import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';

const VerifyOtp = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);

    const email = localStorage.getItem('userEmail');
    const role = localStorage.getItem('userRole'); // role saved during signup

    if (!email || !role) {
      setMessage('❌ Session expired. Please sign up again.');
      navigate('/signup');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otp.trim(), role }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('✅ Verified! Redirecting to login...');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userRole');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        setMessage('❌ ' + data.msg);
      }
    } catch (err) {
      console.error('Verification Error:', err);
      setMessage('❌ Backend is not responding. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setMessage('');
    const email = localStorage.getItem('userEmail');
    const role = localStorage.getItem('userRole');
    try {
      const res = await fetch('http://localhost:5000/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);
      setMessage('✅ A new OTP has been sent.');
    } catch (err) {
      setMessage(`❌ ${err.message || 'Failed to resend OTP.'}`);
    } finally {
      setLoading(false);
    }
  };

  const email = localStorage.getItem('userEmail');

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            NETDRIVE<span className="text-blue-600">.</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Premium Vehicle Rentals</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-5">
            <span className="text-2xl">📧</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Verify Your Email</h2>
          <p className="text-slate-400 text-sm mb-1">Enter the 6-digit code sent to <span className="font-semibold text-slate-600">{email}</span>.</p>
          <p className="text-blue-600 text-xs font-semibold mb-6 capitalize-first">
            ({localStorage.getItem('userRole')} account)
          </p>

          <form className="space-y-4" onSubmit={handleVerify}>
            <input
              type="text" maxLength="6" value={otp} required
              className="w-full text-center text-3xl tracking-widest p-4 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 transition font-bold bg-slate-50"
              onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setMessage(''); }}
              placeholder="000000"
            />
            {message && (
              <p className={`text-xs font-semibold ${message.includes('✅') ? 'text-emerald-600' : 'text-red-600'}`}>{message}</p>
            )}
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-700 transition disabled:bg-slate-300">
              {loading ? <Loader2 className="animate-spin mx-auto" size={18}/> : 'Verify Code'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
            <button onClick={() => navigate('/signup')} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition font-semibold">
              <ArrowLeft size={13} /> Back
            </button>
            <button onClick={handleResendOtp} disabled={loading} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition font-semibold">
              <RefreshCw size={13} /> Resend OTP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOtp;
