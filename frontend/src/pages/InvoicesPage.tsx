import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Search, Filter, Upload, ExternalLink, ShieldAlert, ArrowUpDown } from 'lucide-react';
import api from '../services/api';
import { Invoice } from '../types';

export const InvoicesPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, riskFilter]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      let url = '/invoices';
      const params: string[] = [];
      if (statusFilter !== 'ALL') params.push(`status=${statusFilter}`);
      if (riskFilter !== 'ALL') params.push(`risk_level=${riskFilter}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const res = await api.get(url);
      setInvoices(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const q = search.toLowerCase();
    return (
      inv.invoice_number.toLowerCase().includes(q) ||
      (inv.vendor_name && inv.vendor_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoice Ledger & Surveillance</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Audit-ready multi-tenant registry of incoming invoices, risk ratings, and approval states
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            to="/invoices/upload"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Upload className="w-4 h-4 mr-1.5" />
            Upload Invoice
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice # or vendor..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_VERIFICATION">Pending Verification</option>
              <option value="UNDER_INVESTIGATION">Under Investigation</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          {/* Risk Level Filter */}
          <div className="flex items-center space-x-1.5 text-xs text-slate-600">
            <span>Risk:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
            >
              <option value="ALL">All Risk Tiers</option>
              <option value="LOW">Low Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="HIGH">High Risk</option>
              <option value="CRITICAL">Critical Risk</option>
            </select>
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">Loading ledger records...</td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No matching invoices found in this view.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
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
                      <td className="py-3 px-4 font-mono text-slate-500">{inv.po_number || 'None'}</td>
                      <td className="py-3 px-4 text-slate-500">{inv.invoice_date}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        ${Number(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} {inv.currency}
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
                          className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-semibold"
                        >
                          Forensic View
                          <ExternalLink className="w-3.5 h-3.5 ml-1" />
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
