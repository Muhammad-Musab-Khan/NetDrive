const express = require('express');
const router = express.Router();
const Review = require('../models/Review');

// ================================================================
// POST /api/reviews (Submit a new review and update booking status)
// ================================================================
router.post('/', async (req, res) => {
    try {
        const { bookingId, reviewer, reviewee, role, rating, comment } = req.body;

        // 1. Find the booking and validate its state
        const booking = await require('../models/Booking').findById(bookingId);

        if (!booking) {
            return res.status(404).json({ error: 'Booking not found.' });
        }

        if (booking.status !== 'completed') {
            return res.status(400).json({ error: 'Reviews can only be submitted for completed bookings.' });
        }

        // 2. Check if a review has already been submitted
        if (role === 'renter' && booking.renter_reviewed_vendor) {
            return res.status(400).json({ error: 'You have already reviewed this vendor for this booking.' });
        }
        if (role === 'vendor' && booking.vendor_reviewed_renter) {
            return res.status(400).json({ error: 'You have already reviewed this renter for this booking.' });
        }

        // 3. Create and save the new review
        const newReview = new Review({
            booking: bookingId,
            reviewer,
            reviewee,
            role,
            rating,
            comment
        });
        await newReview.save();

        // 4. Update the booking with the new review status flag
        if (role === 'renter') {
            booking.renter_reviewed_vendor = true;
        } else if (role === 'vendor') {
            booking.vendor_reviewed_renter = true;
        }
        await booking.save();

        res.status(201).json({ success: true, review: newReview });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET: Fetch all reviews (Admin Only)
router.get('/', async (req, res) => {
    try {
        const reviews = await Review.find()
            .populate('reviewer', 'full_name email roles')
            .populate('reviewee', 'full_name email roles')
            .sort({ createdAt: -1 });
        res.status(200).json({ reviews });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET: Fetch reviews for a specific user (Vendor or Renter profile)
router.get('/user/:userId', async (req, res) => {
    try {
        const reviews = await Review.find({ reviewee: req.params.userId })
            .populate('reviewer', 'full_name')
            .sort({ createdAt: -1 });
        res.status(200).json({ reviews });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE: Admin Only - Remove a review
router.delete('/:reviewId', async (req, res) => {
    try {
        // In a real app, you'd have middleware here checking if req.user.role === 'admin'
        await Review.findByIdAndDelete(req.params.reviewId);
        res.status(200).json({ success: true, message: 'Review deleted by Admin.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;