import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, Lock, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../services/api';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState<'REQUEST' | 'RESET' | 'DONE'>('REQUEST');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRequestToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(res.data.message);
      if (res.data.dev_reset_token) {
        setResetToken(res.data.dev_reset_token);
      }
      setStep('RESET');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        reset_token: resetToken,
        new_password: newPassword,
      });
      setStep('DONE');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex p-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-3">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Password Reset Protocol</h2>
        <p className="mt-1 text-sm text-slate-400">Time-limited 15-minute single-use verification token</p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800 border border-slate-700 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {step === 'REQUEST' && (
            <form onSubmit={handleRequestToken} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Enter your registered corporate email
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-slate-900/80 block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="user@acmeglobal.com"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                {loading ? 'Sending Request...' : 'Issue Single-Use Reset Token'}
              </button>
            </form>
          )}

          {step === 'RESET' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/60 text-xs text-indigo-300">
                A single-use verification token expiring in 15 minutes was issued.
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Verification Token
                </label>
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="bg-slate-900/80 block w-full px-3 py-2 border border-slate-700 rounded-lg text-xs font-mono text-white"
                  placeholder="Paste JWT reset token"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  New Secure Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-slate-900/80 block w-full px-3 py-2 border border-slate-700 rounded-lg text-sm text-white"
                  placeholder="New password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                {loading ? 'Applying Changes...' : 'Update Password & Invalidate Token'}
              </button>
            </form>
          )}

          {step === 'DONE' && (
            <div className="text-center py-4 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <div className="text-sm font-bold text-white">Password Updated Successfully</div>
              <p className="text-xs text-slate-400">
                Your password has been changed. You can now log into FinGuard AI.
              </p>
              <Link
                to="/login"
                className="inline-block mt-3 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500"
              >
                Proceed to Login
              </Link>
            </div>
          )}

          <div className="mt-4 text-center">
            <Link to="/login" className="text-xs text-slate-400 hover:text-white">
              ← Return to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
