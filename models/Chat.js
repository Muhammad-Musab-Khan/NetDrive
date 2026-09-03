const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender_id: { type: String, required: true },
  sender_name: { type: String, required: true },
  sender_role: { type: String, enum: ['renter', 'vendor'], required: true },
  content: { type: String, required: true },
  read: { type: Boolean, default: false },
}, { timestamps: true });

const ChatSchema = new mongoose.Schema({
  // Participants
  renter_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  renter_email: { type: String, required: true },
  renter_name: { type: String, required: true },

  vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vendor_email: { type: String, required: true },
  vendor_name: { type: String, required: true },

  renter_unread: { type: Boolean, default: false },
  vendor_unread: { type: Boolean, default: false },

  // Optional: linked vehicle
  vehicle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },

  messages: [MessageSchema],

  // Auto-delete after 3 weeks (21 days = 1814400 seconds)
  expires_at: {
    type: Date,
    default: () => new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
  },

  last_message_at: { type: Date, default: Date.now },

}, { timestamps: true });

// TTL index — MongoDB auto-deletes chats after expires_at
ChatSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Chat', ChatSchema);