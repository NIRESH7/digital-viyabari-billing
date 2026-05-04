import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: '', gst_percent: 18, stock: 0 });

  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://localhost:8000/products');
      setProducts(response.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchProducts(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/products', newProduct);
      setShowModal(false);
      setNewProduct({ name: '', price: '', gst_percent: '18', stock: '' });
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.detail || 'Error creating product. Check if all fields are valid.');
    }
  };

  return (
    <div className="main-content">
      <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', cursor: 'pointer', marginBottom: '20px', padding: 0, fontWeight: '900', fontSize: '12px' }}>← BACK</button>
      <div className="flex justify-between items-center mb-40">
        <h1>PRODUCTS</h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ ADD</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th>NAME</th>
              <th>PRICE</th>
              <th>GST %</th>
              <th>STOCK</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>₹{p.price}</td>
                <td>{p.gst_percent}%</td>
                <td>{p.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 className="mb-40">NEW PRODUCT</h2>
            <form onSubmit={handleSubmit}>
              <input placeholder="PRODUCT NAME" className="input-field mb-40" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} required />
              <input placeholder="PRICE" type="number" className="input-field mb-40" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} required />
              <input placeholder="GST %" type="number" className="input-field mb-40" value={newProduct.gst_percent} onChange={e => setNewProduct({...newProduct, gst_percent: e.target.value})} required />
              <input placeholder="STOCK" type="number" className="input-field mb-40" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} />
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

export default Products;
