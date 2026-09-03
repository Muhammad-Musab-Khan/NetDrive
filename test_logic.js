const { Set } = require('core-js');

let knownBookingIdsRef = { current: new Set() };
let isInitializedRef = { current: false };
let toasts = [];

function addToast(toast) {
  toasts.push(toast);
}

function useBookingAlerts(bookings) {
  if (!bookings) return;

  const currentIds = new Set(bookings.map(b => b._id));

  if (!isInitializedRef.current) {
    knownBookingIdsRef.current = currentIds;
    if (bookings.length > 0) {
      isInitializedRef.current = true;
    }
    return;
  }

  const newBookings = bookings.filter(b => !knownBookingIdsRef.current.has(b._id) && ['confirmed', 'pending'].includes(b.status));

  newBookings.forEach(b => {
    addToast({ title: 'New Booking', id: b._id });
  });

  if (bookings.length !== knownBookingIdsRef.current.size) {
    knownBookingIdsRef.current = currentIds;
  }
}

// 1. Initial load (empty)
useBookingAlerts([]);
console.log('After init (empty):', isInitializedRef.current, knownBookingIdsRef.current.size, toasts.length);

// 2. Initial fetch returns 1 historical booking
useBookingAlerts([{ _id: '1', status: 'confirmed' }]);
console.log('After fetch (1 history):', isInitializedRef.current, knownBookingIdsRef.current.size, toasts.length);

// 3. Polling returns same data
useBookingAlerts([{ _id: '1', status: 'confirmed' }]);
console.log('After poll (no change):', isInitializedRef.current, knownBookingIdsRef.current.size, toasts.length);

// 4. Polling returns new booking!
useBookingAlerts([{ _id: '1', status: 'confirmed' }, { _id: '2', status: 'confirmed' }]);
console.log('After poll (new booking):', isInitializedRef.current, knownBookingIdsRef.current.size, toasts.length);

// 5. Polling returns same data again
useBookingAlerts([{ _id: '1', status: 'confirmed' }, { _id: '2', status: 'confirmed' }]);
console.log('After poll (no change 2):', isInitializedRef.current, knownBookingIdsRef.current.size, toasts.length);

