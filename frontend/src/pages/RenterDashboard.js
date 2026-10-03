import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, LogOut, MapPin, MessageSquare, Send, Share2, X, Calendar, ChevronRight, Star, CheckCircle, UserCheck, Fuel, AlertCircle } from 'lucide-react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import ReportIssueModal from './ReportIssueModal';
import UserDisputesList from './UserDisputesList';
import { ToastContainer, useToast, useStatusAlerts } from './BookingAlerts';

const navItems = [
  { id: 'dashboard', label: 'Dashboard',        emoji: '🏠' },
  { id: 'vendors',   label: 'Verified Vendors',  emoji: '🏢' },
  { id: 'bookings',  label: 'My Bookings',       emoji: '📅' },
  { id: 'chats',     label: 'Messages',         emoji: '💬' },
  { id: 'transactions', label: 'Transactions', emoji: '💳' },
  { id: 'myreviews', label: 'My Reviews',        emoji: '⭐' },
  { id: 'disputes',  label: 'My Disputes',       emoji: '🛡️' },
];

const API = 'http://localhost:5000';

export default function RenterDashboard() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const chatEndRef = useRef(null);

  const currentUserId = localStorage.getItem('userId') || '';
  const renterName    = localStorage.getItem('userName') || 'Musab Khan';
  const firstName     = renterName.split(' ')[0];

  const [activeTab,          setActiveTab]          = useState('dashboard');
  const [activeFilter,       setActiveFilter]       = useState('All');
  const [vendors,            setVendors]            = useState([]);
  const [selectedVendor,     setSelectedVendor]     = useState(null);
  const [vendorFleet,        setVendorFleet]        = useState([]);
  const [activeContract,     setActiveContract]     = useState(null);
  const [chatMessages,       setChatMessages]       = useState([]);
  const [activeChatVendorId, setActiveChatVendorId] = useState(null);
  const [chatThreads,        setChatThreads]        = useState([]);
  const [activeChatVendorName, setActiveChatVendorName] = useState('');
  const [chatInput,          setChatInput]          = useState('');
  const [linkCopied,         setLinkCopied]         = useState(false);
  const [myBookings,         setMyBookings]         = useState([]);
  const [searchTerm,         setSearchTerm]         = useState('');
  const [featuredVehicle,    setFeaturedVehicle]    = useState(null);
  const [allVehicles,        setAllVehicles]        = useState([]);
  const [sharingLocation,    setSharingLocation]    = useState(false);
  const [vendorReviews,      setVendorReviews]      = useState([]);
  const [showReviewsModal,   setShowReviewsModal]   = useState(false);
  const [reviewTargetName,   setReviewTargetName]   = useState('');
  const [declinedNotification, setDeclinedNotification] = useState(null);
  const [completedNotification, setCompletedNotification] = useState(null);

  const [reviewModal, setReviewModal] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [myReviews, setMyReviews] = useState([]);

  const [disputeModal, setDisputeModal] = useState(null); // State for dispute modal
  const [accountCredit, setAccountCredit] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [hasNewDisputes, setHasNewDisputes] = useState(false);

  // ── Real-time booking status alert system ───────────────────────
  const { toasts, addToast, dismissToast } = useToast();
  useStatusAlerts(myBookings, addToast);


  const mapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
  const libraries = useMemo(() => ['places'], []);
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: mapsApiKey, 
    disabled: !mapsApiKey,
    libraries
  });

  const fetchVendors = async () => {
    try {
      const res  = await fetch(`${API}/api/auth/admin/users`);
      const data = await res.json();
      setVendors((data.users || []).filter(u => u.roles?.includes('vendor')));
    } catch (e) { console.error(e); }
  };

  const fetchVendorFleet = async (vendorId) => {
    try {
      const res  = await fetch(`${API}/api/vehicles/vendor/${vendorId}`);
      const data = await res.json();
      setVendorFleet(data.vehicles || []);
    } catch (e) { console.error(e); }
  };

  const fetchActiveContract = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const res  = await fetch(`${API}/api/contracts/renter/${currentUserId}`);
      const data = await res.json();
      setActiveContract(data.contract || null);
    } catch (e) { console.error(e); }
  }, [currentUserId]);

  const fetchMyBookings = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const res  = await fetch(`${API}/api/contracts/renter/${currentUserId}/all`);
      const data = await res.json();
      const bookings = data.bookings || [];
      setMyBookings(bookings);
      
      // Find the first unacknowledged declined booking to show as a notification.
      const unseenDeclinedBooking = bookings.find(b => b.status === 'cancelled' && b.decline_reason && !b.cancellation_seen);
      if (unseenDeclinedBooking) {
        setDeclinedNotification(unseenDeclinedBooking);
      }

      // Find the first unacknowledged completed booking to show as a notification.
      const unseenCompletedBooking = bookings.find(b => b.status === 'completed' && !b.completion_seen);
      if (unseenCompletedBooking) {
        setCompletedNotification(unseenCompletedBooking);
      }
    } catch (e) { console.error(e); }
  }, [currentUserId]);

  const fetchChatThreads = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const res  = await fetch(`${API}/api/messages/my-chats/${currentUserId}`);
      const data = await res.json();
      const chats = data.chats || [];
      setChatThreads(chats);
      setUnreadMessages(chats.filter(c => c.renter_unread).length);
    } catch (e) { console.error(e); }
  }, [currentUserId]);

  const fetchChatLog = useCallback(async (vendorId) => {
    if (!currentUserId || !vendorId) return;
    try {
      const res  = await fetch(`${API}/api/messages?userA=${currentUserId}&userB=${vendorId}&markReadFor=${currentUserId}`);
      const data = await res.json();
      setChatMessages(data.messages || []);
    } catch (e) { console.error(e); }
  }, [currentUserId]);

  const fetchMyDisputes = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`${API}/api/disputes/user/${currentUserId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      const newOrUpdated = (data.disputes || []).some(d => {
        return d.status !== 'resolved' && !d.renter_seen;
      });
      setHasNewDisputes(newOrUpdated);
    } catch (e) {
      console.error("Failed to fetch disputes for notification", e);
    }
  }, [currentUserId]);

  const fetchMyProfile = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const res = await fetch(`${API}/api/auth/user/${currentUserId}`);
      const data = await res.json();
      if (res.ok) setAccountCredit(data.user?.account_credit || 0);
    } catch (e) { console.error(e); }
  }, [currentUserId]);

  useEffect(() => {
    fetchVendors();
    fetchActiveContract();
    fetchChatThreads();
    fetchMyBookings();
    fetchMyDisputes();
    fetchMyProfile();
    const fetchFeaturedAndAll = async () => {
      try {
        const res = await fetch(`${API}/api/vehicles/all`);
        const data = await res.json();
        if (data.vehicles) {
          setAllVehicles(data.vehicles);
          const availableCars = data.vehicles.filter(v => v.is_available);
          const pool = availableCars.length > 0 ? availableCars : data.vehicles;
          if (pool.length > 0) {
            setFeaturedVehicle(pool[Math.floor(Math.random() * pool.length)]);
          }
        }
      } catch (e) {}
    };
    fetchFeaturedAndAll();
  }, [fetchActiveContract, fetchChatThreads, fetchMyBookings, fetchMyDisputes, fetchMyProfile]);

  // ── Poll bookings every 10s for real-time status alerts ─────────
  useEffect(() => {
    const iv1 = setInterval(fetchMyBookings, 3000);
      const iv2 = setInterval(fetchChatThreads, 5000); // Poll threads every 5s
      const iv3 = setInterval(fetchActiveContract, 3000); // Add this for live location/contract banner syncing
      return () => { clearInterval(iv1); clearInterval(iv2); clearInterval(iv3); };
  }, [fetchMyBookings, fetchChatThreads, fetchActiveContract]);

  useEffect(() => {
    if (!currentUserId) return;
    fetch(`${API}/api/reviews/user/${currentUserId}`)
      .then(r => r.json()).then(d => setMyReviews(d.reviews || [])).catch(() => {});
  }, [currentUserId]);

  useEffect(() => {
    if (!activeChatVendorId) return;
    fetchChatLog(activeChatVendorId);
    const iv = setInterval(() => fetchChatLog(activeChatVendorId), 3000);
    return () => clearInterval(iv);
  }, [activeChatVendorId, fetchChatLog]);

  useEffect(() => {
    let gpsInterval;
    if (sharingLocation && activeContract) {
      const sendLocation = () => {
        navigator.geolocation?.getCurrentPosition(
          async (pos) => {
            try {
              await fetch(`${API}/api/contracts/${activeContract._id}/update-location`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude, tracking_active: true })
              });
            } catch (e) {}
          },
          (err) => console.warn(err),
          { enableHighAccuracy: true }
        );
      };
      sendLocation(); // Trigger immediately on click
      gpsInterval = setInterval(sendLocation, 10000); // Polling every 10 seconds
    }
    return () => clearInterval(gpsInterval);
  }, [sharingLocation, activeContract]);

  

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (location.state?.restoreVendor) {
      handleSelectVendor(location.state.restoreVendor);
    }
   
  }, [location.state]);

  const handleSelectVendor = (v) => {
    setSelectedVendor(v);
    fetchVendorFleet(v._id);
  };

  const openChat = (vendorId, vendorName) => {
    setActiveChatVendorId(vendorId);
    setActiveChatVendorName(vendorName);
    // Mark chat as read
    const chatThread = chatThreads.find(t => t.vendor_id === vendorId);
    if (chatThread && chatThread.renter_unread) {
      fetch(`${API}/api/messages/${chatThread._id}/mark-read/${currentUserId}`, { method: 'PATCH' })
        .then(() => {
          fetchChatThreads(); // Re-fetch to update unread count
        });
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !activeChatVendorId || !currentUserId) return;
    try {
      await fetch(`${API}/api/messages/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id:   currentUserId,
          sender_name: renterName,
          sender_role: 'renter',
          content:     chatInput,
          receiver_id: activeChatVendorId,
          renter_name: renterName,
          renter_email: localStorage.getItem('userEmail') || 'renter@netdrive.pk',
          vendor_name:  activeChatVendorName,
        })
      });
      setChatInput('');
      fetchChatLog(activeChatVendorId);
    } catch (e) { console.error(e); }
  };

  const shareTrackingLink = async () => {
    if (!activeContract) return;
    
    const trackUrl = `${window.location.origin}/track/${activeContract._id}`;
    const shareData = {
      title: 'NetDrive Live Location',
      text: '🚗 Track my live vehicle ride here:',
      url: trackUrl
    };

    try {
      if (navigator.share) await navigator.share(shareData);
      else window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareData.text + ' ' + shareData.url)}`, '_blank');
    } catch (err) {
      navigator.clipboard.writeText(trackUrl);
    }

    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 3000);
  };

  const markReceived = async () => {
    if (!activeContract) return;
    try {
      const res = await fetch(`${API}/api/contracts/${activeContract._id}/mark-delivered`, { 
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        alert('✅ Car Received! Official contract has started.');
        fetchMyBookings();
        fetchActiveContract();
      } else {
        const data = await res.json();
        alert(`❌ Failed: ${data.error || 'Server error'}`);
      }
    } catch(e) { console.error(e); }
  };

  const completeContract = async () => {
    if (!activeContract) return;
    try {
      const res = await fetch(`${API}/api/contracts/${activeContract._id}/complete`, { 
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        alert('✅ Contract Ended! Vehicle returned.');
        setReviewModal({
          bookingId: activeContract._id,
          revieweeId: activeContract.vendor?._id || activeContract.vendor,
          role: 'renter'
        });
        setActiveContract(null);
        fetchMyBookings();
      } else {
        const data = await res.json();
        alert(`❌ Failed: ${data.error || 'Server error'}`);
      }
    } catch(e) { console.error(e); }
  };

  const submitReview = async () => {
    try {
      const res = await fetch(`${API}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId: reviewModal.bookingId,
          reviewer: currentUserId,
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
      fetchMyBookings();
      alert('✅ Review submitted! Thank you.');
    } catch (e) { console.error(e); }
  };

  const dismissDeclinedNotification = async () => {
    if (!declinedNotification) return;
    const bookingId = declinedNotification._id;
    try {
      // Mark as seen on the backend
      await fetch(`${API}/api/contracts/${bookingId}/cancellation-seen`, { method: 'PATCH' });
      // Update local state to prevent re-showing in this session
      setMyBookings(prev => prev.map(b => b._id === bookingId ? { ...b, cancellation_seen: true } : b));
      // Close the modal
      setDeclinedNotification(null);
    } catch (e) {
      console.error("Failed to dismiss notification:", e);
      alert("Could not dismiss notification. Please try again.");
    }
  };

  const dismissCompletedNotification = async () => {
    if (!completedNotification) return;
    const bookingId = completedNotification._id;
    try {
      // Mark as seen on the backend
      await fetch(`${API}/api/contracts/${bookingId}/completion-seen`, { method: 'PATCH' });
      // Update local state to prevent re-showing in this session
      setMyBookings(prev => prev.map(b => b._id === bookingId ? { ...b, completion_seen: true } : b));
      // Close the modal
      setCompletedNotification(null);
    } catch (e) {
      console.error("Failed to dismiss notification:", e);
    }
  };

  const openVendorReviews = async (vendorId, vendorName) => {
    try {
      const res = await fetch(`${API}/api/reviews/user/${vendorId}`);
      const data = await res.json();
      setVendorReviews(data.reviews || []);
      setReviewTargetName(vendorName);
      setShowReviewsModal(true);
    } catch (e) { console.error(e); }
  };

  const handleBookNow = (vehicle) => {
    const vendorIdForNav = vehicle.vendor_id?._id || vehicle.vendor_id;

    // Pass only IDs to force VehicleDetails page to fetch fresh data
    navigate('/renter/vehicle', { state: { vehicleId: vehicle._id, vendorId: vendorIdForNav } });
  };

  const handleLogout = () => { localStorage.clear(); navigate('/login'); };

  const filters = ['All', 'SUV', 'Luxury', 'Sports', 'Electric'];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Real-time Booking Status Alert Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {/* Sidebar Navigation */}
      <div className="fixed left-0 top-0 h-full w-56 bg-slate-900 flex flex-col z-20">
        <div className="px-6 pt-7 pb-5">
          <h1 className="text-xl font-black text-white tracking-tight">
            NETDRIVE<span className="text-blue-400">.</span>
          </h1>
        </div>
        <nav className="flex-1 px-3 space-y-0.5">
          {navItems.map(({ id, label, emoji }) => (
            <button key={id}
              onClick={() => { setActiveTab(id); setSelectedVendor(null); setActiveFilter('All'); if (id === 'bookings') fetchMyBookings(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                activeTab === id && !selectedVendor ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}>
              {id === 'chats' && unreadMessages > 0 && <span className="ml-auto bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadMessages}</span>}
              {id === 'disputes' && hasNewDisputes && <span className="absolute right-3 w-2 h-2 rounded-full bg-red-400" />}
              <span className="text-base leading-none">{emoji}</span>{label}
            </button>
          ))}
        </nav>
        <div className="px-3 pb-5 border-t border-slate-800 pt-3">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Panel Pane Container */}
      <div className="ml-56 flex-1 flex flex-col">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-8 py-3 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={selectedVendor ? "Search this vendor's fleet..." : (activeTab === 'bookings' || activeTab === 'transactions') ? "Search bookings by car, date, or price..." : "Search vendors or car models..."}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm placeholder-gray-400 outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2.5">
            {accountCredit > 0 && (
              <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full">
                💰 Rs. {accountCredit.toLocaleString()} Credit
              </div>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-800 leading-tight">{renterName}</p>
              <p className="text-xs text-emerald-600 font-medium">✓ Client Session</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
              {firstName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        <div className="flex-1 p-8">
          {selectedVendor ? (
            <div>
              <button onClick={() => setSelectedVendor(null)} className="text-sm text-blue-600 font-semibold mb-4 flex items-center gap-1 hover:underline">← Back</button>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 flex justify-between items-start">
                <div className="flex gap-4 items-center">                  
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-2xl font-bold overflow-hidden border shadow">
                    {selectedVendor.profile_photo && typeof selectedVendor.profile_photo === 'string' ? (
                      <img src={`${API}/${selectedVendor.profile_photo.replace(/\\/g, '/')}`} alt={selectedVendor.full_name} className="w-full h-full object-cover" />
                    ) : (
                      (selectedVendor.full_name?.charAt(0) || 'V').toUpperCase()
                    )}
                  </div>
                  <div>
                    <span className="bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md">Verified Fleet Partner</span>
                    <h2 className="text-2xl font-black text-slate-800 mt-1 capitalize">{selectedVendor.full_name}</h2>
                <p className="text-slate-400 text-sm flex items-center gap-1 mt-1"><MapPin size={14} />{selectedVendor.vendor_address || 'DHA Phase 6, Karachi'}</p>
                  </div>
                </div>
                <button onClick={() => openChat(selectedVendor._id, selectedVendor.full_name)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition"><MessageSquare size={15} /> Chat with Vendor</button>
              </div>

              <h3 className="text-lg font-bold text-slate-800 mb-4">Available Fleet</h3>
              {vendorFleet.length === 0 ? (
                <div className="bg-white border rounded-2xl p-12 text-center text-slate-400 text-sm">No vehicles listed by this vendor yet.</div>
              ) : (
                <div className="grid grid-cols-3 gap-5">{
                  vendorFleet.filter(c => {
                    const searchMatch = `${c.make || ''} ${c.model_year || ''} ${c.category || ''}`.toLowerCase().includes((searchTerm || '').toLowerCase());
                    const catFilter = activeFilter === 'Sports' ? 'sport' : activeFilter.toLowerCase();
                    const categoryMatch = activeFilter === 'All' || c.category?.toLowerCase() === catFilter;
                    return searchMatch && categoryMatch;
                  }).map(c => (
                    <div key={c._id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] transition-all group cursor-pointer" onClick={() => handleBookNow({ ...c, vendor_id: selectedVendor._id })}>
                      <div className="relative h-44 overflow-hidden bg-gray-100">
                        <img src={c.photos?.[0] ? (c.photos[0].startsWith('http') ? c.photos[0] : `${API}/${c.photos[0].replace(/\\/g, '/')}`) : 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&q=80'} alt={c.make} className="w-full h-full object-cover" />
                        <span className="absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 uppercase">{c.category}</span>
                      </div>
                      <div className="p-4">
                        <h4 className="font-bold text-slate-800 text-base">{c.make}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">Model Year: {c.model_year} · Reg: {c.registration_no}</p>
                        <div className="mt-4 pt-3 border-t flex items-center justify-between">
                          <span className="text-lg font-black text-slate-800">Rs. {parseInt(c.price_per_day || 0).toLocaleString()}/day</span>
                          {c.is_available !== false && c.status === 'active' ? (
                            <button onClick={(e) => { e.stopPropagation(); handleBookNow({ ...c, vendor_id: selectedVendor._id }); }} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-sm">
                              <Calendar size={13} /> Book Now
                            </button>
                          ) : (
                            <span className="text-xs bg-gray-100 border text-gray-500 font-bold px-3 py-2 rounded-xl cursor-not-allowed">🚫 Booked / Blocked</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <div>
                  {activeContract?.tracking_active && activeContract?.delivery_mode === 'dropoff' && activeContract?.status === 'confirmed' && (
                    <div className="relative rounded-2xl overflow-hidden mb-8 bg-slate-900 text-white p-6 flex flex-col md:flex-row justify-between gap-6 shadow-md">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">Live Trip Active</span>
                        </div>
                        <h2 className="text-2xl font-black tracking-tight">Vehicle Dispatch Tracker</h2>
                        <p className="text-slate-400 text-xs mt-1">{activeContract.vehicle?.make || 'Your vehicle'} · Vendor: {activeContract.vendor?.full_name || ''}</p>
                        <div className="flex gap-2 mt-4">
                          <button onClick={shareTrackingLink} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"><Share2 size={13} />{linkCopied ? 'Link Copied!' : 'Share Live Link'}</button>
                        </div>
                      </div>
                      <div className="w-full md:w-80 h-48 bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                        {isLoaded && mapsApiKey ? (
                          <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={{ lat: activeContract.current_lat || 24.8607, lng: activeContract.current_lng || 67.0011 }} zoom={14} options={{ disableDefaultUI: true }}>
                            <MarkerF position={{ lat: Number(activeContract.current_lat) || 24.8607, lng: Number(activeContract.current_lng) || 67.0011 }} />
                            {activeContract.delivery_mode === 'dropoff' && activeContract.delivery_lat && (
                              <MarkerF position={{ lat: Number(activeContract.delivery_lat), lng: Number(activeContract.delivery_lng) }} icon="http://maps.google.com/mapfiles/ms/icons/blue-dot.png" />
                            )}
                          </GoogleMap>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center bg-slate-950 p-4">
                            <span>🛰️ GPS Delivery Tracker Active</span>
                            <span className="text-[10px] text-slate-600 mt-1 font-mono">Lat: {activeContract.current_lat?.toFixed(4)} · Lng: {activeContract.current_lng?.toFixed(4)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeContract?.status === 'active' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-8 flex flex-col md:flex-row items-start md:items-center justify-between shadow-sm gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-emerald-800 text-sm">🚗 Official Contract Active</p>
                          {sharingLocation && (
                            <span className="bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Live Location On
                            </span>
                          )}
                        </div>
                        <p className="text-emerald-600 text-xs mt-1">Your rental period is active. Return by {new Date(activeContract.end_date).toLocaleDateString()}</p>
                        
                        <button 
                          onClick={async () => {
                            if (!sharingLocation) {
                              shareTrackingLink();
                              setSharingLocation(true);
                            } else {
                              setSharingLocation(false);
                              try { await fetch(`${API}/api/contracts/${activeContract._id}/update-location`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tracking_active: false }) }); } catch(e) {}
                            }
                          }}
                          className={`mt-3 px-4 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm w-fit ${
                            sharingLocation ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-blue-600 hover:bg-blue-500 text-white'
                          }`}
                        >
                          <Share2 size={13} />
                          {sharingLocation ? 'Stop Sharing Location' : (linkCopied ? 'Link Copied!' : 'Share Live Location')}
                        </button>
                      </div>
                    </div>
                  )}

                  {activeContract && activeContract.status === 'confirmed' && !activeContract.tracking_active && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-amber-800 text-sm">📋 Waiting for Booking Confirmation — Waiting for Vendor</p>
                        <p className="text-amber-600 text-xs mt-1">{activeContract.vehicle?.make || 'Your vehicle'} · {new Date(activeContract.start_date).toLocaleDateString()} → {new Date(activeContract.end_date).toLocaleDateString()}</p>
                      </div>
                      <span className="text-xs bg-amber-200 text-amber-800 font-bold px-3 py-1.5 rounded-xl">Pending Delivery Start</span>
                    </div>
                  )}

                  <div className="relative h-64 rounded-3xl overflow-hidden mb-8 shadow-sm">
                    <img
                      src="https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1600&q=85"
                      alt="Featured luxury car"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-transparent flex flex-col justify-center px-10">
                      <h2 className="text-3xl font-black text-white leading-tight mb-2">Drive Your Dream<br />Today.</h2>
                      <p className="text-slate-300 text-sm mb-5 max-w-xs">Browse Karachi's best vendor showrooms and book instantly.</p>
                      <button onClick={() => setActiveTab('vendors')} className="w-fit px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition">Browse Vendors</button>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-6">
                    {filters.map(f => (
                      <button key={f} onClick={() => setActiveFilter(f)} className={`px-5 py-2 rounded-full text-sm font-medium border transition ${activeFilter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>{f}</button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-800">Verified Showrooms in Karachi</h3>
                    <span className="text-sm text-slate-400">{vendors.length} Showrooms</span>
                  </div>
                  <div className="grid grid-cols-3 gap-5">
                    {vendors.filter(v => {
                      const search = (searchTerm || '').toLowerCase();
                      const matchesVendor = v.full_name?.toLowerCase().includes(search);
                      const matchesCar = allVehicles.some(car => 
                        (car.vendor_id?._id === v._id || car.vendor_id === v._id) && 
                        `${car.make || ''} ${car.model_year || ''} ${car.category || ''}`.toLowerCase().includes(search)
                      );
                      const matchesCategory = activeFilter === 'All' || allVehicles.some(car => {
                        const isVendorCar = car.vendor_id?._id === v._id || car.vendor_id === v._id;
                        const filterCat = activeFilter === 'Sports' ? 'sport' : activeFilter.toLowerCase();
                        return isVendorCar && car.category?.toLowerCase() === filterCat;
                      });
                      return (matchesVendor || matchesCar) && matchesCategory;
                    }).map(v => (
                      <div key={v._id} onClick={() => handleSelectVendor(v)} className="bg-white rounded-2xl border border-gray-100 hover:shadow-2xl hover:scale-[1.03] hover:-translate-y-1 cursor-pointer transition-all duration-300 p-5 flex flex-col justify-between h-56 group">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="bg-blue-50 text-blue-700 text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded">COMMERCIAL</span>
                            <button onClick={(e) => { e.stopPropagation(); openVendorReviews(v._id, v.full_name); }} className="flex items-center text-amber-500 text-xs font-bold gap-0.5 hover:underline"><Star size={12} className="fill-amber-500"/> View Reviews</button>
                          </div>
                          <div className="flex gap-3 items-center mt-4">                            
                            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xl font-bold overflow-hidden border shrink-0 shadow">
                              {v.profile_photo && typeof v.profile_photo === 'string' ? (
                                <img src={`${API}/${v.profile_photo.replace(/\\/g, '/')}`} alt={v.full_name} className="w-full h-full object-cover" />
                              ) : (
                                (v.full_name?.charAt(0) || 'V').toUpperCase()
                              )}
                            </div>
                            <div className="overflow-hidden">
                              <h4 className="font-bold text-slate-800 text-base capitalize truncate group-hover:text-blue-600 transition">{v.full_name}</h4>
                          <p className="text-xs text-slate-400 mt-0.5 truncate flex items-center gap-0.5"><MapPin size={11} />{v.vendor_address || 'Clifton, Karachi'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <button onClick={(e) => { e.stopPropagation(); openChat(v._id, v.full_name); }} className="text-xs text-blue-600 font-bold flex items-center gap-1 hover:underline"><MessageSquare size={12} /> Chat</button>
                          <span className="text-xs font-bold text-blue-600 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">View Fleet <ChevronRight size={13} /></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'vendors' && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-6">Verified Vendors</h2>
                  <div className="grid grid-cols-2 gap-5">
                    {vendors.filter(v => {
                      const search = (searchTerm || '').toLowerCase();
                      const matchesVendor = v.full_name?.toLowerCase().includes(search);
                      const matchesCar = allVehicles.some(car => 
                        (car.vendor_id?._id === v._id || car.vendor_id === v._id) && 
                        `${car.make || ''} ${car.model_year || ''} ${car.category || ''}`.toLowerCase().includes(search)
                      );
                      const matchesCategory = activeFilter === 'All' || allVehicles.some(car => {
                        const isVendorCar = car.vendor_id?._id === v._id || car.vendor_id === v._id;
                        const filterCat = activeFilter === 'Sports' ? 'sport' : activeFilter.toLowerCase();
                        return isVendorCar && car.category?.toLowerCase() === filterCat;
                      });
                      return (matchesVendor || matchesCar) && matchesCategory;
                    }).map(v => (
                      <div key={v._id} onClick={() => handleSelectVendor(v)} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02] cursor-pointer transition-all duration-300 group">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xl font-bold overflow-hidden border shrink-0">
                            {v.profile_photo && typeof v.profile_photo === 'string' ? (
                              <img src={`${API}/${v.profile_photo.replace(/\\/g, '/')}`} alt={v.full_name} className="w-full h-full object-cover" />
                            ) : (
                              (v.full_name?.charAt(0) || 'V').toUpperCase()
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800">{v.full_name}</h4>
                            <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5"><MapPin size={11} />{v.vendor_address || 'Gulshan-e-Iqbal, Karachi'}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); openVendorReviews(v._id, v.full_name); }} className="text-xs px-3 py-2 border rounded-xl text-amber-600 font-bold hover:bg-amber-50 transition flex items-center gap-1"><Star size={12} className="fill-amber-600"/> Reviews</button>
                          <button onClick={(e) => { e.stopPropagation(); openChat(v._id, v.full_name); }} className="text-xs px-3 py-2 border rounded-xl text-blue-600 font-bold hover:bg-blue-50 transition flex items-center gap-1"><MessageSquare size={12} /> Chat</button>
                          <span className="text-xs px-3 py-2 bg-blue-600 text-white rounded-xl font-bold transition group-hover:bg-blue-500">Fleet →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'chats' && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-6">Messages</h2>
                  {chatThreads.length === 0 ? (
                    <div className="bg-white border rounded-2xl p-16 text-center text-slate-400">
                      <MessageSquare size={36} className="text-gray-200 mx-auto mb-4" />
                      <h3 className="font-semibold text-slate-700 mb-2">No conversations yet</h3>
                      <p className="text-sm">When you message a vendor, your chats will appear here.</p>
                    </div>
                  ) : (
                    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
                      {chatThreads.map(t => (
                        <button key={t._id} onClick={() => openChat(t.vendor_id, t.vendor_name)} className={`w-full text-left px-5 py-4 border-b border-gray-50 hover:bg-gray-50 transition flex items-center justify-between ${activeChatVendorId === t.vendor_id ? 'bg-blue-50' : ''}`}>
                          <div>
                            <p className="font-semibold text-sm text-slate-800">{t.vendor_name}</p>
                            <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{t.messages?.[t.messages.length - 1]?.content || 'No messages'}</p>
                          </div>
                          <span className="text-xs text-blue-600 font-bold shrink-0 ml-4">Open →</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'bookings' && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-6">My Bookings</h2>
                  {myBookings.length === 0 ? (
                    <div className="bg-white border rounded-2xl p-16 text-center text-slate-400">No bookings yet. Browse a vendor's fleet and hit "Book Now".</div>
                  ) : (
                    <div className="space-y-4">
                      {myBookings.filter(b => {
                        const search = (searchTerm || '').toLowerCase();
                        const carMatch = `${b.vehicle?.make || ''} ${b.vehicle?.model_year || ''} ${b.vehicle?.category || ''}`.toLowerCase().includes(search);
                        const vendorMatch = (b.vendor?.full_name || '').toLowerCase().includes(search);
                        const statusMatch = (b.status || '').toLowerCase().includes(search);
                        const dateMatch = new Date(b.start_date).toLocaleDateString().includes(search) || new Date(b.end_date).toLocaleDateString().includes(search);
                        const priceMatch = (b.total_price || '').toString().includes(search);
                        return carMatch || vendorMatch || statusMatch || dateMatch || priceMatch;
                      }).map(b => (
                        <div key={b._id} className="bg-white border rounded-2xl p-5 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-slate-800">{b.vehicle?.make || 'Vehicle'}</p>
                              <div className="text-xs text-slate-400 mt-1">
                                <p>Vendor: <span className="font-medium text-slate-500">{b.vendor?.full_name || 'N/A'}</span></p>
                                <p>{new Date(b.start_date).toLocaleDateString()} → {new Date(b.end_date).toLocaleDateString()}</p>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">Total: Rs. {parseInt(b.total_price || 0).toLocaleString()}</p>
                              {b.with_driver && (
                                <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1.5"><UserCheck size={13}/> + Driver ({b.driver_dates?.length || 0} day(s))</p>
                              )}
                              {b.fuel_price > 0 && (
                                <p className="text-xs text-amber-600 font-semibold mt-1 flex items-center gap-1.5"><Fuel size={13}/> + Fuel (Rs. {b.fuel_price.toLocaleString()})</p>
                              )}
                            </div>
                            <div className="text-right">
                              <span className={`text-xs font-bold px-3 py-1.5 rounded-xl ${
                                b.status === 'active'     ? 'bg-emerald-100 text-emerald-700' :
                                b.status === 'confirmed'  ? 'bg-amber-100 text-amber-700'    :
                                b.status === 'cancelled'  ? 'bg-red-100 text-red-700'        :
                                                            'bg-gray-100 text-gray-600'
                              }`}>{b.status}</span>
                              {b.tracking_active && <p className="text-[10px] text-emerald-600 font-bold mt-1">● Live Tracking On</p>}
                            </div>
                          </div>
                          {b.status === 'cancelled' && b.decline_reason && (
                            <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs">
                              <span className="font-bold">Declined by Vendor:</span> {b.decline_reason}
                                {b.payment_status === 'refunded' && (
                                  <p className="mt-1 font-semibold text-red-600">Your card has been fully refunded via Stripe.</p>
                                )}
                            </div>
                          )}
                          {b.status === 'completed' && !b.renter_reviewed_vendor && (
                            <button
                              onClick={() => {
                                setReviewModal({ bookingId: b._id, revieweeId: b.vendor?._id || b.vendor, role: 'renter' });
                                setReviewData({ rating: 5, comment: '' });
                              }}
                              className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100 transition"
                            >
                              <Star size={12} className="fill-amber-500 text-amber-500"/> Leave a Review
                            </button>
                          )}
                          {b.status === 'completed' && b.renter_reviewed_vendor && (
                            <p className="mt-2 text-[11px] text-emerald-600 font-semibold flex items-center gap-1"><Star size={11} className="fill-emerald-500 text-emerald-500"/> Review submitted</p>
                          )}
                          {b.status === 'completed' && (
                            <button onClick={() => setDisputeModal(b)} className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition">
                              <AlertCircle size={13} /> Report an Issue
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'transactions' && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-6">Transactions</h2>
                  {myBookings.length === 0 ? (
                    <div className="bg-white border rounded-2xl p-16 text-center text-slate-400">No transaction records logged.</div>
                  ) : (
                    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                          <tr>
                            <th className="p-4 font-semibold">Date</th>
                            <th className="p-4 font-semibold">Vehicle</th>
                            <th className="p-4 font-semibold">Vendor</th>
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {myBookings.filter(b => {
                            const search = (searchTerm || '').toLowerCase();
                            const carMatch = `${b.vehicle?.make || ''} ${b.vehicle?.model_year || ''} ${b.vehicle?.category || ''}`.toLowerCase().includes(search);
                            const vendorMatch = (b.vendor?.full_name || '').toLowerCase().includes(search);
                            const statusMatch = (b.status || '').toLowerCase().includes(search);
                            const dateMatch = new Date(b.createdAt).toLocaleDateString().includes(search);
                            const priceMatch = (b.total_price || '').toString().includes(search);
                            return carMatch || vendorMatch || statusMatch || dateMatch || priceMatch;
                          }).map(b => (
                            <tr key={b._id} className="hover:bg-slate-50/50 transition">
                              <td className="p-4 text-slate-600">{new Date(b.createdAt).toLocaleDateString()}</td>
                              <td className="p-4 font-medium text-slate-800">{b.vehicle?.make || 'N/A'}</td>
                              <td className="p-4 text-slate-600">{b.vendor?.full_name || 'N/A'}</td>
                              <td className="p-4">
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                                  b.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                  b.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>{b.status}</span>
                              </td>
                              <td className="p-4 text-right font-bold text-slate-800">Rs. {parseInt(b.total_price || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'myreviews' && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-6">My Reviews</h2>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Reviews I Left Vendors</h3>
                      {myBookings.filter(b => b.renter_reviewed_vendor).length === 0 ? (
                        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-slate-400 text-sm">You haven't reviewed any vendors yet.</div>
                      ) : (
                        <div className="space-y-3">
                          {myBookings.filter(b => b.renter_reviewed_vendor).map(b => (
                            <div key={b._id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                              <p className="font-bold text-slate-800 text-sm">{b.vehicle?.make || 'Vehicle'}</p>
                              <p className="text-xs text-slate-400 mt-0.5">Vendor: {b.vendor?.full_name}</p>
                              <p className="text-[11px] text-emerald-600 font-semibold mt-2 flex items-center gap-1"><Star size={11} className="fill-emerald-500 text-emerald-500"/> Review submitted</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Reviews About Me</h3>
                      {myReviews.length === 0 ? (
                        <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center text-slate-400 text-sm">No vendor reviews about you yet.</div>
                      ) : (
                        <div className="space-y-3">
                          {myReviews.map(r => (
                            <div key={r._id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
                              <div className="flex justify-between items-start mb-1">
                                <p className="font-bold text-slate-800 text-sm">{r.reviewer?.full_name || 'Vendor'}</p>
                                <p className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</p>
                              </div>
                              <div className="flex gap-0.5 mb-2">
                                {[1,2,3,4,5].map(s => <Star key={s} size={12} className={s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}/>)}
                              </div>
                              <p className="text-xs text-slate-600 italic">"{r.comment}"</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'disputes' && (
                <div>
                  <UserDisputesList userId={currentUserId} />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {disputeModal && (
        <ReportIssueModal booking={disputeModal} currentUser={{ id: currentUserId }} onClose={() => setDisputeModal(null)} />
      )}

      {/* Floating Chat Panel */}
      {activeChatVendorId && (
        <div className="fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden flex flex-col h-[450px]">
          <div className="bg-slate-900 px-4 py-3 flex justify-between items-center text-white">
            <div>
              <h4 className="font-bold text-sm">{activeChatVendorName}</h4>
              <p className="text-xs text-emerald-400">● Live Chat</p>
            </div>
            <button onClick={() => setActiveChatVendorId(null)} className="text-slate-400 hover:text-white text-sm font-bold">✕</button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50">
            {chatMessages.length === 0 ? (
              <div className="text-center text-slate-400 mt-10">No messages yet. Say hello!</div>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender_id === currentUserId ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-sm ${msg.sender_id === currentUserId ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white text-slate-800 rounded-tl-sm border border-slate-200'}`}>
                    <p className={`font-bold text-[10px] mb-1 ${msg.sender_id === currentUserId ? 'text-blue-200' : 'text-slate-400'}`}>{msg.sender_name}</p>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
            <input type="text" placeholder="Type a message..." value={chatInput} onChange={e => {
                const text = e.target.value;
                if (text.trim().split(/\s+/).filter(Boolean).length <= 50) setChatInput(text);
              }} onKeyDown={e => e.key === 'Enter' && handleSendMessage()} className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition" />
            <button onClick={handleSendMessage} className="w-10 h-10 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center shrink-0 transition shadow-sm"><Send size={16} /></button>
          </div>
        </div>
      )}

  {reviewModal && (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-slate-900 p-5 flex justify-between items-center text-white">
          <h3 className="font-black text-lg flex items-center gap-2"><Star size={18} className="text-amber-400 fill-amber-400"/> Rate Your Experience</h3>
          <button onClick={() => setReviewModal(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 font-medium">How was your rental experience with this vendor?</p>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Rating (1-5)</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} type="button" onClick={() => setReviewData({...reviewData, rating: star})} className={`transition-colors ${star <= reviewData.rating ? 'text-amber-400' : 'text-slate-200 hover:text-amber-200'}`}>
                  <Star size={32} className={star <= reviewData.rating ? 'fill-amber-400' : ''} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Comment</label>
            <textarea rows="3" value={reviewData.comment} onChange={e => {
              const text = e.target.value;
              if (text.trim().split(/\s+/).filter(Boolean).length <= 50) setReviewData({...reviewData, comment: text});
            }} placeholder="Share your feedback..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"></textarea>
            <p className="text-xs text-slate-400 mt-1 text-right">{reviewData.comment.trim().split(/\s+/).filter(Boolean).length}/50 words</p>
          </div>
          <button onClick={submitReview} disabled={!reviewData.comment.trim()} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition text-sm">Submit Review</button>
        </div>
      </div>
    </div>
  )}

  {/* Global Vendor Ratings View Modal */}
  {showReviewsModal && (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
        <div className="bg-slate-900 p-5 flex justify-between items-center text-white shrink-0">
          <h3 className="font-black text-lg flex items-center gap-2"><Star size={18} className="text-amber-400 fill-amber-400"/> {reviewTargetName}'s Reviews</h3>
          <button onClick={() => setShowReviewsModal(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-6 overflow-y-auto space-y-4 bg-slate-50">
          {vendorReviews.length === 0 ? (
            <div className="text-center text-slate-400 py-8">No reviews yet for this vendor.</div>
          ) : (
            vendorReviews.map(r => (
              <div key={r._id} className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{r.reviewer?.full_name || 'User'}</p>
                    <p className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={12} className={i < r.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-slate-600 italic">"{r.comment}"</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )}

  {declinedNotification && (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-red-600 p-5 flex justify-between items-center text-white">
          <h3 className="font-black text-lg flex items-center gap-2">Contract Declined</h3>
          <button onClick={dismissDeclinedNotification} className="text-white/70 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 font-medium">Your booking for <span className="font-bold text-slate-800">{declinedNotification.vehicle?.make}</span> has been declined by the vendor.</p>
          <div className="bg-red-50 border border-red-100 p-4 rounded-xl">
            <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">Reason Provided:</p>
            <p className="text-sm text-red-700 italic">"{declinedNotification.decline_reason}"</p>
          </div>
          <button onClick={dismissDeclinedNotification} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition text-sm">Acknowledge & Dismiss</button>
        </div>
      </div>
    </div>
  )}

  {completedNotification && (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-blue-600 p-5 flex justify-between items-center text-white">
          <h3 className="font-black text-lg flex items-center gap-2"><CheckCircle size={18}/> Contract Completed</h3>
          <button onClick={dismissCompletedNotification} className="text-white/70 hover:text-white"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 font-medium">Your rental for the <span className="font-bold text-slate-800">{completedNotification.vehicle?.make}</span> with <span className="font-bold text-slate-800">{completedNotification.vendor?.full_name}</span> is now complete.</p>
          <p className="text-xs text-slate-500">We hope you had a great experience. Please consider leaving a review to help other renters.</p>
          <div className="flex gap-3 mt-2">
            <button onClick={dismissCompletedNotification} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition text-sm">Dismiss</button>
            <button onClick={() => {
              setReviewModal({ bookingId: completedNotification._id, revieweeId: completedNotification.vendor?._id || completedNotification.vendor, role: 'renter' });
              setReviewData({ rating: 5, comment: '' });
              dismissCompletedNotification();
            }} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition text-sm flex items-center justify-center gap-1.5">
              <Star size={14}/> Leave a Review
            </button>
          </div>
        </div>
      </div>
    </div>
  )}
    </div>
  );
}


