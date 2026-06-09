const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  make: { type: String, required: true }, 
  model: { type: String, required: true }, 
  year: { type: Number, required: true },
  plate_number: { type: String, required: true, unique: true },
  engine_cc: { type: Number, required: true },
  fuel_type: { type: String, enum: ['Petrol', 'Diesel', 'Hybrid', 'Electric'], required: true },
  transmission: { type: String, enum: ['Manual', 'Automatic'], required: true },
  price_per_day: { type: Number, required: true },
  images: [{ type: String }], 
  is_available: { type: Boolean, default: true },
  location: { type: String, required: true }, 
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Vehicle', VehicleSchema);