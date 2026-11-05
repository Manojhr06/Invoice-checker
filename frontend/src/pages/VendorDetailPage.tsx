import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Building2,
  ArrowLeft,
  Landmark,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Loader2,
  X,
  FileText,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import api from '../services/api';
import { Vendor } from '../types';
import { useAuth } from '../contexts/AuthContext';

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { hasRole } = useAuth();

  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Bank Account Modal
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [submittingBank, setSubmittingBank] = useState(false);
  const [bankError, setBankError] = useState('');

  // Verifying action
  const [verifyingBankId, setVerifyingBankId] = useState<string | null>(null);

  const fetchVendor = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/vendors/${id}`);
      setVendor(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load vendor details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchVendor();
    }
  }, [id]);

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankError('');
    setSubmittingBank(true);
    try {
      await api.post(`/vendors/${id}/bank-accounts`, {
        bank_name: bankName,
        account_number: accountNumber,
        ifsc_swift_code: ifsc,
        account_holder_name: accountHolder,
        is_primary: false
      });
      setShowBankModal(false);
      setBankName('');
      setAccountNumber('');
      setIfsc('');
      setAccountHolder('');
      await fetchVendor();
    } catch (err: any) {
      setBankError(err.response?.data?.detail || 'Failed to add bank account.');
    } finally {
      setSubmittingBank(false);
    }
  };

  const handleVerifyBank = async (bankId: string) => {
    if (!window.confirm('Confirm that you have completed out-of-band contact with the vendor executive to verify these disbursement bank credentials?')) {
      return;
    }
    setVerifyingBankId(bankId);
    try {
      await api.post(`/vendors/${id}/verify-bank/${bankId}`);
      await fetchVendor();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to verify bank account.');
    } finally {
      setVerifyingBankId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
        <p className="text-sm">Loading vendor profile...</p>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-900">{error || 'Vendor not found'}</h3>
        <Link to="/vendors" className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 mt-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Vendor Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button & Header */}
      <div>
        <Link
          to="/vendors"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Vendors
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-lg">
              {vendor.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{vendor.name}</h1>
                {vendor.is_verified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Pending Verification
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">Code: {vendor.vendor_code}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-xs font-medium text-slate-400 block">Vendor Risk Score</span>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-bold font-mono ${
                  vendor.risk_level === 'CRITICAL' ? 'text-rose-600' :
                  vendor.risk_level === 'HIGH' ? 'text-orange-600' :
                  vendor.risk_level === 'MEDIUM' ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {Number(vendor.risk_score).toFixed(0)}/100
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {vendor.risk_level}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile & Metadata Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm md:col-span-2 space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
            Supplier Identity & Tax Data
          </h2>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">GSTIN (India)</span>
              <span className="font-mono font-semibold text-slate-800 text-sm">
                {vendor.gstin || 'None recorded'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Tax ID / EIN</span>
              <span className="font-mono font-semibold text-slate-800 text-sm">
                {vendor.tax_id || 'None recorded'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Billing Email</span>
              <span className="font-medium text-slate-800">{vendor.email || 'N/A'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Phone Contact</span>
              <span className="font-medium text-slate-800">{vendor.phone || 'N/A'}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 font-medium block">Registered Physical Address</span>
              <span className="font-medium text-slate-800">{vendor.address || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
            Verification Protocol
          </h2>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">Onboarded At</span>
              <span className="font-medium text-slate-800">
                {new Date(vendor.created_at).toLocaleDateString()}
              </span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Verification Timestamp</span>
              <span className="font-medium text-slate-800">
                {vendor.verified_at ? new Date(vendor.verified_at).toLocaleDateString() : 'Awaiting confirmation'}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-100">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                FinGuard automated rule engine checks all incoming invoices against this identity profile, including fuzzy name comparison, GSTIN exact match, and bank account active registry.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bank Accounts Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Approved Disbursement Accounts</h2>
              <p className="text-xs text-slate-500">
                Financial accounts authorized for wire transfers and invoice payouts.
              </p>
            </div>
          </div>
          {hasRole(['ADMIN', 'FINANCE_MANAGER', 'FINANCE_EMPLOYEE']) && (
            <button
              onClick={() => setShowBankModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Bank Account
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-200">
          {vendor.bank_accounts?.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No bank accounts recorded for this vendor. Invoices will be held until bank credentials are added.
            </div>
          ) : (
            vendor.bank_accounts?.map((bank: any) => (
              <div key={bank.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{bank.bank_name}</span>
                    {bank.is_primary && (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-bold rounded">
                        PRIMARY
                      </span>
                    )}
                    {bank.is_verified ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        Manager Sign-off Required
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
                    <span>Account: {bank.account_number}</span>
                    <span>IFSC/SWIFT: {bank.ifsc_swift_code}</span>
                    <span>Beneficiary: {bank.account_holder_name}</span>
                  </div>
                </div>

                {!bank.is_verified && hasRole(['ADMIN', 'FINANCE_MANAGER']) && (
                  <div>
                    <button
                      onClick={() => handleVerifyBank(bank.id)}
                      disabled={verifyingBankId === bank.id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {verifyingBankId === bank.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      Verify & Release Hold
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-500" />
            <h2 className="text-base font-bold text-slate-900">Recent Transactions</h2>
          </div>
          <span className="text-xs text-slate-500">
            {vendor.recent_invoices?.length || 0} invoice(s)
          </span>
        </div>

        {vendor.recent_invoices?.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No invoices billed under this vendor code yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3">Invoice Number</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Risk Level</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {vendor.recent_invoices?.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-semibold text-slate-900">
                      {inv.invoice_number}
                    </td>
                    <td className="px-6 py-3 text-slate-500 text-xs">
                      {inv.invoice_date}
                    </td>
                    <td className="px-6 py-3 font-mono font-semibold text-slate-900">
                      ${Number(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        inv.risk_level === 'CRITICAL' ? 'bg-rose-50 text-rose-700' :
                        inv.risk_level === 'HIGH' ? 'bg-orange-50 text-orange-700' :
                        inv.risk_level === 'MEDIUM' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {inv.risk_level}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs font-medium text-slate-700">
                      {inv.status}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        to={`/invoices/${inv.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        Inspect
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Bank Account Modal */}
      {showBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">Add Disbursement Bank Account</h3>
              <button onClick={() => setShowBankModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {bankError && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                {bankError}
              </div>
            )}

            <form onSubmit={handleAddBank} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Citibank N.A."
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 987654321012"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC / SWIFT Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CITI0000001"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Holder Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder={vendor.name}
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowBankModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBank}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {submittingBank && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Register Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
