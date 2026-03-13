import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const AuthPage = ({ onOtpRequired }) => {
  const { signIn, signUp } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'signup'
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleLogin = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    const { error: err } = await signIn(form.email, form.password);
    setLoading(false);
    if (err) setError(err.message);
  };

  const handleSignup = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.'); setLoading(false); return;
    }
    const { error: err } = await signUp(form.email, form.password);
    setLoading(false);
    if (err) { setError(err.message); return; }
    setPendingEmail(form.email);
    onOtpRequired({ email: form.email, name: form.name });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">We<span>Flow</span> <sup style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-40)' }}>V5</sup></div>
        <p className="auth-tagline">Sprint Management OS for creative teams</p>

        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => setTab('login')}>
            Sign In
          </button>
          <button className={`auth-tab ${tab === 'signup' ? 'active' : ''}`} onClick={() => setTab('signup')}>
            Create Account
          </button>
        </div>

        {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

        {tab === 'login' ? (
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input name="email" type="email" className="form-input" placeholder="you@team.com" value={form.email} onChange={handleChange} required autoComplete="email" />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input name="password" type={showPw ? 'text' : 'password'} className="form-input" placeholder="Your password" value={form.password} onChange={handleChange} required style={{ width: '100%', paddingRight: 42 }} autoComplete="current-password" />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-40)', display: 'flex' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
              {loading ? <Loader2 size={16} className="spin" /> : 'Sign In'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleSignup}>
            <div className="form-group">
              <label className="form-label">Your Name</label>
              <input name="name" type="text" className="form-input" placeholder="Full name" value={form.name} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label className="form-label">Work Email</label>
              <input name="email" type="email" className="form-input" placeholder="you@team.com" value={form.email} onChange={handleChange} required autoComplete="email" />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input name="password" type={showPw ? 'text' : 'password'} className="form-input" placeholder="Min 8 characters" value={form.password} onChange={handleChange} required minLength={8} style={{ width: '100%', paddingRight: 42 }} autoComplete="new-password" />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-40)', display: 'flex' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
              {loading ? <Loader2 size={16} className="spin" /> : 'Create Account →'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-40)', marginTop: 4 }}>
              We'll send a verification code to your email.
            </p>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: 'var(--ink-40)', fontWeight: 500 }}>
          Think Beyond, Create Impact
        </p>
      </div>
      <style>{`.spin { animation: spin 0.7s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default AuthPage;
