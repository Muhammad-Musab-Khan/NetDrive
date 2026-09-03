const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  vehicle:     { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  renter:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  vendor:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',    required: true },
  start_date:  { type: Date, required: true },
  end_date:    { type: Date, required: true },

  // Hourly booking fields
  booking_type: { type: String, enum: ['daily', 'hourly'], default: 'daily' },
  start_time: { type: String },
  hours: { type: Number },
  vehicle_rental_price: { type: Number, required: true }, // Base price for vehicle rental only

  total_price: { type: Number, required: true },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'blocked'],
    default: 'pending'
  },
  is_manual_block: { type: Boolean, default: false },
  decline_reason: { type: String },
  cancellation_seen: { type: Boolean, default: false }, // To ensure cancellation notification is shown only once
  completion_seen: { type: Boolean, default: false }, // To ensure completion notification is shown only once

  // Review tracking
  renter_reviewed_vendor: { type: Boolean, default: false },
  vendor_reviewed_renter: { type: Boolean, default: false },

  // Driver options
  with_driver: { type: Boolean, default: false },
  driver_dates: [{ type: Date }],
  driver_total_price: { type: Number, default: 0 },

  // Prepaid fuel
  fuel_price: { type: Number, default: 0 },

  delivery_mode: { type: String, enum: ['pickup', 'dropoff'], default: 'pickup' },
  delivery_address: { type: String },
  payment_method: { type: String, enum: ['cash', 'card'], default: 'cash' },

  // ── Payment tracking (Stripe) ─────────────────────────────────
  payment_status: {
    type: String,
    enum: ['pending', 'paid', 'cash_on_delivery'],
    default: 'pending'
  },
  stripe_payment_intent_id: { type: String },
  credit_applied: { type: Number, default: 0 },

  delivery_lat: { type: Number },
  delivery_lng: { type: Number },

  // ── Live tracking fields (vendor-controlled) ──────────────────
  tracking_active: { type: Boolean, default: false },  // vendor starts the trip tracker
  current_lat:     { type: Number,  default: 24.8607 },
  current_lng:     { type: Number,  default: 67.0011 },

}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);
