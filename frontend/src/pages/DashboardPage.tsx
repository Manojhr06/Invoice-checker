import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  AlertTriangle,
  ShieldCheck,
  Clock,
  DollarSign,
  TrendingUp,
  Copy,
  ArrowUpRight,
  ShieldAlert,
  Building,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import {
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
  ResponsiveContainer,
  Legend
} from 'recharts';
import api from '../services/api';
import { DashboardSummary, Invoice } from '../types';

export const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [vendorRisk, setVendorRisk] = useState<any[]>([]);
  const [departmentExposure, setDepartmentExposure] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [sumRes, trendRes, riskRes, deptRes, invRes] = await Promise.all([
        api.get('/analytics/dashboard-summary'),
        api.get('/analytics/monthly-trends'),
        api.get('/analytics/vendor-risk-distribution'),
        api.get('/analytics/department-exposure'),
        api.get('/invoices')
      ]);

      setSummary(sumRes.data);
      setTrends(trendRes.data || []);
      setVendorRisk(riskRes.data || []);
      setDepartmentExposure(deptRes.data || []);
      setRecentInvoices((invRes.data || []).slice(0, 6));
    } catch (e) {
      console.error('Error fetching dashboard records', e);
    } finally {
      setLoading(false);
    }
  };

  const riskColors: Record<string, string> = {
    LOW: '#10b981',
    MEDIUM: '#f59e0b',
    HIGH: '#f97316',
    CRITICAL: '#ef4444'
  };

  return (
    <div className="space-y-6">
      {/* Header & Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Executive Financial Risk Intelligence</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time fraud prevention, invoice verification & disbursement surveillance
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <Link
            to="/invoices/upload"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            Upload New Invoice
            <ArrowUpRight className="w-4 h-4 ml-1.5" />
          </Link>
        </div>
      </div>

      {/* 8 Primary Financial Risk KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoices */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Processed</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{summary?.total_invoices_processed ?? 0}</div>
          <div className="mt-1 text-xs text-slate-500">Total volume recorded</div>
        </div>

        {/* Total Value */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoice Value</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            ${summary?.total_invoice_value ? Number(summary.total_invoice_value).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="mt-1 text-xs text-slate-500">{summary?.currency || 'USD'} Ledger Total</div>
        </div>

        {/* Suspicious & Flagged */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Elevated Risk Flagged</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-600">{summary?.suspicious_invoices ?? 0}</div>
          <div className="mt-1 text-xs text-slate-500">Medium & High risk classifications</div>
        </div>

        {/* Exposure Under Investigation */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Exposure on Hold</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-rose-600">
            ${summary?.exposure_under_investigation ? Number(summary.exposure_under_investigation).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
          </div>
          <div className="mt-1 text-xs text-slate-500">Halted forensic disbursements</div>
        </div>
      </div>

      {/* Secondary Metric Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-100 p-3 rounded-xl border border-slate-200/80 text-xs">
        <div className="bg-white p-3 rounded-lg border border-slate-200">
          <div className="text-slate-500 font-medium">Verified Legitimate</div>
          <div className="text-lg font-bold text-emerald-600 mt-1">{summary?.legitimate_invoices ?? 0}</div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200">
          <div className="text-slate-500 font-medium">Pending Approvals</div>
          <div className="text-lg font-bold text-blue-600 mt-1">{summary?.pending_approvals ?? 0}</div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200">
          <div className="text-slate-500 font-medium">Confirmed Fraud Blocks</div>
          <div className="text-lg font-bold text-rose-600 mt-1">{summary?.confirmed_fraud_invoices ?? 0}</div>
        </div>
        <div className="bg-white p-3 rounded-lg border border-slate-200">
          <div className="text-slate-500 font-medium">Duplicate Collisions</div>
          <div className="text-lg font-bold text-indigo-600 mt-1">{summary?.duplicate_invoices_detected ?? 0}</div>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Processing & Fraud Trajectory */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly Invoice Volume & Prevented Fraud</h3>
              <p className="text-xs text-slate-500">Reconciled time-series data across trailing operational periods</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">Live DB</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFraud" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="total_volume" name="Total Invoices" stroke="#6366f1" fillOpacity={1} fill="url(#colorVol)" strokeWidth={2} />
                <Area type="monotone" dataKey="flagged_fraud_count" name="Flagged Fraud Cases" stroke="#ef4444" fillOpacity={1} fill="url(#colorFraud)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vendor Risk Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Vendor Risk Distribution</h3>
            <p className="text-xs text-slate-500 mb-4">Master vendor registry risk level segmentation</p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={vendorRisk}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="risk_level"
                  >
                    {vendorRisk.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={riskColors[entry.risk_level] || '#64748b'} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-slate-100">
            {vendorRisk.map((r) => (
              <div key={r.risk_level} className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: riskColors[r.risk_level] || '#64748b' }} />
                <span className="text-slate-600">{r.risk_level}: <strong className="text-slate-900">{r.count}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Recent Invoice Ingestions & Forensic Status</h3>
            <p className="text-xs text-slate-500">Live feed of transactions evaluated against deterministic rules and dual ML models</p>
          </div>
          <Link to="/invoices" className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 flex items-center">
            View All Invoices
            <ExternalLink className="w-3.5 h-3.5 ml-1" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4">Composite Score</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No invoices recorded yet. Click "Upload New Invoice" to begin.
                  </td>
                </tr>
              ) : (
                recentInvoices.map((inv) => {
                  const badgeColor = {
                    LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                    MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
                    HIGH: 'bg-orange-50 text-orange-700 border-orange-200',
                    CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200'
                  }[inv.risk_level || 'LOW'];

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">{inv.invoice_number}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{inv.vendor_name || 'Apex Cloud Systems'}</td>
                      <td className="py-3 px-4 text-slate-500">{inv.invoice_date}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        ${Number(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                          {inv.risk_level}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">{Number(inv.risk_score).toFixed(1)}/100</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                          {inv.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/invoices/${inv.id}`}
                          className="text-indigo-600 hover:text-indigo-800 font-semibold"
                        >
                          Forensic Inspection →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
