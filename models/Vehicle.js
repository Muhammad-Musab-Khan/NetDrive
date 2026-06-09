const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
  vendor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vendor_email: { type: String, required: true },

  // Details from vendor input
  make: { type: String, required: true },
  model_year: { type: String, required: true },
  registration_no: { type: String, required: true },
  registration_date: { type: String, required: true },
  owner_name: { type: String, required: true },
  tax_payment: { type: String, required: true },
  address: { type: String, required: true },
  lat: { type: Number },
  lng: { type: Number },

  // Photos
  photos: [{ type: String }],
  document_front: { type: String },
  document_back: { type: String },

  // Verification result from excise.gos.pk
  is_verified: { type: Boolean, default: false },
  verification_data: { type: Object, default: null },
  verification_error: { type: String, default: null },

  // Listing status
  status: {
    type: String,
    enum: ['pending_verification', 'verified', 'rejected', 'active', 'inactive'],
    default: 'pending_verification'
  },

  price_per_day: { type: Number },
  category: { type: String, enum: ['sedan', 'suv', 'luxury', 'sport', 'electric', 'van', 'truck'], default: 'sedan' },

}, { timestamps: true });

module.exports = mongoose.model('Vehicle', VehicleSchema);