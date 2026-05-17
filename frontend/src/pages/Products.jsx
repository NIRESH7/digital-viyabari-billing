import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Package, X, Search, Edit3, Trash2, ChevronDown, AlertTriangle, AlertCircle, BarChart3 } from 'lucide-react';

const Products = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [stockFilter, setStockFilter] = useState('ALL');
  
  const [newProduct, setNewProduct] = useState({
    name: '', category: '', unit: 'Units', hsn_code: '',
    price: '', tax_type: 'without_tax', discount_value: 0, discount_type: 'percentage',
    gst_percent: 18, stock: 0, image_url: ''
  });

  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://3.86.4.100/api/products');
      setProducts(response.data);
    } catch (err) { 
      console.error(err); 
    }
  };

  useEffect(() => { 
    fetchProducts(); 
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await axios.put(`http://3.86.4.100/api/products/${editingId}`, newProduct);
      } else {
        await axios.post('http://3.86.4.100/api/products', newProduct);
      }
      closeModal();
      fetchProducts();
    } catch (err) {
      alert('Error saving product. Check if all fields are valid.');
    }
  };

  const handleEdit = (product) => {
    setEditingId(product.id);
    setNewProduct({
      name: product.name || '',
      category: product.category || '',
      unit: product.unit || 'Units',
      hsn_code: product.hsn_code || '',
      price: product.price || '',
      tax_type: product.tax_type || 'without_tax',
      discount_value: product.discount_value || 0,
      discount_type: product.discount_type || 'percentage',
      gst_percent: product.gst_percent || 18,
      stock: product.stock || 0,
      image_url: product.image_url || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;
    try {
      await axios.delete(`http://3.86.4.100/api/products/${id}`);
      fetchProducts();
    } catch (err) {
      alert('Error deleting product');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setNewProduct({
      name: '', category: '', unit: 'Units', hsn_code: '',
      price: '', tax_type: 'without_tax', discount_value: 0, discount_type: 'percentage',
      gst_percent: 18, stock: 0, image_url: ''
    });
  };


  const filtered = products.filter(p => {
    const matchesSearch =
      (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.hsn_code || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (categoryFilter !== 'ALL' && (p.category || '').toLowerCase() !== categoryFilter.toLowerCase()) return false;

    if (stockFilter === 'IN_STOCK') return p.stock > 10;
    if (stockFilter === 'LOW_STOCK') return p.stock > 0 && p.stock <= 10;
    if (stockFilter === 'OUT_OF_STOCK') return p.stock <= 0;

    return true;
  });

  const totalSKUs = products.length;
  const lowStockCount = products.filter(p => p.stock < 10 && p.stock > 0).length;
  const outOfStockCount = products.filter(p => p.stock <= 0).length;
  const taxCategoriesCount = new Set(products.map(p => p.gst_percent)).size;

  return (
    <>
      <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Redesigned Premium Title Workspace Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', letterSpacing: '-0.02em', color: '#111827', margin: 0 }}>
            Inventory
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
            Manage your product catalog, pricing, and stock levels.
          </p>
        </div>
        <button 
          type="button"
          onClick={() => setShowModal(true)} 
          style={{ 
            backgroundColor: 'var(--primary-color)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px', 
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
            boxShadow: '0 2px 4px var(--primary-light)'
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--primary-hover)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--primary-color)'}
        >
          <Plus size={16} /> New Catalog Item
        </button>
      </div>

      {/* Grid Row of 4 Redesigned Metrics Blocks */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        
        {/* Total SKUs */}
        <div style={{ 
          padding: '24px', 
          backgroundColor: '#ffffff', 
          border: '1px solid #eaedf3', 
          borderRadius: '12px', 
          position: 'relative',
          boxShadow: '0 1px 3px rgba(0,0,0,0.01)'
        }}>
          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total SKUs
          </span>
          <div style={{ fontSize: '28px', fontWeight: '800', marginTop: '8px', color: '#111827' }}>
            {totalSKUs}
          </div>
          <Package size={18} style={{ position: 'absolute', right: '24px', top: '24px', color: '#9ca3af' }} />
        </div>

        {/* Low Stock */}
        <div style={{ 
          padding: '24px', 
          backgroundColor: '#ffffff', 
          border: '1px solid #eaedf3', 
          borderRadius: '12px', 
          position: 'relative',
          boxShadow: '0 1px 3px rgba(0,0,0,0.01)'
        }}>
          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Low Stock
          </span>
          <div style={{ fontSize: '28px', fontWeight: '800', marginTop: '8px', color: lowStockCount > 0 ? '#ef4444' : '#111827' }}>
            {lowStockCount}
          </div>
          <AlertTriangle size={18} style={{ position: 'absolute', right: '24px', top: '24px', color: '#9ca3af' }} />
        </div>

        {/* Out of Stock */}
        <div style={{ 
          padding: '24px', 
          backgroundColor: '#ffffff', 
          border: '1px solid #eaedf3', 
          borderRadius: '12px', 
          position: 'relative',
          boxShadow: '0 1px 3px rgba(0,0,0,0.01)'
        }}>
          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Out of Stock
          </span>
          <div style={{ fontSize: '28px', fontWeight: '800', marginTop: '8px', color: outOfStockCount > 0 ? '#ef4444' : '#111827' }}>
            {outOfStockCount}
          </div>
          <AlertCircle size={18} style={{ position: 'absolute', right: '24px', top: '24px', color: '#9ca3af' }} />
        </div>

        {/* Tax Categories */}
        <div style={{ 
          padding: '24px', 
          backgroundColor: '#ffffff', 
          border: '1px solid #eaedf3', 
          borderRadius: '12px', 
          position: 'relative',
          boxShadow: '0 1px 3px rgba(0,0,0,0.01)'
        }}>
          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Tax Categories
          </span>
          <div style={{ fontSize: '28px', fontWeight: '800', marginTop: '8px', color: '#111827' }}>
            {taxCategoriesCount}
          </div>
          <BarChart3 size={18} style={{ position: 'absolute', right: '24px', top: '24px', color: '#9ca3af' }} />
        </div>
      </div>

      {/* Redesigned Search & Filters Card Bar */}
      <div style={{ 
        padding: '16px 24px', 
        display: 'flex', 
        gap: '16px', 
        alignItems: 'center', 
        backgroundColor: '#ffffff',
        border: '1px solid #eaedf3',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.01)'
      }}>
        {/* Search Field */}
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input 
            type="text" 
            placeholder="Search products by name or SKU..." 
            style={{ 
              width: '100%',
              height: '42px',
              paddingLeft: '42px', 
              paddingRight: '16px',
              border: '1px solid #e2e8f0', 
              backgroundColor: '#ffffff',
              color: '#1e3a8a',
              borderRadius: '8px', 
              fontSize: '14px',
              fontWeight: '500',
              outline: 'none',
              transition: 'all 0.15s ease'
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'var(--primary-color)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>

        {/* Muted Divider */}
        <div style={{ width: '1px', height: '24px', backgroundColor: '#e2e8f0' }} />

        {/* Categories Dropdown */}
        <div style={{ position: 'relative', width: '160px' }}>
          <select 
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{
              width: '100%',
              height: '42px',
              padding: '0 32px 0 14px',
              border: `1px solid ${categoryFilter !== 'ALL' ? 'var(--primary-color)' : '#e2e8f0'}`,
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              color: categoryFilter !== 'ALL' ? 'var(--primary-color)' : '#4b5563',
              backgroundColor: categoryFilter !== 'ALL' ? 'var(--primary-light)' : '#ffffff',
              appearance: 'none',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Categories</option>
            <option value="Product">Product</option>
            <option value="Service">Service</option>
            <option value="Parts">Parts</option>
            <option value="General">General</option>
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }} />
        </div>

        {/* Stock Status Dropdown */}
        <div style={{ position: 'relative', width: '160px' }}>
          <select 
            value={stockFilter}
            onChange={e => setStockFilter(e.target.value)}
            style={{
              width: '100%',
              height: '42px',
              padding: '0 32px 0 14px',
              border: `1px solid ${stockFilter !== 'ALL' ? 'var(--primary-color)' : '#e2e8f0'}`,
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              color: stockFilter !== 'ALL' ? 'var(--primary-color)' : '#4b5563',
              backgroundColor: stockFilter !== 'ALL' ? 'var(--primary-light)' : '#ffffff',
              appearance: 'none',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Stock</option>
            <option value="IN_STOCK">In Stock (&gt;10)</option>
            <option value="LOW_STOCK">Low Stock (1–10)</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* Redesigned Inventory Registry Table Grid Container */}
      <div className="card" style={{ padding: '0', backgroundColor: '#ffffff', border: '1px solid #eaedf3', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #eaedf3' }}>
              <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em', width: '32%', paddingLeft: '32px' }}>Product</th>
              <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em', width: '18%' }}>Category</th>
              <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em', width: '18%' }}>Base Unit Price</th>
              <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em', width: '20%' }}>Current Stock</th>
              <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em', width: '12%', textAlign: 'right' }}>Tax</th>
              <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: '700', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em', width: '10%', textAlign: 'right', paddingRight: '32px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const stockPercent = Math.min((p.stock / 100) * 100, 100);
              const isLowStock = p.stock < 10 && p.stock > 0;
              const isOutOfStock = p.stock <= 0;
              
              let barColor = 'var(--primary-color)'; // Brand blue
              if (isLowStock) barColor = '#f59e0b'; // Amber warning
              if (isOutOfStock) barColor = '#ef4444'; // Red alarm

              return (
                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'all 0.15s ease' }}>
                  {/* Product Details avatar and SKU */}
                  <td style={{ padding: '16px 24px', paddingLeft: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--primary-light)',
                        color: 'var(--primary-color)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '14px',
                        flexShrink: 0
                      }}>
                        {p.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '700', color: '#111827', fontSize: '14.5px' }}>{p.name}</span>
                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500', marginTop: '2px' }}>
                          SKU-{p.hsn_code || '000'}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Category Details */}
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ fontSize: '13.5px', color: '#4b5563', fontWeight: '600' }}>
                      {p.category || 'General'}
                    </span>
                  </td>

                  {/* Base Pricing */}
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: '800', fontSize: '14.5px', color: '#111827' }}>
                        ₹{Number(p.price).toLocaleString()}
                      </span>
                    </div>
                  </td>

                  {/* Current Stock dynamic meters */}
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', maxWidth: '160px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: isOutOfStock ? '#ef4444' : '#4b5563' }}>
                        {p.stock} {p.unit || 'Units'}
                      </span>
                      <div style={{ width: '100%', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div style={{ width: `${isOutOfStock ? 0 : stockPercent}%`, height: '100%', backgroundColor: barColor, borderRadius: '9999px' }} />
                      </div>
                    </div>
                  </td>

                  {/* Tax labels badge */}
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <div style={{
                      backgroundColor: 'var(--primary-light)',
                      color: 'var(--primary-color)',
                      borderRadius: '9999px',
                      padding: '4px 12px',
                      fontSize: '11px',
                      fontWeight: '700',
                      display: 'inline-flex',
                      alignItems: 'center',
                      fontFamily: 'monospace'
                    }}>
                      {p.gst_percent}% GST
                    </div>
                  </td>

                  {/* Actions buttons */}
                  <td style={{ padding: '16px 24px', paddingRight: '32px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button 
                        type="button"
                        onClick={() => handleEdit(p)}
                        style={{
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: '#4b5563',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.backgroundColor = 'var(--primary-light)';
                          e.currentTarget.style.color = 'var(--primary-color)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#4b5563';
                        }}
                      >
                        <Edit3 size={15} />
                      </button>
                      <button 
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        style={{
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease',
                          opacity: 0.8
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.backgroundColor = '#fee2e2';
                          e.currentTarget.style.opacity = '1';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.opacity = '0.8';
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Footer Pagination bar */}
        <div style={{
          padding: '16px 32px',
          borderTop: '1px solid #eaedf3',
          backgroundColor: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>
            Showing 1 to {filtered.length} of {filtered.length} entries
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              type="button"
              style={{
                padding: '6px 16px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '700',
                color: '#9ca3af',
                cursor: 'not-allowed'
              }}
              disabled
            >
              Previous
            </button>
            <button 
              type="button"
              style={{
                padding: '6px 16px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '700',
                color: '#9ca3af',
                cursor: 'not-allowed'
              }}
              disabled
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>

      {/* Redesigned Frosted Slide Drawer Editor Overlay */}
      {showModal && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            zIndex: 9999
          }}
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div style={{
            backgroundColor: '#ffffff', height: '100%', width: '100%', maxWidth: '580px',
            boxShadow: '-10px 0 25px -5px rgba(0, 0, 0, 0.1), -5px 0 10px -5px rgba(0, 0, 0, 0.04)',
            borderLeft: '1px solid #eaedf3', display: 'flex', flexDirection: 'column',
            animation: 'slideInRight 0.25s ease-out'
          }}>
            
            {/* Header */}
            <div style={{ 
              padding: '24px 32px', 
              borderBottom: '1px solid #eaedf3', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: '#ffffff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Package size={18} style={{ color: 'var(--primary-color)' }} />
                </div>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: '800', letterSpacing: '-0.02em', color: '#111827', margin: 0 }}>
                    {editingId ? 'Edit Item' : 'New Item'}
                  </h2>
                </div>
              </div>
              <button 
                onClick={closeModal} 
                style={{ padding: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Form Body without browser scrollbar */}
            <div className="no-scrollbar" style={{ padding: '32px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '28px' }}>
              <form onSubmit={handleSubmit} id="catalog-form" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                
                {/* Section 1: Basic info */}
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '16px' }}>Basic Information</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Item Name *</label>
                      <input 
                        placeholder="e.g. Keyboard" 
                        style={{ height: '42px', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                        value={newProduct.name} 
                        onChange={e => setNewProduct({...newProduct, name: e.target.value})} 
                        required 
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Category</label>
                      <select 
                        style={{ height: '42px', padding: '0 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: '#ffffff' }}
                        value={newProduct.category} 
                        onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                      >
                        <option value="">Select</option>
                        <option value="Product">Product</option>
                        <option value="Service">Service</option>
                        <option value="Parts">Parts</option>
                        <option value="General">General</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Unit</label>
                      <select 
                        style={{ height: '42px', padding: '0 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none', backgroundColor: '#ffffff' }}
                        value={newProduct.unit} 
                        onChange={e => setNewProduct({...newProduct, unit: e.target.value})}
                      >
                        <option value="Units">Units</option>
                        <option value="Pcs">Pcs</option>
                        <option value="Hrs">Hrs</option>
                        <option value="Nos">Nos</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 2: Codes & inventory */}
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '16px' }}>Inventory</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', letterSpacing: '0.05em', textTransform: 'uppercase' }}>HSN/SAC Code</label>
                      <input 
                        placeholder="e.g. 8471" 
                        style={{ height: '42px', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                        value={newProduct.hsn_code} 
                        onChange={e => setNewProduct({...newProduct, hsn_code: e.target.value})} 
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Current Stock *</label>
                      <input 
                        type="number" 
                        placeholder="0" 
                        style={{ height: '42px', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                        value={newProduct.stock} 
                        onChange={e => setNewProduct({...newProduct, stock: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Pricing and taxes */}
                <div>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '16px' }}>Pricing & Taxes</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Base Unit Price *</label>
                      <div style={{ display: 'flex', height: '42px' }}>
                        <span style={{
                          display: 'flex', alignItems: 'center', padding: '0 12px',
                          background: '#f8fafc', border: '1px solid #e2e8f0',
                          borderRight: 'none', borderRadius: '8px 0 0 8px',
                          fontSize: '13px', color: '#6b7280', fontWeight: '700'
                        }}>₹</span>
                        <input 
                          type="number" 
                          placeholder="0.00" 
                          style={{ flex: 1, height: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '0', fontSize: '14px', outline: 'none' }}
                          value={newProduct.price} 
                          onChange={e => setNewProduct({...newProduct, price: e.target.value})}
                          required
                        />
                        <select
                          style={{ 
                            height: '100%', padding: '0 12px', border: '1px solid #e2e8f0', 
                            borderRadius: '0 8px 8px 0', fontSize: '13px', outline: 'none', 
                            backgroundColor: '#f8fafc', borderLeft: 'none', fontWeight: '700', color: '#4b5563'
                          }}
                          value={newProduct.tax_type}
                          onChange={e => setNewProduct({...newProduct, tax_type: e.target.value})}
                        >
                          <option value="without_tax">+ Tax</option>
                          <option value="with_tax">Incl.</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', letterSpacing: '0.05em', textTransform: 'uppercase' }}>GST Rate (%) *</label>
                      <div style={{ display: 'flex', height: '42px' }}>
                        <input 
                          type="number" 
                          placeholder="18" 
                          style={{ flex: 1, height: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px 0 0 8px', fontSize: '14px', outline: 'none' }}
                          value={newProduct.gst_percent} 
                          onChange={e => setNewProduct({...newProduct, gst_percent: e.target.value})}
                          required
                        />
                        <span style={{
                          display: 'flex', alignItems: 'center', padding: '0 12px',
                          background: '#f8fafc', border: '1px solid #e2e8f0',
                          borderLeft: 'none', borderRadius: '0 8px 8px 0',
                          fontSize: '13px', color: '#6b7280', fontWeight: '700'
                        }}>%</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: '#4b5563', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Discount (Optional)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div style={{ position: 'relative', height: '42px' }}>
                        <input 
                          type="number" 
                          placeholder="Rate in %" 
                          style={{ width: '100%', height: '100%', padding: '10px 32px 10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                          value={newProduct.discount_type === 'percentage' ? newProduct.discount_value : ''} 
                          onChange={e => setNewProduct({...newProduct, discount_type: 'percentage', discount_value: e.target.value})}
                        />
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#9ca3af', fontWeight: '700' }}>%</span>
                      </div>
                      <div style={{ position: 'relative', height: '42px' }}>
                        <input 
                          type="number" 
                          placeholder="Amount in ₹" 
                          style={{ width: '100%', height: '100%', padding: '10px 32px 10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', outline: 'none' }}
                          value={newProduct.discount_type === 'amount' ? newProduct.discount_value : ''} 
                          onChange={e => setNewProduct({...newProduct, discount_type: 'amount', discount_value: e.target.value})}
                        />
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#9ca3af', fontWeight: '700' }}>₹</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Live Preview details */}
                <div style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr 1fr',
                  gap: '16px'
                }}>
                  <div>
                    <div style={{ fontSize: '9px', fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Item Preview</div>
                    <div style={{ fontWeight: '700', color: '#111827', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{newProduct.name || '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Price</div>
                    <div style={{ fontWeight: '800', color: '#111827', fontSize: '13px' }}>{newProduct.price ? `₹${Number(newProduct.price).toLocaleString()}` : '—'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '9px', fontWeight: '800', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Stock</div>
                    <div style={{ fontWeight: '700', color: '#111827', fontSize: '13px' }}>{newProduct.stock || 0} {newProduct.unit}</div>
                  </div>
                </div>

              </form>
            </div>

            {/* Footer */}
            <div style={{ 
              padding: '20px 32px', 
              borderTop: '1px solid #eaedf3', 
              backgroundColor: '#ffffff',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button 
                type="button" 
                style={{
                  padding: '8px 20px', fontSize: '13px', fontWeight: '700', color: '#4b5563',
                  backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer'
                }} 
                onClick={closeModal}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="catalog-form" 
                style={{
                  padding: '8px 28px', backgroundColor: 'var(--primary-color)', color: '#ffffff',
                  border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer'
                }}
              >
                {editingId ? 'Update Record' : 'Save Item'}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default Products;
