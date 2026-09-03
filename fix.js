const fs = require('fs');
const file = 'c:\\Users\\User\\Desktop\\NetDrive - Copy\\frontend\\src\\pages\\VehicleDetails.js';
let content = fs.readFileSync(file, 'utf8');

const correctCode = \
const submitBooking = async () => {
  if (!currentUserId) { setBookingMsg('Error: Renter session expired. Please log in again.'); return; }
  if (bookingMode === 'daily' && (!startDate || !endDate)) { setBookingMsg('Please pick both dates.'); return; }
  if (new Date(endDate) < new Date(startDate)) { setBookingMsg('End date must be after start date.'); return; }
  if (deliveryMode === 'dropoff' && !address.trim()) { setBookingMsg('Please provide a drop-off address or map pin.'); return; }
  if (!vehicle || !vendor) return;

  setLoading(true);
  setBookingMsg('');
  try {
    const selectedDriverDates = Object.entries(driverDates)
      .filter(([, isSelected]) => isSelected)
      .map(([dateString]) => dateString);

    const res = await fetch(\\\\\\/api/contracts/book\\\, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicle_id: vehicle._id,
        vendor_id: vehicle.vendor_id,
        renter_id: currentUserId,
        start_date: startDate,
        end_date: endDate,
        booking_type: bookingMode,
        start_time: bookingMode === 'hourly' ? startTime : undefined,
        end_time: bookingMode === 'hourly' ? endTime : undefined,
        hours: bookingMode === 'hourly' ? rentalHours : undefined,
        price_per_day: vehicle.price_per_day,
        driver_price_per_day: dailyDriverPrice,
        with_driver: withDriver && selectedDriverDates.length > 0,
        driver_dates: selectedDriverDates,
        fuel_price: fuelAmount,
        delivery_mode: deliveryMode,
        delivery_address: deliveryMode === 'dropoff' ? address : (vendor?.vendor_address || 'Showroom Pickup'),
        delivery_lat: deliveryMode === 'dropoff' ? lat : undefined,
        delivery_lng: deliveryMode === 'dropoff' ? lng : undefined,
        payment_method: paymentMethod,
        credit_used: creditToApply
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Booking failed');

    if (paymentMethod === 'cash' || data.booking.total_price <= 0) {
      const doc = generateBookingSlip({
        booking: data.booking,
        vehicle,
        vendor,
        renterName: currentUserName,
        paymentMethod: data.booking.total_price <= 0 ? 'credit' : 'cash',
        paymentStatus: data.booking.payment_status
      });
      setSlipDoc(doc);
      setBookingComplete(true);
      setAccountCredit(prev => prev - (data.booking.credit_applied || 0));
      setBookingMsg(\\\? Booking confirmed with \\\!\\\);
      addToast({ type: 'success', title: '? Booking Confirmed!', message: \\\Your booking for \\\ has been confirmed.\\\, duration: 7000 });
      setLoading(false);
      return;
    }

    const intentRes = await fetch(\\\\\\/api/payments/create-intent\\\, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: data.booking._id, amount: data.booking.total_price })
    });
    const intentData = await intentRes.json();
    if (!intentRes.ok) throw new Error(intentData.error || 'Could not initiate payment.');

    setPendingBooking(data.booking);
    setClientSecret(intentData.clientSecret);
    setShowCardModal(true);
    setLoading(false);
  } catch (e) {
    setBookingMsg(\\\? \\\\\\);
    setLoading(false);
  }
};
\;

content = content.replace(/const submitBooking = async \(\) => \{[\s\S]*?catch \(e\) \{[\s\S]*?setLoading\(false\);\s*\}\s*\};/, correctCode);

fs.writeFileSync(file, content, 'utf8');
