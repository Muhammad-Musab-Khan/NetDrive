import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Car, ShieldCheck, LogOut, TrendingUp, Clock, CheckCircle, XCircle, Eye, Star, MessageSquare, FileText, Search, Trash2, Ban, ShieldOff, ShieldX, AlertCircle } from 'lucide-react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import AdminDisputeTable from './AdminDisputeTable';
import AdminPaymentsTable from './AdminPaymentsTable';

const API = 'http://localhost:5000';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [globalContracts, setGlobalContracts] = useState([]);
  const [interceptedChats, setInterceptedChats] = useState([]);
  const [selectedChatIdx, setSelectedChatIdx] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const navigate = useNavigate();

  const mapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
  const libraries = useMemo(() => ['places'], []);
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: mapsApiKey,
    disabled: !mapsApiKey,
    libraries
  });

  useEffect(() => {
    if (!localStorage.getItem('adminToken')) {
      navigate('/admin/login');
    }
  }, [navigate]);

  useEffect(() => {
    fetchAdminData();

    // Silent polling for live admin map broadcasts
    const pollContracts = async () => {
      const adminHeaders = { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` };
      try {
        const contractRes = await fetch('http://localhost:5000/api/contracts/all', { headers: adminHeaders });
        const contractData = await contractRes.json();
        setGlobalContracts(contractData.contracts || []);
      } catch(e) {}
    };
    
    const iv = setInterval(() => {
      pollContracts();
      fetchAdminData();
    }, 10000);
    return () => clearInterval(iv);
  }, [activeTab]);

  const fetchAdminData = async () => {
    if (users.length === 0) setLoading(true);
    const adminHeaders = { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` };
    try {
      // 1. Fetch Users array payload from active production database
      const userRes = await fetch('http://localhost:5000/api/auth/admin/users', { headers: adminHeaders });
      const userData = await userRes.json();
      setUsers(userData.users || []);

      // 2. Fetch Active Peer Contracts logged inside backend pipeline collections
      const contractRes = await fetch('http://localhost:5000/api/contracts/all', { headers: adminHeaders });
      const contractData = await contractRes.json();
      setGlobalContracts(contractData.contracts || []);

      // 3. Intercept global database communication threads for regulatory auditing
      const chatRes = await fetch('http://localhost:5000/api/messages/global-intercept', { headers: adminHeaders });
      const chatData = await chatRes.json();
      setInterceptedChats(chatData.threads || []);

      // 4. Fetch All Platform Reviews
      const reviewRes = await fetch('http://localhost:5000/api/reviews', { headers: adminHeaders });
      const reviewData = await reviewRes.json();
      setReviews(reviewData.reviews || []);

      // 5. Fetch All Vehicles platform-wide
      const vehicleRes = await fetch('http://localhost:5000/api/vehicles/all?admin=true', { headers: adminHeaders });
      const vehicleData = await vehicleRes.json();
      setVehicles(vehicleData.vehicles || []);
    } catch (err) {
      console.error('Administrative backend pipeline synchronization failed:', err);
    } finally {
      if (users.length === 0) setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  const deleteReview = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/reviews/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` } });
      setReviews(reviews.filter(r => r._id !== id));
    } catch (e) { console.error(e); }
  };

  // --- Admin Moderation Actions ---
  const toggleBanUser = async (userId, currentlyBanned) => {
    setActionMsg('');
    try {
      const res = await fetch(`${API}/api/auth/admin/users/${userId}/ban`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
        body: JSON.stringify({ banned: !currentlyBanned }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Action failed.');
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, status: !currentlyBanned ? 'banned' : 'approved' } : u));
      setActionMsg(`✅ User ${!currentlyBanned ? 'banned' : 'unbanned'} successfully.`);
    } catch (e) {
      setActionMsg(`❌ ${e.message}`);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Permanently delete this user account? This cannot be undone.')) return;
    setActionMsg('');
    try {
      const res = await fetch(`${API}/api/auth/admin/users/${userId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Delete failed.');
      setUsers(prev => prev.filter(u => u._id !== userId));
      setActionMsg('✅ User deleted successfully.');
    } catch (e) {
      setActionMsg(`❌ ${e.message}`);
    }
  };

  const deleteVehicleAdmin = async (vehicleId) => {
    if (!window.confirm('Permanently delete this vehicle listing?')) return;
    setActionMsg('');
    try {
      const res = await fetch(`${API}/api/vehicles/${vehicleId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Delete failed.');
      setVehicles(prev => prev.filter(v => v._id !== vehicleId));
      setActionMsg('✅ Vehicle deleted successfully.');
    } catch (e) {
      setActionMsg(`❌ ${e.message}`);
    }
  };

  const toggleVehicleStatusAdmin = async (vehicleId) => {
    setActionMsg('');
    try {
      const currentVehicle = vehicles.find(v => v._id === vehicleId);
      const isSuspended = currentVehicle?.status === 'suspended';
      const endpoint = isSuspended ? 'admin-unsuspend' : 'admin-suspend';

      const res = await fetch(`${API}/api/vehicles/${vehicleId}/${endpoint}`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.msg || 'Action failed.');

      const newStatus = isSuspended ? 'active' : 'suspended';
      setVehicles(prev => prev.map(v => v._id === vehicleId ? { ...v, status: newStatus } : v));
      setActionMsg(`✅ Vehicle status set to ${newStatus}.`);
    } catch (e) {
      setActionMsg(`❌ ${e.message}`);
    }
  };

  const deleteChatThread = async (threadId) => {
    if (!window.confirm('Permanently delete this entire chat thread?')) return;
    setActionMsg('');
    try {
      const res = await fetch(`${API}/api/messages/thread/${threadId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Delete failed.');
      setInterceptedChats(prev => prev.filter(t => t._id !== threadId));
      setSelectedChatIdx(0);
      setActionMsg('✅ Chat thread deleted successfully.');
    } catch (e) {
      setActionMsg(`❌ ${e.message}`);
    }
  };

  const navItems = [
    { id: 'overview', label: 'Overview', emoji: '📊' },
    { id: 'users', label: 'Users', emoji: '👥' },
    { id: 'vehicles', label: 'Vehicles', emoji: '🚗' },
    { id: 'chats', label: 'All Chats', emoji: '💬' },
    { id: 'bookings', label: 'Contracts Wire', emoji: '📅' },
    { id: 'reviews', label: 'Moderation', emoji: '⭐' },
    { id: 'disputes', label: 'Disputes', emoji: '🛡️' },
    { id: 'payments', label: 'Cash & Online', emoji: '💳' },
  ];

  // Dynamic KPIs calculated by parsing database responses
  const totalUsers = users.length;
  const vendorsList = users.filter(u => u.roles?.includes('vendor'));
  const pendingVerification = users.filter(u => !u.is_email_verified).length;

  const stats = [
    { label: 'Database Users', value: totalUsers || '0', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Vendors', value: vendorsList.length || '0', icon: Car, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Escrow Contracts', value: globalContracts.length, icon: FileText, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Pending Verification', value: pendingVerification, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Navigation */}
      <div className="fixed left-0 top-0 h-full w-56 bg-slate-900 flex flex-col z-20">
        <div className="px-6 pt-7 pb-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-tight">NETDRIVE<span className="text-blue-400">.</span></h1>
              <p className="text-xs text-slate-500">Superuser Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ id, label, emoji }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left ${
                activeTab === id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}>
              <span className="text-base leading-none">{emoji}</span>
              {label}
            </button>
          ))}
        </nav>

        <div className="px-3 pb-5 border-t border-slate-800 pt-3">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </div>

      {/* Main Content Workspace */}
      <div className="ml-56 flex-1 flex flex-col">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-8 py-3 flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search users, contracts, etc..." className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="flex-1" />
        </div>
        {/* Top Header Panel */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-8 py-3 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 capitalize">{activeTab} Control Workspace</h2>
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white text-xs font-bold">A</div>
        </div>

        <div className="flex-1 p-8">
          {actionMsg && (
            <div className={`mb-4 p-3 rounded-xl text-sm font-semibold ${actionMsg.includes('✅') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
              {actionMsg}
            </div>
          )}
          {/* OVERVIEW METRICS TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                {stats.map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs">
                    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                      <Icon size={18} className={color} />
                    </div>
                    <p className="text-2xl font-bold text-slate-800 mb-1">{value}</p>
                    <p className="text-xs text-slate-400">{label}</p>
                  </div>
                ))}
              </div>

              {/* LIVE AUDITING & SYSTEM LEVEL CHAT INTERCEPT MODULES */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* INTERCEPT MODULE WIRE */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col h-[350px]">
                  <div className="mb-3">
                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                      <MessageSquare size={16} className="text-blue-500" /> Database Live Chat Intercept Wire
                    </h3>
                    <p className="text-slate-400 text-xs">Real-time surveillance of user messages pulled from database channels.</p>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-3 bg-gray-50 rounded-xl p-3 text-xs">
                    {interceptedChats.length === 0 ? (
                      <div className="text-center text-slate-400 p-8">No active chat threads found.</div>
                    ) : (
                      interceptedChats.map((thread, idx) => (
                        <div key={idx} className="bg-white rounded-xl border p-3 shadow-sm">
                          <div className="flex items-center justify-between mb-2 pb-2 border-b">
                            <div className="flex items-center gap-2">
                              <span className="bg-blue-100 text-blue-700 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">Renter</span>
                              <span className="font-semibold text-slate-700">{thread.renter_name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">Vendor</span>
                              <span className="font-semibold text-slate-700">{thread.vendor_name}</span>
                            </div>
                          </div>
                          <div className="space-y-1.5 max-h-32 overflow-y-auto">
                            {thread.messages?.map((msg, mi) => (
                              <div key={mi} className={`flex ${msg.sender_role === 'vendor' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-xl px-2.5 py-1.5 ${
                                  msg.sender_role === 'vendor'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                                    : 'bg-blue-50 text-blue-800 border border-blue-100'
                                }`}>
                                  <p className="font-bold text-[9px] opacity-60 mb-0.5">{msg.sender_name}</p>
                                  <p className="text-[11px]">{msg.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* ONGOING CONTRACT BINDINGS ESCROW TRACER PANEL */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 h-[350px] flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                      <Clock size={16} className="text-amber-500" /> Active Database Contract Bindings
                    </h3>
                    <p className="text-slate-400 text-xs mb-3">Live tracking loops and workflow phases operating across database systems.</p>

                    <div className="space-y-2 overflow-y-auto max-h-[220px]">
                      {globalContracts.length === 0 ? (
                        <div className="text-center text-slate-400 p-8 text-xs">No active contract tokens running on the network.</div>
                      ) : (
                        globalContracts.map((con, i) => (
                          <div key={i} className="border bg-slate-50/50 rounded-xl p-3 text-xs">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-mono font-bold text-slate-700 bg-gray-200 px-1.5 py-0.5 rounded">{con._id}</span>
                              <span className={`font-bold uppercase text-[10px] ${con.tracking_active ? 'text-emerald-600 animate-pulse' : 'text-slate-500'}`}>● Status: {con.status}</span>
                            </div>
                            <p className="text-slate-500 mt-1">Vendor: {con.vendor?.full_name} | Renter: {con.renter?.full_name}</p>
                            {con.tracking_active && isLoaded && (
                              <div className="mt-3 h-32 rounded-lg overflow-hidden border border-slate-200">
                                <GoogleMap mapContainerStyle={{ width: '100%', height: '100%' }} center={{ lat: con.current_lat || 24.8607, lng: con.current_lng || 67.0011 }} zoom={13} options={{ disableDefaultUI: true }}>
                                  <MarkerF position={{ lat: Number(con.current_lat) || 24.8607, lng: Number(con.current_lng) || 67.0011 }} />
                                  {con.delivery_mode === 'dropoff' && con.delivery_lat && (
                                    <MarkerF position={{ lat: Number(con.delivery_lat), lng: Number(con.delivery_lng) }} icon="http://maps.google.com/mapfiles/ms/icons/blue-dot.png" />
                                  )}
                                </GoogleMap>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* DYNAMIC SYSTEM REGISTERED USERS DIRECTORY VIEW */}
          {activeTab === 'users' && (
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50 text-left">
                    {['Full User Name', 'Email Space', 'Assigned Security Role', 'Identity Code (CNIC)', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700 text-sm">
                  {users.filter(u => (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())).map(user => {
                    const isBanned = user.status === 'banned';
                    return (
                    <tr key={user._id} className="hover:bg-gray-50/50 transition">
                      <td className="px-5 py-3.5 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          {user.full_name}
                          {isBanned && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-600 text-white">BANNED</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{user.email}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full capitalize ${user.roles?.includes('vendor') ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                          {user.roles?.[0] || 'renter'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-500 text-xs">{user.cnic_number || 'Unspecified'}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleBanUser(user._id, isBanned)}
                            className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg transition ${isBanned ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'}`}
                          >
                            {isBanned ? <ShieldCheck size={12} /> : <Ban size={12} />} {isBanned ? 'Unban' : 'Ban'}
                          </button>
                          <button
                            onClick={() => deleteUser(user._id)}
                            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}

          {/* VEHICLES DATA BLOCK */}
          {activeTab === 'vehicles' && (
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50 text-left">
                    {['Vehicle', 'Vendor', 'Registration', 'Price/Day', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y text-slate-700 text-sm">
                  {vehicles.filter(v => (v.make || '').toLowerCase().includes(searchTerm.toLowerCase()) || (v.registration_no || '').toLowerCase().includes(searchTerm.toLowerCase())).map(v => (
                    <tr key={v._id} className="hover:bg-gray-50/50 transition">
                      <td className="px-5 py-3.5 font-medium text-slate-800">{v.make} <span className="text-slate-400 font-normal">({v.model_year})</span></td>
                      <td className="px-5 py-3.5 text-slate-500">{v.vendor_id?.full_name || v.vendor_email || 'Unknown'}</td>
                      <td className="px-5 py-3.5 font-mono text-slate-500 text-xs">{v.registration_no}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-700">Rs. {parseInt(v.price_per_day || 0).toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${v.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>{v.status}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleVehicleStatusAdmin(v._id)}
                            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition"
                          >
                            <ShieldOff size={12} /> {v.status === 'active' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            onClick={() => deleteVehicleAdmin(v._id)}
                            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {vehicles.length === 0 && <div className="p-16 text-center text-slate-400 text-sm">No vehicles found in the system.</div>}
            </div>
          )}

          {/* ALL CHATS — SIDEBAR + THREAD VIEW */}
          {activeTab === 'chats' && (
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden flex h-[650px]">
              {/* Sidebar list of all chat threads */}
              <div className="w-72 border-r border-gray-100 flex flex-col shrink-0">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="font-bold text-sm text-slate-800">All Chat Threads ({interceptedChats.length})</h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {interceptedChats.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">No chat threads found.</div>
                  ) : (
                    interceptedChats.map((thread, idx) => (
                      <button
                        key={thread._id || idx}
                        onClick={() => setSelectedChatIdx(idx)}
                        className={`w-full text-left p-4 border-b border-gray-50 transition ${selectedChatIdx === idx ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-slate-800 truncate">{thread.renter_name}</span>
                          <span className="text-[9px] text-slate-400 shrink-0 ml-2">{thread.messages?.length || 0} msgs</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">with {thread.vendor_name}</p>
                        {thread.messages?.length > 0 && (
                          <p className="text-[11px] text-slate-400 truncate mt-1 italic">"{thread.messages[thread.messages.length - 1].content}"</p>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Selected thread detail view */}
              <div className="flex-1 flex flex-col">
                {interceptedChats[selectedChatIdx] ? (
                  <>
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-blue-100 text-blue-700 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">Renter</span>
                          <span className="font-bold text-slate-800">{interceptedChats[selectedChatIdx].renter_name}</span>
                          <span className="text-slate-300">↔</span>
                          <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">Vendor</span>
                          <span className="font-bold text-slate-800">{interceptedChats[selectedChatIdx].vendor_name}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteChatThread(interceptedChats[selectedChatIdx]._id)}
                        className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                      >
                        <Trash2 size={13} /> Delete Thread
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50">
                      {(interceptedChats[selectedChatIdx].messages || []).map((msg, mi) => (
                        <div key={mi} className={`flex ${msg.sender_role === 'vendor' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-xl px-3 py-2 ${
                            msg.sender_role === 'vendor'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                              : 'bg-blue-50 text-blue-800 border border-blue-100'
                          }`}>
                            <p className="font-bold text-[10px] opacity-60 mb-0.5">{msg.sender_name}</p>
                            <p className="text-sm">{msg.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Select a chat thread to view messages.</div>
                )}
              </div>
            </div>
          )}

          {/* COMPLIANCE BOOKINGS TRACK TAB */}
          {activeTab === 'bookings' && (
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                  <tr>
                    <th className="p-4 font-semibold">Date</th>
                    <th className="p-4 font-semibold">Vehicle</th>
                    <th className="p-4 font-semibold">Vendor</th>
                    <th className="p-4 font-semibold">Renter</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {globalContracts.filter(c => {
                    const search = searchTerm.toLowerCase();
                    if (!search) return true;
                    const vehicleMatch = (c.vehicle?.make || '').toLowerCase().includes(search);
                    const vendorMatch = (c.vendor?.full_name || '').toLowerCase().includes(search);
                    const renterMatch = (c.renter?.full_name || '').toLowerCase().includes(search);
                    const statusMatch = (c.status || '').toLowerCase().includes(search);
                    return vehicleMatch || vendorMatch || renterMatch || statusMatch;
                  }).map(c => (
                    <tr key={c._id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 text-slate-600">
                        <div className="font-medium text-slate-700">{new Date(c.createdAt).toLocaleDateString()}</div>
                        {c.status === 'cancelled' && c.decline_reason && (
                          <div className="mt-1.5 text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">Reason: <span className="italic">"{c.decline_reason}"</span></div>
                        )}
                      </td>
                      <td className="p-4 font-medium text-slate-800">{c.vehicle?.make || 'N/A'}</td>
                      <td className="p-4 text-slate-600">{c.vendor?.full_name || 'N/A'}</td>
                      <td className="p-4 text-slate-600">{c.renter?.full_name || 'N/A'}</td>
                      <td className="p-4">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                          c.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                          c.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                          c.status === 'confirmed' ? 'bg-amber-100 text-amber-700' :
                          c.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{c.status}</span>
                      </td>
                      <td className="p-4 text-right font-bold text-slate-800">Rs. {parseInt(c.total_price || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {globalContracts.length === 0 && <div className="p-16 text-center text-slate-400 text-sm">No contracts found in the system.</div>}
            </div>
          )}

      {/* PLATFORM REVIEWS MODERATION VIEW */}
      {activeTab === 'reviews' && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
             <h3 className="font-bold text-slate-800">Platform Reviews</h3>
          </div>
          <div className="divide-y">
            {reviews.map(r => (
               <div key={r._id} className="p-6 flex items-start justify-between hover:bg-gray-50 transition">
                 <div>
                   <div className="flex items-center gap-2 mb-2">
                     <Star size={16} className="text-amber-500 fill-amber-500" />
                     <span className="font-bold text-slate-800">{r.rating} / 5</span>
                     <span className="text-xs px-2 py-1 rounded-full bg-slate-200 text-slate-700 capitalize font-semibold">{r.role} Review</span>
                   </div>
                   <p className="text-sm text-slate-700 mb-2">"{r.comment}"</p>
                   <p className="text-xs text-slate-400 font-medium">By: {r.reviewer?.full_name || 'Unknown'} | To: {r.reviewee?.full_name || 'Unknown'}</p>
                 </div>
                 <button onClick={() => deleteReview(r._id)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm">
                   <XCircle size={14} /> Delete
                 </button>
               </div>
            ))}
            {reviews.length === 0 && <div className="p-16 text-center text-slate-400 text-sm">No reviews found.</div>}
          </div>
        </div>
      )}

          {/* DISPUTES TAB */}
          {activeTab === 'disputes' && (
            <div>
              <AdminDisputeTable />
            </div>
          )}

          {/* ONLINE PAYMENTS TAB */}
          {activeTab === 'payments' && (
            <div>
              <AdminPaymentsTable />
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

