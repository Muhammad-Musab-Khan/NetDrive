require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('./models/Booking');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const latestBookings = await Booking.find().sort({ createdAt: -1 }).limit(3);
    for (const b of latestBookings) {
      console.log(`ID: ${b._id} | Status: ${b.status} | Payment: ${b.payment_status} | Intent: ${b.stripe_payment_intent_id} | Declined: ${b.decline_reason}`);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

