import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import { ShieldCheck, Navigation } from 'lucide-react';

const API = 'http://localhost:5000';

export default function LiveTracker() {
  const { bookingId } = useParams();
  const [trackingData, setTrackingData] = useState(null);
  const [error, setError] = useState('');

  const mapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
  const libraries = useMemo(() => ['places'], []);
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: mapsApiKey,
    disabled: !mapsApiKey,
    libraries
  });

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const res = await fetch(`${API}/api/contracts/track/${bookingId}`);
        const data = await res.json();
        
        if (res.ok) {
          setTrackingData(data.tracking_data);
        } else {
          setError(data.error || 'Tracking link invalid.');
        }
      } catch (e) {
        setError('Failed to connect to the server.');
      }
    };

    fetchLocation(); // Fetch immediately
    const iv = setInterval(fetchLocation, 5000); // Poll every 5 seconds
    return () => clearInterval(iv);
  }, [bookingId]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-sm w-full border border-slate-100">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Link Expired or Invalid</h2>
          <p className="text-sm text-slate-500 mb-6">{error}</p>
          <Link to="/" className="inline-block px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl text-sm transition hover:bg-slate-800">Return Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white py-4 px-6 flex items-center justify-between z-10 shadow-md">
        <h1 className="text-lg font-black tracking-tight">NETDRIVE<span className="text-blue-500">.</span></h1>
        <div className="flex items-center gap-2 text-xs font-bold bg-slate-800 px-3 py-1.5 rounded-full">
          <ShieldCheck size={14} className="text-blue-400" /> Public Secure Tracker
        </div>
      </header>

      <div className="flex-1 flex flex-col relative">
        {isLoaded && trackingData ? (
          <GoogleMap 
            mapContainerStyle={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }} 
            center={{ lat: Number(trackingData.current_lat) || 24.8607, lng: Number(trackingData.current_lng) || 67.0011 }} 
            zoom={15} 
            options={{ disableDefaultUI: false, mapTypeControl: false, streetViewControl: false }}
          >
            {/* Car's Current Location */}
            <MarkerF position={{ lat: Number(trackingData.current_lat), lng: Number(trackingData.current_lng) }} />
          </GoogleMap>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400 font-medium">Connecting to GPS Satellite...</div>
        )}

        {/* Overlay Card */}
        {trackingData && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-11/12 max-w-md bg-white rounded-2xl shadow-2xl p-5 border border-slate-100 z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800">{trackingData.vehicle?.make || 'Vehicle Tracking'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Reg: {trackingData.vehicle?.registration_no || 'N/A'}</p>
              </div>
              {trackingData.tracking_active ? (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/> Live
                </span>
              ) : (
                <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold uppercase tracking-wider">Offline</span>
              )}
            </div>
            
            <div className="bg-slate-50 rounded-xl p-3 flex items-start gap-3">
              <Navigation size={18} className="text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-slate-700 mb-0.5">Current Coordinates</p>
                <p className="text-xs text-slate-500 font-mono">{trackingData.current_lat?.toFixed(5)}, {trackingData.current_lng?.toFixed(5)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
