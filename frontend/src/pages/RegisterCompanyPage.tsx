import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Building, Mail, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const RegisterCompanyPage: React.FC = () => {
  const { registerCompany } = useAuth();
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [country, setCountry] = useState('United States');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await registerCompany({
        company_name: companyName,
        currency,
        country,
        admin_first_name: firstName,
        admin_last_name: lastName,
        admin_email: email,
        admin_password: password,
      });
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Company registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center">
        <div className="inline-flex p-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-3">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight">Register Organization Tenant</h2>
        <p className="mt-1 text-sm text-slate-400">
          Set up an isolated multi-tenant corporate partition on FinGuard AI
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-slate-800 border border-slate-700 py-8 px-6 shadow-2xl rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Company / Organization Legal Name
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Building className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="bg-slate-900/80 block w-full pl-10 pr-3 py-2 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Acme Global Corporation"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Default Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="bg-slate-900/80 block w-full px-3 py-2 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Country
                </label>
                <input
                  type="text"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="bg-slate-900/80 block w-full px-3 py-2 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="United States"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-700">
              <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider block mb-2">
                Primary Organization Administrator:
              </span>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="bg-slate-900/80 block w-full px-3 py-2 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500"
                  placeholder="First name"
                />
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="bg-slate-900/80 block w-full px-3 py-2 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500"
                  placeholder="Last name"
                />
              </div>

              <div className="mb-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-900/80 block w-full px-3 py-2 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500"
                  placeholder="Admin email"
                />
              </div>

              <div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-900/80 block w-full px-3 py-2 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500"
                  placeholder="Master password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors flex justify-center items-center"
            >
              {loading ? 'Creating Organization...' : 'Complete Registration & Access Console'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/login" className="text-xs text-indigo-400 hover:text-indigo-300">
              ← Return to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
