import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GoogleMap,
  useJsApiLoader,
  MarkerF,
  Autocomplete
} from '@react-google-maps/api';

import {
  Upload,
  Loader2,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Car, // This was the problematic import
  MapPin,
  FileText
} from 'lucide-react';

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '12px'
};

const defaultCenter = {
  lat: 24.8607,
  lng: 67.0011
};

const ListVehicle = () => {
  const navigate = useNavigate();

  const libraries = useMemo(() => ['places'], []);

  const [formData, setFormData] = useState({
    make: '',
    model_year: '',
    registration_no: '',
    registration_date: '',
    owner_name: '',
    tax_payment: '',
    address: '',
    price_per_day: '',
    category: 'sedan',
    driver_price_per_day: '',
    lat: defaultCenter.lat,
    lng: defaultCenter.lng,
    allow_hourly_rentals: true,
    hourly_rate: '',
    minimum_hours: '',
    operating_hours_start: '09:00',
    operating_hours_end: '21:00'
  });

  const [photos, setPhotos] = useState([]);
  const [documentFront, setDocumentFront] = useState(null);
  const [documentBack, setDocumentBack] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const autocompleteRef = useRef(null);

  // Google Maps Loader
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries
  });

  const vendorId = localStorage.getItem('userId');
  const vendorEmail = localStorage.getItem('userEmail');

  useEffect(() => {
    if (isLoaded && !formData.address) {
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          const currentLat = pos.coords.latitude;
          const currentLng = pos.coords.longitude;
          setFormData((prev) => ({ ...prev, lat: currentLat, lng: currentLng }));
          
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat: currentLat, lng: currentLng } }, (results, status) => {
            if (status === 'OK' && results[0]) {
              setFormData((prev) => ({ ...prev, address: results[0].formatted_address }));
            } else {
              console.error('Geocoding failed on load:', status);
              if (status === 'REQUEST_DENIED') console.error('Geocoding blocked! Please enable "Geocoding API" in your Google Cloud Console.');
              setFormData((prev) => ({ ...prev, address: `📍 Lat: ${currentLat.toFixed(4)}, Lng: ${currentLng.toFixed(4)}` }));
            }
          });
        },
        (err) => { console.warn("Geolocation failed on load:", err); },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
      );
    }
  }, [isLoaded]);

  const handleLocateMe = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const currentLat = pos.coords.latitude;
        const currentLng = pos.coords.longitude;
        setFormData((prev) => ({ ...prev, lat: currentLat, lng: currentLng }));
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat: currentLat, lng: currentLng } }, (results, status) => {
          if (status === 'OK' && results[0]) {
            setFormData((prev) => ({ ...prev, address: results[0].formatted_address }));
          } else {
            if (status === 'REQUEST_DENIED') console.error('Geocoding blocked! Please enable "Geocoding API" in your Google Cloud Console.');
            setFormData((prev) => ({ ...prev, address: `📍 Lat: ${currentLat.toFixed(4)}, Lng: ${currentLng.toFixed(4)}` }));
          }
        });
      },
      (err) => {
        console.warn("Geolocation failed:", err);
        alert("Could not get location: " + err.message);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
    );
  };

  const update = (field) => (e) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  // Map click with integrated Reverse Geocoding Fix
  const onMapClick = useCallback((e) => {
    const clickedLat = e.latLng.lat();
    const clickedLng = e.latLng.lng();

    setFormData((prev) => ({
      ...prev,
      lat: clickedLat,
      lng: clickedLng
    }));

    // Trigger Google Maps Reverse Geocoding to automatically populate address text field
    if (window.google && window.google.maps) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat: clickedLat, lng: clickedLng } }, (results, status) => {
        if (status === 'OK' && results[0]) {
          setFormData((prev) => ({
            ...prev,
            address: results[0].formatted_address
          }));
        } else {
          console.error('Geocoding failed on click:', status);
          if (status === 'REQUEST_DENIED') console.error('Geocoding blocked! Please enable "Geocoding API" in your Google Cloud Console.');
          setFormData((prev) => ({
            ...prev,
            address: `📍 Lat: ${clickedLat.toFixed(4)}, Lng: ${clickedLng.toFixed(4)}`
          }));
        }
      });
    }
  }, []);

  // Place Search
  const onPlaceChanged = () => {
    if (autocompleteRef.current !== null) {
      const place = autocompleteRef.current.getPlace();

      if (place && place.geometry) {
        setFormData((prev) => ({
          ...prev,
          address: place.formatted_address || '',
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng()
        }));
      }
    }
  };

  // Submit Form
  
    const handleSubmit = async (e) => {
      e.preventDefault();

      if (!documentFront || !documentBack || photos.length === 0) {
        setResult({ type: 'error', message: 'Field empty: Please upload all required vehicle photos and documents.' });
        return;
      }
      if (!formData.address || !formData.operating_hours_start || !formData.operating_hours_end) {
        setResult({ type: 'error', message: 'Field empty: Please fill out your address and operating hours.' });
        return;
      }


    setLoading(true);
    setResult(null);

    const data = new FormData();

    Object.entries(formData).forEach(([k, v]) => {
      data.append(k, v);
    });

    data.append('vendor_id', vendorId);
    data.append('vendor_email', vendorEmail);

    photos.forEach((p) => data.append('photos', p));
    if (documentFront) data.append('document_front', documentFront);
    if (documentBack) data.append('document_back', documentBack);

    try {
      const res = await fetch(
        'http://localhost:5000/api/vehicles/list',
        {
          method: 'POST',
          body: data
        }
      );

      const json = await res.json();

      if (res.ok) {
        setResult({
          success: true,
          msg: json.msg
        });
      } else {
        setResult({
          success: false,
          msg: json.msg,
          errors: json.errors
        });
      }
    } catch (err) {
      setResult({
        success: false,
        msg: 'Server not responding. Is backend running?'
      });
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-slate-800 text-sm outline-none focus:ring-2 focus:ring-emerald-400 transition';

  const labelClass =
    'text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block';

  if (loadError) {
    return (
      <div className="p-10 text-center text-red-500">
        Error loading Google Maps API
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        <button
          onClick={() => navigate('/vendor-dashboard')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm mb-6 transition"
        >
          <ArrowLeft size={15} />
          Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Car size={20} className="text-emerald-600" />
            </div>

            <div>
              <h1 className="text-xl font-bold text-slate-800">
                List a Vehicle
              </h1>
            </div>
          </div>

          {/* Result */}
          {result && (
            <div
              className={`mb-6 p-4 rounded-xl border ${
                result.success
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {result.success ? (
                  <CheckCircle size={16} className="text-emerald-600" />
                ) : (
                  <AlertCircle size={16} className="text-red-500" />
                )}

                <p
                  className={`text-sm font-semibold ${
                    result.success
                      ? 'text-emerald-700'
                      : 'text-red-600'
                  }`}
                >
                  {result.msg}
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Make + Year */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Make / Brand</label>

                <input
                  type="text"
                  required
                  placeholder="e.g. Suzuki"
                  className={inputClass}
                  value={formData.make}
                  onChange={update('make')}
                />
              </div>

              <div>
                <label className={labelClass}>Model Year</label>

                <input
                  type="text"
                  required
                  placeholder="e.g. 2007"
                  className={inputClass}
                  value={formData.model_year}
                  onChange={update('model_year')}
                />
              </div>
            </div>

            {/* Registration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Registration No.</label>

                <input
                  type="text"
                  required
                  placeholder="e.g. ANT-305"
                  className={inputClass}
                  value={formData.registration_no}
                  onChange={update('registration_no')}
                />
              </div>

              <div>
                <label className={labelClass}>Registration Date</label>

                <input
                  type="date"
                  required
                  className={inputClass}
                  value={formData.registration_date}
                  onChange={update('registration_date')}
                />
              </div>
            </div>

            {/* Owner */}
            <div>
              <label className={labelClass}>Owner Name</label>

              <input
                type="text"
                required
                placeholder="Full name"
                className={inputClass}
                value={formData.owner_name}
                onChange={update('owner_name')}
              />
            </div>

            {/* Tax Payment */}
            <div>
              <label className={labelClass}>Tax Payment Status</label>
              <select
                className={inputClass}
                value={formData.tax_payment}
                onChange={update('tax_payment')}
                required
              >
                <option value="" disabled>Select tax status</option>
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid</option>
                <option value="Token Tax Paid">Token Tax Paid</option>
                <option value="Life Time Token Paid">Life Time Token Paid</option>
                <option value="Not Applicable">Not Applicable</option>
              </select>
            </div>

            {/* Address + Maps */}
            <div>
              <label className={labelClass}>
                Vehicle Location / Address (Pins automatically sync text)
              </label>

              {isLoaded ? (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Autocomplete
                        onLoad={(autocomplete) => { autocompleteRef.current = autocomplete; }}
                        onPlaceChanged={onPlaceChanged}
                      >
                        <input type="text" placeholder="Search or pin on map below" className={inputClass} value={formData.address} onChange={update('address')} />
                      </Autocomplete>
                    </div>
                    <button type="button" onClick={handleLocateMe} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 rounded-xl transition flex items-center justify-center shrink-0" title="Use current location">
                      <MapPin size={18} />
                    </button>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">

                    <GoogleMap
                      mapContainerStyle={mapContainerStyle}
                      center={{
                        lat: formData.lat,
                        lng: formData.lng
                      }}
                      zoom={14}
                      onClick={onMapClick}
                      options={{
                        mapTypeControl: false,
                        streetViewControl: false,
                        fullscreenControl: false
                      }}
                    >
                    <MarkerF
                        position={{
                        lat: Number(formData.lat),
                        lng: Number(formData.lng)
                        }}
                        draggable={true}
                        onDragEnd={onMapClick}
                      />
                    </GoogleMap>

                  </div>
                </div>
              ) : (
                <div className="h-40 bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-slate-400">
                  Loading Maps...
                </div>
              )}
            </div>

            {/* Price + Category */}
            <div className="grid grid-cols-2 gap-4">

              <div>
                <label className={labelClass}>
                  Price per Day (Rs.)
                </label>

                <input
                  type="number"
                  required
                  placeholder="5000"
                  className={inputClass}
                  value={formData.price_per_day}
                  onChange={update('price_per_day')}
                />
              </div>

              <div>
                <label className={labelClass}>Category</label>

                <select
                  className={inputClass}
                  value={formData.category}
                  onChange={update('category')}
                >
                  <option value="sedan">Sedan</option>
                  <option value="suv">SUV</option>
                  <option value="luxury">Luxury</option>
                  <option value="sport">Sport</option>
                  <option value="electric">Electric</option>
                </select>
              </div>

            </div>
            
            {/* Hourly Rentals Toggle */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="font-bold text-sm text-slate-700">Allow Hourly Rentals</p>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, allow_hourly_rentals: !prev.allow_hourly_rentals }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${formData.allow_hourly_rentals ? 'bg-emerald-500' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${formData.allow_hourly_rentals ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Conditional Hourly Settings */}
            {formData.allow_hourly_rentals && (
              <div className="space-y-5 p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                {/* Operating Hours */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Operating Hours Start</label>
                    <input type="time" className={inputClass} value={formData.operating_hours_start} onChange={update('operating_hours_start')} />
                  </div>
                  <div>
                    <label className={labelClass}>Operating Hours End</label>
                    <input type="time" className={inputClass} value={formData.operating_hours_end} onChange={update('operating_hours_end')} />
                  </div>
                </div>
                
                {/* Hourly Rate */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Hourly Rate (Rs.)</label>
                    <input
                      type="number"
                      placeholder="e.g. 800"
                      className={inputClass}
                  value={formData.hourly_rate}
                  onChange={update('hourly_rate')}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Minimum Hours</label>
                    <input
                      type="number"
                      placeholder="e.g. 2"
                      className={inputClass}
                      value={formData.minimum_hours}
                      onChange={update('minimum_hours')}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Driver Price */}
            <div>
              <div>
                <label className={labelClass}>
                  Driver Price per Day (Rs.) - Optional
                </label>
                <input
                  type="number"
                  placeholder="e.g. 800"
                  className={inputClass}
                  value={formData.driver_price_per_day}
                  onChange={update('driver_price_per_day')}
                />
              </div>
            </div>

            {/* Photos */}
            <div>
              <label className={labelClass}>
                Vehicle Photos (up to 6)
              </label>

              <label className="flex items-center gap-3 p-4 border-2 border-dashed rounded-xl cursor-pointer transition border-slate-200 hover:border-slate-300">

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) =>
                    setPhotos(
                      Array.from(e.target.files).slice(0, 6)
                    )
                  }
                />

                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Upload size={16} className="text-slate-400" />
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-600">
                    {photos.length > 0
                      ? `${photos.length} photo(s) selected`
                      : 'Click to upload photos'}
                  </p>

                  <p className="text-xs text-slate-400">
                    JPG, PNG up to 10MB
                  </p>
                </div>

              </label>
            </div>

            {/* Documents */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Document Front</label>
                <label className={`flex items-center gap-3 p-4 border-2 border-dashed rounded-xl cursor-pointer transition ${documentFront ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setDocumentFront(e.target.files[0])} />
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-slate-400" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-slate-600 truncate">{documentFront ? documentFront.name : 'Upload Front'}</p>
                  </div>
                </label>
              </div>

              <div>
                <label className={labelClass}>Document Back</label>
                <label className={`flex items-center gap-3 p-4 border-2 border-dashed rounded-xl cursor-pointer transition ${documentBack ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setDocumentBack(e.target.files[0])} />
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-slate-400" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-medium text-slate-600 truncate">{documentBack ? documentBack.name : 'Upload Back'}</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition flex justify-center items-center gap-2 disabled:bg-emerald-300 shadow-lg shadow-emerald-200"
            >
              {loading ? (
                <>
                  <Loader2
                    className="animate-spin"
                    size={18}
                  />
                  Saving...
                </>
              ) : (
                'Submit & List Vehicle'
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default ListVehicle;

