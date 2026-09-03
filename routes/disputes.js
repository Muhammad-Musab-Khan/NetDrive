const express = require('express');
const router = express.Router();
const Dispute = require('../models/Dispute');
const User = require('../models/user');
const { upload } = require('../middleware/auth');

// ================================================================
// POST /api/disputes (Submit a new dispute with evidence photos)
// ================================================================
router.post('/', upload.array('evidence', 5), async (req, res) => {
    try {
        const { booking_id, raised_by, against, type, description } = req.body;
        if (!booking_id || !raised_by || !against || !type || !description) { // Added validation
            return res.status(400).json({ msg: 'Please provide all required fields.' });
        }

        const evidence = req.files ? req.files.map(file => file.path) : [];

        // Determine who raised the dispute to set the correct 'seen' flag
        const booking = await require('../models/Booking').findById(booking_id);
        if (!booking) return res.status(404).json({ msg: 'Booking not found.' });

        const isRenterRaising = booking.renter.toString() === raised_by;

        const newDispute = new Dispute({
            booking_id,
            raised_by,
            renter_seen: isRenterRaising,
            vendor_seen: !isRenterRaising,
            against,
            type,
            description,
            evidence
        });

        await newDispute.save();
        // TODO: Send email notification to 'against' user and admin
        res.status(201).json({ msg: 'Dispute submitted successfully!', dispute: newDispute });
    } catch (err) {
        res.status(500).json({ msg: 'Failed to submit dispute.', error: err.message });
    }
});

// GET: Fetch all disputes (Admin table)
router.get('/all', async (req, res) => {
    try {
        const disputes = await Dispute.find()
            .populate('raised_by', 'full_name')
            .populate('against', 'full_name')
            .sort({ createdAt: -1 });
        res.status(200).json({ disputes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET: Fetch disputes involving a specific user (raised by them OR against them)
router.get('/user/:userId', async (req, res) => {
    try {
        const disputes = await Dispute.find({
            $or: [{ raised_by: req.params.userId }, { against: req.params.userId }]
        })
            .populate('raised_by', 'full_name')
            .populate('against', 'full_name')
            .populate({
                path: 'booking_id',
                populate: [
                    { path: 'vehicle', select: 'make' },
                    { path: 'renter', select: 'full_name' }, // Populate renter for context
                    { path: 'vendor', select: 'full_name' }  // Populate vendor for context
                ]
            })
            .sort({ createdAt: -1 });
        res.status(200).json({ disputes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST: Add a comment to a dispute
router.post('/:id/comment', async (req, res) => {
    try {
        // user_id and user_name come from the user/vendor.
        // role and channel come from the admin.
        const { user_id, user_name, comment, role, channel } = req.body;
        const dispute = await Dispute.findById(req.params.id).populate('booking_id', 'renter vendor');

        if (!dispute) {
            return res.status(404).json({ msg: 'Dispute not found.' });
        }
        if (!dispute.booking_id) {
            return res.status(404).json({ msg: 'Associated booking not found.' });
        }

        const newCommentData = { user_id, user_name, comment };
        let thread, threadName;

        if (role === 'admin') {
            // Admin is posting. They must specify a channel.
            if (channel === 'renter') {
                dispute.renter_thread.push(newCommentData);
                thread = dispute.renter_thread;
                threadName = 'renter_thread';
            } else if (channel === 'vendor') {
                dispute.vendor_thread.push(newCommentData);
                thread = dispute.vendor_thread;
                threadName = 'vendor_thread';
            } else {
                return res.status(400).json({ msg: 'Admin must specify a channel ("renter" or "vendor").' });
            }
        } else {
            // A user (renter/vendor) is posting.
            if (dispute.booking_id.renter.toString() === user_id) {
                dispute.renter_thread.push(newCommentData);
                thread = dispute.renter_thread;
                threadName = 'renter_thread';
            } else if (dispute.booking_id.vendor.toString() === user_id) {
                dispute.vendor_thread.push(newCommentData);
                thread = dispute.vendor_thread;
                threadName = 'vendor_thread';
            } else {
                return res.status(403).json({ msg: 'User is not a party to this dispute.' });
            }
        }

        await dispute.save();

        // Populate the new comment with user info for the response
        const newComment = thread[thread.length - 1];

        res.status(201).json({ msg: 'Comment added.', comment: newComment, disputeId: dispute._id, thread: threadName });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH: Mark a dispute as seen by a specific user
router.patch('/:id/mark-seen/:userId', async (req, res) => {
    try {
        const { id, userId } = req.params;
        const dispute = await Dispute.findById(id).populate({ path: 'booking_id', select: 'renter vendor' });

        if (!dispute) {
            return res.status(404).json({ msg: 'Dispute not found.' });
        }
        if (!dispute.booking_id) {
            return res.status(404).json({ msg: 'Associated booking not found.' });
        }

        // Correctly identify if the user is the renter or vendor for this booking
        if (dispute.booking_id.renter?.toString() === userId) {
            dispute.renter_seen = true;
        } else if (dispute.booking_id.vendor?.toString() === userId) {
            dispute.vendor_seen = true;
        } else {
            return res.status(403).json({ msg: 'User is not a party to this dispute.' });
        }
        await dispute.save();
        res.status(200).json({ msg: 'Dispute marked as seen.', dispute });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// PATCH: Admin resolves a dispute (optionally rewarding the renter with account credit)
router.patch('/resolve/:id', async (req, res) => {
    try {
        const { admin_notes, reward_amount } = req.body;
        const dispute = await Dispute.findById(req.params.id).populate({ path: 'booking_id', select: 'renter' });
        if (!dispute) return res.status(404).json({ msg: 'Dispute not found.' });

        dispute.status = 'resolved';
        dispute.admin_notes = admin_notes;

        const amount = Number(reward_amount) || 0;
        if (amount > 0) {
            const renterId = dispute.booking_id?.renter;
            if (renterId) {
                await User.findByIdAndUpdate(renterId, { $inc: { account_credit: amount } });
                dispute.reward_amount = amount;
            }
        }

        await dispute.save();
        res.status(200).json({ msg: 'Dispute resolved.', dispute });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
