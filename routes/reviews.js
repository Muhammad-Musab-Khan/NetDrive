const express = require('express');
const router = express.Router();
const Review = require('../models/models/Review');

// POST: Submit a new review
router.post('/', async (req, res) => {
    try {
        const { booking, reviewer, reviewee, role, rating, comment } = req.body;
        const newReview = new Review({ booking, reviewer, reviewee, role, rating, comment });
        await newReview.save();
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