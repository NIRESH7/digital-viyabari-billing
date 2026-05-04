import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  TrendingUp, Users, FileText, CreditCard, 
  ArrowRight, Calendar, User, ChevronRight,
  PlusCircle, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StatsCard = ({ title, value, icon: Icon, color, trend }) => (
  <div className="card">
    <div className="flex justify-between items-start mb-20">
      <div className="avatar" style={{ background: `${color}15`, color: color }}>
        <Icon size={20} />
      </div>
      {trend && (
        <div className="badge badge-success" style={{ fontSize: '10px' }}>
          {trend}
        </div>
      )}
    </div>
    <div className="text-muted" style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>{title}</div>
    <div style={{ fontSize: '28px', fontWeight: '800' }}>{value}</div>
  </div>
);

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const navigate = useNavigate();

  const fetchMainStats = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/dashboard/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId) => {
    try {
      const response = await axios.get(`http://localhost:8000/dashboard/stats?target_user_id=${userId}`);
      setUserStats(response.data);
      setSelectedUser(userId);
    } catch (err) {
      console.error('Failed to fetch user stats', err);
    }
  };

  useEffect(() => {
    fetchMainStats();
  }, []);

  if (loading) return <div className="text-center py-40">LOADING DATA...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-32">
        <div>
          <h1 style={{ textAlign: 'left', margin: 0, fontSize: '24px' }}>Welcome back, {user.full_name.split(' ')[0]}</h1>
          <p className="text-muted">Here's what's happening with your business today.</p>
        </div>
        {user.role === 'user' && (
          <button className="btn btn-primary" onClick={() => navigate('/invoices/new')}>
            <PlusCircle size={18} /> New Invoice
          </button>
        )}
      </div>

      <div className="stats-grid">
        {user.role === 'super_admin' ? (
          <>
            <StatsCard title="Total Revenue" value={`₹${stats?.total_sales?.toLocaleString() || 0}`} icon={TrendingUp} color="#6366f1" trend="+12.5%" />
            <StatsCard title="Total Admins" value={stats?.total_admins || 0} icon={ShieldCheck} color="#8b5cf6" />
            <StatsCard title="Active Users" value={stats?.total_users || 0} icon={Users} color="#06b6d4" />
            <StatsCard title="Invoices" value={stats?.total_invoices || 0} icon={FileText} color="#f59e0b" />
          </>
        ) : user.role === 'admin' ? (
          <>
            <StatsCard title="My Users" value={stats?.active_users || 0} icon={Users} color="#6366f1" />
            <StatsCard title="Global Transactions" value={stats?.total_invoices || 0} icon={CreditCard} color="#06b6d4" />
            <StatsCard title="Managed Revenue" value={`₹${(stats?.total_sales || 0).toLocaleString()}`} icon={TrendingUp} color="#10b981" />
          </>
        ) : (
          <>
            <StatsCard title="Total Sales" value={`₹${stats?.total_sales?.toLocaleString() || 0}`} icon={TrendingUp} color="#6366f1" trend="+8.2%" />
            <StatsCard title="Customers" value={stats?.total_clients || 0} icon={Users} color="#06b6d4" />
            <StatsCard title="Inventory" value={stats?.total_products || 0} icon={Package} color="#f59e0b" />
            <StatsCard title="Invoices" value={stats?.total_invoices || 0} icon={FileText} color="#8b5cf6" />
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: user.role === 'user' ? '1fr' : '2fr 1fr', gap: '32px' }}>
        {/* Main Section */}
        <div className="flex flex-col gap-32">
          {user.role !== 'user' && (
            <div className="card">
              <div className="flex justify-between items-center mb-24">
                <h3 className="page-title">Management Tree</h3>
                <span className="text-muted text-xs font-bold">CLICK TO VIEW STATS</span>
              </div>
              <div className="flex flex-col gap-12">
                {(stats?.admins || stats?.managed_users || []).map(u => (
                  <div key={u.id} 
                    className="flex justify-between items-center p-16 hover-bg" 
                    style={{ borderRadius: '12px', border: '1px solid #f1f5f9', cursor: 'pointer' }}
                    onClick={() => fetchUserDetails(u.id)}
                  >
                    <div className="flex items-center gap-16">
                      <div className="avatar" style={{ background: '#f8fafc', color: 'var(--primary)' }}>
                        <User size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-sm">{u.full_name}</div>
                        <div className="text-xs text-muted">{u.email}</div>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-muted" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedUser && userStats && (
            <div className="card" style={{ border: '2px solid var(--primary)', animation: 'fadeIn 0.3s' }}>
              <div className="flex justify-between items-center mb-20">
                <h3 className="font-bold">{userStats.target_name}'s Performance</h3>
                <button onClick={() => setSelectedUser(null)} className="text-xs font-bold text-primary">CLOSE</button>
              </div>
              <div className="flex gap-40 mb-24 p-20 bg-bg rounded-12">
                <div>
                  <div className="text-xs text-muted mb-4">REVENUE</div>
                  <div className="font-bold">₹{(userStats.total_sales || 0).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-muted mb-4">INVOICES</div>
                  <div className="font-bold">{userStats.total_invoices}</div>
                </div>
                {userStats.managed_users_count !== undefined && (
                  <div>
                    <div className="text-xs text-muted mb-4">TEAM SIZE</div>
                    <div className="font-bold">{userStats.managed_users_count} Users</div>
                  </div>
                )}
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Mode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userStats.invoices?.map(inv => (
                      <tr key={inv.id}>
                        <td className="font-bold">{inv.invoice_number}</td>
                        <td className="text-muted">{new Date(inv.created_at).toLocaleDateString()}</td>
                        <td className="font-bold">₹{(inv.total_amount || 0).toLocaleString()}</td>
                        <td><span className="badge badge-success" style={{ fontSize: '10px' }}>{inv.payment_mode}</span></td>
                      </tr>
                    ))}
                    {(!userStats.invoices || userStats.invoices.length === 0) && (
                      <tr><td colSpan="4" className="text-center text-muted py-20">No invoices found for this user</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Section */}
        {user.role !== 'user' && (
          <div className="flex flex-col gap-32">
            <div className="card">
              <h3 className="text-sm font-bold mb-20 flex items-center gap-10">
                <Activity size={18} className="text-primary" /> System Status
              </h3>
              <div className="flex flex-col gap-16">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">API STATUS</span>
                  <span className="badge badge-success">ONLINE</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">DATABASE</span>
                  <span className="badge badge-success">STABLE</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">BACKUPS</span>
                  <span className="text-xs text-muted">2 hours ago</span>
                </div>
              </div>
            </div>

            <div className="card bg-primary" style={{ color: 'white' }}>
              <h3 className="text-sm font-bold mb-12">Need help?</h3>
              <p style={{ fontSize: '12px', opacity: 0.9, marginBottom: '20px' }}>Check out our professional documentation or contact support for advanced integration.</p>
              <button className="btn" style={{ width: '100%', background: 'white', color: 'var(--primary)', border: 'none' }}>
                View Guide
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const ShieldCheck = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shield-check"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
)

const Package = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-package"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
)

export default Dashboard;
