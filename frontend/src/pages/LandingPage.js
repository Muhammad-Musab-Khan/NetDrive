import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, Shield, Star, ChevronRight, Menu, X, Zap, Users, MapPin } from 'lucide-react';

const LandingPage = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const features = [
    { icon: Shield, title: 'Verified Identities', desc: 'Every renter and vendor is verified via CNIC and document OCR before accessing the platform.' },
    { icon: Zap, title: 'Instant Booking', desc: 'Browse available vehicles and confirm your rental in minutes, not hours.' },
    { icon: Star, title: 'Premium Fleet', desc: 'Luxury sedans, powerful SUVs, and electric vehicles — all maintained to the highest standard.' },
    { icon: MapPin, title: 'Nationwide', desc: 'Find vehicles across Pakistan — from Karachi to Lahore, Islamabad to Peshawar.' },
    { icon: Users, title: 'Earn as a Vendor', desc: 'List your vehicles and earn passive income. Full booking management in your dashboard.' },
    { icon: Car, title: 'Any Occasion', desc: 'Business travel, weddings, road trips, or daily commutes — we have the right vehicle for you.' },
  ];

  const vehicles = [
    { brand: 'PORSCHE', model: '911 Carrera S', year: '2024', category: 'SPORT', price: '18,000', image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80' },
    { brand: 'MERCEDES', model: 'G-63 AMG', year: '2023', category: 'LUXURY', image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=600&q=80', price: '22,000' },
    { brand: 'AUDI', model: 'RS e-tron GT', year: '2024', category: 'ELECTRIC', image: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=600&q=80', price: '15,000' },
  ];

  const categoryColors = {
    SPORT: 'bg-red-100 text-red-600',
    LUXURY: 'bg-amber-100 text-amber-600',
    ELECTRIC: 'bg-green-100 text-green-600',
  };

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-sm border-b border-gray-100' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className={`text-xl font-black tracking-tight ${scrolled ? 'text-slate-900' : 'text-white'}`}>
            NETDRIVE<span className="text-blue-500">.</span>
          </h1>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'Fleet', 'How it works'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`}
                className={`text-sm font-medium transition hover:text-blue-500 ${scrolled ? 'text-slate-600' : 'text-white/80'}`}>
                {item}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => navigate('/login')}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition ${scrolled ? 'text-slate-700 hover:bg-slate-100' : 'text-white hover:bg-white/10'}`}>
              Sign In
            </button>
            <button onClick={() => navigate('/signup')}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition shadow-lg shadow-blue-600/20">
              Get Started
            </button>
          </div>

          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} className={scrolled ? 'text-slate-800' : 'text-white'} /> : <Menu size={22} className={scrolled ? 'text-slate-800' : 'text-white'} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 space-y-3">
            {['Features', 'Fleet', 'How it works'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(' ', '-')}`}
                className="block text-sm font-medium text-slate-600 hover:text-blue-600 py-1">
                {item}
              </a>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => navigate('/login')} className="flex-1 py-2.5 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl">Sign In</button>
              <button onClick={() => navigate('/signup')} className="flex-1 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl">Get Started</button>
            </div>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <img src="https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1600&q=85"
          alt="hero" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-900/70 to-transparent" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-32">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-bold px-3 py-1.5 rounded-full mb-6 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Pakistan's Premium Vehicle Rental Platform
            </div>

            <h1 className="text-5xl md:text-7xl font-black text-white leading-none tracking-tight mb-6">
              Drive Your<br />
              <span className="text-blue-400">Dream</span><br />
              Today.
            </h1>

            <p className="text-slate-300 text-lg mb-10 max-w-lg leading-relaxed">
              Experience luxury performance with our exclusive verified fleet. Book instantly, drive confidently.
            </p>

            <div className="flex flex-wrap gap-4">
              <button onClick={() => navigate('/signup')}
                className="flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition shadow-xl shadow-blue-600/30 text-sm">
                Start Renting <ChevronRight size={16} />
              </button>
              <button onClick={() => navigate('/signup')}
                className="flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl transition backdrop-blur-sm border border-white/20 text-sm">
                List Your Vehicle
              </button>
            </div>

            <div className="flex gap-8 mt-12">
              {[['500+', 'Verified Vehicles'], ['2,000+', 'Happy Renters'], ['50+', 'Cities']].map(([num, label]) => (
                <div key={label}>
                  <p className="text-2xl font-black text-white">{num}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-blue-600 text-sm font-bold uppercase tracking-widest mb-3">Why NetDrive</p>
            <h2 className="text-4xl font-black text-slate-900">Built for trust. Designed for speed.</h2>
            <p className="text-slate-400 mt-4 max-w-xl mx-auto">Every feature is built around verified identities and seamless experiences for both renters and vendors.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white p-6 rounded-2xl border border-gray-100 hover:shadow-lg transition group">
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-4 group-hover:bg-blue-600 transition">
                  <Icon size={20} className="text-blue-600 group-hover:text-white transition" />
                </div>
                <h3 className="font-bold text-slate-800 mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FLEET PREVIEW */}
      <section id="fleet" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-blue-600 text-sm font-bold uppercase tracking-widest mb-3">Our Fleet</p>
              <h2 className="text-4xl font-black text-slate-900">Vehicles that impress.</h2>
            </div>
            <button onClick={() => navigate('/login')}
              className="hidden md:flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600 transition">
              View all vehicles <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {vehicles.map(v => (
              <div key={v.model} className="group rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300">
                <div className="relative h-52 overflow-hidden bg-gray-100">
                  <img src={v.image} alt={v.model} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <span className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full ${categoryColors[v.category]}`}>{v.category}</span>
                </div>
                <div className="p-5 bg-white">
                  <p className="text-xs font-bold text-blue-600 mb-1 tracking-wide">{v.brand}</p>
                  <h3 className="font-bold text-slate-800 text-lg">{v.model} <span className="text-slate-400 font-normal text-base">{v.year}</span></h3>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    <div>
                      <span className="text-xl font-black text-slate-800">Rs. {v.price}</span>
                      <span className="text-xs text-slate-400">/day</span>
                    </div>
                    <button onClick={() => navigate('/login')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition">
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 bg-slate-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-blue-400 text-sm font-bold uppercase tracking-widest mb-3">Simple Process</p>
            <h2 className="text-4xl font-black text-white">Up and running in minutes.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create Account', desc: 'Sign up as a renter or vendor. Verify your CNIC for instant identity confirmation.' },
              { step: '02', title: 'Browse & Book', desc: 'Find your perfect vehicle, check availability, and confirm your booking instantly.' },
              { step: '03', title: 'Drive & Earn', desc: 'Renters hit the road. Vendors track bookings and earnings from the dashboard.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="relative">
                <div className="text-6xl font-black text-slate-800 mb-4">{step}</div>
                <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-blue-600">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-black text-white mb-4">Ready to drive smarter?</h2>
          <p className="text-blue-100 mb-10">Join thousands of verified renters and vendors on Pakistan's most trusted vehicle rental platform.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <button onClick={() => navigate('/signup')}
              className="px-8 py-4 bg-white text-blue-600 font-bold rounded-2xl hover:bg-blue-50 transition text-sm shadow-xl">
              Create Free Account
            </button>
            <button onClick={() => navigate('/login')}
              className="px-8 py-4 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-2xl transition text-sm border border-blue-400">
              Sign In
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <h1 className="text-xl font-black text-white tracking-tight">NETDRIVE<span className="text-blue-500">.</span></h1>
          <p className="text-slate-500 text-sm">© 2026 NetDrive. Pakistan's Premium Vehicle Rental Platform.</p>
          <div className="flex gap-6">
            <button onClick={() => navigate('/login')} className="text-slate-400 hover:text-white text-sm transition">Sign In</button>
            <button onClick={() => navigate('/signup')} className="text-slate-400 hover:text-white text-sm transition">Sign Up</button>
            <button onClick={() => navigate('/admin/login')} className="text-slate-400 hover:text-white text-sm transition">Admin</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

