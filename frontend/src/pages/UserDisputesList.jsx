import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ShieldAlert, CheckCircle, Clock, Loader2, ShieldQuestion, MessageSquare, Send } from 'lucide-react';

const API_URL = 'http://localhost:5000/api/disputes';
const FILE_BASE = 'http://localhost:5000';

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

const DisputeComments = ({ dispute, userId, onCommentAdded }) => {
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSending(true);
    try {
      const res = await axios.post(`${API_URL}/${dispute._id}/comment`, {
        user_id: userId,
        user_name: localStorage.getItem('userName'),
        comment: comment.trim(),
      });
      onCommentAdded(res.data.disputeId, res.data.comment, res.data.thread);
      setComment('');
    } catch (err) {
      console.error("Failed to post comment", err);
      alert('Could not post comment.');
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1 mt-3">
      <div className="flex gap-2">
        <input type="text" value={comment} onChange={e => {
        const text = e.target.value;
        if (text.trim().split(/\s+/).filter(Boolean).length <= 50) setComment(text);
      }}
        placeholder="Add your comment..."
        className="flex-1 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500" />
        <button type="submit" disabled={sending} className="px-4 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-500 disabled:bg-blue-300"><Send size={14}/></button>
      </div>
      <p className="text-[10px] text-slate-400 text-right">{(comment || '').trim().split(/\s+/).filter(Boolean).length}/50 words</p>
    </form>
  );
};

export default function UserDisputesList({ userId }) {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDisputes = async () => {
      if (!userId) return;
      try {
        
        const res = await axios.get(`${API_URL}/user/${userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setDisputes(res.data.disputes);

        // Mark all fetched disputes as seen by the current user
        const unseenDisputes = res.data.disputes.filter(d => {
          const isRenter = d.booking_id?.renter?._id === userId || d.booking_id?.renter === userId;
          const isVendor = d.booking_id?.vendor?._id === userId || d.booking_id?.vendor === userId;
          return (isRenter && !d.renter_seen) || (isVendor && !d.vendor_seen);
        });

        if (unseenDisputes.length > 0) {
          for (const dispute of unseenDisputes) {
            try {
              await axios.patch(`${API_URL}/${dispute._id}/mark-seen/${userId}`, {}, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
              });
            } catch (patchError) {
              console.error(`Failed to mark dispute ${dispute._id} as seen:`, patchError.response ? patchError.response.data : patchError.message);
            }
          }
        }
      } catch (err) {
        setError('Failed to fetch or update disputes.');
        console.error("Dispute list error:", err.response ? err.response.data : err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDisputes();
      const iv = setInterval(fetchDisputes, 5000);
      return () => clearInterval(iv);
    }, [userId]);

  const handleCommentAdded = (disputeId, newComment, threadName) => {
    setDisputes(prev => prev.map(d => {
      if (d._id === disputeId) {
        // threadName will be 'renter_thread' or 'vendor_thread'
        return { ...d, [threadName]: [...(d[threadName] || []), newComment] };
      }
      return d;
    }));
  };
  if (loading) return <div className="text-center p-8"><Loader2 className="animate-spin mx-auto text-slate-400" /></div>;
  if (error) return <div className="text-center p-8 text-red-500">{error}</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-slate-800 mb-6">My Disputes</h2>
      {disputes.length === 0 ? (
        <div className="bg-white border rounded-2xl p-16 text-center text-slate-400">
          <ShieldQuestion size={36} className="text-gray-200 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-700 mb-2">No disputes found</h3>
          <p className="text-sm">Your dispute history will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map(d => {
            const isRenter = d.booking_id?.renter?._id === userId;
            const thread = isRenter ? d.renter_thread : d.vendor_thread;
            return (
              <div key={d._id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-800">{d.type} on {d.booking_id?.vehicle?.make || 'Booking'}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Case #{d._id.slice(-6)} • Filed on {new Date(d.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      <span className="font-semibold">Raised By:</span> {d.raised_by?.full_name || 'N/A'}
                      <span className="mx-2">|</span>
                      <span className="font-semibold">Against:</span> {d.against?.full_name || 'N/A'}
                    </p>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-600">{d.description}</p>
                  {d.evidence && d.evidence.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-bold text-slate-500 uppercase mb-2">Evidence</p>
                      <div className="flex gap-2 flex-wrap">
                        {d.evidence.map((path, idx) => (
                          <a key={idx} href={`${FILE_BASE}/${path.replace(/\\/g, '/')}`} target="_blank" rel="noopener noreferrer">
                            <img src={`${FILE_BASE}/${path.replace(/\\/g, '/')}`} alt={`evidence-${idx}`} className="w-20 h-20 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-4">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1.5"><MessageSquare size={13}/> Discussion with Admin</p>
                    <div className="space-y-3 max-h-48 overflow-y-auto bg-slate-50 p-3 rounded-lg border">
                      {thread && thread.length > 0 ? thread.map(c => (
                        <div key={c._id}>
                          <p className="text-xs font-bold text-slate-700">{c.user_name} <span className="text-slate-400 font-normal ml-2">{new Date(c.createdAt).toLocaleString()}</span></p>
                          <p className="text-sm text-slate-600 pl-1">{c.comment}</p>
                        </div>
                      )) : <p className="text-xs text-slate-400 text-center py-2">No comments yet.</p>}
                    </div>
                    {d.status !== 'resolved' && <DisputeComments dispute={d} userId={userId} onCommentAdded={handleCommentAdded} />}
                  </div>
                  {d.admin_notes && <p className="mt-3 text-xs text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-100"><span className="font-bold">Admin Note:</span> {d.admin_notes}</p>}
                  {d.reward_amount > 0 && d.raised_by._id === userId && (
                    <p className="mt-3 text-xs text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-100"><span className="font-bold">🎉 Account Credit Awarded:</span> Rs. {d.reward_amount.toLocaleString()}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}