const mongoose = require('mongoose');

const OtpSchema = new mongoose.Schema({
    email: { type: String, required: true },
    otpCode: { type: String, required: true },
    role: { type: String, required: true }, // Added this
    createdAt: { type: Date, default: Date.now, expires: 600 } // 10 mins
}, { strict: false });

module.exports = mongoose.model('Otp', OtpSchema);