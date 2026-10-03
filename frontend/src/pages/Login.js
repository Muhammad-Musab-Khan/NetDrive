import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, Car, Store } from 'lucide-react';

const Login = () => {
  const [role, setRole] = useState('renter');
  const [creds, setCreds] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    const res = await axios.post(
      'http://localhost:5000/api/auth/login',
      {
        ...creds,
        role: role
      }
    );

    // ✅ NOW res exists
    localStorage.setItem('userName', res.data.user.full_name);
    localStorage.setItem('userId', res.data.user.id);
    localStorage.setItem('userEmail', res.data.user.email);
    localStorage.setItem('userRole', res.data.user.role);

    if (res.data.token) {
      localStorage.setItem('token', res.data.token);
    }

    if (role === 'vendor') {
      navigate('/vendor-dashboard');
    } else {
      navigate('/renter-dashboard');
    }

  } catch (err) {
    alert(err.response?.data?.msg || 'Login Failed');
  } finally {
    setLoading(false);
  }
};

  const isVendor = role === 'vendor';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center px-4">

      {/* Logo */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">
          NETDRIVE<span className={isVendor ? 'text-emerald-600' : 'text-blue-600'}>.</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1">Premium Vehicle Rentals</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Welcome Back</h2>

        {/* Role Toggle */}
        <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
          <button type="button" onClick={() => setRole('renter')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              !isVendor ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}>
            <Car size={15} /> Renter
          </button>
          <button type="button" onClick={() => setRole('vendor')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              isVendor ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}>
            <Store size={15} /> Vendor
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Email Address</label>
            <input type="email" placeholder="name@company.com" required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition text-sm"
              onChange={(e) => setCreds({ ...creds, email: e.target.value })} />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Password</label>
            <input type="password" placeholder="••••••••" required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition text-sm"
              onChange={(e) => setCreds({ ...creds, password: e.target.value })} />
          </div>

          <button type="submit" disabled={loading}
            className={`w-full py-3.5 rounded-xl font-bold text-white flex justify-center items-center gap-2 transition-all mt-2 ${
              isVendor ? 'bg-slate-900 hover:bg-slate-700' : 'bg-slate-900 hover:bg-slate-700'
            } disabled:bg-slate-400`}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : `Login as ${isVendor ? 'Vendor' : 'Renter'}`}
          </button>

          <div className="pt-3 space-y-1.5 text-center border-t border-slate-100 mt-2">
            <p className="text-slate-400 text-sm pt-1">
              Don't have an account?{' '}
              <Link to="/signup" className="text-blue-600 font-semibold hover:underline">Sign up</Link>
            </p>
            <p className="text-slate-400 text-sm">
              Forgot password?{' '}
              <Link to="/forgot-password" className="text-blue-600 font-semibold hover:underline">Reset here</Link>
            </p>
            <p className="text-slate-400 text-sm">
              <Link to="/" className="text-slate-400 hover:text-blue-600 transition">← Back to Home</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
