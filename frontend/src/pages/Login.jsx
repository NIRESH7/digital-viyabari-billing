import React, { useState } from 'react';
import axios from 'axios';

const Login = ({ login }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);
      const response = await axios.post('http://localhost:8000/auth/login', formData);
      login(response.data.user, response.data.access_token);
    } catch (err) {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        width: '400px',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '48px 40px',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <img
            src="/logo.png"
            alt="Logo"
            style={{ width: '96px', height: '96px', objectFit: 'contain' }}
          />
        </div>

        {/* Heading */}
        <h1 style={{
          fontSize: '22px', fontWeight: '800', color: '#0f172a',
          margin: '0 0 4px', letterSpacing: '-0.3px',
        }}>
          Sign in
        </h1>
        <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 32px', fontWeight: '500' }}>
          Enter your credentials to continue
        </p>

        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'block', fontSize: '13px', fontWeight: '600',
              color: '#0f172a', marginBottom: '6px',
            }}>
              Email address
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%', padding: '11px 14px',
                borderRadius: '10px', border: '1px solid #e2e8f0',
                fontSize: '14px', fontFamily: 'inherit',
                color: '#0f172a', background: '#fcfcfd',
                outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.15s, box-shadow 0.15s',
              }}
              onFocus={e => {
                e.target.style.borderColor = '#6366f1';
                e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)';
                e.target.style.background = '#fff';
              }}
              onBlur={e => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.boxShadow = 'none';
                e.target.style.background = '#fcfcfd';
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block', fontSize: '13px', fontWeight: '600',
              color: '#0f172a', marginBottom: '6px',
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%', padding: '11px 42px 11px 14px',
                  borderRadius: '10px', border: '1px solid #e2e8f0',
                  fontSize: '14px', fontFamily: 'inherit',
                  color: '#0f172a', background: '#fcfcfd',
                  outline: 'none', boxSizing: 'border-box',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#6366f1';
                  e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.1)';
                  e.target.style.background = '#fff';
                }}
                onBlur={e => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                  e.target.style.background = '#fcfcfd';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                style={{
                  position: 'absolute', right: '12px', top: '50%',
                  transform: 'translateY(-50%)', background: 'none',
                  border: 'none', cursor: 'pointer', color: '#94a3b8',
                  fontSize: '14px', padding: 0, lineHeight: 1,
                }}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p style={{
              fontSize: '13px', color: '#ef4444', fontWeight: '600',
              margin: '0 0 16px', padding: '10px 14px',
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: '8px',
            }}>
              {error}
            </p>
          )}

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px',
              background: loading ? '#a5b4fc' : '#6366f1',
              color: '#fff', border: 'none', borderRadius: '10px',
              fontSize: '14px', fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', letterSpacing: '0.2px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#4f46e5'; }}
            onMouseLeave={e => { if (!loading) e.currentTarget.style.background = '#6366f1'; }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p style={{
          textAlign: 'center', fontSize: '12px', color: '#94a3b8',
          fontWeight: '500', marginTop: '24px',
        }}>
          Contact your administrator to get access
        </p>
      </div>
    </div>
  );
};

export default Login;
