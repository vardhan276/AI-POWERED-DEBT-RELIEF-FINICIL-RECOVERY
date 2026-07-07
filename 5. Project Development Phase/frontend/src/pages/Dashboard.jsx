import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Edit2, Trash2, ShieldAlert, Sparkles, TrendingDown, 
  HelpCircle, CircleDollarSign, Calendar, BarChart3, Settings, LogOut, CheckCircle2 
} from 'lucide-react';

const Dashboard = () => {
  const { user, token, logout, updateProfile } = useAuth();
  const [loans, setLoans] = useState([]);
  const [profile, setProfile] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    TotalOutstanding: 0,
    TotalEMI: 0,
    MonthlySurplus: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [showLoanModal, setShowLoanModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [currentLoan, setCurrentLoan] = useState(null); // for editing
  
  // Form states for profile
  const [profileForm, setProfileForm] = useState({
    Name: user?.Name || '',
    MonthlyIncome: user?.MonthlyIncome || '',
    MonthlyExpenses: user?.MonthlyExpenses || ''
  });

  // Form states for adding/editing loan
  const [loanForm, setLoanForm] = useState({
    LenderName: '',
    LoanType: 'Credit Card',
    OutstandingAmount: '',
    InterestRate: '',
    EMI: '',
    OverdueMonths: 0
  });

  const [formError, setFormError] = useState('');
  const navigate = useNavigate();

  // Load dashboard overview data
  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/analysis/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setLoans(data.Loans);
        setProfile(data.Profile);
        setDashboardData({
          TotalOutstanding: data.TotalOutstanding,
          TotalEMI: data.TotalEMI,
          MonthlySurplus: data.MonthlySurplus
        });
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  // Handle Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await updateProfile(profileForm.Name, profileForm.MonthlyIncome, profileForm.MonthlyExpenses);
      setShowProfileModal(false);
      fetchDashboardData(); // Refresh metrics
    } catch (err) {
      setFormError(err.message || 'Failed to update profile.');
    }
  };

  // Open Add Loan Modal
  const openAddLoanModal = () => {
    setCurrentLoan(null);
    setLoanForm({
      LenderName: '',
      LoanType: 'Credit Card',
      OutstandingAmount: '',
      InterestRate: '',
      EMI: '',
      OverdueMonths: 0
    });
    setFormError('');
    setShowLoanModal(true);
  };

  // Open Edit Loan Modal
  const openEditLoanModal = (loan) => {
    setCurrentLoan(loan);
    setLoanForm({
      LenderName: loan.LenderName,
      LoanType: loan.LoanType,
      OutstandingAmount: loan.OutstandingAmount,
      InterestRate: loan.InterestRate,
      EMI: loan.EMI,
      OverdueMonths: loan.OverdueMonths
    });
    setFormError('');
    setShowLoanModal(true);
  };

  // Submit Add/Edit Loan Form
  const handleLoanSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    
    const payload = {
      LenderName: loanForm.LenderName,
      LoanType: loanForm.LoanType,
      OutstandingAmount: parseFloat(loanForm.OutstandingAmount),
      InterestRate: parseFloat(loanForm.InterestRate),
      EMI: parseFloat(loanForm.EMI),
      OverdueMonths: parseInt(loanForm.OverdueMonths)
    };

    try {
      let response;
      if (currentLoan) {
        // Edit mode
        response = await fetch(`${API_BASE_URL}/api/loans/${currentLoan.LoanID}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        // Add mode
        response = await fetch(`${API_BASE_URL}/api/loans`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (response.ok) {
        setShowLoanModal(false);
        fetchDashboardData();
      } else {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to save loan information.');
      }
    } catch (err) {
      setFormError(err.message || 'Error occurred while saving loan.');
    }
  };

  // Delete a Loan
  const handleDeleteLoan = async (loanId) => {
    if (!window.confirm('Are you sure you want to delete this loan record? This will permanently recalculate your health metrics.')) {
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/loans/${loanId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error('Delete loan error:', err);
    }
  };

  // Stress level color map
  const getStressDetails = (level) => {
    switch (level) {
      case 'Severe':
        return { color: 'var(--color-danger)', percent: 100, class: 'badge-severe', text: 'Severe Distress' };
      case 'High':
        return { color: '#f97316', percent: 75, class: 'badge-high', text: 'High Distress' };
      case 'Medium':
        return { color: 'var(--color-warning)', percent: 50, class: 'badge-medium', text: 'Moderate Distress' };
      default:
        return { color: 'var(--color-success)', percent: 25, class: 'badge-low', text: 'Minimal Distress' };
    }
  };

  const stress = getStressDetails(profile?.StressLevel || 'Low');
  
  // Calculate SVG stroke offset
  // Arc length = PI * Radius = 3.14159 * 70 = ~219.9
  const radius = 70;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (stress.percent / 100) * circumference;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading financial metrics...</p>
      </div>
    );
  }

  // Check if income is setup, if not show profile setup suggestion banner
  const isProfileIncomplete = user?.MonthlyIncome === 0;

  return (
    <div className="slide-up">
      {/* Quick Setup Warning banner */}
      {isProfileIncomplete && (
        <div className="glass-panel" style={{
          marginBottom: '28px',
          borderColor: 'var(--color-warning)',
          background: 'rgba(245, 158, 11, 0.05)',
          display: 'flex',
          justifyContent: 'between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ShieldAlert color="var(--color-warning)" size={24} />
            <div>
              <h4 style={{ color: '#fff', fontSize: '1.05rem' }}>Financial Profile Incomplete</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Please set up your monthly income and living expenses to generate accurate debt stress levels and settlement ratios.
              </p>
            </div>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              setProfileForm({
                Name: user?.Name || '',
                MonthlyIncome: user?.MonthlyIncome || '',
                MonthlyExpenses: user?.MonthlyExpenses || ''
              });
              setShowProfileModal(true);
            }}
            style={{ background: 'var(--color-warning)', boxShadow: '0 4px 14px 0 rgba(245, 158, 11, 0.25)' }}
          >
            Configure Profile
          </button>
        </div>
      )}

      {/* Main Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px', marginBottom: '32px' }}>
        <div>
          <h1 className="dashboard-title">Welcome back, {user?.Name}</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Track and manage your settlement options and lender communications</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary" onClick={() => {
            setProfileForm({
              Name: user?.Name || '',
              MonthlyIncome: user?.MonthlyIncome || '',
              MonthlyExpenses: user?.MonthlyExpenses || ''
            });
            setShowProfileModal(true);
          }}>
            <Settings size={16} /> Profile Settings
          </button>
          <button className="btn btn-primary" onClick={openAddLoanModal}>
            <Plus size={16} /> Add Loan Account
          </button>
        </div>
      </div>

      {/* Ratios & Gauge Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        
        {/* Gauge Card */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Debt Distress Index
          </h3>
          <div className="dial-container">
            <svg className="dial-svg">
              <path 
                className="dial-bg" 
                d="M 20 85 A 70 70 0 0 1 160 85" 
              />
              <path 
                className="dial-value-arc" 
                d="M 20 85 A 70 70 0 0 1 160 85" 
                stroke={stress.color}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{
                  filter: `drop-shadow(0 0 4px ${stress.color})`
                }}
              />
            </svg>
            <div style={{ position: 'absolute', bottom: '15px', textAlign: 'center' }}>
              <span className={`badge ${stress.class}`} style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
                {stress.text}
              </span>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px', maxWidth: '280px' }}>
            Calculated based on your Debt-to-Income (DTI) ratio, EMI obligations, and remaining monthly surplus.
          </p>
        </div>

        {/* Core Ratios Overview */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Financial Health Ratios
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* EMI to Income */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Monthly EMI Ratio</span>
                <span style={{ fontWeight: '600', color: (profile?.EMI_Ratio >= 0.5 ? 'var(--color-danger)' : 'white') }}>
                  {profile ? (profile.EMI_Ratio * 100).toFixed(1) : '0.0'}%
                </span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${Math.min(100, (profile?.EMI_Ratio || 0) * 100)}%`, 
                  background: (profile?.EMI_Ratio >= 0.5 ? 'var(--color-danger)' : (profile?.EMI_Ratio >= 0.3 ? 'var(--color-warning)' : 'var(--color-success)'))
                }} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target: Under 35% of monthly income</span>
            </div>

            {/* DTI (Total Debt / Annual Income) */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Outstanding DTI Ratio</span>
                <span style={{ fontWeight: '600', color: (profile?.DTI_Ratio >= 1.5 ? 'var(--color-danger)' : 'white') }}>
                  {profile ? profile.DTI_Ratio.toFixed(2) : '0.00'}x
                </span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ 
                  height: '100%', 
                  width: `${Math.min(100, ((profile?.DTI_Ratio || 0) / 2.0) * 100)}%`, 
                  background: (profile?.DTI_Ratio >= 1.5 ? 'var(--color-danger)' : (profile?.DTI_Ratio >= 0.8 ? 'var(--color-warning)' : 'var(--color-success)'))
                }} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Target: Under 1.0x (Outstanding Balance &lt; 1 Year Income)</span>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-muted)', paddingTop: '16px', marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Monthly Surplus Income</span>
              <span style={{ fontSize: '1.25rem', fontWeight: '700', color: (dashboardData.MonthlySurplus < 0 ? 'var(--color-danger)' : 'var(--color-success)') }}>
                ${dashboardData.MonthlySurplus.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            {dashboardData.MonthlySurplus < 0 && (
              <span style={{ color: 'var(--color-danger)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TrendingDown size={14} /> Negative Budget
              </span>
            )}
          </div>
        </div>
      </div>

      {/* General Metrics Grid */}
      <div className="metrics-grid">
        <div className="glass-panel metric-card info">
          <span className="metric-label">Total Debt Balance</span>
          <span className="metric-value">${dashboardData.TotalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        
        <div className="glass-panel metric-card danger">
          <span className="metric-label">Monthly EMI Bill</span>
          <span className="metric-value">${dashboardData.TotalEMI.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        <div className="glass-panel metric-card success">
          <span className="metric-label">Monthly Income</span>
          <span className="metric-value">${(user?.MonthlyIncome || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>

        <div className="glass-panel metric-card warning">
          <span className="metric-label">Active Accounts</span>
          <span className="metric-value">{loans.length}</span>
        </div>
      </div>

      {/* Loans Table / Empty State */}
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Active Debt & Loan Accounts</h3>
          {loans.length > 0 && (
            <button className="btn btn-secondary btn-primary" onClick={() => navigate('/predictor')} style={{ fontSize: '0.85rem', padding: '6px 12px' }}>
              <Sparkles size={14} /> Run Settlement Predictor
            </button>
          )}
        </div>

        {loans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
            <CircleDollarSign size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
            <h4>No Loans Found</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Add your credit cards or personal loans to start analyzing settlement plans.
            </p>
            <button className="btn btn-primary" onClick={openAddLoanModal}>
              <Plus size={16} /> Add Loan Account
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table-custom">
              <thead>
                <tr>
                  <th>Lender / Creditor</th>
                  <th>Loan Type</th>
                  <th>Outstanding Balance</th>
                  <th>EMI</th>
                  <th>Interest</th>
                  <th>Delinquency</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => (
                  <tr key={loan.LoanID}>
                    <td style={{ fontWeight: '600' }}>{loan.LenderName}</td>
                    <td>{loan.LoanType}</td>
                    <td>${loan.OutstandingAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>${loan.EMI.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>{loan.InterestRate}%</td>
                    <td>
                      {loan.OverdueMonths > 0 ? (
                        <span className={`badge ${loan.OverdueMonths >= 6 ? 'badge-severe' : (loan.OverdueMonths >= 3 ? 'badge-high' : 'badge-medium')}`}>
                          {loan.OverdueMonths} {loan.OverdueMonths === 1 ? 'Month' : 'Months'} Overdue
                        </span>
                      ) : (
                        <span className="badge badge-low">Current</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => openEditLoanModal(loan)}
                          style={{ padding: '6px', borderRadius: '4px' }}
                          title="Edit Loan"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => handleDeleteLoan(loan.LoanID)}
                          style={{ padding: '6px', borderRadius: '4px', color: 'var(--color-danger)', borderColor: 'rgba(239,68,68,0.1)' }}
                          title="Delete Loan"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- PROFILE MODAL --- */}
      {showProfileModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.3rem', marginBottom: '24px' }}>Edit Financial Profile</h3>
            {formError && (
              <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '16px' }}>{formError}</div>
            )}
            <form onSubmit={handleProfileSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-control"
                  value={profileForm.Name} 
                  onChange={(e) => setProfileForm({ ...profileForm, Name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Gross Income ($)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  min="0"
                  step="0.01"
                  value={profileForm.MonthlyIncome} 
                  onChange={(e) => setProfileForm({ ...profileForm, MonthlyIncome: e.target.value })}
                  required
                  placeholder="e.g. 5000"
                />
              </div>
              <div className="form-group" style={{ marginBottom: '28px' }}>
                <label className="form-label">Basic Monthly Expenses ($) <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(excluding EMIs)</span></label>
                <input 
                  type="number" 
                  className="form-control" 
                  min="0"
                  step="0.01"
                  value={profileForm.MonthlyExpenses} 
                  onChange={(e) => setProfileForm({ ...profileForm, MonthlyExpenses: e.target.value })}
                  required
                  placeholder="e.g. 2000"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowProfileModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD/EDIT LOAN MODAL --- */}
      {showLoanModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ fontSize: '1.3rem', marginBottom: '24px' }}>
              {currentLoan ? 'Edit Loan Account' : 'Add Loan Account'}
            </h3>
            {formError && (
              <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '16px' }}>{formError}</div>
            )}
            <form onSubmit={handleLoanSubmit}>
              <div className="form-group">
                <label className="form-label">Lender / Creditor Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  placeholder="e.g. Chase Bank, Apex Credit"
                  value={loanForm.LenderName}
                  onChange={(e) => setLoanForm({ ...loanForm, LenderName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Account / Loan Type</label>
                <select 
                  className="form-control"
                  value={loanForm.LoanType}
                  onChange={(e) => setLoanForm({ ...loanForm, LoanType: e.target.value })}
                >
                  <option value="Credit Card">Credit Card (Unsecured)</option>
                  <option value="Personal Loan">Personal Loan (Unsecured)</option>
                  <option value="Home Mortgage">Home Mortgage (Secured)</option>
                  <option value="Auto Loan">Auto Loan (Secured)</option>
                  <option value="Student Loan">Student Loan</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Outstanding Balance ($)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    min="1" 
                    step="0.01" 
                    required
                    placeholder="e.g. 10000"
                    value={loanForm.OutstandingAmount}
                    onChange={(e) => setLoanForm({ ...loanForm, OutstandingAmount: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Interest Rate (% APY)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    min="0" 
                    step="0.01" 
                    required
                    placeholder="e.g. 18.5"
                    value={loanForm.InterestRate}
                    onChange={(e) => setLoanForm({ ...loanForm, InterestRate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Monthly EMI ($)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    min="0" 
                    step="0.01" 
                    required
                    placeholder="e.g. 350"
                    value={loanForm.EMI}
                    onChange={(e) => setLoanForm({ ...loanForm, EMI: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Months Overdue</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    min="0" 
                    required
                    placeholder="e.g. 3"
                    value={loanForm.OverdueMonths}
                    onChange={(e) => setLoanForm({ ...loanForm, OverdueMonths: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowLoanModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {currentLoan ? 'Save Changes' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
