import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Mail, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const { register, login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const isRegistered = await register(email, name, password);
      if (isRegistered) {
        setSuccess(true);
        // Automatically login the user
        setTimeout(async () => {
          try {
            await login(email, password);
            navigate('/');
          } catch (loginErr) {
            navigate('/login');
          }
        }, 1500);
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Try again.');
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '85vh',
      padding: '20px'
    }}>
      <div className="glass-panel fade-in" style={{
        maxWidth: '440px',
        width: '100%',
        padding: '40px 32px',
        borderRadius: 'var(--radius-lg)'
      }}>
        {success ? (
          <div style={{ textAlign: 'center', padding: '30px 10px' }}>
            <CheckCircle2 size={56} color="var(--color-success)" style={{ margin: '0 auto 20px auto' }} />
            <h3 style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Registration Complete</h3>
            <p style={{ color: 'var(--text-secondary)' }}>Setting up your secure profile...</p>
          </div>
        ) : (
          <>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h2 style={{
                fontSize: '1.8rem',
                marginBottom: '8px',
                background: 'linear-gradient(135deg, #fff 0%, var(--text-secondary) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>Create Account</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Start tracking and resolving your outstanding debt today
              </p>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: 'var(--color-danger)',
                fontSize: '0.9rem',
                marginBottom: '20px'
              }}>
                <AlertTriangle size={18} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="name">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={18} style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }} />
                  <input
                    id="name"
                    type="text"
                    className="form-control"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }} />
                  <input
                    id="email"
                    type="email"
                    className="form-control"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '28px' }}>
                <label className="form-label" htmlFor="password">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={18} style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)'
                  }} />
                  <input
                    id="password"
                    type="password"
                    className="form-control"
                    placeholder="Min 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    style={{ paddingLeft: '44px' }}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{ width: '100%', padding: '12px', fontSize: '1rem', height: '48px' }}
              >
                {submitting ? (
                  <RefreshCw className="spin" size={18} style={{ animation: 'spin 1.5s linear infinite' }} />
                ) : 'Sign Up'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Already have an account? </span>
              <Link to="/login" style={{ fontWeight: '500' }}>Sign In</Link>
            </div>
          </>
        )}
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Register;
