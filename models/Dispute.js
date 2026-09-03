const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Not required for admin comments
  user_name: { type: String, required: true },
  comment: { type: String, required: true },
}, { timestamps: true });

const DisputeSchema = new mongoose.Schema({
  booking_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  raised_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  against: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['Damage', 'Cleanliness', 'Late Return', 'Other'],
    required: true
  },
  description: { type: String, required: true },
  evidence: [{ type: String }],
  status: {
    type: String,
    enum: ['open', 'reviewing', 'resolved'],
    default: 'open'
  },
  admin_notes: { type: String },
  renter_thread: [CommentSchema],
  vendor_thread: [CommentSchema],
  renter_seen: { type: Boolean, default: false }, // Renter has seen this dispute
  vendor_seen: { type: Boolean, default: false }, // Vendor has seen this dispute
  reward_amount: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Dispute', DisputeSchema);
