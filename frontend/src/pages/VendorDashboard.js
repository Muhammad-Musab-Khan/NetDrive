import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LogOut, Plus, DollarSign, TrendingUp, Car, Calendar, Package, Navigation, Send, MessageSquare, X, Star, MapPin, UserCheck, Fuel, ChevronLeft, ChevronRight, Trash2, Upload, Info, Clock, AlertCircle } from 'lucide-react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import ReportIssueModal from './ReportIssueModal';
import UserDisputesList from './UserDisputesList';
import { ToastContainer, useToast, useBookingAlerts } from './BookingAlerts';

const API = 'http://localhost:5000';

const navItems = [ // Keep this at the top of the file
  { id: 'overview', label: 'Overview',    emoji: '📊' },
  { id: 'vehicles', label: 'My Vehicles', emoji: '🚗' },
  { id: 'bookings', label: 'Bookings',    emoji: '👁️' },
  { id: 'chats',    label: 'Messages',    emoji: '💬' },
  { id: 'earnings', label: 'Earnings',    emoji: '💰' },
  { id: 'reviews',  label: 'My Reviews',  emoji: '⭐' },
  { id: 'disputes', label: 'Disputes',    emoji: '🛡️' },
  { id: 'profile',  label: 'My Profile',  emoji: '👤' },
];

export default function VendorDashboard() {
  const navigate   = useNavigate();
  const chatEndRef = useRef(null);

  const vendorId   = localStorage.getItem('userId') || '';
  const vendorName = localStorage.getItem('userName') || 'Vendor';
  const firstName  = vendorName.split(' ')[0];

  const [activeTab,     setActiveTab]     = useState('overview');
  const [myVehicles,    setMyVehicles]    = useState([]);
  const [bookings,      setBookings]      = useState([]);
  const [showRenterDetailsModal, setShowRenterDetailsModal] = useState(false);
  const [selectedRenterForModal, setSelectedRenterForModal] = useState(null);
  const [renterTransactionsInModal, setRenterTransactionsInModal] = useState([]);
  const [chatThreads,   setChatThreads]   = useState([]);
  const [activeChat,    setActiveChat]    = useState(null);
  const [chatMessages,  setChatMessages]  = useState([]);
  const [chatInput,     setChatInput]     = useState('');
  const [startingTrip,  setStartingTrip]  = useState(null);
  const [reviewModal,   setReviewModal]   = useState(null);
  const [reviewData,    setReviewData]    = useState({ rating: 5, comment: '' });
  const [searchTerm,    setSearchTerm]    = useState('');
  const [renterTransactionsLoading, setRenterTransactionsLoading] = useState(false);
  const [myReviews,     setMyReviews]     = useState([]);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineBookingId, setDeclineBookingId] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [disputeModal, setDisputeModal] = useState(null); // State for dispute modal

  // ── Real-time booking alert system ──────────────────────────────
  const { toasts, addToast, dismissToast } = useToast();
  const unreadChatsCount = chatThreads.filter(t => t.vendor_unread).length;
  useBookingAlerts(bookings, addToast);

  // --- Vehicle Detail Modal State ---
  const [vehicleModal, setVehicleModal] = useState(null); // holds the vehicle object
  const [vehicleModalPhoto, setVehicleModalPhoto] = useState(0);
  const [vehicleModalSaving, setVehicleModalSaving] = useState(false);
  const [driverEnabled, setDriverEnabled] = useState(false);
  const [vehicleModalMsg, setVehicleModalMsg] = useState('');

  // --- Store Hours State ---
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [operatingHours, setOperatingHours] = useState({ start: '09:00', end: '21:00' });
  const [hoursSaving, setHoursSaving] = useState(false);
  const [hoursMsg, setHoursMsg] = useState('');
  const photoInputRef = useRef(null);

  // --- Profile State ---
  const [vendorProfile, setVendorProfile] = useState(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const profilePhotoInputRef = useRef(null);

  const mapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
  const libraries = useMemo(() => ['places'], []);
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: mapsApiKey,
    disabled: !mapsApiKey,
    libraries
  });

  const fetchVehicles = useCallback(async () => {
    if (!vendorId) return;
    try {
      const res  = await fetch(`${API}/api/vehicles/vendor/${vendorId}`);
      const data = await res.json();
      setMyVehicles(data.vehicles || []);
    } catch (e) { console.error(e); }
  }, [vendorId]);

  const fetchBookings = useCallback(async () => {
    if (!vendorId) return;
    try {
      const res  = await fetch(`${API}/api/contracts/vendor/${vendorId}?t=${Date.now()}`);
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (e) { console.error(e); }
  }, [vendorId]);

  const fetchChatThreads = useCallback(async () => {
    if (!vendorId) return;
    try {
      const res  = await fetch(`${API}/api/messages/my-chats/${vendorId}`);
      const data = await res.json();
      setChatThreads(data.chats || []);
    } catch (e) { console.error(e); }
  }, [vendorId]);

  const fetchChatMessages = useCallback(async (renterId) => {
    if (!vendorId || !renterId) return;
    try {
      const res  = await fetch(`${API}/api/messages?userA=${vendorId}&userB=${renterId}&markReadFor=${vendorId}`);
      const data = await res.json();
      setChatMessages(data.messages || []);
    } catch (e) { console.error(e); }
  }, [vendorId]);

  const fetchMyReviews = useCallback(async () => {
    if (!vendorId) return;
    try {
      const res = await fetch(`${API}/api/reviews/user/${vendorId}`);
      const data = await res.json();
      setMyReviews(data.reviews || []);
    } catch (e) { console.error(e); }
  }, [vendorId]);

  const fetchVendorProfile = useCallback(async () => {
    if (!vendorId) return;
    try {
      const res = await fetch(`${API}/api/auth/user/${vendorId}`);
      const data = await res.json();
      setVendorProfile(data.user);
    } catch (e) { console.error(e); }
  }, [vendorId]);

  useEffect(() => {
    fetchVehicles();
    fetchBookings();
    fetchChatThreads();
    fetchMyReviews();
    fetchVendorProfile();
  }, [fetchVehicles, fetchBookings, fetchChatThreads, fetchMyReviews, fetchVendorProfile]);

  // ── Poll bookings every 10s for real-time alerts ────────────────
  useEffect(() => {
    const iv1 = setInterval(fetchBookings, 3000);
    const iv2 = setInterval(fetchChatThreads, 5000); // Poll threads every 5s
    return () => { clearInterval(iv1); clearInterval(iv2); };
  }, [fetchBookings, fetchChatThreads]);

  useEffect(() => {
    if (!activeChat) return;
    fetchChatMessages(activeChat.renter_id);
    const iv = setInterval(() => fetchChatMessages(activeChat.renter_id), 3000);
    return () => clearInterval(iv);
  }, [activeChat, fetchChatMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Real-time GPS Broadcaster: Listens for any active deliveries and transmits the Vendor's true location
  useEffect(() => {
    const activeDeliveries = bookings.filter(b => b.tracking_active && b.status === 'confirmed');
    if (activeDeliveries.length === 0) return;

    const sendLocation = () => {
      navigator.geolocation?.getCurrentPosition(
        async (pos) => {
          for (const b of activeDeliveries) {
            try {
              await fetch(`${API}/api/contracts/${b._id}/update-location`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude })
              });
            } catch (e) {}
          }
        },
        (err) => console.warn('Vendor GPS Error:', err),
        { enableHighAccuracy: true }
      );
    };

    sendLocation(); // Trigger immediately upon starting the trip
    const iv = setInterval(sendLocation, 10000); // Poll device GPS every 10 seconds
    return () => clearInterval(iv); // Safely cleans up and turns off GPS when delivered
  }, [bookings]);

  const startTrip = async (bookingId) => {
    setStartingTrip(bookingId);
    try {
      const res  = await fetch(`${API}/api/contracts/${bookingId}/start-tracking`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      alert('✅ Trip tracking started! Renter can now see your live location.');
      fetchBookings();
    } catch (e) {
      alert(`❌ ${e.message}`);
    } finally {
      setStartingTrip(null);
    }
  };

  const handleDeclineBooking = async () => {
    if (!declineReason.trim()) return alert("Please provide a reason.");
    try {
      const res = await fetch(`${API}/api/contracts/${declineBookingId}/decline`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: declineReason })
      });
      if (res.ok) {
        alert('Contract declined successfully.');
        setShowDeclineModal(false);
        setDeclineBookingId(null);
        setDeclineReason('');
        fetchBookings();
        fetchVehicles();
      } else {
        const data = await res.json();
        alert(`❌ ${data.error || 'Failed to decline'}`);
      }
    } catch(e) {
      alert(`❌ ${e.message}`);
    }
  };

  const markDelivered = async (bookingId) => {
    try {
      const res = await fetch(`${API}/api/contracts/${bookingId}/mark-delivered`, { 
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        alert('✅ Car Delivered! Official rental contract has started.');
        fetchBookings();
      } else {
        const data = await res.json();
        alert(`❌ ${data.error || 'Failed to update'}`);
      }
    } catch(e) {
      alert(`❌ ${e.message}`);
    }
  };

  const completeContract = async (bookingId, renterId) => {
    try {
      const res = await fetch(`${API}/api/contracts/${bookingId}/complete`, { 
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        alert('✅ Contract Ended! Vehicle relisted.');
        fetchBookings();
        fetchVehicles();
        setReviewModal({ bookingId, revieweeId: renterId, role: 'vendor' });
      } else {
        const data = await res.json();
        alert(`❌ ${data.error || 'Failed to complete'}`);
      }
    } catch(e) {
      alert(`❌ ${e.message}`);
    }
  };

  const submitReview = async () => {
    try {
      const res = await fetch(`${API}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: reviewModal.bookingId,
          reviewer: vendorId,
          reviewee: reviewModal.revieweeId,
          role: reviewModal.role,
          rating: reviewData.rating,
          comment: reviewData.comment
        })
      });
      const data = await res.json();
      if (!res.ok) { alert(`❌ ${data.error || 'Failed to submit review.'}`); return; }
      setReviewModal(null);
      setReviewData({ rating: 5, comment: '' });
      fetchMyReviews();
      alert('✅ Review submitted!');
    } catch (e) { console.error(e); }
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !activeChat || !vendorId) return;
    try {
      await fetch(`${API}/api/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id:   vendorId,
          sender_name: vendorName,
          sender_role: 'vendor',
          content:     chatInput,
          receiver_id: activeChat.renter_id,
          vendor_name: vendorName,
          renter_name: activeChat.renter_name,
          vendor_email: localStorage.getItem('userEmail') || 'vendor@netdrive.pk',
          renter_email: activeChat.renter_email,
        })
      });
      setChatInput('');
      fetchChatMessages(activeChat.renter_id);
    } catch (e) { console.error(e); }
  };

  // --- Vehicle Detail Modal Handlers ---
  const openVehicleModal = (v) => {
    setVehicleModal({ ...v });
    setVehicleModalPhoto(0);
    setDriverEnabled(v.driver_price_per_day > 0);
    setVehicleModalMsg('');
  };

  const closeVehicleModal = () => {
    setVehicleModal(null);
    setVehicleModalMsg('');
  };

  const handleModalDeletePhoto = (idx) => {
    setVehicleModal(prev => {
      const updated = prev.photos.filter((_, i) => i !== idx);
      const newActive = Math.min(vehicleModalPhoto, updated.length - 1);
      setVehicleModalPhoto(Math.max(0, newActive));
      return { ...prev, photos: updated };
    });
  };

  const handleModalAddPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const current = vehicleModal.photos?.length || 0;
    if (current + files.length > 6) {
      setVehicleModalMsg(`❌ Max 6 photos allowed. You can add ${6 - current} more.`);
      return;
    }
    // Store File objects separately for upload; preview with object URLs
    setVehicleModal(prev => ({
      ...prev,
      photos: [...(prev.photos || []), ...files.map(f => ({ __file: f, __preview: URL.createObjectURL(f) }))],
    }));
    setVehicleModalMsg('');
  };

  const saveVehicleModal = async () => {
    if (!vehicleModal) return;
    setVehicleModalSaving(true);
    setVehicleModalMsg('');
    try {
      const formData = new FormData();
      const existingPhotos = vehicleModal.photos.filter(p => typeof p === 'string');
      existingPhotos.forEach(p => formData.append('existingPhotos', p));

      vehicleModal.photos.filter(p => p?.__file).forEach(p => formData.append('photos', p.__file));

      formData.append('driver_price_per_day', vehicleModal.driver_price_per_day || 0);
      formData.append('with_petrol', vehicleModal.with_petrol ? 'true' : 'false');
      formData.append('hourly_rate', vehicleModal.hourly_rate || 0);
      formData.append('allow_hourly_rentals', vehicleModal.allow_hourly_rentals ? 'true' : 'false');
      formData.append('price_per_day', vehicleModal.price_per_day || 0);
      formData.append('minimum_hours', vehicleModal.minimum_hours || 1);
      formData.append('operating_hours_start', vehicleModal.operating_hours_start || '09:00');
      formData.append('operating_hours_end', vehicleModal.operating_hours_end || '21:00');

      const res = await fetch(`${API}/api/vehicles/${vehicleModal._id}/edit`, {
        method: 'PATCH',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Save failed');
      setVehicleModalMsg('✅ Changes saved successfully!');
      fetchVehicles(); // Refresh the grid
      // Update modal with server-returned vehicle so previews become real paths
      setVehicleModal(prev => ({ ...prev, ...data.vehicle }));
    } catch (e) {
      setVehicleModalMsg(`❌ ${e.message}`);
    } finally {
      setVehicleModalSaving(false);
    }
  };

  const handleDeleteVehicle = async () => {
    if (!vehicleModal) return;
    const confirmed = window.confirm(`Are you sure you want to permanently delete this vehicle: ${vehicleModal.make}? This action cannot be undone.`);
    if (!confirmed) return;

    setVehicleModalSaving(true);
    setVehicleModalMsg('');
    try {
      const res = await fetch(`${API}/api/vehicles/${vehicleModal._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Deletion failed');
      setVehicleModalMsg('✅ Vehicle deleted successfully!');
      fetchVehicles();
      setTimeout(closeVehicleModal, 1500);
    } catch (e) {
      setVehicleModalMsg(`❌ ${e.message}`);
    } finally {
      setVehicleModalSaving(false);
    }
  };

  const saveStoreHours = async () => {
    setHoursSaving(true);
    setHoursMsg('');
    try {
      const res = await fetch(`${API}/api/auth/user/${vendorId}/hours`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operating_hours_start: operatingHours.start,
          operating_hours_end: operatingHours.end,
          status: isStoreOpen ? 'active' : 'closed',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Failed to save.');
      setHoursMsg('✅ Store hours updated successfully!');
    } catch (e) {
      setHoursMsg(`❌ ${e.message}`);
    } finally {
      setHoursSaving(false);
    }
  };

  const saveProfile = async () => {
    if (!vendorProfile) return;
    setProfileSaving(true);
    setProfileMsg('');
    try {
      const formData = new FormData();
      formData.append('full_name', vendorProfile.full_name || '');
      formData.append('vendor_address', vendorProfile.vendor_address);

      // Check if a new photo was selected
      if (vendorProfile.profile_photo && vendorProfile.profile_photo.__file) {
        formData.append('profile_photo', vendorProfile.profile_photo.__file);
      }

      const res = await fetch(`${API}/api/auth/user/${vendorId}/profile`, {
        method: 'PATCH',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Save failed');

      setProfileMsg('✅ Profile updated successfully!');
      setVendorProfile(data.user); // Update with fresh data from server
      localStorage.setItem('userName', data.user.full_name); // Keep localStorage in sync
    } catch (e) {
      setProfileMsg(`❌ ${e.message}`);
    } finally {
      setProfileSaving(false);
    }
  };
  const handleLogout = () => { localStorage.clear(); navigate('/login'); };

  // New functions for renter details modal
  const openRenterDetailsModal = async (renterData, renterId) => {
    setSelectedRenterForModal(renterData);
    setShowRenterDetailsModal(true);
    setRenterTransactionsLoading(true);
    setRenterTransactionsInModal([]); // Clear previous data
    try {
      const res = await fetch(`${API}/api/contracts/renter/${renterId}/all`);
      const data = await res.json();
      setRenterTransactionsInModal(data.bookings || []);
    } catch (e) {
      console.error('Error fetching renter transactions:', e);
    } finally {
      setRenterTransactionsLoading(false);
    }
  };

  const closeRenterDetailsModal = () => {
    setShowRenterDetailsModal(false);
    setSelectedRenterForModal(null);
    setRenterTransactionsInModal([]);
  };

  const handleChatSelect = (t) => {
    setActiveChat(t);
    if (t && t.vendor_unread) {
      fetch(`${API}/api/messages/${t._id}/mark-read/${vendorId}`, { method: 'PATCH' })
        .then(() => fetchChatThreads())
        .catch(e => console.error(e));
    }
  };

  const startChatWithRenter = (renter) => {
    if (!renter) return;
    const existingThread = chatThreads.find(t => t.renter_id === renter._id);
    if (existingThread) {
      handleChatSelect(existingThread);
    } else {
      setActiveChat({
        renter_id: renter._id,
        renter_name: renter.full_name,
        renter_email: renter.email,
        messages: []
      });
    }
    setActiveTab('chats');
  };


  const activeBookings   = bookings.filter(b => ['confirmed', 'active'].includes(b.status));
  const totalEarned      = bookings.filter(b => b.status === 'completed').reduce((s, b) => s + (b.total_price || 0), 0);
  const avgRating        = myReviews.length ? (myReviews.reduce((s, r) => s + r.rating, 0) / myReviews.length).toFixed(1) : 'N/A';

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Real-time Booking Alert Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {/* Sidebar Component */}
      <div className="fixed left-0 top-0 h-full w-56 bg-slate-900 flex flex-col z-20">
        <div className="px-6 pt-7 pb-5">
          <h1 className="text-xl font-black text-white tracking-tight">NETDRIVE<span className="text-emerald-400">.</span></h1>
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map(({ id, label, emoji }) => (
            <button key={id} onClick={() => setActiveTab(id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${activeTab === id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <span className="text-base leading-none">{emoji}</span>{label}
              {id === 'bookings' && activeBookings.length > 0 && <span className="ml-auto bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeBookings.length}</span>}
                {id === 'chats' && unreadChatsCount > 0 && <span className="ml-auto bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadChatsCount}</span>}
            </button>
          ))}
        </nav>
        <div className="px-3 pb-5 border-t border-slate-800 pt-3">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"><LogOut size={15} /> Sign Out</button>
        </div>
      </div>

      <div className="ml-56 flex-1 flex flex-col">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-8 py-3 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search vehicles, renters, etc..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex-1" />
          <button onClick={() => setActiveTab('profile')} className="flex items-center gap-2.5 group">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-800 leading-tight">{vendorName}</p>
              <p className="text-xs text-emerald-600 font-medium">✓ Verified Vendor</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-bold group-hover:ring-2 ring-emerald-300 ring-offset-2 transition-all">
              {vendorProfile?.profile_photo ? (
                typeof vendorProfile.profile_photo === 'string' ? (
                  <img src={`${API}/${vendorProfile.profile_photo.replace(/\\/g, '/')}`} alt="P" className="w-full h-full object-cover rounded-full" />
                ) : (
                  <img src={vendorProfile.profile_photo.__preview} alt="P" className="w-full h-full object-cover rounded-full" />
                )
              ) : firstName.charAt(0).toUpperCase()}
            </div>
          </button>
        </div>

        <div className="flex-1 p-8">
          {/* Conditional rendering for chat interface */}
          {activeTab === 'chats' ? (
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Messages</h2>
              {chatThreads.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center text-slate-400">
                  <MessageSquare size={36} className="text-gray-200 mx-auto mb-4" />
                  <h3 className="font-semibold text-slate-700 mb-2">No conversations yet</h3>
                  <p className="text-sm">When renters message you, conversations appear here.</p>
                </div>
              ) : (
                <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                  {chatThreads.filter(t => (t.renter_name || '').toLowerCase().includes((searchTerm || '').toLowerCase())).map(t => (
                    <button key={t._id} onClick={() => handleChatSelect(t)} className={`w-full text-left px-5 py-4 border-b border-gray-50 hover:bg-gray-50 transition flex items-center justify-between ${activeChat?._id === t._id ? 'bg-emerald-50' : ''}`}>
                      <div>
                        <p className="font-semibold text-sm text-slate-800">{t.renter_name}</p>
                        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{t.messages?.[t.messages.length - 1]?.content || 'No messages'}</p>
                      </div>
                      <span className="text-xs text-emerald-600 font-bold shrink-0 ml-4">Open →</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
          {activeTab === 'overview' && (
            <div>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
                  <p className="text-slate-400 text-sm mt-1">Welcome back, {firstName}</p>
                </div>
                <button onClick={() => navigate('/vendor/list-vehicle')} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"><Plus size={16} /> Add Vehicle</button>
              </div>

              <div className="grid grid-cols-5 gap-4 mb-8">
                {[
                  { label: 'Vehicles',        value: myVehicles.length,                icon: Car,         color: 'text-blue-600',    bg: 'bg-blue-50',    tabId: 'vehicles' },
                  { label: 'Active Bookings', value: activeBookings.length,            icon: TrendingUp,  color: 'text-violet-600',  bg: 'bg-violet-50',  tabId: 'bookings' },
                  { label: 'Total Earned',    value: `Rs. ${totalEarned.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', tabId: 'earnings' },
                  { label: 'Messages',        value: chatThreads.length,               icon: MessageSquare, color: 'text-amber-600', bg: 'bg-amber-50',   tabId: 'chats'    },
                  { label: 'Avg Rating',      value: avgRating,                        icon: Star,        color: 'text-amber-500',   bg: 'bg-amber-50',   tabId: 'reviews'  },
                ].map(({ label, value, icon: Icon, color, bg, tabId }) => (
                  <button
                    key={label}
                    onClick={() => setActiveTab(tabId)}
                    className="bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-left"
                  >
                    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}><Icon size={18} className={color} /></div>
                    <p className="text-2xl font-bold text-slate-800 mb-1">{value}</p>
                    <p className="text-xs text-slate-400">{label}</p>
                  </button>
                ))}
              </div>

              {activeBookings.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-4">
                  <h3 className="font-bold text-slate-800 mb-4">Bookings Needing Action</h3>
                  <div className="space-y-3">
                    {activeBookings.filter(b => {
                      const search = searchTerm.toLowerCase();
                      const carMatch = `${b.vehicle?.make || ''} ${b.vehicle?.model_year || ''} ${b.vehicle?.registration_no || ''}`.toLowerCase().includes(search);
                      const renterMatch = (b.renter?.full_name || '').toLowerCase().includes(search);
                      const addressMatch = (b.delivery_address || '').toLowerCase().includes(search);
                      const dateMatch = new Date(b.start_date).toLocaleDateString().includes(search) || new Date(b.end_date).toLocaleDateString().includes(search);
                      const priceMatch = (b.total_price || '').toString().includes(search);
                      return carMatch || renterMatch || addressMatch || dateMatch || priceMatch;
                    }).map(b => (
                      <div key={b._id} className="flex items-start justify-between gap-4 bg-amber-50 border border-amber-100 rounded-xl p-4">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-800 text-sm">{b.vehicle?.make || 'Vehicle'}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Renter: {b.renter?.full_name} · {new Date(b.start_date).toLocaleDateString()} → {new Date(b.end_date).toLocaleDateString()}</p>
                          {b.with_driver && (
                            <div className="mt-2 mb-1 bg-emerald-50/50 border border-emerald-100 rounded-lg p-2 w-fit">
                              <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 mb-1.5">
                                <UserCheck size={13}/> Driver requested for {b.driver_dates?.length || 0} day(s):
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {b.driver_dates?.map((d, i) => (
                                  <span key={i} className="text-[10px] bg-white text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded shadow-sm font-medium">
                                    {new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {b.fuel_price > 0 && (
                            <p className="text-xs text-amber-600 font-semibold mt-1 flex items-center gap-1.5"><Fuel size={13}/> Prepaid Fuel: Rs. {b.fuel_price.toLocaleString()}</p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.payment_method === 'card' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                              {b.payment_method === 'card' ? '💳 Card' : '💵 Cash'}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                              {b.payment_status === 'paid' ? 'Paid' : b.payment_status === 'cash_on_delivery' ? 'Pay on Pickup/Delivery' : 'Pending'}
                            </span>
                            {b.credit_applied > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                                Rs. {b.credit_applied.toLocaleString()} Credit Used
                              </span>
                            )}
                          </div>
                          {b.delivery_mode === 'dropoff' && b.delivery_address && (
                            <div className="mt-3">
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <p className="text-xs text-slate-500 flex items-start gap-1.5 leading-tight"><MapPin size={13} className="text-slate-400 shrink-0 mt-0.5"/> <span><span className="font-semibold">Drop-off:</span> {b.delivery_address}</span></p>
                                <a href={`https://www.google.com/maps/dir/?api=1&destination=${b.delivery_lat ? `${b.delivery_lat},${b.delivery_lng}` : encodeURIComponent(b.delivery_address)}`} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold hover:bg-blue-100 transition shadow-sm shrink-0">
                                  Get Directions
                                </a>
                              </div>
                              {b.delivery_lat && b.delivery_lng ? (
                                isLoaded ? (
                                  <div className="h-32 w-full max-w-sm rounded-xl overflow-hidden border border-slate-200">
                                    <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={{ lat: Number(b.delivery_lat), lng: Number(b.delivery_lng) }} zoom={14} options={{ disableDefaultUI: true }}>
                                      <MarkerF position={{ lat: Number(b.delivery_lat), lng: Number(b.delivery_lng) }} />
                                    </GoogleMap>
                                  </div>
                                ) : <div className="h-32 w-full max-w-sm rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs animate-pulse">Loading Map...</div>
                              ) : null}
                            </div>
                          )}
                          <div className="flex gap-4 mt-2">
                            <button onClick={() => openRenterDetailsModal(b.renter, b.renter._id)} className="text-xs text-blue-600 font-bold hover:underline">View Renter Details</button>
                            <button onClick={() => startChatWithRenter(b.renter)} className="text-xs text-emerald-600 font-bold hover:underline">Message Renter</button>
                          </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-2">
                        {/* Actions for bookings */}
                        {b.status === 'confirmed' && b.delivery_mode === 'pickup' ? (
                          <>
                            <button onClick={() => markDelivered(b._id)} className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm w-full">Handover Keys (Start Contract)</button>
                            <button onClick={() => { setDeclineBookingId(b._id); setShowDeclineModal(true); }} className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm w-full">Decline Contract</button>
                          </>
                        ) : b.status === 'confirmed' && b.delivery_mode !== 'pickup' && !b.tracking_active ? (
                          <>
                            <button onClick={() => startTrip(b._id)} disabled={startingTrip === b._id} className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition w-full"><Navigation size={13} />{startingTrip === b._id ? 'Starting...' : 'Start Delivery'}</button>
                            <button onClick={() => { setDeclineBookingId(b._id); setShowDeclineModal(true); }} className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm w-full">Decline Contract</button>
                          </>
                        ) : b.status === 'confirmed' && b.tracking_active ? (
                          <span className="flex items-center gap-2 text-xs bg-emerald-100 text-emerald-700 font-bold px-3 py-1.5 rounded-xl">
                            ● Delivery Live
                            <button onClick={() => markDelivered(b._id)} className="ml-2 bg-emerald-600 text-white px-3 py-1 rounded-lg hover:bg-emerald-500 transition shadow-sm">Mark Delivered</button>
                          </span>
                        ) : b.status === 'active' ? (
                          <div className="flex items-center gap-2">
                            {b.tracking_active && <span className="text-[10px] text-emerald-600 font-bold px-2 py-1 bg-emerald-50 rounded border border-emerald-100">📍 Renter is Sharing Location</span>}
                            <button onClick={() => completeContract(b._id, b.renter._id)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm">End Contract & Relist</button>
                          </div>
                        ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'vehicles' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-slate-800">My Vehicles</h2>
                <button onClick={() => navigate('/vendor/list-vehicle')} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition"><Plus size={16} /> List New Vehicle</button>
              </div>
              {myVehicles.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center">
                  <Package size={36} className="text-gray-200 mx-auto mb-4" />
                  <h3 className="font-semibold text-slate-700 mb-2">No vehicles yet</h3>
                  <button onClick={() => navigate('/vendor/list-vehicle')} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition inline-flex items-center gap-2"><Plus size={15} /> List First Vehicle</button>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-5">
                  {myVehicles.filter(v =>
                    (v.make || '').toLowerCase().includes((searchTerm || '').toLowerCase())
                  ).map(v => (
                    <div key={v._id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition flex flex-col justify-between">
                      <div className="cursor-pointer" onClick={() => openVehicleModal(v)}>
                        <div className="h-36 bg-gray-100 overflow-hidden">
                          <img src={v.photos?.[0] ? (v.photos[0].startsWith('http') ? v.photos[0] : `${API}/${v.photos[0].replace(/\\/g, '/')}`) : 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&q=80'} alt={v.make} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-4">
                          <h4 className="font-bold text-slate-800">{v.make}</h4>
                          <p className="text-xs text-slate-400 mt-0.5">{v.model_year} · {v.registration_no}</p>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-sm font-black text-slate-800">Rs. {parseInt(v.price_per_day || 0).toLocaleString()}/day</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${v.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{v.status === 'active' ? 'Listed / Available' : 'Manually Blocked'}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-2">Click to manage →</p>
                        </div>
                      </div>
                      <div className="p-4 pt-0 border-t border-gray-50 mt-2">
                        {v.status === 'suspended' ? (
                          <div className="w-full mt-2 py-2 text-xs font-bold rounded-xl border border-red-200 bg-red-50 text-red-600 text-center">
                            🚫 Suspended by Admin
                          </div>
                        ) : (
                          <button onClick={async () => {
                            try {
                              const res = await fetch(`${API}/api/vehicles/${v._id}/toggle-status`, { method: 'PATCH' });
                              if (res.ok) fetchVehicles();
                            } catch (e) { console.error(e); }
                          }} className={`w-full mt-2 py-2 text-xs font-bold rounded-xl border transition ${v.status === 'active' ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'}`}>
                            {v.status === 'active' ? '🚫 Mark as Unavailable' : '✅ Re-List Vehicle'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'bookings' && (
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Bookings</h2>
              {bookings.length === 0 ? (
                <div className="bg-white border rounded-2xl p-16 text-center">
                  <Calendar size={36} className="text-gray-200 mx-auto mb-4" />
                  <h3 className="font-semibold text-slate-700 mb-2">No bookings yet</h3>
                  <p className="text-slate-400 text-sm">Once renters book your vehicles, they'll appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {bookings.filter(b => {
                    const search = searchTerm.toLowerCase();
                    const carMatch = `${b.vehicle?.make || ''} ${b.vehicle?.model_year || ''} ${b.vehicle?.registration_no || ''}`.toLowerCase().includes(search);
                    const renterMatch = (b.renter?.full_name || '').toLowerCase().includes(search);
                    const statusMatch = (b.status || '').toLowerCase().includes(search);
                    const dateMatch = new Date(b.start_date).toLocaleDateString().includes(search) || new Date(b.end_date).toLocaleDateString().includes(search);
                    const priceMatch = (b.total_price || '').toString().includes(search);
                    return carMatch || renterMatch || statusMatch || dateMatch || priceMatch;
                  }).map(b => (
                    <div key={b._id} className="bg-white border border-gray-100 rounded-2xl p-5 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-bold text-slate-800">{b.vehicle?.make || 'Vehicle'}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${b.status === 'active' ? 'bg-emerald-100 text-emerald-700' : b.status === 'confirmed' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{b.status}</span>
                        </div>
                        <p className="text-xs text-slate-500">Renter: <span className="font-medium">{b.renter?.full_name}</span> · {b.renter?.phone}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{new Date(b.start_date).toLocaleDateString()} → {new Date(b.end_date).toLocaleDateString()} · Rs. {parseInt(b.total_price || 0).toLocaleString()}</p>
                        {b.with_driver && (
                          <div className="mt-2 mb-1 bg-emerald-50/50 border border-emerald-100 rounded-lg p-2 w-fit">
                            <p className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 mb-1.5">
                              <UserCheck size={13}/> Driver requested for {b.driver_dates?.length || 0} day(s):
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {b.driver_dates?.map((d, i) => (
                                <span key={i} className="text-[10px] bg-white text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded shadow-sm font-medium">
                                  {new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                          {b.fuel_price > 0 && (
                            <p className="text-xs text-amber-600 font-semibold mt-1 flex items-center gap-1.5"><Fuel size={13}/> Prepaid Fuel: Rs. {b.fuel_price.toLocaleString()}</p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.payment_method === 'card' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                              {b.payment_method === 'card' ? '💳 Card' : '💵 Cash'}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${b.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                              {b.payment_status === 'paid' ? 'Paid' : b.payment_status === 'cash_on_delivery' ? 'Pay on Pickup/Delivery' : 'Pending'}
                            </span>
                            {b.credit_applied > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                                Rs. {b.credit_applied.toLocaleString()} Credit Used
                              </span>
                            )}
                          </div>
                        <div className="flex gap-4 mt-2">
                          <button onClick={() => openRenterDetailsModal(b.renter, b.renter._id)} className="text-xs text-blue-600 font-bold hover:underline">View Renter Details</button>
                          <button onClick={() => startChatWithRenter(b.renter)} className="text-xs text-emerald-600 font-bold hover:underline">Message Renter</button>
                        </div>
                        {b.delivery_mode === 'dropoff' && b.delivery_address && (
                            <div className="mt-3 pt-3 border-t border-slate-100">
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <p className="text-xs text-slate-500 flex items-start gap-1.5 leading-tight"><MapPin size={13} className="text-slate-400 shrink-0 mt-0.5"/> <span><span className="font-semibold">Drop-off:</span> {b.delivery_address}</span></p>
                                <a href={`https://www.google.com/maps/dir/?api=1&destination=${b.delivery_lat ? `${b.delivery_lat},${b.delivery_lng}` : encodeURIComponent(b.delivery_address)}`} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold hover:bg-blue-100 transition shadow-sm shrink-0">
                                  Get Directions
                                </a>
                              </div>
                              {b.delivery_lat && b.delivery_lng ? (
                                isLoaded ? (
                                  <div className="h-32 w-full max-w-sm rounded-xl overflow-hidden border border-slate-200">
                                    <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={{ lat: Number(b.delivery_lat), lng: Number(b.delivery_lng) }} zoom={14} options={{ disableDefaultUI: true }}>
                                      <MarkerF position={{ lat: Number(b.delivery_lat), lng: Number(b.delivery_lng) }} />
                                    </GoogleMap>
                                  </div>
                                ) : <div className="h-32 w-full max-w-sm rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs animate-pulse">Loading Map...</div>
                              ) : null}
                            </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {b.status === 'confirmed' && b.delivery_mode === 'pickup' && (
                          <>
                            <button onClick={() => markDelivered(b._id)} className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm w-full">Handover Keys</button>
                            <button onClick={() => { setDeclineBookingId(b._id); setShowDeclineModal(true); }} className="flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm w-full">Decline</button>
                          </>
                        )}
                        {b.status === 'confirmed' && b.delivery_mode !== 'pickup' && !b.tracking_active && (
                          <>
                            <button onClick={() => startTrip(b._id)} disabled={startingTrip === b._id} className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold px-3 py-2 rounded-xl transition w-full"><Navigation size={12} />{startingTrip === b._id ? 'Starting...' : 'Start Delivery'}</button>
                            <button onClick={() => { setDeclineBookingId(b._id); setShowDeclineModal(true); }} className="flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm w-full">Decline</button>
                          </>
                        )}
                        {b.status === 'confirmed' && b.tracking_active && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-3 py-1.5 rounded-xl">● Live</span>
                            <button onClick={() => markDelivered(b._id)} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition shadow-sm">Delivered</button>
                          </div>
                        )}
                        {b.status === 'active' && (
                          <div className="flex items-center gap-2">
                            {b.tracking_active && <span className="text-[10px] text-emerald-600 font-bold px-2 py-1 bg-emerald-50 rounded border border-emerald-100 shadow-sm">📍 Renter is Sharing Location</span>}
                            <button onClick={() => completeContract(b._id, b.renter._id)} className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition shadow-sm">End Contract</button>
                          </div>
                        )}
                        {b.status === 'completed' && (
                          <button onClick={() => setDisputeModal(b)} className="mt-2 text-xs font-bold px-3 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition">
                            Report Issue
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'earnings' && (
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Earnings</h2>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[{ label: 'Total Earned', value: `Rs. ${totalEarned.toLocaleString()}` }, { label: 'Active Bookings', value: activeBookings.length }, { label: 'All Bookings', value: bookings.length }].map(({ label, value }) => (
                  <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5">
                    <p className="text-slate-400 text-xs mb-2">{label}</p>
                    <p className="text-2xl font-bold text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-6">My Reviews</h2>
              {myReviews.length === 0 ? (
                <div className="bg-white border border-gray-100 rounded-2xl p-16 text-center">
                  <Star size={36} className="text-gray-200 mx-auto mb-4" />
                  <h3 className="font-semibold text-slate-700 mb-2">No reviews yet</h3>
                  <p className="text-slate-400 text-sm">When renters review you, they will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {myReviews.map(r => (
                    <div key={r._id} className="bg-white border border-gray-100 p-5 rounded-2xl shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{r.reviewer?.full_name || 'Renter'}</p>
                          <p className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} size={14} className={i < r.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"} />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 italic">"{r.comment}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'disputes' && (
            <div>
              <UserDisputesList userId={vendorId} />
            </div>
          )}

          {activeTab === 'profile' && (
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-6">My Profile</h2>
              {vendorProfile ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 max-w-2xl mx-auto shadow-sm">
                  <div className="flex items-center gap-6 mb-8">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-3xl font-bold overflow-hidden">
                        {vendorProfile.profile_photo?.__preview ? (
                          <img src={vendorProfile.profile_photo.__preview} alt="Preview" className="w-full h-full object-cover" />
                        ) : vendorProfile.profile_photo ? (
                          <img src={`${API}/${vendorProfile.profile_photo.replace(/\\/g, '/')}`} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          firstName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <input
                        ref={profilePhotoInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setVendorProfile(prev => ({ ...prev, profile_photo: { __file: file, __preview: URL.createObjectURL(file) } }));
                          }
                        }}
                      />
                      <button onClick={() => profilePhotoInputRef.current?.click()} className="absolute bottom-0 right-0 w-8 h-8 bg-slate-900 text-white rounded-full flex items-center justify-center border-2 border-white hover:bg-slate-700 transition">
                        <Upload size={14} />
                      </button>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Showroom Name</label>
                      <input type="text" value={vendorProfile.full_name || ''} onChange={e => {
                          const text = e.target.value;
                          if (text.trim().split(/\s+/).filter(Boolean).length <= 15) setVendorProfile(p => ({ ...p, full_name: text }));
                        }} className="w-full text-2xl font-bold text-slate-800 bg-transparent border-b-2 border-transparent focus:border-emerald-500 outline-none transition pb-1" />
                        <p className="text-[10px] text-slate-400 mt-1">{(vendorProfile.full_name || '').trim().split(/\s+/).filter(Boolean).length}/15 words</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
      
                      <label className="text-xs font-bold text-slate-500 uppercase">Showroom Address</label>
                      <input type="text" value={vendorProfile.vendor_address || ''} onChange={e => {
                          const text = e.target.value;
                          if (text.trim().split(/\s+/).filter(Boolean).length <= 15) setVendorProfile(p => ({ ...p, vendor_address: text }));
                        }} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm mt-1" />
                        <p className="text-[10px] text-slate-400 mt-1">{(vendorProfile.vendor_address || '').trim().split(/\s+/).filter(Boolean).length}/15 words</p>
                  
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Email (Read-only)</label>
                        <p className="p-3 bg-slate-100 text-slate-500 rounded-xl text-sm mt-1">{vendorProfile.email}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">CNIC (Read-only)</label>
                        <p className="p-3 bg-slate-100 text-slate-500 rounded-xl text-sm mt-1">{vendorProfile.cnic_number}</p>
                      </div>
                    </div>
                  </div>

                  {profileMsg && (
                    <div className={`mt-6 p-3 rounded-xl text-sm font-semibold ${profileMsg.includes('✅') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                      {profileMsg}
                    </div>
                  )}

                  <button onClick={saveProfile} disabled={profileSaving} className="w-full mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition disabled:opacity-50">
                    {profileSaving ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>
              ) : <div className="text-center text-slate-400">Loading profile...</div>}
            </div>
          )}
          </>
          )}
        </div>
      </div>

      {disputeModal && (
        <ReportIssueModal booking={disputeModal} currentUser={{ id: vendorId }} onClose={() => setDisputeModal(null)} />
      )}

      {reviewModal && (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
          <h3 className="font-black text-lg flex items-center gap-2"><Star size={18} className="text-emerald-400 fill-emerald-400"/> Rate the Renter</h3>
          <button onClick={() => setReviewModal(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 font-medium">How was your experience renting to this user?</p>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Rating (1-5)</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} type="button" onClick={() => setReviewData({...reviewData, rating: star})} className={`transition-colors ${star <= reviewData.rating ? 'text-emerald-400' : 'text-slate-200 hover:text-emerald-200'}`}>
                  <Star size={32} className={star <= reviewData.rating ? 'fill-emerald-400' : ''} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Comment</label>
            <textarea rows="3" value={reviewData.comment} onChange={e => {
              const text = e.target.value;
              if (text.trim().split(/\s+/).filter(Boolean).length <= 50) setReviewData({...reviewData, comment: text});
            }} placeholder="Share your feedback..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500 resize-none"></textarea>
            <p className="text-xs text-slate-400 mt-1 text-right">{reviewData.comment.trim().split(/\s+/).filter(Boolean).length}/50 words</p>
          </div>
          <button onClick={submitReview} disabled={!reviewData.comment.trim()} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition text-sm">Submit Review</button>
        </div>
      </div>
    </div>
  )}

      {/* Floating Chat Panel — opens when a thread is selected */}
      {activeChat && (
        <div className="fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden flex flex-col h-[450px]">
          <div className="bg-slate-900 px-4 py-3 flex justify-between items-center text-white shrink-0">
            <div>
              <h4 className="font-bold text-sm">{activeChat.renter_name}</h4>
              <p className="text-xs text-emerald-400">● Live Chat</p>
            </div>
            <button onClick={() => setActiveChat(null)} className="text-slate-400 hover:text-white text-sm font-bold">✕</button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
            {chatMessages.length === 0 ? (
              <div className="text-center text-slate-400 mt-10 text-sm">No messages yet.</div>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender_id === vendorId ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${msg.sender_id === vendorId ? 'bg-emerald-600 text-white rounded-tr-sm' : 'bg-white text-slate-800 rounded-tl-sm border border-slate-200'}`}>
                    <p className={`font-bold text-[10px] mb-1 ${msg.sender_id === vendorId ? 'text-emerald-200' : 'text-slate-400'}`}>{msg.sender_name}</p>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 bg-white border-t border-slate-100 flex flex-col gap-1 shrink-0">
              <div className="flex gap-2">
                
            <input type="text" placeholder="Reply to renter..." value={chatInput} onChange={e => {
                const text = e.target.value;
                if (text.trim().split(/\s+/).filter(Boolean).length <= 50) setChatInput(text);
              }} onKeyDown={e => e.key === 'Enter' && sendMessage()} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500 transition" />
            <button onClick={sendMessage} className="w-10 h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0 transition"><Send size={16} /></button>
              </div>
              <p className="text-[10px] text-slate-400 text-right">{(chatInput || '').trim().split(/\s+/).filter(Boolean).length}/50 words</p>
            </div>
        </div>
      )}

      {showDeclineModal && (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
          <h3 className="font-black text-lg">Decline Contract</h3>
          <button onClick={() => { setShowDeclineModal(false); setDeclineBookingId(null); setDeclineReason(''); }} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 font-medium">Please provide a reason for declining this contract. The renter will see this reason.</p>
          <div>
            <textarea rows="3" value={declineReason} onChange={e => {
              const text = e.target.value;
              if (text.trim().split(/\s+/).filter(Boolean).length <= 50) setDeclineReason(text);
            }} placeholder="e.g., Vehicle is currently undergoing maintenance..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-500 resize-none"></textarea>
            <p className="text-xs text-slate-400 mt-1 text-right">{(declineReason || '').trim().split(/\s+/).filter(Boolean).length}/50 words</p>
          </div>
          <button onClick={handleDeclineBooking} disabled={!declineReason.trim()} className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition text-sm">Decline Contract</button>
        </div>
      </div>
    </div>
  )}

      {/* Vehicle Detail / Edit Modal */}
  {vehicleModal && (
    <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4" onClick={closeVehicleModal}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[92vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-slate-900 p-5 flex justify-between items-center text-white shrink-0">
          <div>
            <h3 className="font-black text-lg">{vehicleModal.make}</h3>
            <p className="text-xs text-slate-400">{vehicleModal.model_year} · {vehicleModal.registration_no}</p>
          </div>
          <button onClick={closeVehicleModal} className="text-slate-400 hover:text-white"><X size={22} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6 bg-slate-50">

          {/* --- Photo Gallery --- */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase mb-3">Photos ({vehicleModal.photos?.length || 0}/6)</p>

            {/* Main photo */}
            {vehicleModal.photos?.length > 0 ? (
              <div className="relative h-64 bg-gray-100 rounded-xl overflow-hidden mb-3">
                {(() => {
                  const p = vehicleModal.photos[vehicleModalPhoto];
                  const src = p?.__preview || (typeof p === 'string' ? (p.startsWith('http') ? p : `${API}/${p.replace(/\\/g, '/')}`) : null);
                  return src ? <img src={src} alt="main" className="w-full h-full object-cover" /> : null;
                })()}
                {vehicleModal.photos.length > 1 && (
                  <>
                    <button onClick={() => setVehicleModalPhoto(i => Math.max(0, i - 1))} disabled={vehicleModalPhoto === 0} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-full disabled:opacity-30 transition"><ChevronLeft size={18}/></button>
                    <button onClick={() => setVehicleModalPhoto(i => Math.min(vehicleModal.photos.length - 1, i + 1))} disabled={vehicleModalPhoto === vehicleModal.photos.length - 1} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-full disabled:opacity-30 transition"><ChevronRight size={18}/></button>
                  </>
                )}
                <span className="absolute bottom-2 right-3 text-[10px] bg-black/50 text-white px-2 py-0.5 rounded-full font-bold">{vehicleModalPhoto + 1} / {vehicleModal.photos.length}</span>
              </div>
            ) : (
              <div className="h-40 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-sm mb-3">No photos yet</div>
            )}

            {/* Thumbnails */}
            <div className="flex gap-2 flex-wrap">
              {(vehicleModal.photos || []).map((p, idx) => {
                const src = p?.__preview || (typeof p === 'string' ? (p.startsWith('http') ? p : `${API}/${p.replace(/\\/g, '/')}`) : null);
                return (
                  <div key={idx} className="relative group">
                    <button onClick={() => setVehicleModalPhoto(idx)} className={`w-20 h-14 rounded-xl overflow-hidden border-2 transition ${vehicleModalPhoto === idx ? 'border-blue-600' : 'border-slate-200 opacity-70 hover:opacity-100'}`}>
                      {src && <img src={src} alt="thumb" className="w-full h-full object-cover" />}
                    </button>
                    <button onClick={() => handleModalDeletePhoto(idx)} className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition shadow-md">
                      <Trash2 size={11}/>
                    </button>
                  </div>
                );
              })}
              {(vehicleModal.photos?.length || 0) < 6 && (
                <>
                  <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleModalAddPhotos} />
                  <button onClick={() => photoInputRef.current?.click()} className="w-20 h-14 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-blue-500 transition">
                    <Upload size={14}/>
                    <span className="text-[10px] font-bold">Add</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* --- Car Info (read-only) --- */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1.5"><Info size={13}/> Vehicle Info (Read-only)</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['Make / Name', vehicleModal.make],
                ['Model Year', vehicleModal.model_year],
                ['Category', vehicleModal.category],
                ['Registration No.', vehicleModal.registration_no],
                ['Registration Date', vehicleModal.registration_date ? new Date(vehicleModal.registration_date).toLocaleDateString() : '—'],
                ['Owner Name', vehicleModal.owner_name],
                ['Tax Payment', vehicleModal.tax_payment],
                ['Address / Location', vehicleModal.address],
              ].map(([label, value]) => (
                <div key={label} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-slate-400 text-[10px] font-bold uppercase mb-0.5">{label}</p>
                  <p className="font-semibold text-slate-800 text-sm">{value || '—'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* --- Editable Options --- */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
            <p className="text-xs font-bold text-slate-500 uppercase">Manage Options</p>

            {/* Hourly Rentals Toggle */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div>
                <p className="font-bold text-sm text-slate-700">Allow Hourly Rentals</p>
                <p className="text-[11px] text-slate-400">Enable this to offer short-term rentals.</p>
              </div>
              <button
                type="button"
                onClick={() => setVehicleModal(prev => ({ ...prev, allow_hourly_rentals: !prev.allow_hourly_rentals }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${vehicleModal.allow_hourly_rentals ? 'bg-emerald-500' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${vehicleModal.allow_hourly_rentals ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Daily Price */}
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5">Price Per Day (Rs.)</label>
              <input
                type="number"
                min="0"
                value={vehicleModal.price_per_day ?? 0}
                onChange={e => setVehicleModal(prev => ({ ...prev, price_per_day: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                placeholder="e.g. 5000"
              />
            </div>
            
            {/* Conditional Hourly Settings */}
            {vehicleModal.allow_hourly_rentals && (
              <div className="space-y-4 p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                {/* Operating Hours */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">Operating Hours Start</label>
                    <input
                      type="time"
                      value={vehicleModal.operating_hours_start ?? '09:00'}
                      onChange={e => setVehicleModal(prev => ({ ...prev, operating_hours_start: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">Operating Hours End</label>
                    <input
                      type="time"
                      value={vehicleModal.operating_hours_end ?? '21:00'}
                      onChange={e => setVehicleModal(prev => ({ ...prev, operating_hours_end: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                    />
                  </div>
                </div>

                {/* Hourly Rate */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">Hourly Rate (Rs.)</label>
                    <input
                      type="number" min="0" value={vehicleModal.hourly_rate ?? 0}
                      onChange={e => setVehicleModal(prev => ({ ...prev, hourly_rate: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                      placeholder="e.g. 800"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1.5">Minimum Hours</label>
                    <input
                      type="number" min="1" value={vehicleModal.minimum_hours ?? 1}
                      onChange={e => setVehicleModal(prev => ({ ...prev, minimum_hours: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                      placeholder="e.g. 2"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Driver Price */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <UserCheck size={16} className="text-emerald-600"/>
                  <div>
                    <p className="font-bold text-sm text-slate-700">Offer a Driver</p>
                    <p className="text-[11px] text-slate-400">Allow renters to hire a professional driver with the vehicle.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDriverEnabled(!driverEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${driverEnabled ? 'bg-emerald-500' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${driverEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
              {driverEnabled && (
                <div className="pt-3 border-t border-slate-200">
                  <label className="text-xs font-bold text-slate-600 block mb-1.5">Driver Price Per Day (Rs.)</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="50"
                      value={vehicleModal.driver_price_per_day}
                      onChange={e => setVehicleModal(prev => ({ ...prev, driver_price_per_day: e.target.value }))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                      placeholder="e.g. 2000"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col">
                      <button type="button" onClick={() => setVehicleModal(p => ({...p, driver_price_per_day: (Number(p.driver_price_per_day) || 0) + 50}))} className="h-4 w-4 flex items-center justify-center text-slate-400 hover:text-slate-700">▲</button>
                      <button type="button" onClick={() => setVehicleModal(p => ({...p, driver_price_per_day: Math.max(0, (Number(p.driver_price_per_day) || 0) - 50)}))} className="h-4 w-4 flex items-center justify-center text-slate-400 hover:text-slate-700">▼</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Fuel (Petrol) Toggle */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2.5">
                <Fuel size={16} className="text-amber-500"/>
                <div>
                  <p className="font-bold text-sm text-slate-700">Prepaid Fuel Option</p>
                  <p className="text-[11px] text-slate-400">Allow renters to prepay for fuel (Rs. 1k–5k)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVehicleModal(prev => ({ ...prev, with_petrol: !prev.with_petrol }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${vehicleModal.with_petrol ? 'bg-amber-500' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${vehicleModal.with_petrol ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Availability Toggle */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2.5">
                <Car size={16} className={vehicleModal.status === 'active' ? 'text-emerald-600' : 'text-red-500'}/>
                <div>
                  <p className="font-bold text-sm text-slate-700">Listing Status</p>
                  <p className="text-[11px] text-slate-400">{vehicleModal.status === 'active' ? 'Vehicle is publicly listed and available' : 'Vehicle is hidden from renters'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVehicleModal(prev => ({ ...prev, status: prev.status === 'active' ? 'inactive' : 'active' }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${vehicleModal.status === 'active' ? 'bg-emerald-500' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${vehicleModal.status === 'active' ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>

          {vehicleModalMsg && (
            <div className={`p-3 rounded-xl text-sm font-semibold ${vehicleModalMsg.includes('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
              {vehicleModalMsg}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-gray-100 bg-white flex gap-3 shrink-0">
          <button
            onClick={handleDeleteVehicle}
            disabled={vehicleModalSaving}
            className="py-3 px-5 rounded-xl border border-red-200 bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 transition disabled:opacity-50 flex items-center gap-1.5">
            <Trash2 size={14}/> Delete
          </button>
          <button
            onClick={async () => {
              // Handle status toggle separately via its own endpoint, then save the rest
              const statusChanged = vehicleModal.status !== myVehicles.find(v => v._id === vehicleModal._id)?.status;
              if (statusChanged) {
                await fetch(`${API}/api/vehicles/${vehicleModal._id}/toggle-status`, { method: 'PATCH' });
              }
              await saveVehicleModal();
            }}
            disabled={vehicleModalSaving}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold transition"
          >
            {vehicleModalSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )}

      {/* Renter Details Modal */}
  {showRenterDetailsModal && selectedRenterForModal && (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-900 p-5 flex justify-between items-center text-white shrink-0">
          <div>
            <h3 className="font-black text-lg">Renter Profile</h3>
            <p className="text-xs text-slate-400">Verified Identity</p>
          </div>
          <button onClick={closeRenterDetailsModal} className="text-slate-400 hover:text-white"><X size={24} /></button>
        </div>
        
        <div className="p-6 overflow-y-auto bg-slate-50 flex-1 space-y-6">
          {/* Profile Info */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-5">
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-2xl font-black">
              {(selectedRenterForModal.full_name?.charAt(0) || 'U').toUpperCase()}
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-800">{selectedRenterForModal.full_name}</h4>
              <p className="text-sm text-slate-500 mt-1">{selectedRenterForModal.email} • {selectedRenterForModal.phone}</p>
              <p className="text-xs text-emerald-600 font-bold mt-2 bg-emerald-50 inline-block px-2 py-1 rounded">
                Member since {new Date(selectedRenterForModal.createdAt).toLocaleDateString()}
              </p>
              {selectedRenterForModal.avg_rating > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} className={i < Math.round(selectedRenterForModal.avg_rating) ? "text-amber-400 fill-amber-400" : "text-slate-200"} />
                    ))}
                  </div>
                  <p className="text-xs font-bold text-slate-500">{selectedRenterForModal.avg_rating.toFixed(1)} average rating</p>
                </div>
              )}
            </div>
          </div>

          {/* Documents */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">CNIC Document</p>
              <div className="h-40 bg-gray-200 rounded-xl overflow-hidden border border-gray-300">
                {selectedRenterForModal.cnic_image ? (
                  <img src={selectedRenterForModal.cnic_image.startsWith('http') ? selectedRenterForModal.cnic_image : `${API}/${selectedRenterForModal.cnic_image.replace(/\\/g, '/')}`} alt="CNIC" className="w-full h-full object-cover hover:object-contain transition-all" />
                ) : <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">No Image</div>}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Driving License</p>
              <div className="h-40 bg-gray-200 rounded-xl overflow-hidden border border-gray-300">
                {selectedRenterForModal.license_image ? (
                  <img src={selectedRenterForModal.license_image.startsWith('http') ? selectedRenterForModal.license_image : `${API}/${selectedRenterForModal.license_image.replace(/\\/g, '/')}`} alt="License" className="w-full h-full object-cover hover:object-contain transition-all" />
                ) : <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">No Image</div>}
              </div>
            </div>
          </div>

          {/* Transactions */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-3">Rental History</p>
            {renterTransactionsLoading ? (
              <div className="text-center py-6 text-slate-400 text-sm animate-pulse">Loading history...</div>
            ) : renterTransactionsInModal.length === 0 ? (
              <div className="bg-white p-6 rounded-2xl border border-gray-100 text-center text-sm text-slate-500">No previous rental history found.</div>
            ) : (
              <div className="space-y-3">
                {renterTransactionsInModal.map(t => (
                  <div key={t._id} className="bg-white p-4 rounded-xl border border-gray-100 flex justify-between items-center shadow-sm">
                    <div>
                      <p className="font-bold text-sm text-slate-800">{t.vehicle?.make || 'Vehicle'}</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(t.start_date).toLocaleDateString()} to {new Date(t.end_date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-800">Rs. {parseInt(t.total_price || 0).toLocaleString()}</p>
                      <p className={`text-[10px] font-bold uppercase mt-1 ${t.status === 'completed' ? 'text-blue-600' : 'text-emerald-600'}`}>{t.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )}
    </div>
  );
}


