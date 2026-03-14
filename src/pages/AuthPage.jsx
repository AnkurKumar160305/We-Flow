import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthPage = () => {
  const [tab, setTab] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (tab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password
        });
        if (error) throw error;
        // Optional: you can show a success message here if email confirmation is required,
        // but if confirmation is disabled this will log them right in.
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ padding: '40px 32px' }}>
        <div className="auth-logo" style={{ marginBottom: 12 }}>We<span style={{ color: 'var(--brand)' }}>Flow</span> <sup style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-40)' }}>V5</sup></div>
        <p className="auth-tagline" style={{ marginBottom: 32 }}>Sprint Management OS for creative teams</p>

        <div className="auth-tabs" style={{ marginBottom: 24 }}>
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} type="button" onClick={() => setTab('login')}>
            Sign In
          </button>
          <button className={`auth-tab ${tab === 'signup' ? 'active' : ''}`} type="button" onClick={() => setTab('signup')}>
            Create Account
          </button>
        </div>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
          {error && <div style={{ color: 'var(--red-60)', fontSize: '13px', padding: '10px', backgroundColor: 'var(--red-10)', borderRadius: '6px' }}>{error}</div>}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink-80)' }}>Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--ink-20)', fontSize: '14px' }}
              placeholder="you@example.com"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--ink-80)' }}>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{ padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--ink-20)', fontSize: '14px' }}
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              marginTop: '8px',
              padding: '12px', 
              borderRadius: '6px', 
              border: 'none', 
              backgroundColor: 'var(--brand)', 
              color: 'white', 
              fontSize: '14px', 
              fontWeight: 600, 
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.2s ease'
            }}
          >
            {loading ? 'Processing...' : (tab === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 32, fontSize: 11, color: 'var(--ink-40)', fontWeight: 500 }}>
          Think Beyond, Create Impact
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
