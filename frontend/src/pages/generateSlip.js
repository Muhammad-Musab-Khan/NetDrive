import jsPDF from 'jspdf';

export function generateBookingSlip({ booking, vehicle, vendor, renterName, paymentMethod, paymentStatus }) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('NetDrive', 14, 20);
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text('Booking Confirmation Slip', 14, 27);
  doc.setDrawColor(220, 220, 220);
  doc.line(14, 32, pageWidth - 14, 32);

  let y = 42;
  const row = (label, value) => {
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text(label, 14, y);
    doc.setFont(undefined, 'normal');
    doc.text(String(value ?? '-'), 80, y);
    y += 8;
  };

  row('Booking Reference:', booking._id);
  row('Renter Name:', renterName || 'N/A');
  row('Vehicle:', `${vehicle.make} (${vehicle.model_year})`);
  row('Registration No:', vehicle.registration_no);
  row('Vendor:', vendor?.full_name || 'N/A');
  row('Booking Type:', booking.booking_type === 'hourly' ? 'Hourly Rental' : 'Daily Rental');
  row('Start Date:', booking.start_date ? new Date(booking.start_date).toLocaleDateString() : '-');
  row('End Date:', booking.end_date ? new Date(booking.end_date).toLocaleDateString() : '-');
  if (booking.booking_type === 'hourly') row('Duration:', `${booking.hours} hour(s)`);
  row('Fulfillment:', booking.delivery_mode === 'dropoff' ? 'Drop-off' : 'Showroom Pickup');
  if (booking.delivery_mode === 'dropoff') row('Delivery Address:', booking.delivery_address);

  y += 2;
  doc.setDrawColor(235, 235, 235);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  doc.setFont(undefined, 'bold');
  doc.setFontSize(10);
  doc.text('Cost Breakdown', 14, y);
  y += 8;

  // Use the directly stored vehicle_rental_price for clarity
  row('Vehicle Rental:', `Rs. ${Number(booking.vehicle_rental_price || 0).toLocaleString()}`);
  if (booking.with_driver && booking.driver_total_price > 0) {
    row(`Driver (${booking.driver_dates?.length || 0} day(s)):`, `Rs. ${Number(booking.driver_total_price).toLocaleString()}`);
  }
  if (booking.fuel_price > 0) {
    row('Prepaid Fuel:', `Rs. ${Number(booking.fuel_price).toLocaleString()}`);
  }
  if (booking.credit_applied > 0) {
    row('Account Credit Applied:', `– Rs. ${Number(booking.credit_applied).toLocaleString()}`);
  }

  y += 2;
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  const methodLabel = paymentMethod === 'credit'
    ? 'Fully Paid via Account Credit'
    : paymentMethod === 'card'
      ? 'Credit / Debit Card'
      : 'Cash';
  row('Payment Method:', methodLabel);
  row('Payment Status:', paymentStatus === 'paid' ? 'Paid' : paymentStatus === 'cash_on_delivery' ? 'Pay on Delivery / Pickup' : 'Pending');

  doc.setFont(undefined, 'bold');
  doc.setFontSize(12);
  doc.text('Amount Paid:', 14, y);
  doc.text(`Rs. ${Number(booking.total_price).toLocaleString()}`, 80, y);
  y += 10;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(10);
  row('Issued On:', new Date().toLocaleString());

  y += 4;
  doc.line(14, y, pageWidth - 14, y);
  y += 10;
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('This is a system-generated receipt. Keep it for your records.', 14, y);

  return doc; // caller decides when to trigger the actual download
}

