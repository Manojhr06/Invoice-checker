import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Loader2,
  FileText,
  Clock,
  Search,
  Check,
  X,
  Building2,
  DollarSign
} from 'lucide-react';
import api from '../services/api';
import { Invoice } from '../types';
import { useAuth } from '../contexts/AuthContext';

export default function ApprovalsPage() {
  const { hasRole } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [actionType, setActionType] = useState<'APPROVED' | 'REJECTED' | 'ESCALATED'>('APPROVED');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchPending = async () => {
    try {
      setLoading(true);
      const res = await api.get('/approvals/pending');
      setInvoices(res.data);
    } catch (err) {
      console.error('Failed to load pending approvals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const openActionModal = (inv: Invoice, action: 'APPROVED' | 'REJECTED' | 'ESCALATED') => {
    setSelectedInvoice(inv);
    setActionType(action);
    setReason('');
    setErrorMsg('');
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    // Check mandatory justification for high/critical risk approval
    const isHighRisk = ['HIGH', 'CRITICAL'].includes(selectedInvoice.risk_level);
    if (actionType === 'APPROVED' && isHighRisk && !reason.trim()) {
      setErrorMsg('Written justification is legally mandated before approving an invoice flagged as High or Critical risk.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      await api.post(`/approvals/${selectedInvoice.id}/action`, {
        action: actionType,
        reason: reason.trim() || undefined
      });
      setSelectedInvoice(null);
      await fetchPending();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to execute approval decision.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInvoices = invoices.filter((i) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      i.invoice_number.toLowerCase().includes(q) ||
      (i.vendor_name && i.vendor_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Finance Manager Approvals</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review inbound disbursement obligations, investigate risk exceptions, and enforce dual-control payment authorizations.
        </p>
      </div>

      {/* Search / Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search pending invoices by number or vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-sm">Retrieving pending approval queue...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-16 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900">Approval queue is clear</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              There are no pending invoices awaiting managerial sign-off at this time.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Invoice</th>
                  <th className="px-6 py-3.5">Vendor</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">AI Risk Score</th>
                  <th className="px-6 py-3.5">Verification Flags</th>
                  <th className="px-6 py-3.5 text-right">Approval Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <Link
                          to={`/invoices/${inv.id}`}
                          className="font-bold text-slate-900 hover:text-blue-600 font-mono"
                        >
                          {inv.invoice_number}
                        </Link>
                        <p className="text-xs text-slate-400">{inv.invoice_date}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {inv.vendor_name || 'Unregistered Vendor'}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      ${Number(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                          inv.risk_level === 'CRITICAL' ? 'bg-rose-100 text-rose-800' :
                          inv.risk_level === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                          inv.risk_level === 'MEDIUM' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {inv.risk_level} ({Number(inv.risk_score).toFixed(0)})
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {inv.verification?.flags && inv.verification.flags.length > 0 ? (
                          inv.verification.flags.slice(0, 2).map((fl, idx) => (
                            <span key={idx} className="text-[10px] px-1.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded font-medium truncate">
                              {fl}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> All Checks Passed
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {hasRole(['ADMIN', 'FINANCE_MANAGER']) ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openActionModal(inv, 'APPROVED')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => openActionModal(inv, 'REJECTED')}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject
                          </button>
                          <Link
                            to={`/invoices/${inv.id}`}
                            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
                            title="Detailed Audit View"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        </div>
                      ) : (
                        <Link
                          to={`/invoices/${inv.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                        >
                          View Details
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Justification Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {actionType === 'APPROVED' ? 'Confirm Payment Approval' : 'Reject Invoice'}
              </h3>
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleExecuteAction} className="mt-4 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedInvoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vendor:</span>
                  <span className="font-semibold text-slate-900">{selectedInvoice.vendor_name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount:</span>
                  <span className="font-mono font-bold text-slate-900">${Number(selectedInvoice.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Risk Level:</span>
                  <span className="font-bold text-slate-900">{selectedInvoice.risk_level} ({Number(selectedInvoice.risk_score).toFixed(0)}/100)</span>
                </div>
              </div>

              {['HIGH', 'CRITICAL'].includes(selectedInvoice.risk_level) && actionType === 'APPROVED' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Caution:</strong> This invoice has been flagged by the AI risk engine. Company policy mandates explicit reasoning to authorize disbursement.
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Managerial Comment & Audit Notes {['HIGH', 'CRITICAL'].includes(selectedInvoice.risk_level) && actionType === 'APPROVED' ? '*' : '(Optional)'}
                </label>
                <textarea
                  rows={3}
                  required={['HIGH', 'CRITICAL'].includes(selectedInvoice.risk_level) && actionType === 'APPROVED'}
                  placeholder="Record verification rationale or reason for payment hold/rejection..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                    actionType === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm {actionType === 'APPROVED' ? 'Approval' : 'Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
