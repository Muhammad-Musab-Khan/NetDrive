import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle, XCircle, Clock, Loader2, ChevronDown, ChevronUp, Search } from 'lucide-react';

const API_URL = 'http://localhost:5000/api/payments';

export default function AdminPaymentsTable() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/admin/all`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
        });
        const data = await res.json();
        setPayments(data.payments || []);
      } catch (err) {
        setError('Failed to fetch payment records.');
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, []);

  const StatusBadge = ({ status }) => {
    const base = "text-xs font-bold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5";
    switch (status) {
      case 'paid':
        return <span className={`${base} bg-emerald-100 text-emerald-700`}><CheckCircle size={12} /> Paid</span>;
      case 'pending':
        return <span className={`${base} bg-amber-100 text-amber-700`}><Clock size={12} /> Pending</span>;
      case 'cash_on_delivery':
        return <span className={`${base} bg-blue-100 text-blue-700`}><CreditCard size={12} /> COD</span>;
      default:
        return <span className={`${base} bg-red-100 text-red-600`}><XCircle size={12} /> {status || 'Unknown'}</span>;
    }
  };

  const BookingStatusBadge = ({ status }) => {
    const base = "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase";
    const colors = {
      confirmed: 'bg-blue-100 text-blue-700',
      active: 'bg-emerald-100 text-emerald-700',
      completed: 'bg-slate-200 text-slate-600',
      cancelled: 'bg-red-100 text-red-600',
      pending: 'bg-amber-100 text-amber-700',
      blocked: 'bg-gray-200 text-gray-600',
    };
    return <span className={`${base} ${colors[status] || 'bg-slate-100 text-slate-500'}`}>{status}</span>;
  };

  // Filter logic
  const filtered = payments.filter(p => {
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'successful' && (p.payment_status === 'paid' || p.payment_status === 'cash_on_delivery'))
      || (statusFilter === 'unsuccessful' && p.payment_status !== 'paid' && p.payment_status !== 'cash_on_delivery');

    const term = searchTerm.toLowerCase();
    const matchesSearch = !term
      || (p.renter?.full_name || '').toLowerCase().includes(term)
      || (p.vendor?.full_name || '').toLowerCase().includes(term)
      || (p.vehicle?.registration_no || '').toLowerCase().includes(term)
      || (p.stripe_payment_intent_id || '').toLowerCase().includes(term)
      || (p._id || '').toLowerCase().includes(term);

    return matchesStatus && matchesSearch;
  });

  const successCount = payments.filter(p => p.payment_status === 'paid' || p.payment_status === 'cash_on_delivery').length;
  const unsuccessCount = payments.filter(p => p.payment_status !== 'paid' && p.payment_status !== 'cash_on_delivery').length;
  const totalRevenue = payments
    .filter(p => p.payment_status === 'paid' || p.payment_status === 'cash_on_delivery')
    .reduce((sum, p) => sum + (p.total_price || 0), 0);

  if (loading) return <div className="text-center p-8"><Loader2 className="animate-spin mx-auto text-slate-400" /></div>;
  if (error) return <div className="text-center p-8 text-red-500">{error}</div>;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
            <CheckCircle size={18} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{successCount}</p>
          <p className="text-xs text-slate-400">Successful Payments</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mb-3">
            <XCircle size={18} className="text-red-500" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{unsuccessCount}</p>
          <p className="text-xs text-slate-400">Pending / Unsuccessful</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
            <CreditCard size={18} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">Rs. {totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-slate-400">Total Revenue</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search renter, vendor, plate, ID..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-full text-sm outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'all', label: 'All' },
            { id: 'successful', label: 'Successful' },
            { id: 'unsuccessful', label: 'Unsuccessful' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                statusFilter === f.id
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
            <tr>
              <th className="p-4 font-semibold">Date</th>
              <th className="p-4 font-semibold">Renter</th>
              <th className="p-4 font-semibold">Vendor</th>
              <th className="p-4 font-semibold">Vehicle</th>
                <th className="p-4 font-semibold text-center">Method</th>
              <th className="p-4 font-semibold text-right">Amount</th>
              <th className="p-4 font-semibold text-center">Payment</th>
              <th className="p-4 font-semibold text-center">Booking</th>
              <th className="p-4 font-semibold text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(p => (
              <React.Fragment key={p._id}>
                <tr className="hover:bg-slate-50/50 transition">
                  <td className="p-4 text-slate-600">{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td className="p-4">
                    <p className="font-medium text-slate-800">{p.renter?.full_name || 'N/A'}</p>
                    <p className="text-xs text-slate-400">{p.renter?.email || ''}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-slate-800">{p.vendor?.full_name || 'N/A'}</p>
                  </td>
                  <td className="p-4 text-slate-600">
                    {p.vehicle ? `${p.vehicle.make} ${p.vehicle.model_year}` : 'N/A'}
                    {p.vehicle?.registration_no && (
                      <span className="ml-1.5 text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">{p.vehicle.registration_no}</span>
                    )}
                  </td>
                    <td className="p-4 text-center text-xs font-bold text-slate-500 uppercase">{p.payment_method === "cash" ? "Cash" : "Card"}</td>
                    <td className="p-4 text-right font-bold text-slate-800">Rs. {(p.total_price || 0).toLocaleString()}</td>
                  <td className="p-4 text-center"><StatusBadge status={p.payment_status} /></td>
                  <td className="p-4 text-center"><BookingStatusBadge status={p.status} /></td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setExpandedId(expandedId === p._id ? null : p._id)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition inline-flex items-center gap-1"
                    >
                      {expandedId === p._id ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Info
                    </button>
                  </td>
                </tr>
                {expandedId === p._id && (
                  <tr className="bg-slate-50">
                    <td colSpan={9} className="p-5">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <p className="font-bold text-slate-500 uppercase mb-1">Booking ID</p>
                          <p className="font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded inline-block break-all">{p._id}</p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-500 uppercase mb-1">Stripe Intent ID</p>
                          <p className="font-mono text-slate-700 bg-slate-100 px-2 py-1 rounded inline-block break-all">
                            {p.stripe_payment_intent_id || <span className="text-slate-400 italic">Not recorded</span>}
                          </p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-500 uppercase mb-1">Booking Type</p>
                          <p className="text-slate-700 capitalize">{p.booking_type || 'daily'}{p.hours ? ` (${p.hours}h)` : ''}</p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-500 uppercase mb-1">Rental Period</p>
                          <p className="text-slate-700">
                            {new Date(p.start_date).toLocaleDateString()} — {new Date(p.end_date).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-500 uppercase mb-1">Vehicle Price</p>
                          <p className="text-slate-700">Rs. {(p.vehicle_rental_price || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-500 uppercase mb-1">Driver Cost</p>
                          <p className="text-slate-700">Rs. {(p.driver_total_price || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-500 uppercase mb-1">Fuel Price</p>
                          <p className="text-slate-700">Rs. {(p.fuel_price || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-500 uppercase mb-1">Credit Applied</p>
                          <p className="text-slate-700">Rs. {(p.credit_applied || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-500 uppercase mb-1">Delivery Mode</p>
                          <p className="text-slate-700 capitalize">{p.delivery_mode || 'pickup'}</p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-500 uppercase mb-1">Renter Phone</p>
                          <p className="text-slate-700">{p.renter?.phone || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-500 uppercase mb-1">With Driver</p>
                          <p className="text-slate-700">{p.with_driver ? 'Yes' : 'No'}</p>
                        </div>
                        <div>
                          <p className="font-bold text-slate-500 uppercase mb-1">Created</p>
                          <p className="text-slate-700">{new Date(p.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-16 text-center text-slate-400 text-sm">
            {payments.length === 0 ? 'No card payment records found.' : 'No payments match your filters.'}
          </div>
        )}
      </div>
    </div>
  );
}

