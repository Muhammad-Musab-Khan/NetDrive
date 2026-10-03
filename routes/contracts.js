const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Review = require('../models/Review');
const Booking = require('../models/Booking'); 
const Vehicle = require('../models/Vehicle'); 
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


// POST /api/contracts/book (Creates a booking and verifies availability)

router.post('/book', async (req, res) => {
    try {
        const {
            vehicle_id, vendor_id, renter_id, start_date, end_date, booking_type, start_time, hours, // Removed price_per_day from destructuring
            driver_price_per_day, fuel_price,
            with_driver, driver_dates, 
            delivery_mode, delivery_address, delivery_lat, delivery_lng,
            payment_method, credit_used
        } = req.body;
        
        // 0. Check if the vendor is open for business
        const vendor = await User.findById(vendor_id);
        if (!vendor) {
            return res.status(400).json({ error: 'Invalid vendor ID provided.' });
        }
        if (!vendor.roles.includes('vendor')) {
            return res.status(400).json({ error: 'Invalid vendor ID provided.' });
        }
        if (vendor.status === 'closed') {
            return res.status(400).json({ error: 'This vendor is currently closed and not accepting new bookings.' });
        }
        if (vendor.status === 'banned') {
            return res.status(400).json({ error: 'This vendor account has been suspended.' });
        }

        const vehicle = await Vehicle.findById(vehicle_id);
        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found.' });
        }

        // Block bookings for vehicles that are inactive/suspended/banned by admin or vendor
        if (vehicle.status !== 'active') {
            return res.status(403).json({ error: 'This vehicle is currently unavailable for booking.' });
        }

        // Check operating hours window
        if (vehicle.allow_hourly_rentals && vehicle.operating_hours_start && vehicle.operating_hours_end) {
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();
            const [sh, sm] = vehicle.operating_hours_start.split(':').map(Number);
            const [eh, em] = vehicle.operating_hours_end.split(':').map(Number);
            const startTime = sh * 60 + sm;
            const endTime = eh * 60 + em;
            const isOpen = endTime < startTime
                ? (currentTime >= startTime || currentTime <= endTime)
                : (currentTime >= startTime && currentTime <= endTime);
            if (!isOpen) {
                return res.status(400).json({ error: `This vendor is closed right now. Operating hours: ${vehicle.operating_hours_start} - ${vehicle.operating_hours_end}.` });
            }
        }

        // 0b. Check if the renter is banned
        const renter = await User.findById(renter_id);
        if (!renter || renter.status === 'banned') {
            return res.status(403).json({ error: 'Your account has been suspended. You cannot make bookings.' });
        }
        // 1. Double check if the car was booked by another renter during this timeline
        // Server-side validation for single-day daily bookings
        if (booking_type === 'daily' && start_date === end_date) {
            return res.status(400).json({ error: 'Daily rentals must be for at least two days. Please use the hourly option for single-day bookings.' });
        }

        const overlappingBooking = await Booking.findOne({
            vehicle: vehicle_id,
            status: { $in: ['pending', 'confirmed', 'active'] },
            $or: [
                { start_date: { $lte: new Date(end_date) }, end_date: { $gte: new Date(start_date) } }
            ]
        });

        if (overlappingBooking) {
            return res.status(400).json({ error: 'This vehicle has already been reserved for the selected dates.' });
        }

        let vehicle_total_price = 0;
        if (booking_type === 'hourly') {
            if (!hours || hours < (vehicle.minimum_hours || 1)) {
                return res.status(400).json({ error: `Minimum booking duration is ${vehicle.minimum_hours || 1} hours.` });
            }
            vehicle_total_price = hours * (vehicle.hourly_rate); // Use vehicle's hourly_rate from DB
        } else {
            const totalDays = Math.round((new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1; // Corrected inclusive day calculation
            vehicle_total_price = totalDays * (vehicle.price_per_day); // Use vehicle's price_per_day from DB
        }

        // For hourly bookings, ensure the end_date is the same as the start_date
        const final_end_date = booking_type === 'hourly' ? new Date(start_date) : new Date(end_date);

        let driver_total_price = 0;
        if (with_driver && driver_dates && driver_dates.length > 0) {
            driver_total_price = driver_dates.length * (driver_price_per_day || 0);
        }

        const subtotal = vehicle_total_price + driver_total_price + (Number(fuel_price) || 0);

        // Validate & apply account credit (never trust the client's number — recheck against the renter's real balance)
        let credit_to_apply = 0;
        const requestedCredit = Number(credit_used) || 0;
        if (requestedCredit > 0) {
            const renterBalance = renter.account_credit || 0;
            credit_to_apply = Math.min(requestedCredit, renterBalance, subtotal);
        }

        const total_price = subtotal - credit_to_apply;

        // FIXED: Maps your body params schema definitions
        const booking = new Booking({
            vehicle: vehicle_id,
            renter: renter_id,
            vendor: vendor_id,
            start_date: new Date(start_date),
            end_date: final_end_date,
            total_price,
            booking_type,
            start_time,
            hours,
            vehicle_rental_price: vehicle_total_price, // Store the calculated base vehicle rental price
            with_driver,
            driver_dates: driver_dates || [],
            driver_total_price,
            fuel_price: Number(fuel_price) || 0,
            delivery_mode,
            delivery_address,
            delivery_lat,
            delivery_lng,
            payment_method,
            // If account credit fully covers the total, there's nothing left for Stripe to charge — mark paid immediately
            payment_status: total_price <= 0 ? 'paid' : (payment_method === 'cash' ? 'cash_on_delivery' : 'pending'),
            credit_applied: credit_to_apply,
            current_lat: delivery_lat || 24.8607,
            current_lng: delivery_lng || 67.0011,
            status: 'confirmed' // Confirmed right away for testing presentation loops
        });

        await booking.save();

        // Deduct the applied credit from the renter's balance now that the booking is confirmed
        if (credit_to_apply > 0) {
            await User.findByIdAndUpdate(renter_id, { $inc: { account_credit: -credit_to_apply } });
        }

        // Send Emails
        const { sendEmail } = require('../utils/emailService');
        const vehicleName = `${vehicle.make} ${vehicle.model_year}`;
        // Only send immediately if cash or fully covered by credit
        if (payment_method === "cash" || total_price <= 0) {
        
        // To Vendor
        const vendorHtml = `
            <h2>New Booking Received!</h2>
            <p>Hello ${vendor.full_name},</p>
            <p>You have received a new booking for your <b>${vehicleName}</b>.</p>
            <p><b>Renter:</b> ${renter.full_name}</p>
            <p><b>Start Date:</b> ${new Date(start_date).toLocaleDateString()}</p>
            <p><b>End Date:</b> ${final_end_date.toLocaleDateString()}</p>
            <p><b>Total Price:</b> Rs. ${total_price.toLocaleString()}</p>
            <p>Please log in to your vendor dashboard to manage this booking.</p>
        `;
        sendEmail(vendor.email, 'New Booking on NetDrive', vendorHtml);

        // To Renter
        const renterHtml = `
            <h2>Booking Confirmed!</h2>
            <p>Hello ${renter.full_name},</p>
            <p>Your booking for the <b>${vehicleName}</b> has been confirmed by ${vendor.full_name}.</p>
            <p><b>Start Date:</b> ${new Date(start_date).toLocaleDateString()}</p>
            <p><b>End Date:</b> ${final_end_date.toLocaleDateString()}</p>
            <p><b>Total Price:</b> Rs. ${total_price.toLocaleString()}</p>
            <p>Enjoy your ride!</p>
        `;
        sendEmail(renter.email, 'Booking Confirmed on NetDrive', renterHtml);
        }

        res.status(200).json({ msg: 'Booking confirmed!', booking });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// GET /api/contracts/all (Pulls all contracts for Admin)

router.get('/all', async (req, res) => {
    try {
        const contracts = await Booking.find()
            .populate('vehicle')
            .populate('renter', 'full_name phone')
            .populate('vendor', 'full_name')
            .sort({ createdAt: -1 });
        res.status(200).json({ contracts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// GET /api/contracts/renter/:renterId (Pulls running contracts for renter map)

router.get('/renter/:renterId', async (req, res) => {
    try {
        const contract = await Booking.findOne({ 
            renter: req.params.renterId,
            status: { $in: ['confirmed', 'active'] }
        })
        .populate('vehicle')
        .populate('vendor', 'full_name phone cnic_image')
        .sort({ createdAt: -1 });

        res.status(200).json({ contract });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// GET /api/contracts/renter/:renterId/all (Pulls all bookings for a renter)

router.get('/renter/:renterId/all', async (req, res) => {
    try {
        const bookings = await Booking.find({ renter: req.params.renterId })
            .populate('vehicle', 'make model_year registration_no photos') // Provide more vehicle details
            .populate('vendor', 'full_name') // Provide vendor name
            .sort({ createdAt: -1 }); // Show most recent first
        res.status(200).json({ bookings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// GET /api/contracts/vendor/:vendorId (Pulls all assignments for the vendor dashboard)

router.get('/vendor/:vendorId', async (req, res) => {
    try {
        const bookings = await Booking.find({ vendor: req.params.vendorId })
            .populate('vehicle', 'make model_year registration_no') // Populate vehicle details too
            .populate('renter') // Populate the FULL renter object, including all images
            .sort({ createdAt: -1 })
            .lean(); // Use lean() for better performance and to allow modification

        // Manually calculate and attach average rating for each renter
        for (let booking of bookings) {
            if (booking.renter) {
                const reviews = await Review.find({ reviewee: booking.renter._id });
                if (reviews.length > 0) {
                    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
                    booking.renter.avg_rating = totalRating / reviews.length;
                } else {
                    booking.renter.avg_rating = 0;
                }
            }
        }
        res.status(200).json({ bookings });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// PATCH /api/contracts/:bookingId/start-tracking (Toggles map live status)

router.patch('/:bookingId/start-tracking', async (req, res) => {
    try {
        const booking = await Booking.findByIdAndUpdate(
            req.params.bookingId,
            { tracking_active: true }, // Keep status 'confirmed' during the delivery phase
            { new: true }
        );
        res.status(200).json({ success: true, booking });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// PATCH /api/contracts/:bookingId/update-location (Processes simulated movement updates)

router.patch('/:bookingId/update-location', async (req, res) => {
    try {
        const { lat, lng, tracking_active } = req.body;
        const updateData = {};
        if (lat !== undefined) updateData.current_lat = lat;
        if (lng !== undefined) updateData.current_lng = lng;
        if (tracking_active !== undefined) updateData.tracking_active = tracking_active;

        await Booking.findByIdAndUpdate(req.params.bookingId, updateData);
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// PATCH /api/contracts/:bookingId/mark-delivered (Starts Official Contract)

router.patch('/:bookingId/mark-delivered', async (req, res) => {
    try {
        const booking = await Booking.findByIdAndUpdate(
            req.params.bookingId,
            { tracking_active: false, status: 'active' }, // Official rental period begins
            { new: true }
        );
        res.status(200).json({ success: true, booking });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// PATCH /api/contracts/:bookingId/decline (Vendor declines booking)

router.patch('/:bookingId/decline', async (req, res) => {
    try {
        const { reason } = req.body;
        
        const booking = await Booking.findById(req.params.bookingId);
        if (!booking) return res.status(404).json({ error: 'Booking not found' });
        
        // If it was already paid by card, issue a Stripe refund
        if (booking.payment_status === 'paid' && booking.stripe_payment_intent_id) {
            try {
                await stripe.refunds.create({
                    payment_intent: booking.stripe_payment_intent_id,
                });
                booking.payment_status = 'refunded';

                // Notify renter of refund
                const { sendEmail } = require('../utils/emailService');
                const refundHtml = `
                    <h2>Booking Declined - Refund Issued</h2>
                    <p>Hello,</p>
                    <p>Unfortunately, your vendor declined the booking. But don't worry!</p>
                    <p>A full refund for your card payment has been automatically issued via Stripe.</p>
                    <p>Reason: ${reason || 'No reason provided'}</p>
                    <p>The funds will appear in your bank account shortly.</p>
                `;
                
                await booking.populate('renter');
                if (booking.renter && booking.renter.email) {
                    sendEmail(booking.renter.email, 'Booking Refunded on NetDrive', refundHtml);
                }
            } catch (stripeErr) {
                console.error('Stripe refund failed:', stripeErr);
            }
        }
        
        booking.tracking_active = false;
        booking.status = 'cancelled';
        booking.decline_reason = reason;
        await booking.save();
        
        if (booking.vehicle) {
            await Vehicle.findByIdAndUpdate(booking.vehicle, { status: 'active' });
        }
        res.status(200).json({ success: true, booking });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH: End Contract (Car is returned and completed)
router.patch('/:bookingId/complete', async (req, res) => {
    try {
        const booking = await Booking.findByIdAndUpdate(
            req.params.bookingId,
            { tracking_active: false, status: 'completed' },
            { new: true }
        );
        
        if (booking && booking.vehicle) {
            await Vehicle.findByIdAndUpdate(booking.vehicle, { status: 'active' });
        }
        res.status(200).json({ success: true, booking });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET: Public Tracking Link (For family sharing)
router.get('/track/:bookingId', async (req, res) => {
    try {
        // Finds the booking but only returns safe, non-sensitive data
        const booking = await Booking.findById(req.params.bookingId)
            .select('current_lat current_lng tracking_active status vehicle')
            .populate('vehicle', 'make model_year registration_no');
            
        if (!booking) return res.status(404).json({ error: 'Tracking link invalid.' });
        
        res.status(200).json({ tracking_data: booking });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// PATCH /api/contracts/:bookingId/cancellation-seen (Marks notification as read)

router.patch('/:bookingId/cancellation-seen', async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.bookingId);
  
      if (!booking) {
        return res.status(404).json({ success: false, message: `Booking not found with id of ${req.params.bookingId}` });
      }
  
      // In a real app with auth, you would check if req.user.id is the renter or vendor
      // For now, we will allow the update.
  
      if (booking.status !== 'cancelled') {
          return res.status(400).json({ success: false, message: 'Booking is not cancelled.' });
      }
  
      booking.cancellation_seen = true;
      await booking.save();
  
      res.status(200).json({ success: true, data: booking });
  
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
});


// PATCH /api/contracts/:bookingId/completion-seen (Marks completion notification as read)

router.patch('/:bookingId/completion-seen', async (req, res) => {
    try {
      const booking = await Booking.findById(req.params.bookingId);
  
      if (!booking) {
        return res.status(404).json({ success: false, message: `Booking not found with id of ${req.params.bookingId}` });
      }
  
      if (booking.status !== 'completed') {
          return res.status(400).json({ success: false, message: 'Booking is not completed.' });
      }
  
      booking.completion_seen = true;
      await booking.save();
  
      res.status(200).json({ success: true, data: booking });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
});

// PATCH /api/contracts/:bookingId/mark-paid (Verifies & confirms a card payment via Stripe)

router.patch('/:bookingId/mark-paid', async (req, res) => {
    try {
        const { paymentIntentId } = req.body;
        if (!paymentIntentId) {
            return res.status(400).json({ error: 'Missing paymentIntentId.' });
        }

        // Never trust the client — verify with Stripe first
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (intent.status !== 'succeeded') {
            return res.status(400).json({ error: 'Payment has not succeeded.' });
        }

                const booking = await Booking.findByIdAndUpdate(
            req.params.bookingId,
            { payment_status: 'paid', stripe_payment_intent_id: paymentIntentId },
            { new: true }
        ).populate('vehicle').populate('renter').populate('vendor');

        if (!booking) return res.status(404).json({ error: 'Booking not found.' });

        const { sendEmail } = require('../utils/emailService');
        const vehicleName = `${booking.vehicle.make} ${booking.vehicle.model_year}`;

        const vendorHtml = `
            <h2>Payment Received & New Booking!</h2>
            <p>Hello ${booking.vendor.full_name},</p>
            <p>The renter <b>${booking.renter.full_name}</b> has paid <b>Rs. ${booking.total_price.toLocaleString()}</b> by card.</p>
            <p>You have a new confirmed booking for your <b>${vehicleName}</b>.</p>
            <p>Please log in to your vendor dashboard to manage this booking.</p>
        `;
        sendEmail(booking.vendor.email, 'Payment Received on NetDrive', vendorHtml);

        const renterHtml = `
            <h2>Payment Successful!</h2>
            <p>Hello ${booking.renter.full_name},</p>
            <p>We successfully received your card payment of <b>Rs. ${booking.total_price.toLocaleString()}</b>.</p>
            <p>Your booking for the <b>${vehicleName}</b> is fully confirmed.</p>
            <p>Enjoy your ride!</p>
        `;
        sendEmail(booking.renter.email, 'Payment Receipt & Booking Confirmed', renterHtml);

        res.status(200).json({ success: true, booking });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/contracts/:vehicleId/booked-dates
// Returns all date ranges that are already booked for this vehicle
router.get('/:vehicleId/booked-dates', async (req, res) => {
    try {
        const bookings = await Booking.find({
            vehicle: req.params.vehicleId,
            status: { $in: ['pending', 'confirmed', 'active'] }
        }).select('start_date end_date').lean();

        // Expand each booking into individual dates
        const bookedDates = new Set();
        bookings.forEach(b => {
            const current = new Date(b.start_date);
            const end = new Date(b.end_date);
            while (current <= end) {
                bookedDates.add(current.toISOString().split('T')[0]);
                current.setDate(current.getDate() + 1);
            }
        });

        res.json({ bookedDates: [...bookedDates].sort() });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch booked dates.' });
    }
});

module.exports = router;
