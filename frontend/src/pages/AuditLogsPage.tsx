import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  Search,
  Filter,
  ShieldAlert,
  Clock,
  User,
  Terminal,
  ChevronDown,
  ChevronRight,
  Loader2,
  Lock
} from 'lucide-react';
import api from '../services/api';
import { AuditLog } from '../types';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [resourceFilter, setResourceFilter] = useState('');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (actionFilter) params.action = actionFilter;
      if (resourceFilter) params.resource_type = resourceFilter;
      const res = await api.get('/audit', { params });
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to load audit trail', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, resourceFilter]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (log.action && log.action.toLowerCase().includes(q)) ||
      (log.user_email && log.user_email.toLowerCase().includes(q)) ||
      (log.resource_type && log.resource_type.toLowerCase().includes(q)) ||
      (log.resource_id && log.resource_id.toLowerCase().includes(q))
    );
  });

  const getActionBadge = (action: string) => {
    if (action.includes('FRAUD') || action.includes('REJECT')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">{action}</span>;
    }
    if (action.includes('APPROV') || action.includes('VERIFY')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">{action}</span>;
    }
    if (action.includes('CREATE') || action.includes('UPLOAD')) {
      return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{action}</span>;
    }
    return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{action}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Forensic Audit Trail
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              WORM Append-Only
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tamper-evident system activity ledger tracking every disbursement approval, bank modification, and AI evaluation.
          </p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by action, user email, or resource ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All Actions</option>
            <option value="UPLOAD_INVOICE">UPLOAD_INVOICE</option>
            <option value="CREATE_VENDOR">CREATE_VENDOR</option>
            <option value="ADD_VENDOR_BANK_ACCOUNT">ADD_VENDOR_BANK_ACCOUNT</option>
            <option value="VERIFY_VENDOR_BANK_ACCOUNT">VERIFY_VENDOR_BANK_ACCOUNT</option>
            <option value="EXECUTE_APPROVAL_DECISION">EXECUTE_APPROVAL_DECISION</option>
            <option value="UPDATE_FRAUD_INVESTIGATION">UPDATE_FRAUD_INVESTIGATION</option>
            <option value="CREATE_USER">CREATE_USER</option>
          </select>
          <select
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            className="text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">All Resources</option>
            <option value="INVOICE">INVOICE</option>
            <option value="VENDOR">VENDOR</option>
            <option value="VENDOR_BANK_ACCOUNT">VENDOR_BANK_ACCOUNT</option>
            <option value="FRAUD_ALERT">FRAUD_ALERT</option>
            <option value="USER">USER</option>
            <option value="PURCHASE_ORDER">PURCHASE_ORDER</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-sm">Retrieving forensic log ledger...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center">
            <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900">No audit logs found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              System transactions matching this query have not been recorded yet.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5">Actor</th>
                  <th className="px-6 py-3.5">Action</th>
                  <th className="px-6 py-3.5">Resource</th>
                  <th className="px-6 py-3.5">IP Address</th>
                  <th className="px-6 py-3.5 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => toggleExpand(log.id)}>
                        <td className="px-6 py-4 text-xs text-slate-500 font-mono whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {log.user_email || 'System Daemon'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {getActionBadge(log.action)}
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-slate-700">
                          <span className="font-semibold text-slate-900">{log.resource_type}</span>
                          {log.resource_id && (
                            <span className="text-slate-400 block font-mono text-[11px] truncate max-w-[120px]">
                              {log.resource_id}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-mono text-slate-500">
                          {log.ip_address || '127.0.0.1'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(log.id);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            {isExpanded ? 'Hide' : 'Inspect'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-900 text-slate-200">
                          <td colSpan={6} className="px-6 py-4 font-mono text-xs">
                            <div className="flex items-center gap-2 mb-2 text-slate-400">
                              <Terminal className="w-4 h-4 text-blue-400" />
                              <span>Forensic State Snapshot:</span>
                            </div>
                            <pre className="overflow-x-auto p-3 bg-slate-950 rounded-lg text-[11px] text-emerald-400">
                              {JSON.stringify(log.new_values || { action: log.action, id: log.resource_id }, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
