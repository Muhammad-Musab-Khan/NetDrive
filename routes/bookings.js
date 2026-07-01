const express = require('express');
const {
  // Assuming you have these functions in a main booking controller
  // getBookings,
  // getBooking,
  // createBooking,
  // updateBooking,
  // deleteBooking
} = require('../controllers/bookings'); // Adjust path if needed

const { markCancellationSeen } = require('../controllers/bookingActions');

const router = express.Router();

const { protect } = require('../middleware/auth'); // Assuming you have this auth middleware

router.route('/:id/cancellation-seen').put(protect, markCancellationSeen);

// Add your other booking routes here if this is a new file
// router.route('/').get(protect, getBookings).post(protect, createBooking);
// router.route('/:id').get(protect, getBooking).put(protect, updateBooking).delete(protect, deleteBooking);

module.exports = router;