import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  FileText,
  Upload,
  CheckSquare,
  AlertTriangle,
  Building2,
  ShoppingCart,
  BarChart3,
  Bot,
  ShieldCheck,
  Users,
  Settings,
  Bell,
  LogOut,
  ChevronDown,
  User as UserIcon,
  Cpu,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export const AppLayout: React.FC = () => {
  const { user, logout, isAdmin, isFinanceManager, isFinanceEmployee, isAuditor } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
  }, [location.pathname]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch {
      // ignore
    }
  };

  const navItems = [
    { label: 'Executive Dashboard', path: '/', icon: LayoutDashboard, show: true },
    { label: 'Invoice Management', path: '/invoices', icon: FileText, show: true },
    { label: 'Upload & OCR Review', path: '/invoices/upload', icon: Upload, show: isFinanceEmployee },
    { label: 'Approval Queue', path: '/approvals', icon: CheckSquare, show: isFinanceManager },
    { label: 'Fraud Detection Center', path: '/fraud-alerts', icon: AlertTriangle, show: true },
    { label: 'Vendor Registry', path: '/vendors', icon: Building2, show: true },
    { label: 'Purchase Orders', path: '/purchase-orders', icon: ShoppingCart, show: true },
    { label: 'Financial Analytics', path: '/analytics', icon: BarChart3, show: isFinanceManager || isAuditor },
    { label: 'AI Risk Assistant', path: '/assistant', icon: Bot, show: true },
    { label: 'Forensic Audit Logs', path: '/audit-logs', icon: ShieldCheck, show: isAuditor || isAdmin },
    { label: 'ML Model Performance', path: '/model-performance', icon: Cpu, show: isAdmin || isFinanceManager },
    { label: 'User Governance', path: '/users', icon: Users, show: isAdmin },
    { label: 'System Settings', path: '/settings', icon: Settings, show: isAdmin || isFinanceManager },
  ];

  const roleBadgeColor = {
    ADMIN: 'bg-rose-50 text-rose-700 border-rose-200',
    FINANCE_MANAGER: 'bg-blue-50 text-blue-700 border-blue-200',
    FINANCE_EMPLOYEE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    AUDITOR: 'bg-purple-50 text-purple-700 border-purple-200',
  }[user?.role?.name || 'FINANCE_EMPLOYEE'];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans antialiased">
      {/* Sidebar for Desktop */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex-shrink-0 hidden md:flex flex-col justify-between">
        <div>
          {/* Logo & Platform Name */}
          <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950/40">
            <Shield className="w-6 h-6 text-indigo-400 mr-2.5 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-white flex items-center">
                FinGuard <span className="text-indigo-400 ml-1 text-xs px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-800">AI</span>
              </span>
              <span className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">Enterprise Risk Guard</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
            {navItems.filter((i) => i.show).map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 mr-3 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Tenant Organization Indicator */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30">
          <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Organization Tenant</div>
          <div className="text-sm font-medium text-slate-200 truncate">{user?.organization_name || 'Acme Global Corp'}</div>
          <div className="text-xs text-slate-500 mt-0.5">Isolated Multi-Tenant Ledger</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden mr-3 p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="text-sm font-medium text-slate-500 hidden sm:block">
              Corporate Financial Risk & Fraud Prevention Subsystem
            </div>
          </div>

          {/* User Profile & Notifications */}
          <div className="flex items-center space-x-3">
            {/* Role Badge */}
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${roleBadgeColor}`}>
              {user?.role?.name?.replace('_', ' ')}
            </span>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <span className="text-sm font-bold text-slate-800">Alerts & Notifications</span>
                    <span className="text-xs text-indigo-600 font-medium">{unreadCount} unread</span>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="text-xs text-slate-400 text-center py-4">No recent notifications</div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="p-2 rounded bg-slate-50 hover:bg-slate-100 text-xs">
                          <div className="font-semibold text-slate-800">{n.title}</div>
                          <div className="text-slate-500 mt-0.5">{n.message}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Details & Logout */}
            <div className="flex items-center pl-3 border-l border-slate-200 space-x-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-slate-800 leading-none">{user?.full_name || 'Admin User'}</div>
                <div className="text-xs text-slate-500 mt-1">{user?.email}</div>
              </div>
              <button
                onClick={logout}
                title="Secure Logout"
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-b border-slate-800 p-4 space-y-1">
            {navItems.filter((i) => i.show).map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center px-3 py-2 rounded text-slate-300 hover:bg-slate-800 text-sm font-medium"
                >
                  <Icon className="w-4 h-4 mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Page View Container */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
