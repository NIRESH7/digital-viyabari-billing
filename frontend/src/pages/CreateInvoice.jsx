import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const CreateInvoice = () => {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [showClientModal, setShowClientModal] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', mobile: '', address: '' });
  
  const [invoice, setInvoice] = useState({ 
    client_id: '', 
    invoice_number: `INV-${Date.now().toString().slice(-4)}`, 
    date: new Date().toISOString().split('T')[0], 
    discount: 0, 
    paid_amount: 0, 
    status: 'UNPAID',
    payment_mode: 'CASH'
  });
  
  const [items, setItems] = useState([{ product_id: '', product_name: '', quantity: '', price: '', gst_percent: 18 }]);

  useEffect(() => {
    const fetchData = async () => {
      const [cRes, pRes] = await Promise.all([
        axios.get('http://localhost:8000/clients'),
        axios.get('http://localhost:8000/products')
      ]);
      setClients(cRes.data);
      setProducts(pRes.data);
    };
    fetchData();
  }, []);

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    if (field === 'product_id') {
      const prod = products.find(p => p.id === value);
      if (prod) {
        newItems[index] = { ...newItems[index], product_id: value, product_name: prod.name, price: prod.price, gst_percent: prod.gst_percent };
      }
    } else {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  const calculate = () => {
    let sub = 0, gst = 0;
    items.forEach(i => {
      const p = parseFloat(i.price) || 0;
      const q = parseFloat(i.quantity) || 0;
      sub += p * q;
      gst += (p * q * i.gst_percent) / 100;
    });
    const total = sub + gst - (parseFloat(invoice.discount) || 0);
    return { sub, gst, total };
  };

  const { sub, gst, total } = calculate();

  const handleQuickClientSave = async (e) => {
    e.preventDefault();
    const res = await axios.post('http://localhost:8000/clients', newClient);
    setClients([...clients, res.data]);
    setInvoice({...invoice, client_id: res.data.id});
    setShowClientModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) return alert('Add at least one item');
    if (!invoice.client_id) return alert('Select a customer');

    setLoading(true);
    try {
      const data = { 
        ...invoice, 
        total_amount: total, 
        items: items.map(i => ({
          product_id: i.product_id || null,
          product_name: i.product_name,
          quantity: Math.round(parseFloat(i.quantity) || 0),
          price: parseFloat(i.price) || 0,
          gst_percent: parseFloat(i.gst_percent) || 0
        }))
      };
      console.log('SENDING INVOICE DATA:', data);
      const res = await axios.post('http://localhost:8000/invoices', data);
      
      // Auto-download PDF
      const pdfRes = await axios.get(`http://localhost:8000/invoices/${res.data.id}/pdf?t=${Date.now()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([pdfRes.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `INV_${data.invoice_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      navigate('/invoices');
    } catch (err) {
      alert(err.response?.data?.detail || 'ERROR SAVING INVOICE');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-content">
      <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: '20px', padding: 0, fontWeight: '900', fontSize: '12px' }}>← BACK</button>
      <h1 className="mb-40">BILLING</h1>

      <form onSubmit={handleSubmit}>
        <div className="card mb-40">
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <select className="input-field" style={{ flex: 1 }} required value={invoice.client_id} onChange={e => setInvoice({...invoice, client_id: e.target.value})}>
              <option value="">SELECT CUSTOMER</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.mobile})</option>)}
            </select>
            <button type="button" className="btn" onClick={() => setShowClientModal(true)} style={{ padding: '0 15px' }}>+ NEW</button>
          </div>

          <h3 style={{ fontSize: '10px', fontWeight: '800', marginBottom: '15px' }}>PRODUCTS</h3>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', marginBottom: '15px' }}>
            {items.map((item, index) => (
              <div key={index} className="flex gap-8" style={{ 
                padding: '12px 8px', 
                borderBottom: index === items.length - 1 ? 'none' : '1px solid #f1f5f9',
                background: '#fff'
              }}>
                <select className="input-field" style={{ flex: 2.5, padding: '8px', fontSize: '12px' }} value={item.product_id} onChange={e => updateItem(index, 'product_id', e.target.value)}>
                  <option value="">SELECT PRODUCT</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input type="number" className="input-field" style={{ flex: 0.8, padding: '8px', fontSize: '12px' }} placeholder="QTY" value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)} />
                <input type="number" className="input-field" style={{ flex: 1.2, padding: '8px', fontSize: '12px' }} placeholder="PRICE" value={item.price} onChange={e => updateItem(index, 'price', e.target.value)} />
                <button 
                  type="button" 
                  className="btn" 
                  style={{ 
                    padding: '0 10px', 
                    color: '#ef4444', 
                    borderColor: '#fee2e2',
                    background: '#fef2f2',
                    fontSize: '12px'
                  }} 
                  onClick={() => setItems(items.filter((_, i) => i !== index))}
                >X</button>
              </div>
            ))}
          </div>
          <button type="button" className="btn" style={{ fontSize: '10px', padding: '10px 15px' }} onClick={() => setItems([...items, { product_id: '', product_name: '', quantity: '', price: '', gst_percent: 18 }])}>+ ADD ITEM</button>
        </div>

        <div className="card mb-40">
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '10px', fontWeight: '800' }}>PAID AMOUNT</label>
              <input type="number" className="input-field" value={invoice.paid_amount} onChange={e => setInvoice({...invoice, paid_amount: parseFloat(e.target.value) || 0})} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '10px', fontWeight: '800' }}>MODE</label>
              <select className="input-field" value={invoice.payment_mode} onChange={e => setInvoice({...invoice, payment_mode: e.target.value})}>
                <option value="CASH">CASH</option>
                <option value="ONLINE">ONLINE</option>
              </select>
            </div>
          </div>
          
          <div style={{ borderTop: '2px solid #000', paddingTop: '20px' }}>
            <div className="flex justify-between" style={{ fontWeight: '900', fontSize: '20px' }}>
              <span>TOTAL</span>
              <span>₹{total}</span>
            </div>
            <div className="flex justify-between" style={{ fontSize: '12px', marginTop: '10px', fontWeight: 'bold', color: '#666' }}>
              <span>BALANCE</span>
              <span>₹{total - invoice.paid_amount}</span>
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '20px', fontSize: '16px' }}>SAVE & GENERATE</button>
      </form>

      {showClientModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="mb-40">QUICK CUSTOMER ADD</h2>
            <form onSubmit={handleQuickClientSave}>
              <input placeholder="NAME" className="input-field mb-20" value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} required />
              <input placeholder="MOBILE" className="input-field mb-20" value={newClient.mobile} onChange={e => setNewClient({...newClient, mobile: e.target.value})} required />
              <textarea placeholder="ADDRESS" className="input-field mb-40" style={{ height: '60px' }} value={newClient.address} onChange={e => setNewClient({...newClient, address: e.target.value})} />
              <div className="flex gap-10">
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>SAVE</button>
                <button type="button" className="btn" onClick={() => setShowClientModal(false)} style={{ flex: 1 }}>CANCEL</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateInvoice;
