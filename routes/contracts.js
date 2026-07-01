const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Review = require('../models/Review');
const Booking = require('../models/Booking'); //
const Vehicle = require('../models/Vehicle'); //

// ================================================================
// POST /api/contracts/book (Creates a booking and verifies availability)
// ================================================================
router.post('/book', async (req, res) => {
    try {
        const {
            vehicle_id, vendor_id, renter_id, start_date, end_date, booking_type, start_time, hours,
            price_per_day, driver_price_per_day, fuel_price,
            with_driver, driver_dates, 
            delivery_mode, delivery_address, delivery_lat, delivery_lng,
            payment_method
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
            vehicle_total_price = hours * (vehicle.hourly_rate || 0);
        } else {
            const totalDays = Math.max(1, Math.ceil((new Date(end_date) - new Date(start_date)) / 86400000));
            vehicle_total_price = totalDays * (price_per_day || 0);
        }

        // For hourly bookings, ensure the end_date is the same as the start_date
        const final_end_date = booking_type === 'hourly' ? new Date(start_date) : new Date(end_date);

        let driver_total_price = 0;
        if (with_driver && driver_dates && driver_dates.length > 0) {
            driver_total_price = driver_dates.length * (driver_price_per_day || 0);
        }

        const total_price = vehicle_total_price + driver_total_price + (Number(fuel_price) || 0);

        // FIXED: Maps your body params exactly to your model property schema definitions
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
            with_driver,
            driver_dates: driver_dates || [],
            driver_total_price,
            fuel_price: Number(fuel_price) || 0,
            delivery_mode,
            delivery_address,
            delivery_lat,
            delivery_lng,
            payment_method,
            current_lat: delivery_lat || 24.8607,
            current_lng: delivery_lng || 67.0011,
            status: 'confirmed' // Confirmed right away for testing presentation loops
        });

        await booking.save();
        res.status(200).json({ msg: 'Booking confirmed!', booking });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================================================================
// GET /api/contracts/all (Pulls all contracts for Admin)
// ================================================================
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

// ================================================================
// GET /api/contracts/renter/:renterId (Pulls running contracts for renter map)
// ================================================================
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

// ================================================================
// GET /api/contracts/renter/:renterId/all (Pulls all bookings for a renter)
// ================================================================
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

// ================================================================
// GET /api/contracts/vendor/:vendorId (Pulls all assignments for the vendor dashboard)
// ================================================================
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

// ================================================================
// PATCH /api/contracts/:bookingId/start-tracking (Toggles map live status)
// ================================================================
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

// ================================================================
// PATCH /api/contracts/:bookingId/update-location (Processes simulated movement updates)
// ================================================================
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

// ================================================================
// PATCH /api/contracts/:bookingId/mark-delivered (Starts Official Contract)
// ================================================================
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

// ================================================================
// PATCH /api/contracts/:bookingId/decline (Vendor declines booking)
// ================================================================
router.patch('/:bookingId/decline', async (req, res) => {
    try {
        const { reason } = req.body;
        const booking = await Booking.findByIdAndUpdate(
            req.params.bookingId,
            { tracking_active: false, status: 'cancelled', decline_reason: reason },
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

// ================================================================
// PATCH /api/contracts/:bookingId/cancellation-seen (Marks notification as read)
// ================================================================
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

// ================================================================
// PATCH /api/contracts/:bookingId/completion-seen (Marks completion notification as read)
// ================================================================
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

module.exports = router;