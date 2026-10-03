import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, CheckCircle, Clock, Loader2, ChevronDown, ChevronUp, MessageSquare, Send } from 'lucide-react';

const API_URL = 'http://localhost:5000/api/disputes';
const FILE_BASE = 'http://localhost:5000';

const AdminCommentForm = ({ dispute, handleCommentAdded }) => {
  const [comment, setComment] = useState('');
  const [channel, setChannel] = useState('renter');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSending(true);
    try {
      const res = await axios.post(`${API_URL}/${dispute._id}/comment`, {
        user_id: localStorage.getItem('adminId'), // This can be null, schema is now optional
        user_name: 'Admin',
        comment: comment.trim(),
        role: 'admin',
        channel: channel
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } });
      handleCommentAdded(res.data.disputeId, res.data.comment, res.data.thread);
      setComment('');
    } catch (err) {
      alert('Failed to post comment.');
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-3 bg-slate-100 border border-slate-200 rounded-lg">
      <textarea value={comment} onChange={e => {
        const text = e.target.value;
        if (text.trim().split(/\s+/).filter(Boolean).length <= 50) setComment(text);
      }} placeholder="Add an admin comment..." rows="2" className="w-full p-2 border rounded-md text-sm mb-1"></textarea>
      <p className="text-[10px] text-slate-400 text-right mb-2">{(comment || '').trim().split(/\s+/).filter(Boolean).length}/50 words</p>
      <div className="flex justify-between items-center">
        <select value={channel} onChange={e => setChannel(e.target.value)} className="text-xs p-1 border rounded-md"><option value="renter">Reply to Renter</option><option value="vendor">Reply to Vendor</option></select>
        <button type="submit" disabled={sending} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg disabled:opacity-50">{sending ? 'Sending...' : 'Post Comment'}</button>
      </div>
    </form>
  );
};

export default function AdminDisputeTable() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolvingId, setResolvingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const fetchDisputes = async () => {
    try {
      
      const res = await axios.get(`${API_URL}/all`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      setDisputes(res.data.disputes);
    } catch (err) {
      setError('Failed to fetch disputes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
    const iv = setInterval(fetchDisputes, 5000);
    return () => clearInterval(iv);
  }, []);

  const handleResolve = async (disputeId) => {
    const notes = prompt("Enter resolution notes (optional):");
    if (notes === null) return; // user clicked Cancel — don't touch the dispute

    const rewardInput = prompt("Award account credit to the renter? Enter Rs. amount, or leave blank for none:");
    if (rewardInput === null) return; // clicked Cancel on this prompt too — abort
    const reward_amount = rewardInput && !isNaN(rewardInput) ? Number(rewardInput) : 0;

    setResolvingId(disputeId);
    try {
      await axios.patch(`${API_URL}/resolve/${disputeId}`, { admin_notes: notes, reward_amount }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      fetchDisputes(); // Re-fetch to update the list
    } catch (err) {
      alert('Failed to resolve dispute.');
    } finally {
      setResolvingId(null);
    }
  };

  const handleCommentAdded = (disputeId, newComment, threadName) => {
    setDisputes(prev => prev.map(d => {
      if (d._id === disputeId) {
        return { ...d, [threadName]: [...(d[threadName] || []), newComment] };
      }
      return d;
    }));
  };

  const StatusBadge = ({ status }) => {
    const base = "text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5";
    switch (status) {
      case 'open':
        return <span className={`${base} bg-red-100 text-red-700`}><ShieldAlert size={12} /> Open</span>;
      case 'reviewing':
        return <span className={`${base} bg-amber-100 text-amber-700`}><Clock size={12} /> Reviewing</span>;
      case 'resolved':
        return <span className={`${base} bg-emerald-100 text-emerald-700`}><CheckCircle size={12} /> Resolved</span>;
      default:
        return <span className={`${base} bg-slate-100 text-slate-600`}>{status}</span>;
    }
  };

  if (loading) return <div className="text-center p-8"><Loader2 className="animate-spin mx-auto text-slate-400" /></div>;
  if (error) return <div className="text-center p-8 text-red-500">{error}</div>;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
          <tr>
            <th className="p-4 font-semibold">Date</th>
            <th className="p-4 font-semibold">Type</th>
            <th className="p-4 font-semibold">Raised By</th>
            <th className="p-4 font-semibold">Against</th>
            <th className="p-4 font-semibold">Status</th>
            <th className="p-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {disputes.map(d => (
            <React.Fragment key={d._id}>
              <tr className="hover:bg-slate-50/50 transition">
                <td className="p-4 text-slate-600">{new Date(d.createdAt).toLocaleDateString()}</td>
                <td className="p-4 font-medium text-slate-800">{d.type}</td>
                <td className="p-4 text-slate-600">{d.raised_by?.full_name || 'N/A'}</td>
                <td className="p-4 text-slate-600">{d.against?.full_name || 'N/A'}</td>
                <td className="p-4"><StatusBadge status={d.status} /></td>
                <td className="p-4 text-right space-x-2">
                  <button
                    onClick={() => setExpandedId(expandedId === d._id ? null : d._id)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition inline-flex items-center gap-1"
                  >
                    {expandedId === d._id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>} Details
                  </button>
                  {d.status !== 'resolved' && (
                    <button
                      onClick={() => handleResolve(d._id)}
                      disabled={resolvingId === d._id}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition disabled:opacity-50"
                    >
                      {resolvingId === d._id ? 'Saving...' : 'Resolve'}
                    </button>
                  )}
                </td>
              </tr>
              {expandedId === d._id && (
                <tr className="bg-slate-50">
                  <td colSpan={6} className="p-5">
                    <p className="text-sm text-slate-600 mb-3">
                      <span className="font-bold">Description:</span> {d.description}
                    </p>
                    {d.admin_notes && (
                      <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded-lg mb-3">
                        <span className="font-bold">Admin Notes:</span> {d.admin_notes}
                      </p>
                    )}
                    {d.reward_amount > 0 && (
                      <p className="text-xs text-emerald-700 bg-emerald-50 p-2 rounded-lg mb-3">
                        <span className="font-bold">Reward Credited:</span> Rs. {d.reward_amount.toLocaleString()}
                      </p>
                    )}
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Evidence</p>
                    {d.evidence && d.evidence.length > 0 ? (
                      <div className="flex gap-3 flex-wrap">
                        {d.evidence.map((path, idx) => (
                          <a key={idx} href={`${FILE_BASE}/${path.replace(/\\/g, '/')}`} target="_blank" rel="noopener noreferrer">
                            <img
                              src={`${FILE_BASE}/${path.replace(/\\/g, '/')}`}
                              alt={`evidence-${idx}`}
                              className="w-24 h-24 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition"
                            />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">No evidence uploaded.</p>
                    )}

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      {/* Renter Thread */}
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5"><MessageSquare size={13}/> Renter/Admin Thread</p>
                        <div className="space-y-3 max-h-48 overflow-y-auto bg-white p-3 rounded-lg border border-slate-200">
                          {d.renter_thread && d.renter_thread.length > 0 ? d.renter_thread.map(c => (
                            <div key={c._id} className="text-xs">
                              <p className="font-bold text-slate-700">{c.user_name} <span className="text-slate-400 font-normal ml-2">{new Date(c.createdAt).toLocaleString()}</span></p>
                              <p className="text-slate-600 pl-1">{c.comment}</p>
                            </div>
                          )) : <p className="text-xs text-slate-400 text-center py-2">No comments yet.</p>}
                        </div>
                      </div>
                      {/* Vendor Thread */}
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5"><MessageSquare size={13}/> Vendor/Admin Thread</p>
                        <div className="space-y-3 max-h-48 overflow-y-auto bg-white p-3 rounded-lg border border-slate-200">
                          {d.vendor_thread && d.vendor_thread.length > 0 ? d.vendor_thread.map(c => (
                            <div key={c._id} className="text-xs">
                              <p className="font-bold text-slate-700">{c.user_name} <span className="text-slate-400 font-normal ml-2">{new Date(c.createdAt).toLocaleString()}</span></p>
                              <p className="text-slate-600 pl-1">{c.comment}</p>
                            </div>
                          )) : <p className="text-xs text-slate-400 text-center py-2">No comments yet.</p>}
                        </div>
                      </div>
                    </div>

                    {d.status !== 'resolved' && <AdminCommentForm dispute={d} handleCommentAdded={handleCommentAdded} />}

                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      {disputes.length === 0 && <div className="p-16 text-center text-slate-400 text-sm">No disputes found.</div>}
    </div>
  );
}
