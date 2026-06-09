const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  vehicle:     { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  renter:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  vendor:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  start_date:  { type: Date, required: true },
  end_date:    { type: Date, required: true },
  total_price: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'blocked'],
    default: 'pending'
  },
  is_manual_block: { type: Boolean, default: false },
  decline_reason: { type: String },

  delivery_mode: { type: String, enum: ['pickup', 'dropoff'], default: 'pickup' },
  delivery_address: { type: String },
  payment_method: { type: String, enum: ['cash', 'card'], default: 'cash' },
  delivery_lat: { type: Number },
  delivery_lng: { type: Number },

  // ── Live tracking fields (vendor-controlled) ──────────────────
  tracking_active: { type: Boolean, default: false },  // vendor starts the trip tracker
  current_lat:     { type: Number,  default: 24.8607 },
  current_lng:     { type: Number,  default: 67.0011 },

}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);