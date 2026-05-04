import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const SettingsPage = () => {
  const navigate = useNavigate();
  const [company, setCompany] = useState({
    name: '',
    address: '',
    gst: '',
    mobile: ''
  });

  useEffect(() => {
    // In a real app, fetch from backend. For now, use localStorage or mock.
    const saved = localStorage.getItem('company_details');
    if (saved) setCompany(JSON.parse(saved));
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('company_details', JSON.stringify(company));
    alert('COMPANY DETAILS SAVED.');
    navigate('/');
  };

  return (
    <div className="main-content">
      <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: '20px', padding: 0, fontWeight: '900', fontSize: '12px' }}>← BACK</button>
      <h1 className="mb-40">COMPANY DETAILS</h1>
      
      <div className="card">
        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '10px', fontWeight: '800', display: 'block', marginBottom: '5px' }}>COMPANY NAME</label>
            <input className="input-field" value={company.name} onChange={e => setCompany({...company, name: e.target.value})} required />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '10px', fontWeight: '800', display: 'block', marginBottom: '5px' }}>ADDRESS</label>
            <textarea className="input-field" style={{ height: '80px' }} value={company.address} onChange={e => setCompany({...company, address: e.target.value})} required />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '10px', fontWeight: '800', display: 'block', marginBottom: '5px' }}>GST NUMBER</label>
            <input className="input-field" value={company.gst} onChange={e => setCompany({...company, gst: e.target.value})} />
          </div>
          <div style={{ marginBottom: '40px' }}>
            <label style={{ fontSize: '10px', fontWeight: '800', display: 'block', marginBottom: '5px' }}>MOBILE NUMBER</label>
            <input className="input-field" value={company.mobile} onChange={e => setCompany({...company, mobile: e.target.value})} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>SAVE DETAILS</button>
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;
