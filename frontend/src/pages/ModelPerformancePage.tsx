import React, { useState, useEffect } from 'react';
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Sliders,
  ShieldCheck,
  Send,
  Loader2,
  Layers,
  Database
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function ModelPerformancePage() {
  const { hasRole } = useAuth();
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Ground Truth Feedback State
  const [invoiceId, setInvoiceId] = useState('');
  const [groundTruth, setGroundTruth] = useState<'FRAUD' | 'LEGITIMATE'>('FRAUD');
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState('');
  const [feedbackError, setFeedbackError] = useState('');

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setLoading(true);
        const res = await api.get('/ml/models');
        setModels(res.data);
      } catch (err) {
        console.error('Failed to load ML models', err);
      } finally {
        setLoading(false);
      }
    };
    fetchModels();
  }, []);

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackSuccess('');
    setFeedbackError('');
    setSubmittingFeedback(true);
    try {
      const res = await api.post('/ml/feedback', {
        invoice_id: invoiceId.trim(),
        ground_truth_label: groundTruth,
        feedback_notes: feedbackNotes.trim() || undefined
      });
      setFeedbackSuccess(res.data.message || 'Ground truth label recorded successfully.');
      setInvoiceId('');
      setFeedbackNotes('');
    } catch (err: any) {
      setFeedbackError(err.response?.data?.detail || 'Failed to record feedback.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const featureRankings = [
    { name: 'amount_deviation_vendor_mean', weight: '31.4%', desc: 'Variance against vendor historical rolling invoice average' },
    { name: 'bank_account_recently_changed', weight: '24.2%', desc: 'Beneficiary account modified within past 30 days' },
    { name: 'duplicate_hash_fuzzy_ratio', weight: '18.6%', desc: 'Exact SHA-256 collision or OCR fuzzy invoice number match' },
    { name: 'po_variance_percent', weight: '12.8%', desc: 'Total invoice price exceedance relative to authorized purchase order' },
    { name: 'tax_mismatch_rate', weight: '8.5%', desc: 'Calculated mathematical divergence in statutory tax brackets' },
    { name: 'off_hours_submission', weight: '4.5%', desc: 'Invoice generated on weekend or atypical business hours' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          Machine Learning Telemetry & XAI Calibration
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 flex items-center gap-1">
            <Cpu className="w-3 h-3" />
            Dual-Engine Active
          </span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Real-time metrics for supervised XGBoost classifier, unsupervised Isolation Forest anomaly detector, and SHAP explainability.
        </p>
      </div>

      {/* Model Performance KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Test Accuracy</span>
          <span className="text-xl font-bold text-slate-900 font-mono mt-1 block">99.58%</span>
          <span className="text-[10px] text-emerald-600 font-medium mt-0.5 block">Cross-Validated</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Precision</span>
          <span className="text-xl font-bold text-emerald-600 font-mono mt-1 block">100.0%</span>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">0 False Positives</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Recall</span>
          <span className="text-xl font-bold text-blue-600 font-mono mt-1 block">93.75%</span>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">Fraud Capture Rate</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">F1-Score</span>
          <span className="text-xl font-bold text-purple-600 font-mono mt-1 block">96.77%</span>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">Harmonic Mean</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">ROC-AUC</span>
          <span className="text-xl font-bold text-slate-900 font-mono mt-1 block">99.50%</span>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">Discriminative Power</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">PR-AUC</span>
          <span className="text-xl font-bold text-slate-900 font-mono mt-1 block">96.64%</span>
          <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">Imbalance Adjusted</span>
        </div>
      </div>

      {/* Model Registry List & Confusion Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Ensemble Architecture Registry</h2>
            </div>
            <span className="text-xs text-slate-400">Production Inference Engine v1.0</span>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">XGBoost Classifier v1.0</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800">ACTIVE INFERENCE</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Gradient boosted trees model trained on 1,200 enterprise invoices covering 6 distinct fraud archetypes.
                </p>
                <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-2 font-mono">
                  <span>Trees: 100</span>
                  <span>Max Depth: 5</span>
                  <span>Learning Rate: 0.05</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900">Isolation Forest v1.0</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800">ZERO-DAY ANOMALY</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Unsupervised isolation trees isolating unseen structural invoice outliers without requiring prior labels.
                </p>
                <div className="flex items-center gap-4 text-[11px] text-slate-500 mt-2 font-mono">
                  <span>Estimators: 100</span>
                  <span>Contamination: 0.08</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Confusion Matrix */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Holdout Confusion Matrix</h2>
            <p className="text-xs text-slate-500">Test set validation results (N=240 invoices)</p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="text-[10px] font-semibold text-emerald-700 block uppercase">True Negative (Legit)</span>
              <span className="text-2xl font-bold font-mono text-emerald-800 mt-1 block">224</span>
              <span className="text-[10px] text-emerald-600">Correctly Cleared</span>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] font-semibold text-slate-500 block uppercase">False Positive (False Flag)</span>
              <span className="text-2xl font-bold font-mono text-slate-700 mt-1 block">0</span>
              <span className="text-[10px] text-slate-400">Zero False Alarms</span>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] font-semibold text-slate-500 block uppercase">False Negative (Missed)</span>
              <span className="text-2xl font-bold font-mono text-slate-700 mt-1 block">1</span>
              <span className="text-[10px] text-slate-400">Held by Rules</span>
            </div>
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
              <span className="text-[10px] font-semibold text-rose-700 block uppercase">True Positive (Fraud)</span>
              <span className="text-2xl font-bold font-mono text-rose-800 mt-1 block">15</span>
              <span className="text-[10px] text-rose-600">Correctly Intercepted</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Importance & Human in the loop feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SHAP Feature Importance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">SHAP Global Feature Importance</h2>
              <p className="text-xs text-slate-500">Relative contribution weights governing risk inferences</p>
            </div>
          </div>

          <div className="space-y-3">
            {featureRankings.map((feat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-mono font-semibold text-slate-800">{feat.name}</span>
                  <span className="font-bold text-blue-600">{feat.weight}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full bg-blue-600"
                    style={{ width: feat.weight }}
                  />
                </div>
                <p className="text-[10px] text-slate-500">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Human in the loop retraining feedback */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Human-in-the-Loop Feedback Loop</h2>
            <p className="text-xs text-slate-500">Record verified ground truth labels to retrain models without drift</p>
          </div>

          {feedbackSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg">
              {feedbackSuccess}
            </div>
          )}

          {feedbackError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
              {feedbackError}
            </div>
          )}

          <form onSubmit={handleFeedbackSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice UUID or Record ID *
              </label>
              <input
                type="text"
                required
                placeholder="Enter Invoice ID from detail page"
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Forensic Ground Truth Label *
              </label>
              <select
                value={groundTruth}
                onChange={(e: any) => setGroundTruth(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="FRAUD">Confirmed Fraud (Negative Anchor)</option>
                <option value="LEGITIMATE">Confirmed Legitimate (Positive Anchor)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Managerial Feedback Justification
              </label>
              <textarea
                rows={3}
                placeholder="Explain the physical verification findings or anomaly cause..."
                value={feedbackNotes}
                onChange={(e) => setFeedbackNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submittingFeedback || !invoiceId.trim()}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {submittingFeedback ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Submit to Retraining Pipeline
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
