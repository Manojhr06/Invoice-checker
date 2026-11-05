import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  ArrowRight,
  UserCheck,
  FileText,
  X,
  Loader2,
  ExternalLink
} from 'lucide-react';
import api from '../services/api';
import { FraudAlert } from '../types';
import { useAuth } from '../contexts/AuthContext';

export default function FraudAlertsPage() {
  const { hasRole } = useAuth();
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  // Investigation Modal
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [investigationStatus, setInvestigationStatus] = useState<'UNDER_INVESTIGATION' | 'CONFIRMED_FRAUD' | 'LEGITIMATE' | 'RESOLVED'>('UNDER_INVESTIGATION');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (severityFilter) params.severity = severityFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/fraud/alerts', { params });
      setAlerts(res.data);
    } catch (err) {
      console.error('Failed to load fraud alerts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter, statusFilter]);

  const openInvestigationModal = (alert: FraudAlert) => {
    setSelectedAlert(alert);
    setInvestigationStatus(
      alert.investigation_status === 'NEW' ? 'UNDER_INVESTIGATION' :
      (alert.investigation_status as any)
    );
    setResolutionNotes(alert.resolution_notes || '');
    setErrorMsg('');
  };

  const handleUpdateInvestigation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlert) return;
    setUpdating(true);
    setErrorMsg('');
    try {
      await api.put(`/fraud/investigations/${selectedAlert.id}`, {
        investigation_status: investigationStatus,
        resolution_notes: resolutionNotes
      });
      setSelectedAlert(null);
      await fetchAlerts();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update fraud alert.');
    } finally {
      setUpdating(false);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.alert_title.toLowerCase().includes(q) ||
      a.alert_description.toLowerCase().includes(q) ||
      (a.invoice_number && a.invoice_number.toLowerCase().includes(q)) ||
      (a.vendor_name && a.vendor_name.toLowerCase().includes(q))
    );
  });

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-300">
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            LOW
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED_FRAUD':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-600 text-white">Confirmed Fraud</span>;
      case 'UNDER_INVESTIGATION':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500 text-white">Under Investigation</span>;
      case 'LEGITIMATE':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-600 text-white">Legitimate</span>;
      case 'RESOLVED':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-600 text-white">Resolved</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-600 text-white">New Case</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fraud Detection Center</h1>
        <p className="text-sm text-slate-500 mt-1">
          Active risk exceptions generated by multi-layer AI inference, OCR hash collisions, and suspicious vendor behavior.
        </p>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by alert headline, invoice number, or vendor..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="UNDER_INVESTIGATION">Under Investigation</option>
            <option value="CONFIRMED_FRAUD">Confirmed Fraud</option>
            <option value="LEGITIMATE">Legitimate</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {/* Alerts Grid / Cards */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-sm">Scanning active risk exceptions...</p>
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="p-16 text-center bg-white rounded-xl border border-slate-200">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">No active fraud alerts</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            All submitted invoices currently conform to verified supplier benchmarks, PO authorizations, and ML safety scores.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`bg-white rounded-xl p-5 border transition-all shadow-sm ${
                alert.severity === 'CRITICAL' ? 'border-l-4 border-l-rose-500 border-slate-200' :
                alert.severity === 'HIGH' ? 'border-l-4 border-l-orange-500 border-slate-200' :
                'border-slate-200'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {getSeverityBadge(alert.severity)}
                    {getStatusBadge(alert.investigation_status)}
                    <span className="text-xs text-slate-400">
                      Detected {new Date(alert.created_at).toLocaleString()}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">
                    {alert.alert_title}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {alert.alert_description}
                  </p>

                  {/* Context Links */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1 font-semibold text-slate-700">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      Invoice:
                      <Link
                        to={`/invoices/${alert.invoice_id}`}
                        className="text-blue-600 hover:underline font-mono ml-1 inline-flex items-center gap-0.5"
                      >
                        {alert.invoice_number || 'View Invoice'}
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    {alert.vendor_name && (
                      <div>
                        Vendor: <span className="font-semibold text-slate-700">{alert.vendor_name}</span>
                      </div>
                    )}

                    {alert.total_amount && (
                      <div>
                        Exposure: <span className="font-semibold text-slate-900 font-mono">${Number(alert.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}

                    {alert.assigned_user_name && (
                      <div className="flex items-center gap-1">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        Analyst: <span className="font-semibold text-slate-700">{alert.assigned_user_name}</span>
                      </div>
                    )}
                  </div>

                  {alert.resolution_notes && (
                    <div className="mt-2 p-2.5 rounded bg-slate-50 border border-slate-200 text-xs text-slate-700">
                      <span className="font-semibold text-slate-900">Case Findings: </span>
                      {alert.resolution_notes}
                    </div>
                  )}
                </div>

                {hasRole(['ADMIN', 'FINANCE_MANAGER']) && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => openInvestigationModal(alert)}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Update Case
                    </button>
                    <Link
                      to={`/invoices/${alert.invoice_id}`}
                      className="inline-flex items-center justify-center gap-1 px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
                    >
                      Audit Invoice
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Investigation Status Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">Update Fraud Investigation</h3>
              </div>
              <button onClick={() => setSelectedAlert(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleUpdateInvestigation} className="mt-4 space-y-4">
              <div>
                <span className="text-xs text-slate-400 block mb-0.5">Alert</span>
                <p className="text-xs font-bold text-slate-900">{selectedAlert.alert_title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{selectedAlert.alert_description}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Investigation Disposition *
                </label>
                <select
                  value={investigationStatus}
                  onChange={(e: any) => setInvestigationStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="UNDER_INVESTIGATION">Under Active Investigation</option>
                  <option value="CONFIRMED_FRAUD">Confirmed Fraud (Auto-Reject Invoice)</option>
                  <option value="LEGITIMATE">Legitimate Discrepancy (Cleared)</option>
                  <option value="RESOLVED">Resolved & Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Findings & Forensic Justification *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail out-of-band vendor call notes, matching purchase receipts, or fraud pattern analysis..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedAlert(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {updating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Disposition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
