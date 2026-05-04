import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Clients = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newClient, setNewClient] = useState({ name: '', email: '', mobile: '', address: '', gst_number: '' });

  const fetchClients = async () => {
    try {
      const response = await axios.get('http://localhost:8000/clients');
      setClients(response.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchClients(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/clients', newClient);
      setShowModal(false);
      setNewClient({ name: '', email: '', mobile: '', address: '', gst_number: '' });
      fetchClients();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error creating client. Check if all fields are valid.');
    }
  };

  const filtered = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="main-content">
      <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: '20px', padding: 0, fontWeight: '900', fontSize: '12px' }}>← BACK</button>
      <div className="flex justify-between items-center mb-40">
        <h1>CUSTOMERS</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ ADD</button>
      </div>

      <input 
        type="text" placeholder="SEARCH CLIENTS..." className="input-field mb-40" 
        value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} 
      />

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>NAME</th>
              <th>MOBILE</th>
              <th>EMAIL</th>
              <th>GST</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{c.mobile}</td>
                <td>{c.email || '-'}</td>
                <td>{c.gst_number || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="mb-40">NEW CLIENT</h2>
            <form onSubmit={handleSubmit}>
              <input placeholder="NAME" className="input-field mb-40" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} required />
              <input placeholder="MOBILE" className="input-field mb-40" value={newClient.mobile} onChange={e => setNewClient({...newClient, mobile: e.target.value})} required />
              <input placeholder="EMAIL" className="input-field mb-40" value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} />
              <input placeholder="ADDRESS" className="input-field mb-40" value={newClient.address} onChange={e => setNewClient({...newClient, address: e.target.value})} required />
              <input placeholder="GSTIN" className="input-field mb-40" value={newClient.gst_number} onChange={e => setNewClient({...newClient, gst_number: e.target.value})} />
              <div className="flex gap-10">
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>SAVE</button>
                <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ flex: 1 }}>CANCEL</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Clients;
