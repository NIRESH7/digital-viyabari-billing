import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminUsers = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newUser, setNewUser] = useState({ 
    full_name: '', 
    email: '', 
    password: '', 
    role: user?.role === 'super_admin' ? 'admin' : 'user' 
  });

  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:8000/admin/users');
      setUsers(response.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/admin/users', newUser);
      setShowModal(false);
      setNewUser({ 
        full_name: '', 
        email: '', 
        password: '', 
        role: user?.role === 'super_admin' ? 'admin' : 'user' 
      });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error creating user. Check if the email is unique.');
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to remove this user?')) {
      try {
        await axios.delete(`http://localhost:8000/admin/users/${userId}`);
        fetchUsers();
      } catch (err) {
        alert(err.response?.data?.detail || 'Error removing user');
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-40">
        <h1>SYSTEM USERS</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>ADD USER</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>NAME</th>
              <th>EMAIL</th>
              <th>ROLE</th>
              <th style={{ textAlign: 'right' }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.full_name}</td>
                <td>{u.email}</td>
                <td><span style={{ fontWeight: '800' }}>{u.role.toUpperCase()}</span></td>
                <td style={{ textAlign: 'right' }}>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => handleDelete(u.id)}
                  >
                    REMOVE
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="mb-40">NEW USER</h2>
            <form onSubmit={handleSubmit}>
              <input placeholder="FULL NAME" className="input-field mb-40" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} required />
              <input placeholder="EMAIL" className="input-field mb-40" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
              <input placeholder="PASSWORD" type="password" className="input-field mb-40" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
              <select className="input-field mb-40" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                {user?.role === 'super_admin' ? (
                  <option value="admin">ADMIN (MANAGER)</option>
                ) : (
                  <option value="user">USER (EMPLOYEE)</option>
                )}
              </select>
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

export default AdminUsers;
