import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Download, Share2, Plus, Search, FileText, 
  User, Users, Shield, Filter, ChevronRight,
  MoreVertical, Calendar, CreditCard
} from 'lucide-react';

const Invoices = ({ user }) => {
  const [invoices, setInvoices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');
  const [filterUserId, setFilterUserId] = useState('ALL');
  const navigate = useNavigate();

  const fetchInvoices = async () => {
    try {
      const response = await axios.get('http://localhost:8000/invoices');
      setInvoices(response.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const handleDownload = async (id, number) => {
    const response = await axios.get(`http://localhost:8000/invoices/${id}/pdf`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `INV_${number}.pdf`);
    document.body.appendChild(link);
    link.click();
  };

  const handleShare = async (id, number) => {
    const response = await axios.get(`http://localhost:8000/invoices/${id}/pdf`, { responseType: 'blob' });
    const file = new File([response.data], `INV_${number}.pdf`, { type: 'application/pdf' });
    if (navigator.share) {
      await navigator.share({ files: [file], title: `INV ${number}` });
    } else {
      alert('Share not supported on this browser.');
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         inv.user_full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesCategory = true;
    if (user?.role === 'super_admin') {
      if (activeTab === 'SUPER_ADMIN') matchesCategory = inv.user_role === 'super_admin';
      else if (activeTab === 'ADMIN') matchesCategory = inv.user_role === 'admin';
      else if (activeTab === 'USER') matchesCategory = inv.user_role === 'user';
    } else if (user?.role === 'admin') {
      if (activeTab === 'MY_INVOICES') matchesCategory = inv.user_id === user.id;
      else if (activeTab === 'MANAGED_USERS') matchesCategory = inv.user_id !== user.id;
      
      if (filterUserId !== 'ALL') {
        matchesCategory = matchesCategory && inv.user_id === filterUserId;
      }
    }
    
    return matchesSearch && matchesCategory;
  });

  const uniqueUsers = Array.from(new Set(invoices.filter(inv => inv.user_id !== user.id).map(inv => JSON.stringify({id: inv.user_id, name: inv.user_full_name}))))
    .map(s => JSON.parse(s));

  const TabButton = ({ id, label, icon: Icon }) => (
    <button 
      className={`tab-btn ${activeTab === id ? 'active' : ''}`} 
      onClick={() => setActiveTab(id)}
    >
      {Icon && <Icon size={14} />}
      {label}
    </button>
  );

  const handleMarkAsPaid = async (id) => {
    try {
      await axios.patch(`http://localhost:8000/invoices/${id}/status`, { status: 'PAID' });
      fetchInvoices();
    } catch (err) {
      alert('Error updating status');
    }
  };

  const toggleStatus = async (inv) => {
    const currentStatus = (inv.status || 'UNPAID').toUpperCase();
    const newStatus = currentStatus === 'PAID' ? 'UNPAID' : 'PAID';
    try {
      await axios.patch(`http://localhost:8000/invoices/${inv.id}/status`, { status: newStatus });
      fetchInvoices();
    } catch (err) { 
      alert(`Update failed: ${err.response?.data?.detail || err.message}`);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-32">
        <h2 className="page-title">Transaction History</h2>
        <button className="btn btn-primary" onClick={() => navigate('/invoices/new')}>
          <Plus size={18} /> New Invoice
        </button>
      </div>

      <div className="card mb-32" style={{ padding: '8px' }}>
        <div className="flex justify-between items-center flex-wrap gap-16 p-8">
          <div className="flex gap-4">
            <TabButton id="ALL" label="All History" />
            {user?.role === 'super_admin' ? (
              <>
                <TabButton id="SUPER_ADMIN" label="My Invoices" icon={Shield} />
                <TabButton id="ADMIN" label="Admins" icon={User} />
                <TabButton id="USER" label="Regular Users" icon={Users} />
              </>
            ) : user?.role === 'admin' ? (
              <>
                <TabButton id="MY_INVOICES" label="My Invoices" icon={Shield} />
                <TabButton id="MANAGED_USERS" label="User Invoices" icon={Users} />
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-16">
            {user?.role === 'admin' && activeTab !== 'MY_INVOICES' && uniqueUsers.length > 0 && (
              <div className="flex items-center gap-8">
                <Filter size={14} className="text-muted" />
                <select 
                  className="input-field" 
                  style={{ width: 'auto', padding: '6px 12px', fontSize: '12px' }}
                  value={filterUserId}
                  onChange={(e) => setFilterUserId(e.target.value)}
                >
                  <option value="ALL">All Users</option>
                  {uniqueUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="input-field"
                style={{ paddingLeft: '36px', width: '200px' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="table-container shadow-sm">
        <table>
          <thead>
            <tr>
              <th>Invoice Info</th>
              <th>Creator</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th style={{ width: '220px', textAlign: 'right', paddingRight: '16px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map(inv => (
              <tr key={inv.id}>
                <td>
                  <div className="flex items-center gap-12">
                    <div className="avatar" style={{ background: '#f8fafc', color: 'var(--primary)', width: '32px', height: '32px' }}>
                      <FileText size={14} />
                    </div>
                    <div>
                      <div className="font-bold">#{inv.invoice_number}</div>
                      <div className="text-xs text-muted">ID: {inv.id}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{inv.user_full_name}</span>
                    <span className="text-xs text-muted capitalize">{inv.user_role?.replace('_', ' ')}</span>
                  </div>
                </td>
                <td className="text-muted">
                  <div className="flex items-center gap-8">
                    <Calendar size={14} />
                    {new Date(inv.date).toLocaleDateString()}
                  </div>
                </td>
                <td>
                  <div className="font-bold">₹{inv.total_amount?.toLocaleString()}</div>
                </td>
                <td>
                  <span className={`badge ${inv.status?.toLowerCase() === 'paid' ? 'badge-success' : 'badge-error'}`} style={{ minWidth: '80px', textAlign: 'center' }}>
                    {(inv.status || 'unpaid').toUpperCase()}
                  </span>
                </td>
                <td style={{ width: '220px', textAlign: 'right', paddingRight: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
                    {inv.status?.toLowerCase() !== 'paid' && (
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '6px', whiteSpace: 'nowrap' }}
                        onClick={() => toggleStatus(inv)}
                      >
                        MARK AS PAID
                      </button>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="icon-btn" onClick={() => handleDownload(inv.id, inv.invoice_number)} title="Download PDF">
                        <Download size={18} />
                      </button>
                      <button className="icon-btn" onClick={() => handleShare(inv.id, inv.invoice_number)} title="Share Invoice">
                        <Share2 size={18} />
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredInvoices.length === 0 && (
          <div className="text-center py-60">
            <FileText size={48} className="text-muted" style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p className="text-muted">No transactions matching your criteria were found.</p>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .tab-btn {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-muted);
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }
        .tab-btn:hover { background: #f1f5f9; color: var(--text); }
        .tab-btn.active { background: #eef2ff; color: var(--primary); }
        .icon-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: white;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.2s;
        }
        .icon-btn:hover { background: var(--bg); color: var(--primary); border-color: var(--primary); }
      `}} />
    </div>
  );
};

export default Invoices;
