import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Upload, Loader2, Car, Store, Shield, FileText, Eye, EyeOff } from 'lucide-react';

const Signup = () => {
  const [role, setRole] = useState('renter');
  const [formData, setFormData] = useState({ full_name: '', email: '', password: '', confirmPassword: '', phone: '', vendor_address: '' });
  const [cnicImage, setCnicImage] = useState(null);
  const [licenseImage, setLicenseImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const validatePassword = (pwd) => ({
    length: pwd.length >= 8,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    number: /[0-9]/.test(pwd),
  });

  const pwdRules = validatePassword(formData.password);
  const pwdValid = Object.values(pwdRules).every(Boolean);

  
  const handleSignup = async (e) => {
    e.preventDefault();
    if (!cnicImage || (role === 'renter' && !licenseImage)) {
      alert('Field empty: Please upload all required documents.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match. Please try again.');
      return;
    }
    if (!pwdValid) {
      alert('Please make sure your password meets all requirements.');
      return;
    }
    setLoading(true);
    const data = new FormData();
    data.append('full_name', formData.full_name);
    data.append('email', formData.email);
    data.append('password', formData.password);
    data.append('phone', formData.phone);
    data.append('role', role);
    data.append('cnic_image', cnicImage);
    if (role === 'renter') data.append('license_image', licenseImage);
    if (role === 'vendor') data.append('vendor_address', formData.vendor_address);

    try {
      await axios.post('http://localhost:5000/api/auth/signup', data);
      localStorage.setItem('userEmail', formData.email);
      localStorage.setItem('userRole', role);
      navigate('/verify-otp');
    } catch (err) {
      alert(err.response?.data?.msg || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

  const RuleCheck = ({ valid, label }) => (
    <div className={`flex items-center gap-2 text-xs ${valid ? 'text-emerald-600' : 'text-slate-400'}`}>
      <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${valid ? 'bg-emerald-500' : 'bg-slate-300'}`} />
      {label}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-lg shadow-blue-200 mb-4">
            <Car className="text-white" size={26} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-800">NetDrive</h1>
          <p className="text-slate-500 mt-1 text-sm">Create your account to get started</p>
        </div>

        {/* Role Selector */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button type="button" onClick={() => setRole('renter')}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
              role === 'renter' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
            }`}>
            <Car size={24} />
            <div>
              <p className="font-bold text-sm">Renter</p>
              <p className="text-xs opacity-70">Rent vehicles</p>
            </div>
          </button>

          <button type="button" onClick={() => setRole('vendor')}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
              role === 'vendor' ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
            }`}>
            <Store size={24} />
            <div>
              <p className="font-bold text-sm">Vendor</p>
              <p className="text-xs opacity-70">List vehicles</p>
            </div>
          </button>
        </div>

        {/* Info Banner */}
        <div className={`flex items-start gap-3 p-4 rounded-xl mb-6 text-sm ${
          role === 'renter' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
        }`}>
          <Shield size={16} className="mt-0.5 shrink-0" />
          <p>
            {role === 'renter'
              ? 'As a renter, you need a valid CNIC and driving license. Each account is tied to one identity.'
              : 'As a vendor, you need a valid CNIC to list vehicles. If you already have a renter account, you must create a separate vendor account with the same  email.'}
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
          <form onSubmit={handleSignup} className="space-y-4">

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">
                {role === 'vendor' ? 'Showroom Name' : 'Full Name'}
              </label>
              <input type="text" required 
                placeholder={role === 'vendor' ? 'e.g. Karachi Car Deals' : 'Muhammad Ali'}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                onChange={update('full_name')} />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Email Address</label>
              <input type="email" required placeholder="name@email.com"
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                onChange={update('email')} />
            </div>

            {role === 'vendor' && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Showroom Address</label>
                <input type="text" required placeholder="e.g. DHA Phase 6, Karachi"
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition text-sm"
                  onChange={update('vendor_address')} />
              </div>
            )}
            {/* Password with rules */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} required placeholder="••••••••"
                  className="w-full p-3.5 pr-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                  onChange={update('password')} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password rules — show as soon as user starts typing */}
              {formData.password.length > 0 && (
                <div className="mt-3 p-3 bg-slate-50 rounded-xl grid grid-cols-2 gap-1.5">
                  <RuleCheck valid={pwdRules.length} label="At least 8 characters" />
                  <RuleCheck valid={pwdRules.upper} label="One uppercase letter" />
                  <RuleCheck valid={pwdRules.lower} label="One lowercase letter" />
                  <RuleCheck valid={pwdRules.number} label="One number" />
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'} required placeholder="••••••••"
                  className={`w-full p-3.5 pr-12 bg-slate-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm ${
                    formData.confirmPassword && formData.password !== formData.confirmPassword ? 'border-red-300' : formData.confirmPassword && formData.password === formData.confirmPassword ? 'border-emerald-300' : 'border-slate-200'
                  }`}
                  onChange={update('confirmPassword')} />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {/* CNIC Upload */}
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">CNIC Front Photo</label>
              <label className={`flex items-center gap-3 p-4 border-2 border-dashed rounded-xl cursor-pointer transition ${
                cnicImage ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setCnicImage(e.target.files[0])} />
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                  <Upload size={16} className="text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">{cnicImage ? cnicImage.name : 'Click to upload CNIC'}</p>
                  <p className="text-xs text-slate-400">JPG, PNG up to 10MB</p>
                </div>
              </label>
            </div>

            {/* License Upload — Renter Only */}
            {role === 'renter' && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">
                  Driver's License <span className="text-blue-500">(Required for renters)</span>
                </label>
                <label className={`flex items-center gap-3 p-4 border-2 border-dashed rounded-xl cursor-pointer transition ${
                  licenseImage ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setLicenseImage(e.target.files[0])} />
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <FileText size={16} className="text-slate-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600">{licenseImage ? licenseImage.name : 'Click to upload License'}</p>
                    <p className="text-xs text-slate-400">JPG, PNG up to 10MB</p>
                  </div>
                </label>
              </div>
            )}

            <button type="submit" disabled={loading || !pwdValid || formData.password !== formData.confirmPassword}
              className={`w-full py-4 rounded-xl font-bold text-white flex justify-center items-center gap-2 transition-all shadow-lg mt-2 ${
                role === 'renter'
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 disabled:bg-blue-300'
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 disabled:bg-emerald-300'
              } disabled:cursor-not-allowed`}>
              {loading ? <><Loader2 className="animate-spin" size={18} /> Processing OCR...</> : `Create ${role === 'renter' ? 'Renter' : 'Vendor'} Account`}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>

        {/* Note for dual role */}
        <div className="mt-4 p-4 bg-slate-100 rounded-xl text-center">
          <p className="text-xs text-slate-500">
            Want to be both a renter and vendor?{' '}
            <span className="font-semibold text-slate-700">Create two separate accounts with different emails.</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
