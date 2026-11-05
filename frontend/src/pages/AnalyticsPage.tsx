import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Download,
  AlertTriangle,
  Building,
  DollarSign,
  PieChart as PieIcon,
  BarChart3,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import api from '../services/api';
import { DashboardSummary } from '../types';

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<any[]>([]);
  const [riskDistribution, setRiskDistribution] = useState<any[]>([]);
  const [deptExposure, setDeptExposure] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const [sumRes, trendRes, distRes, deptRes] = await Promise.all([
          api.get('/analytics/dashboard-summary'),
          api.get('/analytics/monthly-trends'),
          api.get('/analytics/vendor-risk-distribution'),
          api.get('/analytics/department-exposure')
        ]);
        setSummary(sumRes.data);
        setMonthlyTrends(trendRes.data);
        setRiskDistribution(distRes.data);
        setDeptExposure(deptRes.data);
      } catch (err) {
        console.error('Failed to load analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const res = await api.get('/analytics/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `finguard_financial_forensics_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('CSV export failed', err);
      alert('Failed to export forensic CSV.');
    } finally {
      setExporting(false);
    }
  };

  const RISK_COLORS: Record<string, string> = {
    LOW: '#10B981',
    MEDIUM: '#F59E0B',
    HIGH: '#F97316',
    CRITICAL: '#EF4444'
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
        <p className="text-sm">Calculating financial risk models and exposure distributions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Financial Risk Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
            Forensic metrics, anomaly concentrations, and enterprise capital exposure analytics.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 text-emerald-400" />}
          Export Forensic CSV
        </button>
      </div>

      {/* KPI Overview */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Capital Processed</span>
            <span className="text-2xl font-bold text-slate-900 font-mono mt-1 block">
              ${Number(summary.total_invoice_value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-slate-500 mt-1 block">Across {summary.total_invoices_processed} processed invoices</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-rose-500 uppercase tracking-wider block">At-Risk Capital Exposure</span>
            <span className="text-2xl font-bold text-rose-600 font-mono mt-1 block">
              ${Number(summary.exposure_under_investigation).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-rose-500 mt-1 block">Held under investigation</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Verified Disbursements</span>
            <span className="text-2xl font-bold text-emerald-600 font-mono mt-1 block">
              {summary.legitimate_invoices}
            </span>
            <span className="text-xs text-slate-500 mt-1 block">100% policy compliant</span>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Duplicates Intercepted</span>
            <span className="text-2xl font-bold text-blue-600 font-mono mt-1 block">
              {summary.duplicate_invoices_detected}
            </span>
            <span className="text-xs text-slate-500 mt-1 block">Zero double payouts</span>
          </div>
        </div>
      )}

      {/* Monthly Trends Area Chart */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Monthly Invoicing & Fraud Interception Trends</h2>
            <p className="text-xs text-slate-500">Gross monthly disbursement requests vs. flagged risk exceptions</p>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyTrends} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="totalColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fraudColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} />
              <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} tickFormatter={(val) => `$${val}`} />
              <Tooltip formatter={(value: any) => [`$${Number(value).toLocaleString()}`, '']} />
              <Legend />
              <Area type="monotone" dataKey="total_amount" name="Total Requested ($)" stroke="#3B82F6" fillOpacity={1} fill="url(#totalColor)" strokeWidth={2} />
              <Area type="monotone" dataKey="flagged_fraud_amount" name="Fraud Blocked ($)" stroke="#EF4444" fillOpacity={1} fill="url(#fraudColor)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dual Charts Grid: Vendor Risk Distribution & Department Exposure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vendor Risk Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Supplier Risk Tier Distribution</h2>
            <p className="text-xs text-slate-500">Distribution of registered vendors across AI safety ratings</p>
          </div>

          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskDistribution}
                  dataKey="count"
                  nameKey="risk_level"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.risk_level] || '#64748B'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any, name: any) => [`${value} Vendors`, `${name} Risk`]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Exposure */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Department Financial Exposure</h2>
            <p className="text-xs text-slate-500">Total spend vs high-risk invoice volume by cost center</p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptExposure} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="department" stroke="#94A3B8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v: any) => `$${Number(v).toLocaleString()}`} />
                <Legend />
                <Bar dataKey="total_amount" name="Total Spend" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="high_risk_amount" name="High Risk Exposure" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
