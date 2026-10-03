import React, { useState } from 'react';
import axios from 'axios';
import { X, AlertCircle, Upload, Send, Loader2 } from 'lucide-react';
 
const API_URL = 'http://localhost:5000/api/disputes/';

export default function ReportIssueModal({ booking, currentUser, onClose }) {
  const [type, setType] = useState('Damage');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) {
      setMessage({ type: 'error', text: 'Please provide a description.' });
      return;
    }
    setLoading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('booking_id', booking._id);
    formData.append('raised_by', currentUser.id);
    // The 'against' user is the one who is NOT the current user in the booking
    const renterId = booking.renter?._id || booking.renter;
    const vendorId = booking.vendor?._id || booking.vendor;
    const againstId = renterId === currentUser.id ? vendorId : renterId;
    formData.append('against', againstId);
    formData.append('type', type);
    formData.append('description', description);
    evidence.forEach(file => {
      formData.append('evidence', file);
    });

    try {
      const res = await axios.post(API_URL, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setMessage({ type: 'success', text: res.data.msg });
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.msg || 'Failed to submit dispute.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-5 flex justify-between items-center border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <AlertCircle className="text-red-500" /> Report an Issue
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Issue Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm">
              <option>Damage</option>
              <option>Cleanliness</option>
              <option>Late Return</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
            <textarea
              rows="4"
              value={description}
              onChange={(e) => {
                const text = e.target.value;
                if (text.trim().split(/\s+/).filter(Boolean).length <= 125) setDescription(text);
              }}
              placeholder="Please describe the issue in detail..."
              className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none"></textarea>
            <p className="text-xs text-slate-400 mt-1 text-right">{(description || '').trim().split(/\s+/).filter(Boolean).length}/125 words</p>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Upload Evidence (optional, max 5)</label>
            <label className="mt-1 flex items-center gap-3 p-4 border-2 border-dashed rounded-xl cursor-pointer transition border-slate-200 hover:border-slate-300">
              <input
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => setEvidence(Array.from(e.target.files).slice(0, 5))}
              />
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <Upload size={16} className="text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600">
                  {evidence.length > 0 ? `${evidence.length} file(s) selected` : 'Click to upload photos'}
                </p>
                <p className="text-xs text-slate-400">PNG, JPG up to 10MB each</p>
              </div>
            </label>
          </div>
          {message.text && (
            <div className={`p-3 rounded-lg text-sm font-semibold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              {message.text}
            </div>
          )}
          <button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={16} />}
            {loading ? 'Submitting...' : 'Submit Dispute'}
          </button>
        </form>
      </div>
    </div>
  );
}