const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  full_name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  phone: { type: String },
  roles: { type: [String], enum: ['renter', 'vendor', 'admin'], default: ['renter'] },
  cnic_image: { type: String },
  profile_photo: { type: String, default: null },
  license_image: { type: String },
  cnic_number: { type: String },
  license_number: { type: String },
  document_expiry: { type: Date },
  vendor_address: { type: String, default: null }, // ✅ Karachi showroom address for vendor profiles

  is_phone_verified: { type: Boolean, default: false },
  is_email_verified: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'pending_otp', 'pending_admin', 'banned'],
    default: 'pending_otp'
  },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);