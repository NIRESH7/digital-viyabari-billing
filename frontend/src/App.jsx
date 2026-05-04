import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
  PlusCircle, Users, Package, FileText, 
  Settings, LogOut, Home, LayoutDashboard,
  ShieldCheck, UserPlus, Menu, X, Bell
} from 'lucide-react';
import axios from 'axios';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Products from './pages/Products';
import Invoices from './pages/Invoices';
import CreateInvoice from './pages/CreateInvoice';
import SettingsPage from './pages/Settings';
import AdminUsers from './pages/AdminUsers';

const SidebarLink = ({ to, label, icon: Icon }) => (
  <NavLink 
    to={to} 
    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
  >
    <Icon size={20} />
    <span>{label}</span>
  </NavLink>
);

const AppLayout = ({ user, logout, children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path === '/invoices/new') return 'Create Invoice';
    if (path.startsWith('/invoices')) return 'Transactions';
    if (path === '/clients') return 'Customers';
    if (path === '/products') return 'Inventory';
    if (path === '/settings') return 'Settings';
    if (path === '/admin/users') return 'User Management';
    return '';
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <ShieldCheck size={24} className="text-primary" />
            <span>INVOICER.</span>
          </div>
          <button className="mobile-close" onClick={() => setIsMobileMenuOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <SidebarLink to="/" label="Overview" icon={LayoutDashboard} />
          
          {user.role === 'user' && (
            <>
              <SidebarLink to="/invoices/new" label="New Invoice" icon={PlusCircle} />
              <SidebarLink to="/clients" label="Customers" icon={Users} />
              <SidebarLink to="/products" label="Inventory" icon={Package} />
              <SidebarLink to="/invoices" label="Transactions" icon={FileText} />
            </>
          )}
          
          <div className="nav-section">ADMINISTRATION</div>
          {(user.role === 'super_admin' || user.role === 'admin') && (
            <SidebarLink to="/admin/users" label={user.role === 'super_admin' ? "Manage Managers" : "Manage Employees"} icon={UserPlus} />
          )}
          <SidebarLink to="/settings" label="Company Profile" icon={Settings} />
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">{user.full_name[0]}</div>
            <div className="user-info">
              <p className="user-name">{user.full_name}</p>
              <p className="user-role">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="main-area">
        <header className="top-header">
          <div className="header-left">
            <button className="mobile-toggle" onClick={() => setIsMobileMenuOpen(true)}>
              <Menu size={24} />
            </button>
            <h2 className="page-title">{getPageTitle()}</h2>
          </div>
          <div className="header-right">
            <button className="icon-btn"><Bell size={20} /></button>
            <div className="date-display">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          </div>
        </header>

        <div className="content-wrapper">
          {children}
        </div>
      </main>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [token, setToken] = useState(localStorage.getItem('token'));

  const login = (userData, token) => {
    setUser(userData);
    setToken(token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [token]);

  return (
    <Router>
      {!token ? (
        <Routes>
          <Route path="/login" element={<Login login={login} />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      ) : (
        <AppLayout user={user} logout={logout}>
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/clients" element={<Clients user={user} />} />
            <Route path="/products" element={<Products user={user} />} />
            <Route path="/invoices" element={<Invoices user={user} />} />
            <Route path="/invoices/new" element={<CreateInvoice user={user} />} />
            <Route path="/settings" element={<SettingsPage user={user} />} />
            <Route path="/admin/users" element={<AdminUsers user={user} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AppLayout>
      )}
    </Router>
  );
};

export default App;
