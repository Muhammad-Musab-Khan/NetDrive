import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, CreditCard, Banknote, Info, Loader2, AlertCircle, Store, Navigation, UserCheck, Fuel, Download, Wallet } from 'lucide-react';
import { GoogleMap, useJsApiLoader, MarkerF, Autocomplete } from '@react-google-maps/api';
import CardPaymentModal from './CardPaymentModal';
import { generateBookingSlip } from './generateSlip';
import { ToastContainer, useToast } from './BookingAlerts';

const API = 'http://localhost:5000';
const mapContainerStyle = { width: '100%', height: '200px', borderRadius: '12px' };
const defaultCenter = { lat: 24.8607, lng: 67.0011 };

// Helper to reliably get the local date string (YYYY-MM-DD) avoiding UTC drift
const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function VehicleDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const { vehicleId, vendorId } = location.state || {};
  const { toasts, addToast, dismissToast } = useToast();
  const [showCardModal, setShowCardModal] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [pendingBooking, setPendingBooking] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [vendor, setVendor] = useState(null);
  const currentUserId = localStorage.getItem('userId');
  const currentUserName = localStorage.getItem('userName') || 'Renter';
  const [accountCredit, setAccountCredit] = useState(0);
  const [renterEmail, setRenterEmail] = useState('');
  const [useCredit, setUseCredit] = useState(false);
  const [slipDoc, setSlipDoc] = useState(null);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookedDates, setBookedDates] = useState([]);

  const [activePhoto, setActivePhoto] = useState(0);
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getTodayString());
  const [bookingMode, setBookingMode] = useState('daily'); // 'daily' or 'hourly'
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [withDriver, setWithDriver] = useState(false);
  const [driverDates, setDriverDates] = useState({});
  const [fuelAmount, setFuelAmount] = useState(0);
  const [deliveryMode, setDeliveryMode] = useState('pickup');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState(defaultCenter.lat);
  const [lng, setLng] = useState(defaultCenter.lng);
  const [bookingMsg, setBookingMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const autocompleteRef = useRef(null);
  const libraries = useMemo(() => ['places'], []);
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '',
    libraries
  });

  const rentalDates = useMemo(() => {
    if (!startDate || !endDate || new Date(endDate) < new Date(startDate)) return [];
    const dates = [];
    const current = new Date(startDate);
    // Adjust for timezone to prevent off-by-one day errors
    current.setMinutes(current.getMinutes() + current.getTimezoneOffset());
    const end = new Date(endDate);
    end.setMinutes(end.getMinutes() + end.getTimezoneOffset());

    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }, [startDate, endDate]);

  // Use the driver price set by the vendor. If it's 0 or not set, the option is disabled.
  const dailyDriverPrice = useMemo(() => Number(vehicle?.driver_price_per_day) || 0, [vehicle]);

  const totalDays = bookingMode === 'daily' ? rentalDates.length : 0;
  const rentalHours = useMemo(() => {
    if (bookingMode !== 'hourly' || !startTime || !endTime) return 0;
    const start = new Date(`1970-01-01T${startTime}:00`);
    let end = new Date(`1970-01-01T${endTime}:00`);
    if (end <= start) end.setDate(end.getDate() + 1); // handle overnight (past midnight)
    return Math.round((end - start) / (1000 * 60 * 60));
  }, [bookingMode, startTime, endTime]);

  const totalDriverDays = withDriver ? Object.values(driverDates).filter(Boolean).length : 0;
  const driverCost = totalDriverDays * dailyDriverPrice;
  
  const vehicleCost = useMemo(() => {
    if (bookingMode === 'hourly') return rentalHours * (Number(vehicle?.hourly_rate) || 0);
    return totalDays * (vehicle?.price_per_day || 0);
  }, [bookingMode, rentalHours, totalDays, vehicle, startTime, endTime]);

  const finalTotalPrice = vehicleCost + driverCost + fuelAmount;
  const creditToApply = useCredit ? Math.min(accountCredit, finalTotalPrice) : 0;
  const payableAmount = finalTotalPrice - creditToApply;

  useEffect(() => {
    const fetchData = async () => {
      if (!vehicleId) {
        setBookingMsg('Error: No vehicle specified.');
        return;
      }
      setLoading(true);
      try {
        const vehicleRes = await fetch(`${API}/api/vehicles/${vehicleId}`);
        const vehicleData = await vehicleRes.json();
        if (!vehicleRes.ok) throw new Error(vehicleData.msg || 'Could not fetch vehicle.');

        const fetchedVehicle = vehicleData.vehicle;
        setVehicle(fetchedVehicle);

        // If vendor_id is populated as an object, use it directly
        if (fetchedVehicle?.vendor_id && typeof fetchedVehicle.vendor_id === 'object' && fetchedVehicle.vendor_id.full_name) {
          setVendor(fetchedVehicle.vendor_id);
        } else {
          // Fall back to a direct user fetch
          const resolvedVendorId = vendorId || (typeof fetchedVehicle?.vendor_id === 'string' ? fetchedVehicle.vendor_id : null);
          if (resolvedVendorId) {
            const vendorRes = await fetch(`${API}/api/auth/user/${resolvedVendorId}`);
            const vendorData = await vendorRes.json();
            if (vendorRes.ok) setVendor(vendorData.user);
            else throw new Error('Could not fetch vendor details.');
          }
        }
      } catch (e) {
        setBookingMsg(`${e.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [vehicleId, vendorId]);

  // Fetch booked dates for this vehicle
  useEffect(() => {
    if (!vehicleId) return;
    const fetchBookedDates = async () => {
      try {
        const res = await fetch(`${API}/api/contracts/${vehicleId}/booked-dates`);
        const data = await res.json();
        if (res.ok) setBookedDates(data.bookedDates || []);
      } catch (e) { console.error(e); }
    };
    fetchBookedDates();
  }, [vehicleId]);

  useEffect(() => {
    const fetchCredit = async () => {
      if (!currentUserId) return;
      try {
        const res = await fetch(`${API}/api/auth/user/${currentUserId}`);
        const data = await res.json();
        if (res.ok) {
            setAccountCredit(data.user?.account_credit || 0);
            setRenterEmail(data.user?.email || '');
          }
      } catch (e) { console.error(e); }
    };
    fetchCredit();
  }, [currentUserId]);

  useEffect(() => {
    if (isLoaded && deliveryMode === 'dropoff' && !address) {
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          const currentLat = pos.coords.latitude;
          const currentLng = pos.coords.longitude;
          setLat(currentLat);
          setLng(currentLng);
          
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat: currentLat, lng: currentLng } }, (results, status) => {
            if (status === 'OK' && results[0]) {
              setAddress(results[0].formatted_address);
            } else {
              console.error('Geocoding failed on load:', status);
              setAddress(`ðŸ“ Lat: ${currentLat.toFixed(4)}, Lng: ${currentLng.toFixed(4)}`);
            }
          });
        },
        (err) => { console.warn("Geolocation failed:", err); },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, [isLoaded, deliveryMode, address]);

  useEffect(() => {
    // When rental dates change, reset the driver dates selection, keeping any already checked
    setDriverDates(prev => {
      const newDriverDates = {};
      rentalDates.forEach(date => {
        const dateString = date.toISOString().split('T')[0];
        newDriverDates[dateString] = prev[dateString] || false;
      });
      return newDriverDates;
    });
  }, [rentalDates]);

  const handleLocateMe = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const currentLat = pos.coords.latitude;
        const currentLng = pos.coords.longitude;
        setLat(currentLat);
        setLng(currentLng);
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat: currentLat, lng: currentLng } }, (results, status) => {
          if (status === 'OK' && results[0]) setAddress(results[0].formatted_address);
          else {
            if (status === 'REQUEST_DENIED') console.error('Geocoding blocked! Please enable "Geocoding API" in your Google Cloud Console.');
            setAddress(`ðŸ“ Lat: ${currentLat.toFixed(4)}, Lng: ${currentLng.toFixed(4)}`);
          }
        });
      },
      (err) => { console.warn("Geolocation failed:", err); alert("Could not get location: " + err.message); },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
    );
  };

  const onMapClick = useCallback((e) => {
    const clickedLat = e.latLng.lat();
    const clickedLng = e.latLng.lng();
    setLat(clickedLat);
    setLng(clickedLng);
    if (window.google && window.google.maps) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat: clickedLat, lng: clickedLng } }, (results, status) => {
        if (status === 'OK' && results[0]) {
          setAddress(results[0].formatted_address);
        } else {
          console.error('Geocoding failed on click:', status);
          if (status === 'REQUEST_DENIED') console.error('Geocoding blocked! Please enable "Geocoding API" in your Google Cloud Console.');
        }
      });
    }
  }, []);

  const onPlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry) {
        setAddress(place.formatted_address || '');
        setLat(place.geometry.location.lat());
        setLng(place.geometry.location.lng());
      }
    }
  };

 const submitBooking = async () => {
  if (!currentUserId) { setBookingMsg('Error: Renter session expired. Please log in again.'); return; }
  if (bookingMode === 'daily' && (!startDate || !endDate)) { setBookingMsg('Please pick both dates.'); return; }
  if (new Date(endDate) < new Date(startDate)) { setBookingMsg('End date must be after start date.'); return; }
  if (deliveryMode === 'dropoff' && !address.trim()) { setBookingMsg('Please provide a drop-off address or map pin.'); return; }
  if (!vehicle || !vendor) return;

  setIsSubmitting(true);
  setBookingMsg('');
  try {
    const selectedDriverDates = Object.entries(driverDates)
      .filter(([, isSelected]) => isSelected)
      .map(([dateString]) => dateString);

    const res = await fetch(`${API}/api/contracts/book`, {
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
      setBookingMsg(`Payment Secured! Your booking with ${vendor.full_name} is confirmed and the funds are locked.`);
      addToast({ type: 'success', title: 'Booking Confirmed!', message: `Your booking for ${vehicle.make} has been confirmed.`, duration: 7000 });
      setIsSubmitting(false);
      return;
    }

    const intentRes = await fetch(`${API}/api/payments/create-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: data.booking._id, amount: data.booking.total_price, receipt_email: renterEmail })
    });
    const intentData = await intentRes.json();
    if (!intentRes.ok) throw new Error(intentData.error || 'Could not initiate payment.');

    setPendingBooking(data.booking);
    setClientSecret(intentData.clientSecret);
    setShowCardModal(true);
    setIsSubmitting(false);
  } catch (e) {
    setBookingMsg(`${e.message}`);
    setIsSubmitting(false);
  }
};

  const handleCardPaymentSuccess = async (paymentIntentId) => {
  try {
    const res = await fetch(`${API}/api/contracts/${pendingBooking._id}/mark-paid`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentIntentId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Could not confirm payment.');

    const doc = generateBookingSlip({ booking: data.booking, vehicle, vendor, renterName: currentUserName, paymentMethod: 'card', paymentStatus: 'paid' });
    setSlipDoc(doc);
    setShowCardModal(false);
    setBookingComplete(true);
    setAccountCredit(prev => prev - (data.booking.credit_applied || 0));
    setBookingMsg(`Payment Secured! Your booking with ${vendor.full_name} is confirmed and the funds are locked.`);
  } catch (e) {
    setBookingMsg(`${e.message}`);
    setShowCardModal(false);
  }
};

 if (loading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={36}/></div>;
}

if (!vehicle) {
    return <div className="p-8 text-center text-slate-500">Could not load vehicle data. <button onClick={() => navigate('/renter-dashboard')} className="text-blue-600 hover:underline font-bold ml-2">Go back</button></div>;
}

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 md:px-8">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <div className="max-w-6xl mx-auto">
        <button onClick={() => navigate('/renter-dashboard', { state: { restoreVendor: vendor } })} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-bold mb-6 transition">
          <ArrowLeft size={16} /> Back to Vendor
        </button>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-2/3 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <div className="h-[400px] bg-gray-100 rounded-2xl overflow-hidden mb-4">
                {vehicle.photos?.[activePhoto] && (
                  <img src={vehicle.photos[activePhoto].startsWith('http') ? vehicle.photos[activePhoto] : `${API}/${vehicle.photos[activePhoto].replace(/\\/g, '/')}`} alt={vehicle.make} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {(vehicle.photos || []).map((p, idx) => (
                  <button key={idx} onClick={() => setActivePhoto(idx)} className={`shrink-0 w-32 h-20 rounded-xl overflow-hidden border-2 transition ${activePhoto === idx ? 'border-blue-600' : 'border-transparent opacity-70 hover:opacity-100'}`}>
                    <img src={p.startsWith('http') ? p : `${API}/${p.replace(/\\/g, '/')}`} alt="thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-6">
                <div>
                  <h1 className="text-3xl font-black text-slate-800 tracking-tight">{vehicle.make}</h1>
                  <p className="text-slate-500 mt-1 flex items-center gap-2"><MapPin size={15}/> {vendor?.full_name || 'Showroom'}</p>
                </div>
                <div className="text-right">
                  {bookingMode === 'daily' ? (
                    <><p className="text-3xl font-black text-blue-600">Rs. {parseInt(vehicle.price_per_day || 0).toLocaleString()}</p><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Per Day</p></>
                  ) : (
                    <><p className="text-3xl font-black text-blue-600">Rs. {parseInt(vehicle.hourly_rate || 0).toLocaleString()}</p><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Per Hour</p></>
                  )}
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Info size={18} className="text-blue-500"/> Vehicle Specifications</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><p className="text-slate-400 text-xs font-bold mb-1">Model Year</p><p className="font-semibold text-slate-800">{vehicle.model_year}</p></div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><p className="text-slate-400 text-xs font-bold mb-1">Category</p><p className="font-semibold text-slate-800 capitalize">{vehicle.category}</p></div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><p className="text-slate-400 text-xs font-bold mb-1">Registration</p><p className="font-semibold text-slate-800">{vehicle.registration_no}</p></div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><p className="text-slate-400 text-xs font-bold mb-1">Tax Status</p><p className="font-semibold text-slate-800">{vehicle.tax_payment}</p></div>
              </div>
            </div>
          </div>

          <div className="lg:w-1/3">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xl sticky top-24">
              <h2 className="text-xl font-black text-slate-800 mb-6">Reservation Setup</h2>
                    {bookingMsg && <div className={`mb-4 p-3 rounded-xl text-sm font-semibold ${bookingMsg.includes('confirmed') || bookingMsg.includes('successful') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>{bookingMsg}</div>}
              {vehicle.is_available === false || vehicle.status !== 'active' ? (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl font-bold text-center flex flex-col items-center gap-2"><AlertCircle size={24}/> Unavailable or Booked.</div>
              ) : (
                <div className="space-y-6">
{!bookingComplete && (<>
<div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Start Date</label><input type="date" min={getTodayString()} value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></div>
                    {bookingMode === 'daily' ? (
                      <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">End Date</label><input type="date" min={startDate || getTodayString()} value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></div>
                    ) : (
                      <div className="text-center pt-3 text-xs text-slate-400">Hourly rentals are for a single day.</div>
                    )}
                  </div>
                  <div>
                    {bookedDates.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-1">
                      <p className="text-xs font-bold text-red-600 mb-1.5">⚠️ Already Booked Dates:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {bookedDates.map(d => (
                          <span key={d} className="text-[11px] bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">
                            {new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Booking Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setBookingMode('daily')} className={`py-3 rounded-xl border-2 text-xs font-bold transition ${bookingMode === 'daily' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}>Daily Rental</button>
                      <button onClick={() => setBookingMode('hourly')} disabled={!vehicle?.allow_hourly_rentals} className={`relative group py-3 rounded-xl border-2 text-xs font-bold transition ${bookingMode === 'hourly' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400 hover:bg-slate-50'} disabled:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed`}>
                        Hourly Rental
                        {!vehicle?.allow_hourly_rentals && <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-slate-700 text-white text-[10px] rounded-md opacity-0 group-hover:opacity-100 transition-opacity">Not available for this vehicle</span>}
                      </button>
                    </div>
                  </div>
                  {bookingMode === 'hourly' && (
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Start Time</label>
                          <input type="time" value={startTime} min={vehicle.operating_hours_start || '00:00'} max={vehicle.operating_hours_end || '23:59'} onChange={e => setStartTime(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase block mb-1">End Time</label>
                          <input type="time" value={endTime} min={startTime} max={vehicle.operating_hours_end || '23:59'} onChange={e => setEndTime(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-500" />
                        </div>
                      </div>
                      {rentalHours > 0 && <p className="text-center text-xs text-slate-500">Total Duration: <span className="font-bold">{rentalHours} {rentalHours === 1 ? 'hour' : 'hours'}</span></p>}
                      {rentalHours > 0 && rentalHours < vehicle.minimum_hours && <p className="text-center text-xs text-red-500 font-semibold">Minimum booking is {vehicle.minimum_hours} hours.</p>}
                      <p className="text-[11px] text-slate-400 mt-1.5">Operating Hours: <span className="font-semibold text-slate-500">{vehicle.operating_hours_start || '00:00'} — {vehicle.operating_hours_end || '23:59'}</span></p>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Fulfillment Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setDeliveryMode('pickup')} className={`flex items-center justify-center gap-1.5 py-3 rounded-xl border-2 text-xs font-bold transition ${deliveryMode === 'pickup' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}><Store size={14}/> Showroom</button>
                      <button onClick={() => setDeliveryMode('dropoff')} className={`flex items-center justify-center gap-1.5 py-3 rounded-xl border-2 text-xs font-bold transition ${deliveryMode === 'dropoff' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}><Navigation size={14}/> Drop-off</button>
                    </div>
                  </div>
                  {dailyDriverPrice > 0 && (
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Driver Option</label>
                      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-3">
                        <div className="flex items-center gap-2">
                          <UserCheck size={16} className="text-emerald-600"/>
                          <span className="font-bold text-sm text-slate-700">Add a Professional Driver</span>
                          <span className="text-xs text-slate-500">(Rs. {dailyDriverPrice.toLocaleString()}/day)</span>
                        </div>
                        <button type="button" onClick={() => setWithDriver(!withDriver)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${withDriver ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${withDriver ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                      {withDriver && totalDays > 0 && (
                        <div className="mt-3 space-y-2 max-h-40 overflow-y-auto bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <p className="text-xs font-bold text-slate-500 mb-2">Select days for the driver:</p>
                          {rentalDates.map(date => {
                            const dateString = date.toISOString().split('T')[0];
                            return (
                              <label key={dateString} className="flex items-center justify-between bg-white p-2 rounded-lg cursor-pointer hover:bg-slate-100 shadow-sm">
                                <span className="text-sm text-slate-600">{date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                <input type="checkbox" checked={driverDates[dateString] || false}
                                  onChange={() => setDriverDates(prev => ({ ...prev, [dateString]: !prev[dateString] }))}
                                  className="h-5 w-5 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                                />
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Prepaid Fuel</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[0, 1000, 2000, 3000, 4000, 5000].map(amount => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => setFuelAmount(amount)}
                          className={`py-2 rounded-xl border-2 text-xs font-bold transition ${fuelAmount === amount ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                        >
                          {amount === 0 ? 'No Fuel' : `Rs. ${amount / 1000}k`}
                        </button>
                      ))}
                    </div>
                  </div>
                  {deliveryMode === 'dropoff' && (
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Drop-off Location</label>
                      {isLoaded ? (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Autocomplete onLoad={ref => autocompleteRef.current = ref} onPlaceChanged={onPlaceChanged}>
                                <input type="text" placeholder="Search address..." value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500" />
                              </Autocomplete>
                            </div>
                            <button type="button" onClick={handleLocateMe} className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 rounded-xl transition flex items-center justify-center shrink-0" title="Use current location"><MapPin size={18} /></button>
                          </div>
                          <div className="border border-slate-200 rounded-xl overflow-hidden"><GoogleMap mapContainerStyle={mapContainerStyle} center={{ lat, lng }} zoom={14} onClick={onMapClick} options={{ mapTypeControl: false, streetViewControl: false }}><MarkerF position={{ lat: Number(lat), lng: Number(lng) }} draggable={true} onDragEnd={onMapClick} /></GoogleMap></div>
                        </div>
                      ) : <div className="h-32 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs">Loading Map...</div>}
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Payment</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => setPaymentMethod('cash')} className={`flex items-center justify-center gap-1.5 py-3 rounded-xl border-2 text-xs font-bold transition ${paymentMethod === 'cash' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}><Banknote size={14}/> Cash</button>
                      <button onClick={() => setPaymentMethod('card')} className={`flex items-center justify-center gap-1.5 py-3 rounded-xl border-2 text-xs font-bold transition ${paymentMethod === 'card' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}><CreditCard size={14}/> Card</button>
                    </div>
                  </div>
                  {accountCredit > 0 && (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <div className="flex items-center gap-2">
                        <Wallet size={16} className="text-emerald-600"/>
                        <span className="font-bold text-sm text-emerald-800">Use Account Credit</span>
                        <span className="text-xs text-emerald-600">(Rs. {accountCredit.toLocaleString()} available)</span>
                      </div>
                      <button type="button" onClick={() => setUseCredit(!useCredit)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useCredit ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useCredit ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  )}
                  </>)}
<div className="border-t border-slate-100 pt-5">
                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          {bookingMode === 'daily' 
                            ? `Vehicle rental (${totalDays} ${totalDays === 1 ? 'day' : 'days'})`
                            : `Vehicle rental (${rentalHours} ${rentalHours === 1 ? 'hour' : 'hours'})`
                          }
                        </span>
                        <span className="font-semibold text-slate-700">Rs. {vehicleCost.toLocaleString()}</span>
                      </div>
                      {/* Driver option only available for daily rentals for now */}
                      {bookingMode === 'daily' && withDriver && driverCost > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Driver ({totalDriverDays} {totalDriverDays === 1 ? 'day' : 'days'})</span>
                          <span className="font-semibold text-slate-700">Rs. {driverCost.toLocaleString()}</span>
                        </div>
                      )}
                      {fuelAmount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Prepaid Fuel</span>
                          <span className="font-semibold text-slate-700">Rs. {fuelAmount.toLocaleString()}</span>
                        </div>
                      )}
                      {creditToApply > 0 && (
                        <div className="flex justify-between">
                          <span className="text-emerald-600">Account Credit Applied</span>
                          <span className="font-semibold text-emerald-600">- Rs. {creditToApply.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center mb-4 border-t border-slate-200 pt-4">
                      <span className="text-sm font-semibold text-slate-600">{creditToApply > 0 ? 'Amount Payable' : 'Grand Total'}</span>
                      <span className="text-xl font-black text-slate-800">Rs. {payableAmount.toLocaleString()}</span>
                    </div>

                    {bookingComplete ? (
                      <div className="space-y-2">
                        {slipDoc && (
                          <button onClick={() => slipDoc.save('NetDrive-Booking-Slip.pdf')} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition">
                            <Download size={16}/> Download Receipt
                          </button>
                        )}
                        <button onClick={() => navigate('/renter-dashboard')} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-sm transition">
                          Continue to Dashboard
                        </button>
                      </div>
                    ) : (
                      <>
                        {bookingMode === 'daily' && totalDays < 2 && (
                          <div className="text-center text-xs text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-100">
                            Daily rentals must be for a minimum of 2 days. For single-day use, please select the 'Hourly' option.
                          </div>
                        )}
                        <button onClick={submitBooking} disabled={isSubmitting || loading || (bookingMode === 'daily' && totalDays < 2) || (bookingMode === 'hourly' && (!rentalHours || rentalHours < (vehicle.minimum_hours || 1)))} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow transition-all">{isSubmitting ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Confirm Reservation'}</button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {showCardModal && (
  <CardPaymentModal
    clientSecret={clientSecret}
    amount={pendingBooking?.total_price || finalTotalPrice}
    onSuccess={handleCardPaymentSuccess}
    onClose={() => { setShowCardModal(false); setBookingMsg('Booking created - payment was not completed, it remains pending'); }}
  />
)}
    
    </div>
  );
}






