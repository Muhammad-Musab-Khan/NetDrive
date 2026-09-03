const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// POST /api/payments/create-intent
router.post('/create-intent', async (req, res) => {
    try {
        const { booking_id, amount } = req.body;
        let receipt_email = req.body.receipt_email;
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Invalid amount.' });
        }
        
        // Ensure receipt_email is fetched from DB if missing
        if (!receipt_email && booking_id) {
            const Booking = require('../models/Booking');
            const booking = await Booking.findById(booking_id).populate('renter');
            if (booking && booking.renter && booking.renter.email) {
                receipt_email = booking.renter.email;
            }
        }

        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // smallest currency unit
            currency: 'pkr', // switch to 'usd' if your sandbox account rejects pkr
            metadata: { booking_id: booking_id || '' },
            ...(receipt_email && { receipt_email }),
            automatic_payment_methods: { enabled: true },
        });

        res.status(200).json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/payments/admin/all — Fetch all card payment records for admin view
router.get('/admin/all', async (req, res) => {
    try {
        const Booking = require('../models/Booking');
        const payments = await Booking.find({})
            .populate('renter', 'full_name email phone')
            .populate('vendor', 'full_name email')
            .populate('vehicle', 'make model_year registration_no')
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({ payments });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
