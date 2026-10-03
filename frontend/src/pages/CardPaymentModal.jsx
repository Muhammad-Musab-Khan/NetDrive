import React, { useState } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { X, Loader2, Lock } from 'lucide-react';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const cardElementOptions = {
  style: {
    base: { fontSize: '15px', color: '#1e293b', '::placeholder': { color: '#94a3b8' } },
    invalid: { color: '#dc2626' },
  },
};

function CheckoutForm({ clientSecret, amount, onSuccess, onCancel }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError('');

    const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) },
    });

    if (stripeError) {
      setError(stripeError.message);
      setProcessing(false);
      return;
    }

    if (paymentIntent.status === 'succeeded') {
      onSuccess(paymentIntent.id);
    } else {
      setError('Payment could not be completed.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <CardElement options={cardElementOptions} />
      </div>
      {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-xl font-semibold">{error}</div>}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Lock size={12} /> Payments are securely processed by Stripe.
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} disabled={processing} className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 disabled:opacity-50">
          Cancel
        </button>
        <button type="submit" disabled={!stripe || processing} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
          {processing ? <Loader2 className="animate-spin" size={16} /> : `Pay Rs. ${amount.toLocaleString()}`}
        </button>
      </div>
    </form>
  );
}

export default function CardPaymentModal({ clientSecret, amount, onSuccess, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 flex justify-between items-center border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-800">Complete Payment</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        <div className="p-6">
          <Elements stripe={stripePromise}>
            <CheckoutForm clientSecret={clientSecret} amount={amount} onSuccess={onSuccess} onCancel={onClose} />
          </Elements>
        </div>
      </div>
    </div>
  );
}
