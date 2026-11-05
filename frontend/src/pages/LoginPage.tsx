import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, Mail, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@acmeglobal.com');
  const [password, setPassword] = useState('FinGuard@123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoRole = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('FinGuard@123');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex p-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-4 shadow-inner">
          <Shield className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">FinGuard AI</h2>
        <p className="mt-2 text-sm text-slate-400">
          Enterprise Financial Risk & Invoice Fraud Prevention Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800 border border-slate-700 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Corporate Email Address
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
                  className="bg-slate-900/80 block w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="user@acmeglobal.com"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300">
                  Forgot password?
                </Link>
              </div>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-900/80 block w-full pl-10 pr-3 py-2.5 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'Authenticating...' : (
                <>
                  Sign in to FinGuard AI
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </form>

          {/* 1-Click Role Switcher for Evaluators */}
          <div className="mt-6 pt-5 border-t border-slate-700/80">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2.5">
              Instant Evaluation Switcher (1-Click Fill):
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoRole('admin@acmeglobal.com')}
                className="p-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-300 hover:border-indigo-500 hover:text-white text-left transition-colors"
              >
                <div className="font-semibold text-rose-400">Admin</div>
                <div className="text-[10px] text-slate-500 truncate">Governance & Users</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('finance.manager@acmeglobal.com')}
                className="p-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-300 hover:border-indigo-500 hover:text-white text-left transition-colors"
              >
                <div className="font-semibold text-blue-400">Finance Manager</div>
                <div className="text-[10px] text-slate-500 truncate">Approvals & Fraud</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('finance.employee@acmeglobal.com')}
                className="p-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-300 hover:border-indigo-500 hover:text-white text-left transition-colors"
              >
                <div className="font-semibold text-emerald-400">Finance Employee</div>
                <div className="text-[10px] text-slate-500 truncate">Uploads & OCR</div>
              </button>
              <button
                type="button"
                onClick={() => setDemoRole('auditor@acmeglobal.com')}
                className="p-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-300 hover:border-indigo-500 hover:text-white text-left transition-colors"
              >
                <div className="font-semibold text-purple-400">Auditor</div>
                <div className="text-[10px] text-slate-500 truncate">Read-Only Logs</div>
              </button>
            </div>
          </div>

          <div className="mt-5 text-center">
            <Link to="/register-company" className="text-xs text-indigo-400 hover:text-indigo-300">
              Register a New Tenant Organization →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
