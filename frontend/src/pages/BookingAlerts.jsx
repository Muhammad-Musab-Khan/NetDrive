import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle, X, Bell, CreditCard, Car } from 'lucide-react';

// Simple audio beep for notifications (base64 encoded short chime)
const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
    // Second chime
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1100;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.3, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc2.start(ctx.currentTime);
      osc2.stop(ctx.currentTime + 0.5);
    }, 200);
  } catch (e) { /* AudioContext not available */ }
};

// ─── Toast Notification Component ───────────────────────────────────
function Toast({ toast, onDismiss }) {
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => onDismiss(toast.id), 400);
    }, toast.duration || 6000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const iconMap = {
    booking: <Car size={18} className="text-white" />,
    payment: <CreditCard size={18} className="text-white" />,
    success: <CheckCircle size={18} className="text-white" />,
    info: <CheckCircle size={18} className="text-white" />,
    error: <X size={18} className="text-white" />,
    alert:   <Bell size={18} className="text-white" />,
  };

  const colorMap = {
    booking: 'from-emerald-600 to-emerald-500',
    payment: 'from-blue-600 to-blue-500',
    success: 'from-emerald-600 to-emerald-500',
    info: 'from-blue-600 to-blue-500',
    error: 'from-red-600 to-red-500',
    alert: 'from-amber-500 to-amber-400',
    alert:   'from-amber-600 to-amber-500',
  };

  return (
    <div
      className={`flex items-start gap-3 bg-gradient-to-r ${colorMap[toast.type] || colorMap.alert} text-white rounded-2xl px-5 py-4 shadow-2xl max-w-sm w-full transition-all duration-400 ${
        exiting ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0 animate-slideIn'
      }`}
      style={{ animation: exiting ? '' : 'slideIn 0.4s ease-out' }}
    >
      <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
        {iconMap[toast.type] || iconMap.alert}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm leading-tight">{toast.title}</p>
        <p className="text-xs text-white/80 mt-1 leading-snug">{toast.message}</p>
        {toast.subtitle && <p className="text-[10px] text-white/60 mt-1.5 font-medium">{toast.subtitle}</p>}
      </div>
      <button onClick={() => { setExiting(true); setTimeout(() => onDismiss(toast.id), 400); }} className="text-white/60 hover:text-white transition shrink-0">
        <X size={16} />
      </button>
    </div>
  );
}

// ─── Toast Container ────────────────────────────────────────────────
export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;
  return (
    <div className="fixed top-4 right-4 z-[200] space-y-3 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}

// ─── Hook: useToast ─────────────────────────────────────────────────
export function useToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { ...toast, id }]);
    if (toast.sound !== false) playNotificationSound();
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
}

// ─── Hook: useBookingAlerts (for Vendor Dashboard) ──────────────────
// Polls for new bookings and fires toast alerts when new ones arrive
// ─── Hook: useBookingAlerts (for Vendor Dashboard) ──────────────────
// Polls for new bookings and fires toast alerts when new ones arrive
export function useBookingAlerts(bookings, addToast) {
  const knownBookingIdsRef = useRef(new Set());
  

  useEffect(() => {
    if (!bookings) return;

    const currentIds = new Set(bookings.map(b => b._id));

    // Find newly appeared bookings
    const newBookings = bookings.filter(b => !knownBookingIdsRef.current.has(b._id) && ['confirmed', 'pending'].includes(b.status));

    newBookings.forEach(b => {
      addToast({
        type: 'booking',
        title: '🔔 New Booking Received!',
        message: `${b.renter?.full_name || 'A renter'} just booked your ${b.vehicle?.make || 'vehicle'} ${b.vehicle?.model_year || ''}`.trim(),
        subtitle: `${b.booking_type === 'hourly' ? `${b.hours}h` : `${new Date(b.start_date).toLocaleDateString()} — ${new Date(b.end_date).toLocaleDateString()}`} • Rs. ${(b.total_price || 0).toLocaleString()} • ${b.payment_method === 'card' ? '💳 Card' : '💵 Cash'}`,
        duration: 3000,
      });
    });

    if (newBookings.length > 0 || bookings.length !== knownBookingIdsRef.current.size) {
      knownBookingIdsRef.current = currentIds;
    }
  }, [bookings, addToast]);
}

// ─── Hook: useStatusAlerts (for Renter Dashboard) ───────────────────
// Watches for booking status changes and fires toast alerts
export function useStatusAlerts(bookings, addToast) {
  const knownStatusesRef = useRef(new Map());
  

  useEffect(() => {
    if (!bookings) return;

    const currentStatuses = new Map(bookings.map(b => [b._id, b.status]));

    let hasChanges = false;

          bookings.forEach(b => {
      const prevStatus = knownStatusesRef.current.get(b._id);

      // New booking just appeared (instant confirmation)
      if (prevStatus === undefined && b.status === 'confirmed') {
        addToast({
          type: 'success',
          title: 'Booking Confirmed!',
          message: `Your booking for ${b.vehicle?.make || 'vehicle'} ${b.vehicle?.model_year || ''} has been confirmed!`.trim(),
          subtitle: `Vendor: ${b.vendor?.full_name || 'N/A'} • Rs. ${(b.total_price || 0).toLocaleString()}`,
          duration: 3000,
        });
        hasChanges = true;
      }
      
      if (prevStatus && prevStatus !== b.status) {
        if (b.status === 'active') {
           addToast({
            type: 'info',
            title: 'Car Handed Over!',
            message: `The vendor has marked your ${b.vehicle?.make || 'vehicle'} as delivered/handed over. Your rental period has officially started.`,
            duration: 3000,
          });
          hasChanges = true;
        } else if (b.status === 'completed') {
           addToast({
            type: 'success',
            title: 'Contract Finished!',
            message: `Your rental for ${b.vehicle?.make || 'vehicle'} has been successfully completed. Thank you!`,
            duration: 3000,
          });
          hasChanges = true;
        } else if (b.status === 'cancelled') {
           addToast({
            type: 'error',
            title: 'Booking Declined/Cancelled',
            message: `Your booking for ${b.vehicle?.make || 'vehicle'} was declined or cancelled by the vendor.`,
            duration: 3000,
          });
          hasChanges = true;
        }
      }
    });

    if (hasChanges || bookings.length !== knownStatusesRef.current.size) {
      knownStatusesRef.current = currentStatuses;
    }
  }, [bookings, addToast]);
}