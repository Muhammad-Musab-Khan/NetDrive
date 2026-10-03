import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, KeyRound, Lock, Loader2, ArrowLeft, CheckCircle, Eye, EyeOff, RefreshCw, Car, Store } from 'lucide-react';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState('renter');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [otpExpired, setOtpExpired] = useState(false);
  const navigate = useNavigate();

  const validatePassword = (pwd) => ({
    length: pwd.length >= 8,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
  });
  const pwdRules = validatePassword(password);
  const pwdValid = Object.values(pwdRules).every(Boolean);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true); setErrors({}); setOtpExpired(false);
    try {
      const res = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);
      setStep(2);
    } catch (err) {
      setErrors({ email: err.message || 'Failed to send OTP.' });
    } finally { setLoading(false); }
  };

  const handleResendOtp = async () => {
    setLoading(true); setErrors({}); setOtpExpired(false); setOtp('');
    try {
      const res = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);
    } catch (err) {
      setErrors({ otp: err.message });
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true); setErrors({}); setOtpExpired(false);
    try {
      const res = await fetch('http://localhost:5000/api/auth/verify-reset-otp', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: otp.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);
      setStep(3);
    } catch (err) {
      const msg = err.message || 'Invalid or expired OTP.';
      setOtpExpired(msg.toLowerCase().includes('expired') || msg.toLowerCase().includes('invalid'));
      setErrors({ otp: msg });
    } finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault(); setErrors({});
    if (!pwdValid) { setErrors({ password: 'Password does not meet all requirements.' }); return; }
    if (password !== confirmPassword) { setErrors({ confirmPassword: 'Passwords do not match.' }); return; }
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/reset-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        // Send role so only that role's password gets reset
        body: JSON.stringify({ email, otp: otp.trim(), newPassword: password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);
      setStep(4);
    } catch (err) {
      setErrors({ password: err.message || 'Failed to reset password.' });
    } finally { setLoading(false); }
  };

  const RuleCheck = ({ valid, label }) => (
    <div className={`flex items-center gap-2 text-xs ${valid ? 'text-emerald-600' : 'text-slate-400'}`}>
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${valid ? 'bg-emerald-500' : 'bg-slate-300'}`} />
      {label}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            NETDRIVE<span className="text-blue-600">.</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">Premium Vehicle Rentals</p>
        </div>

        {step < 4 && (
          <div className="flex gap-2 mb-6">
            {[1,2,3].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-blue-600' : 'bg-slate-200'}`} />
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">

          {/* STEP 1 — Role + Email */}
          {step === 1 && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <Mail className="text-blue-600" size={26} />
                </div>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-800 text-center mb-2">Forgot Password?</h2>
              <p className="text-slate-400 text-center text-sm mb-6">Select your account type and enter your email.</p>

              {/* Role selector */}
              <div className="flex bg-slate-100 rounded-xl p-1 mb-5">
                <button type="button" onClick={() => setRole('renter')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${role === 'renter' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                  <Car size={14}/> Renter
                </button>
                <button type="button" onClick={() => setRole('vendor')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${role === 'vendor' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>
                  <Store size={14}/> Vendor
                </button>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Email Address</label>
                  <input type="email" required placeholder="name@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none text-sm transition focus:ring-2 focus:ring-blue-400 ${errors.email ? 'border-red-300' : 'border-slate-200'}`} />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-700 transition flex justify-center items-center gap-2 disabled:bg-slate-300">
                  {loading ? <><Loader2 className="animate-spin" size={18}/>Sending...</> : 'Send Verification Code'}
                </button>
              </form>
              <div className="mt-5 text-center">
                <Link to="/login" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-blue-600 transition">
                  <ArrowLeft size={14}/> Back to Login
                </Link>
              </div>
            </>
          )}

          {/* STEP 2 — OTP */}
          {step === 2 && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center"><KeyRound className="text-violet-600" size={26}/></div>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-800 text-center mb-2">Check Your Email</h2>
              <p className="text-slate-400 text-center text-sm mb-1">We sent a 6-digit code to</p>
              <p className="text-blue-600 font-semibold text-center text-sm mb-6">{email}</p>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Verification Code</label>
                  <input type="text" maxLength="6" required placeholder="000000" value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    className={`w-full px-4 py-4 bg-slate-50 border rounded-xl outline-none text-center text-2xl tracking-widest font-bold transition focus:ring-2 focus:ring-violet-400 ${errors.otp ? 'border-red-300' : 'border-slate-200'}`}
                  />
                  {errors.otp && (
                    <div className="mt-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                      <p className="text-red-600 text-xs font-semibold mb-3">{errors.otp}</p>
                      {otpExpired && (
                        <div className="flex flex-col gap-2">
                          <button type="button" onClick={handleResendOtp} disabled={loading}
                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-violet-600 text-white text-xs font-bold rounded-lg hover:bg-violet-700 transition">
                            <RefreshCw size={12}/> Resend a New OTP
                          </button>
                          <Link to="/signup"
                            className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition">
                            <ArrowLeft size={12}/> Back to Sign Up
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button type="submit" disabled={loading || otp.length < 6}
                  className="w-full bg-violet-600 text-white py-3.5 rounded-xl font-bold hover:bg-violet-700 transition flex justify-center items-center gap-2 disabled:bg-violet-300">
                  {loading ? <><Loader2 className="animate-spin" size={18}/>Verifying...</> : 'Verify Code'}
                </button>
              </form>
              <div className="mt-4 text-center space-y-2">
                <button onClick={handleResendOtp} disabled={loading}
                  className="text-sm text-slate-400 hover:text-violet-600 transition inline-flex items-center gap-1.5">
                  <RefreshCw size={13}/> Resend code
                </button>
                <br/>
                <button onClick={() => setStep(1)} className="text-sm text-slate-400 hover:text-blue-600 transition inline-flex items-center gap-1.5">
                  <ArrowLeft size={14}/> Use a different email
                </button>
              </div>
            </>
          )}

          {/* STEP 3 — New Password */}
          {step === 3 && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center"><Lock className="text-emerald-600" size={26}/></div>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-800 text-center mb-2">Set New Password</h2>
              <p className="text-slate-400 text-center text-sm mb-2">Resetting password for your <span className="font-semibold text-slate-600">{role}</span> account.</p>

              <form onSubmit={handleResetPassword} className="space-y-4 mt-6">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">New Password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)}
                      className={`w-full px-4 py-3 pr-12 bg-slate-50 border rounded-xl outline-none text-sm transition focus:ring-2 focus:ring-emerald-400 ${errors.password ? 'border-red-300' : 'border-slate-200'}`}/>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-xl grid grid-cols-2 gap-1.5">
                      <RuleCheck valid={pwdRules.length} label="At least 8 characters"/>
                      <RuleCheck valid={pwdRules.upper} label="One uppercase letter"/>
                      <RuleCheck valid={pwdRules.lower} label="One lowercase letter"/>
                      <RuleCheck valid={pwdRules.number} label="One number"/>
                    </div>
                  )}
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Confirm Password</label>
                  <div className="relative">
                    <input type={showConfirm ? 'text' : 'password'} required placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full px-4 py-3 pr-12 bg-slate-50 border rounded-xl outline-none text-sm transition focus:ring-2 focus:ring-emerald-400 ${
                        confirmPassword && password !== confirmPassword ? 'border-red-300' : confirmPassword && password === confirmPassword ? 'border-emerald-300' : 'border-slate-200'}`}/>
                    <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showConfirm ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && <p className="text-red-500 text-xs mt-1">Passwords do not match.</p>}
                  {confirmPassword && password === confirmPassword && <p className="text-emerald-600 text-xs mt-1">✓ Passwords match!</p>}
                </div>
                <button type="submit" disabled={loading || !pwdValid || password !== confirmPassword}
                  className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold hover:bg-emerald-700 transition flex justify-center items-center gap-2 disabled:bg-emerald-300 disabled:cursor-not-allowed">
                  {loading ? <><Loader2 className="animate-spin" size={18}/>Saving...</> : 'Set New Password'}
                </button>
              </form>
            </>
          )}

          {/* STEP 4 — Success */}
          {step === 4 && (
            <div className="text-center py-4">
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="text-emerald-500" size={42}/>
                </div>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Password Updated!</h2>
              <p className="text-slate-400 text-sm mb-2">Your <span className="font-semibold text-slate-600">{role}</span> account password has been reset.</p>
              <p className="text-slate-400 text-sm mb-8">You can now sign in with your new password.</p>
              <button onClick={() => navigate('/login')}
                className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-700 transition">
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
