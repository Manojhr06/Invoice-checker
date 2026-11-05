import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Sliders,
  Shield,
  Save,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  DollarSign,
  Globe,
  Lock
} from 'lucide-react';
import api from '../services/api';
import { Organization } from '../types';
import { useAuth } from '../contexts/AuthContext';

export default function SettingsPage() {
  const { hasRole } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Editable Form fields
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [country, setCountry] = useState('United States');
  const [threshold, setThreshold] = useState(70);

  useEffect(() => {
    const fetchOrg = async () => {
      try {
        setLoading(true);
        const res = await api.get('/organizations/current');
        setOrg(res.data);
        setName(res.data.name);
        setCurrency(res.data.currency);
        setCountry(res.data.country);
        setThreshold(res.data.risk_tolerance_threshold ? Number(res.data.risk_tolerance_threshold) : 70);
      } catch (err) {
        console.error('Failed to load organization settings', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrg();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setSaving(true);
    try {
      const res = await api.put('/organizations/current', {
        name,
        currency,
        country,
        risk_tolerance_threshold: threshold
      });
      setOrg(res.data);
      setSuccessMsg('Organization settings and risk tolerance threshold updated successfully.');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to update settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
        <p className="text-sm">Loading organization settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Organization Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure financial risk tolerances, disbursement rules, and tenant profile parameters.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Identity */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">Enterprise Entity Profile</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company Legal Name</label>
              <input
                type="text"
                required
                disabled={!hasRole(['ADMIN'])}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Organization Slug / Tenant ID</label>
              <input
                type="text"
                disabled
                value={org?.slug || ''}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Base Currency</label>
              <select
                disabled={!hasRole(['ADMIN'])}
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Country Jurisdiction</label>
              <input
                type="text"
                disabled={!hasRole(['ADMIN'])}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Risk Tolerance Threshold */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900">Dynamic Risk Tolerance Threshold</h2>
            </div>
            <span className="text-sm font-bold font-mono px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
              {threshold} / 100
            </span>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed">
              Invoices scoring at or above this threshold trigger mandatory manager sign-off holds and prevent automated straight-through disbursements.
            </p>

            <input
              type="range"
              min="30"
              max="95"
              disabled={!hasRole(['ADMIN'])}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />

            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>30 (Strict / Zero Tolerance)</span>
              <span>70 (Industry Standard)</span>
              <span>95 (Permissive)</span>
            </div>
          </div>
        </div>

        {/* Enforced Governed Policies (Read Only) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Enforced Verification Policies</h2>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 block">3-Way PO Variance Ceiling</span>
                <span className="text-slate-500">Invoices exceeding purchase order line pricing by more than 2% are held for investigation</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold font-mono">2.0%</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 block">Vendor Bank Modification Cooling Window</span>
                <span className="text-slate-500">Invoices submitted within 30 days of a bank account update require out-of-band validation</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold font-mono">30 Days</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-900 block">Cryptographic Hash Duplicate Protection</span>
                <span className="text-slate-500">Exact SHA-256 byte collisions or fuzzy invoice number collisions are instantly intercepted</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold font-mono">Enforced</span>
            </div>
          </div>
        </div>

        {hasRole(['ADMIN']) && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Configuration
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
