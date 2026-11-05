import React, { useState } from 'react';
import {
  User,
  Shield,
  Briefcase,
  Building2,
  Calendar,
  Key,
  AlertTriangle,
  Trash2,
  Loader2,
  CheckCircle2,
  Lock
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [showAnonymizeModal, setShowAnonymizeModal] = useState(false);
  const [anonymizing, setAnonymizing] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const handleAnonymize = async () => {
    if (confirmText !== 'DELETE') return;
    setAnonymizing(true);
    try {
      await api.delete('/users/me/anonymize-data');
      alert('Your personal identifying data has been redacted and your account deactivated.');
      logout();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to anonymize account data.');
      setAnonymizing(false);
    }
  };

  const getRolePermissions = (roleName: string) => {
    switch (roleName) {
      case 'ADMIN':
        return [
          'Full organizational administration and company settings management',
          'User provisioning, role assignment, and access revocation',
          'Access to forensic compliance audit logs and system telemetry',
          'Dual-engine ML model retraining oversight'
        ];
      case 'FINANCE_MANAGER':
        return [
          'Dual-control invoice approval and disbursement sign-off',
          'Fraud alert investigation disposition and case resolution',
          'Vendor bank account out-of-band verification and hold release',
          'Comprehensive financial exposure and spend analytics'
        ];
      case 'FINANCE_EMPLOYEE':
        return [
          'Multi-format invoice upload (PDF, JPG, PNG) and OCR text extraction',
          'Pre-submission OCR correction and line item adjustment',
          'Vendor directory access and supplier profile registration',
          'Purchase order generation and commitment tracking'
        ];
      case 'AUDITOR':
        return [
          'Read-only access to complete transaction ledger and verification results',
          'Forensic WORM-compliant audit trail inspection',
          'Export of certified financial CSV ledgers for external compliance',
          'Zero-write policy enforcement (cannot modify transaction states)'
        ];
      default:
        return ['Standard platform access'];
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Profile & Credentials</h1>
        <p className="text-sm text-slate-500 mt-1">
          Identity management, role authorization matrix, and data privacy governance.
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 border-b border-slate-100 pb-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-2xl shadow-sm">
            {user?.first_name?.[0]}{user?.last_name?.[0]}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{user?.full_name}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {user?.role?.name}
              </span>
            </div>
            <p className="text-sm text-slate-500">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 text-xs">
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-slate-400 block font-medium">Department</span>
              <span className="font-semibold text-slate-800">{user?.department || 'Finance & Accounts'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-slate-400 block font-medium">Organization</span>
              <span className="font-semibold text-slate-800">{user?.organization_name || 'Enterprise Tenant'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-slate-400 block font-medium">Account Created</span>
              <span className="font-semibold text-slate-800">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
            <Lock className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-slate-400 block font-medium">Session Security</span>
              <span className="font-semibold text-emerald-600">RFC-7519 JWT Authenticated</span>
            </div>
          </div>
        </div>
      </div>

      {/* Role Capabilities */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">
            Assigned RBAC Privileges ({user?.role?.name})
          </h2>
        </div>

        <ul className="space-y-2 text-xs text-slate-700">
          {getRolePermissions(user?.role?.name || '').map((perm, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{perm}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* GDPR Data Anonymization Section */}
      <div className="bg-rose-50/50 p-6 rounded-xl border border-rose-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <h2 className="text-base font-bold text-rose-900">GDPR Privacy & Account Anonymization</h2>
        </div>
        <p className="text-xs text-rose-700 leading-relaxed">
          Under GDPR Article 17 (Right to be Forgotten), you may redact all personal identifying information (full name, email, credentials) associated with this account. Financial transaction records and immutable audit entries will be anonymized to preserve enterprise audit integrity.
        </p>

        <button
          onClick={() => setShowAnonymizeModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Request Personal Data Redaction
        </button>
      </div>

      {/* Confirmation Modal */}
      {showAnonymizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center gap-2 text-rose-600 pb-3 border-b border-slate-200">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Confirm Account Anonymization</h3>
            </div>

            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              This action is <strong>irreversible</strong>. Your name, email, and login credentials will be immediately overwritten with cryptographic random strings, and you will be logged out of FinGuard.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Type <strong>DELETE</strong> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowAnonymizeModal(false);
                  setConfirmText('');
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmText !== 'DELETE' || anonymizing}
                onClick={handleAnonymize}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {anonymizing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Permanently Anonymize
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
