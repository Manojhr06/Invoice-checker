import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Building,
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  Cpu,
  BarChart2,
  Clock,
  ArrowLeft,
  Check,
  X
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isFinanceManager } = useAuth();

  const [invoice, setInvoice] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [modalAction, setModalAction] = useState<'APPROVED' | 'REJECTED' | null>(null);

  useEffect(() => {
    fetchInvoiceDetails();
  }, [id]);

  const fetchInvoiceDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/invoices/${id}`);
      setInvoice(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalAction = async (action: 'APPROVED' | 'REJECTED') => {
    setActionLoading(true);
    try {
      await api.post(`/approvals/${id}/action`, {
        action,
        reason: actionReason || `Invoice ${action.toLowerCase()} by authorized manager.`
      });
      setModalAction(null);
      setActionReason('');
      await fetchInvoiceDetails();
    } catch (e: any) {
      alert(e.response?.data?.detail || 'Approval action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-16 text-slate-400">Loading forensic verification analysis...</div>;
  }

  if (!invoice) {
    return <div className="text-center py-16 text-slate-500">Invoice not found or access restricted.</div>;
  }

  const riskBadgeColor = {
    LOW: 'bg-emerald-50 text-emerald-700 border-emerald-300',
    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-300',
    HIGH: 'bg-orange-50 text-orange-700 border-orange-300',
    CRITICAL: 'bg-rose-50 text-rose-700 border-rose-300'
  }[invoice.risk_level || 'LOW'];

  // SHAP Chart data
  const shapData = Object.entries(invoice.fraud_prediction?.feature_importance_shap || {}).map(([key, val]) => ({
    feature: key.replace(/_/g, ' ').replace('flag', '').trim(),
    weight: Number((Number(val) * 100).toFixed(1))
  })).sort((a, b) => b.weight - a.weight);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <Link to="/invoices" className="inline-flex items-center text-xs font-semibold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Invoices Ledger
        </Link>
        <span className="text-xs text-slate-500 font-mono">ID: {invoice.id}</span>
      </div>

      {/* Invoice Forensic Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold font-mono text-slate-900 tracking-tight">#{invoice.invoice_number}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${riskBadgeColor}`}>
              {invoice.risk_level} RISK (Score: {Number(invoice.risk_score).toFixed(1)}/100)
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-4 text-xs text-slate-500">
            <div>Vendor: <strong className="text-slate-800">{invoice.vendor_name}</strong></div>
            <div>Issued: <strong className="text-slate-800">{invoice.invoice_date}</strong></div>
            <div>PO Link: <strong className="text-slate-800 font-mono">{invoice.po_number || 'No PO'}</strong></div>
            <div>Status: <span className="font-semibold text-slate-700">{invoice.status}</span></div>
          </div>
        </div>

        <div className="text-left md:text-right">
          <div className="text-xs text-slate-400 uppercase font-semibold">Total Invoice Amount</div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            ${Number(invoice.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {invoice.currency}
          </div>
          <div className="text-xs text-slate-500">Subtotal: ${Number(invoice.subtotal_amount).toFixed(2)} | Tax: ${Number(invoice.tax_amount).toFixed(2)}</div>
        </div>
      </div>

      {/* Governed AI Explanation Synthesizer Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-md">
        <div className="flex items-center space-x-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Cpu className="w-4 h-4" />
          <span>Governed Forensic AI Explanation (Auditable Rationale)</span>
        </div>
        <div className="text-xs leading-relaxed text-slate-200 whitespace-pre-line font-sans">
          {invoice.fraud_prediction?.natural_language_explanation || 'No forensic explanation generated yet.'}
        </div>
      </div>

      {/* Deterministic Verification Matrix */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center">
          <ShieldCheck className="w-4 h-4 mr-2 text-indigo-600" />
          Deterministic Rule Verification Matrix
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {/* Vendor Check */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-700">Vendor Master Match</span>
              {invoice.verification?.vendor_matched ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-500" />
              )}
            </div>
            <p className="text-slate-500">
              {invoice.verification?.vendor_matched ? 'Registered in authorized vendor directory.' : 'Unregistered vendor or ghost entity.'}
            </p>
          </div>

          {/* Bank Alteration Check */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-700">Disbursement Bank Check</span>
              {!invoice.verification?.bank_recently_changed && invoice.verification?.bank_details_matched ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              )}
            </div>
            <p className="text-slate-500">
              {invoice.verification?.bank_recently_changed
                ? 'Bank account modified within trailing 30 days! Manager review required.'
                : 'Disbursement target matches verified vendor bank registry.'}
            </p>
          </div>

          {/* Tax / GSTIN */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-700">Tax ID / GSTIN Validation</span>
              {invoice.verification?.gstin_verified ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-500" />
              )}
            </div>
            <p className="text-slate-500">
              {invoice.verification?.gstin_verified ? 'Tax identifier reconciled with government master.' : 'Tax identifier mismatch identified.'}
            </p>
          </div>

          {/* PO 3-Way Reconciliation */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-700">PO 3-Way Reconciliation</span>
              {invoice.verification?.po_matched ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              )}
            </div>
            <p className="text-slate-500">
              {invoice.verification?.po_amount_exceeded
                ? 'Invoice amount exceeds authorized PO remaining budget!'
                : (invoice.verification?.po_matched ? 'Line items reconciled within 2.0% variance tolerance.' : 'Discrepancy in unit price or missing contract PO.')}
            </p>
          </div>

          {/* Duplicate Detection */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-700">Duplicate Surveillance</span>
              {!invoice.verification?.duplicate_detected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-500" />
              )}
            </div>
            <p className="text-slate-500">
              {invoice.verification?.duplicate_detected
                ? invoice.verification?.duplicate_match_reason
                : 'No duplicate document hash or number collisions found.'}
            </p>
          </div>

          {/* Document Hash Digest */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-slate-700">SHA-256 Digest</span>
              <CheckCircle2 className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-[10px] font-mono text-slate-500 break-all truncate">
              {invoice.document_hash}
            </p>
          </div>
        </div>
      </div>

      {/* Machine Learning Dual-Engine Diagnostics & SHAP Attributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ML Gauge Cards */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center">
            <Cpu className="w-4 h-4 mr-2 text-indigo-600" />
            Dual-Model Inference Scores
          </h3>

          <div className="space-y-3 text-xs">
            {/* XGBoost */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Model A: XGBoost Supervised</span>
                <span className="font-mono text-indigo-600 font-bold">
                  {(Number(invoice.fraud_prediction?.supervised_fraud_probability || 0) * 100).toFixed(1)}% Prob
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full"
                  style={{ width: `${Number(invoice.fraud_prediction?.supervised_fraud_probability || 0) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Trained on labeled enterprise fraud patterns</span>
            </div>

            {/* Isolation Forest */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex justify-between font-semibold text-slate-700 mb-1">
                <span>Model B: Isolation Forest</span>
                <span className="font-mono text-amber-600 font-bold">
                  {(Number(invoice.fraud_prediction?.isolation_forest_anomaly_score || 0) * 100).toFixed(1)}% Anomaly
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full"
                  style={{ width: `${Number(invoice.fraud_prediction?.isolation_forest_anomaly_score || 0) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Unsupervised multi-dimensional spending outlier detection</span>
            </div>
          </div>
        </div>

        {/* SHAP Feature Contribution Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center">
            <BarChart2 className="w-4 h-4 mr-2 text-indigo-600" />
            Explainable AI: Key Contributing Features (SHAP Values)
          </h3>
          <p className="text-xs text-slate-500 mb-4">Relative percentage impact pushing risk score upward</p>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shapData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} unit="%" />
                <YAxis type="category" dataKey="feature" tick={{ fontSize: 10, fill: '#334155' }} width={140} />
                <Tooltip
                  formatter={(value: any) => [`+${value}% impact`, 'Weight']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="weight" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">Extracted Invoice Line Items</h3>
        </div>
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4">Item Description</th>
              <th className="py-2.5 px-4">Quantity</th>
              <th className="py-2.5 px-4">Unit Price</th>
              <th className="py-2.5 px-4">Tax Amount</th>
              <th className="py-2.5 px-4 text-right">Total Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(invoice.items || []).map((it: any, idx: number) => (
              <tr key={idx}>
                <td className="py-3 px-4 font-medium text-slate-800">{it.item_description}</td>
                <td className="py-3 px-4 font-mono">{it.quantity}</td>
                <td className="py-3 px-4 font-mono">${Number(it.unit_price).toFixed(2)}</td>
                <td className="py-3 px-4 font-mono">${Number(it.tax_amount).toFixed(2)}</td>
                <td className="py-3 px-4 font-mono font-semibold text-slate-900 text-right">
                  ${Number(it.total_price).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Human Approval Action Gateway (Finance Managers Only) */}
      {isFinanceManager && invoice.status !== 'APPROVED' && invoice.status !== 'REJECTED' && (
        <div className="bg-white p-6 rounded-2xl border-2 border-indigo-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Finance Manager Disbursement Authorization Gate</h4>
            <p className="text-xs text-slate-500">
              Inspect all deterministic flags and dual ML predictions before signing off on disbursement release.
            </p>
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={() => setModalAction('REJECTED')}
              className="flex-1 sm:flex-none px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center"
            >
              <X className="w-4 h-4 mr-1.5" />
              Reject Disbursement
            </button>
            <button
              onClick={() => setModalAction('APPROVED')}
              className="flex-1 sm:flex-none px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors flex items-center justify-center"
            >
              <Check className="w-4 h-4 mr-1.5" />
              Approve for Disbursement
            </button>
          </div>
        </div>
      )}

      {/* Approval / Rejection Modal */}
      {modalAction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Confirm {modalAction === 'APPROVED' ? 'Disbursement Approval' : 'Invoice Rejection'}
            </h3>
            <p className="text-xs text-slate-500">
              Please document your compliance notes and justification for audit log compliance:
            </p>
            <textarea
              required
              rows={3}
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              placeholder="Enter audit justification (e.g. verified PO variance with Department Head via phone)..."
              className="w-full p-2.5 border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setModalAction(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleApprovalAction(modalAction)}
                className={`px-4 py-2 text-white text-xs font-semibold rounded-lg ${
                  modalAction === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {actionLoading ? 'Executing Decision...' : `Confirm ${modalAction}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval History & Decision Trail */}
      {invoice.workflow && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
            <Clock className="w-4 h-4 mr-2 text-indigo-600" />
            Decision Timeline & Compliance History
          </h3>
          <div className="space-y-3">
            {(invoice.workflow.history || []).map((h: any, idx: number) => (
              <div key={idx} className="flex items-start text-xs border-l-2 border-indigo-200 pl-3 py-1">
                <div>
                  <div className="font-semibold text-slate-800">
                    Action: <span className="uppercase text-indigo-600 font-bold">{h.action_taken}</span>
                  </div>
                  <div className="text-slate-500 mt-0.5">{h.reason}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{h.action_timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
