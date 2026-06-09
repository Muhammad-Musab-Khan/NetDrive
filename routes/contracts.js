const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking'); //
const Vehicle = require('../models/Vehicle'); //

// ================================================================
// POST /api/contracts/book (Creates a booking and verifies availability)
// ================================================================
router.post('/book', async (req, res) => {
    try {
        const { vehicle_id, vendor_id, renter_id, start_date, end_date, price_per_day, delivery_mode, delivery_address, delivery_lat, delivery_lng, payment_method } = req.body;

        // 1. Double check if the car was booked by another renter during this timeline
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

        const totalDays = Math.max(1, Math.ceil((new Date(end_date) - new Date(start_date)) / 86400000));
        const total_price = totalDays * price_per_day;

        // FIXED: Maps your body params exactly to your model property schema definitions
        const booking = new Booking({
            vehicle: vehicle_id,
            renter: renter_id,
            vendor: vendor_id,
            start_date: new Date(start_date),
            end_date: new Date(end_date),
            total_price,
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
            .populate('vehicle', 'make')
            .populate('vendor', 'full_name')
            .sort({ createdAt: -1 });
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
            .populate('renter', 'full_name phone email cnic_image license_image createdAt') // Add more renter details
            .sort({ createdAt: -1 });
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

module.exports = router;