import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, ArrowLeft } from 'lucide-react';

const OtpPage = ({ email, name, onBack, onVerified }) => {
  const { verifyOtp } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputs = useRef([]);

  useEffect(() => { inputs.current[0]?.focus(); }, []);

  const handleChange = (i, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputs.current[5]?.focus();
    }
  };

  const handleVerify = async e => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) { setError('Please enter the full 6-digit code.'); return; }
    setError(''); setLoading(true);
    const { error: err } = await verifyOtp(email, code);
    setLoading(false);
    if (err) { setError(err.message); return; }
    onVerified({ name });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <button className="icon-btn" onClick={onBack} style={{ marginBottom: 8 }}>
          <ArrowLeft size={16} />
        </button>
        <div className="auth-logo">We<span style={{ color: 'var(--brand)' }}>Flow</span></div>
        <p className="auth-tagline">Check your email for a verification code</p>
        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-60)', marginBottom: 28, fontWeight: 500 }}>
          We sent a 6-digit code to <strong>{email}</strong>
        </p>

        {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleVerify}>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24 }} onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => inputs.current[i] = el}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                style={{
                  width: 52, height: 56,
                  textAlign: 'center',
                  fontSize: 22,
                  fontWeight: 800,
                  border: `2px solid ${digit ? 'var(--brand)' : 'var(--border-light)'}`,
                  borderRadius: 10,
                  outline: 'none',
                  fontFamily: 'var(--font-mono)',
                  background: digit ? 'var(--brand-04)' : 'var(--sur-00)',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              />
            ))}
          </div>
          <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
            {loading ? <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> : 'Verify Email →'}
          </button>
        </form>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'var(--ink-40)' }}>
          Didn't get the code? Check your spam folder.
        </p>
      </div>
    </div>
  );
};

export default OtpPage;
