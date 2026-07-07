import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Sparkles, AlertTriangle, ArrowRight, ShieldCheck, Calculator, Download, Calendar } from 'lucide-react';

const SettlementPredictor = () => {
  const { token } = useAuth();
  const [loans, setLoans] = useState([]);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Load user loans on mount
  useEffect(() => {
    const fetchLoans = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/loans`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setLoans(data);
          if (data.length > 0) {
            setSelectedLoanId(data[0].LoanID.toString());
          }
        }
      } catch (err) {
        console.error('Failed to load loans:', err);
      }
    };
    fetchLoans();
  }, [token]);

  // Load existing prediction if selected loan changes
  useEffect(() => {
    if (!selectedLoanId) return;
    
    const fetchExistingPrediction = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/analysis/predictions`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          const existing = data.find(p => p.LoanID === parseInt(selectedLoanId));
          setPrediction(existing || null);
        }
      } catch (err) {
        console.error('Error fetching existing predictions:', err);
      }
    };
    fetchExistingPrediction();
  }, [selectedLoanId, token]);

  const handlePredict = async () => {
    if (!selectedLoanId) return;
    setCalculating(true);
    setError('');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/analysis/predict/${selectedLoanId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPrediction(data);
      } else {
        const errData = await response.json();
        throw new Error(errData.detail || 'Prediction failed');
      }
    } catch (err) {
      setError(err.message || 'Could not compute prediction.');
    } finally {
      setCalculating(false);
    }
  };

  const getSelectedLoanDetails = () => {
    return loans.find(l => l.LoanID === parseInt(selectedLoanId));
  };

  const selectedLoan = getSelectedLoanDetails();

  // Installment structures based on predicted amount
  const getInstallmentOptions = (amount) => {
    if (!amount) return [];
    return [
      { 
        term: 'Single Lump-Sum', 
        monthly: amount, 
        total: amount, 
        interest: 0,
        desc: 'Propose a single immediate payment in exchange for a complete write-off. Offers the highest chance of lender approval.'
      },
      { 
        term: '3-Month Structured', 
        monthly: roundVal((amount * 1.05) / 3), 
        total: roundVal(amount * 1.05), 
        interest: 5,
        desc: 'Propose 3 monthly installments (includes 5% admin markup). Highly accepted by large credit issuers.'
      },
      { 
        term: '6-Month Structured', 
        monthly: roundVal((amount * 1.10) / 6), 
        total: roundVal(amount * 1.10), 
        interest: 10,
        desc: 'Propose 6 monthly installments (includes 10% interest markup). Recommended only if lump-sum cash is unavailable.'
      }
    ];
  };

  const roundVal = (v) => Math.round(v * 100) / 100;

  return (
    <div className="slide-up">
      <div style={{ marginBottom: '32px' }}>
        <h1 className="dashboard-title">Settlement Predictor</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Analyze maximum discount potential and calculate legally safe settlement proposals</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
        
        {/* Selection Card */}
        <div className="glass-panel" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '20px' }}>Select Account</h3>
          
          {loans.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No active accounts found to analyze. Please add accounts on the dashboard first.</p>
          ) : (
            <div>
              <div className="form-group">
                <label className="form-label">Loan / Creditor Account</label>
                <select 
                  className="form-control"
                  value={selectedLoanId}
                  onChange={(e) => {
                    setSelectedLoanId(e.target.value);
                    setPrediction(null);
                  }}
                >
                  {loans.map(l => (
                    <option key={l.LoanID} value={l.LoanID}>
                      {l.LenderName} - {l.LoanType} (${l.OutstandingAmount.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {selectedLoan && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-muted)', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Outstanding Balance:</span>
                    <span style={{ fontWeight: '600' }}>${selectedLoan.OutstandingAmount.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Interest Rate:</span>
                    <span style={{ fontWeight: '600' }}>{selectedLoan.InterestRate}% APY</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Current EMI:</span>
                    <span style={{ fontWeight: '600' }}>${selectedLoan.EMI}/mo</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Delinquency Status:</span>
                    <span style={{ fontWeight: '600', color: selectedLoan.OverdueMonths > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                      {selectedLoan.OverdueMonths > 0 ? `${selectedLoan.OverdueMonths} months overdue` : 'Current'}
                    </span>
                  </div>
                </div>
              )}

              <button 
                className="btn btn-primary" 
                onClick={handlePredict} 
                disabled={calculating}
                style={{ width: '100%', gap: '10px' }}
              >
                <Sparkles size={16} /> {calculating ? 'Analyzing Financial Ratios...' : 'Calculate Settlement Offer'}
              </button>
            </div>
          )}
        </div>

        {/* Prediction Results Card */}
        <div className="glass-panel" style={{ minHeight: '350px', display: 'flex', flexDirection: 'column', justifyContent: prediction ? 'flex-start' : 'center' }}>
          {!prediction ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 10px' }}>
              <Calculator size={48} style={{ margin: '0 auto 16px auto', opacity: 0.3 }} />
              <h4>Analysis Pending</h4>
              <p style={{ fontSize: '0.9rem', maxWidth: '280px', margin: '8px auto 0 auto' }}>
                Select an account and run the predictor to see target settlements.
              </p>
            </div>
          ) : (
            <div className="fade-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.2rem' }}>Settlement Recommendation</h3>
                <span className={`badge ${prediction.RiskCategory === 'Severe' ? 'badge-severe' : (prediction.RiskCategory === 'High' ? 'badge-high' : (prediction.RiskCategory === 'Medium' ? 'badge-medium' : 'badge-low'))}`}>
                  {prediction.RiskCategory} Risk Category
                </span>
              </div>

              {/* Offer Percent & Ratios */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: 'var(--radius-sm)', padding: '16px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Offer</span>
                  <span style={{ fontSize: '2.2rem', fontWeight: '800', color: 'var(--color-success)' }}>
                    {prediction.SuggestedSettlement}%
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>of balance</span>
                </div>
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-muted)', borderRadius: 'var(--radius-sm)', padding: '16px', textAlign: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Settlement Amount</span>
                  <span style={{ fontSize: '2.2rem', fontWeight: '800', color: 'white' }}>
                    ${prediction.PredictedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block' }}>Save ${(selectedLoan.OutstandingAmount - prediction.PredictedAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Progress visual comparison */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  <span>Settlement: ${prediction.PredictedAmount.toLocaleString()}</span>
                  <span>Original Debt: ${selectedLoan.OutstandingAmount.toLocaleString()}</span>
                </div>
                <div style={{ height: '14px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '99px', overflow: 'hidden', display: 'flex' }}>
                  <div style={{ height: '100%', width: `${prediction.SuggestedSettlement}%`, background: 'var(--color-success)', boxShadow: '0 0 10px rgba(16,185,129,0.3)' }} />
                  <div style={{ height: '100%', flex: 1, background: 'rgba(239,68,68,0.25)' }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', display: 'block', textAlign: 'center' }}>
                  Lender write-off value: <strong>{100 - prediction.SuggestedSettlement}%</strong>
                </span>
              </div>

              {/* Risk category details banner */}
              {prediction.RiskCategory === 'Severe' || prediction.RiskCategory === 'High' ? (
                <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', padding: '14px', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '12px', marginBottom: '28px' }}>
                  <AlertTriangle color="var(--color-danger)" style={{ flexShrink: 0 }} />
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <strong>Immediate Legal Risk:</strong> Your account is heavily overdue. The lender is preparing for collections. This makes them highly cooperative for a settlement, but you must act quickly to avoid credit court filings.
                  </p>
                </div>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.15)', padding: '14px', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '12px', marginBottom: '28px' }}>
                  <ShieldCheck color="var(--color-success)" style={{ flexShrink: 0 }} />
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <strong>Low Legal Risk:</strong> Your account is in good standing or early overdue. Lenders may initially reject low offers. Use the AI Letter Generator to explain hardship and justify the write-off.
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <button 
                className="btn btn-primary" 
                onClick={() => navigate('/negotiator', { 
                  state: { 
                    loanId: selectedLoan.LoanID, 
                    proposedPercent: prediction.SuggestedSettlement 
                  } 
                })}
                style={{ width: '100%', gap: '10px' }}
              >
                Proceed to AI Letter Draft <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Installment Options Grid */}
      {prediction && (
        <div className="glass-panel" style={{ marginTop: '28px' }}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="var(--color-primary)" /> Proposed Payoff Structures
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {getInstallmentOptions(prediction.PredictedAmount).map((opt, i) => (
              <div key={i} style={{ 
                background: i === 0 ? 'rgba(99, 102, 241, 0.03)' : 'transparent',
                border: i === 0 ? '1px dashed var(--color-primary)' : '1px solid var(--border-muted)',
                borderRadius: 'var(--radius-md)', 
                padding: '20px', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between' 
              }}>
                <div>
                  <h4 style={{ color: i === 0 ? 'var(--color-primary)' : 'white', fontSize: '1rem', marginBottom: '8px' }}>{opt.term}</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>{opt.desc}</p>
                </div>
                <div>
                  <div style={{ borderTop: '1px solid var(--border-muted)', paddingTop: '12px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Monthly Pay</span>
                      <span style={{ fontSize: '1.2rem', fontWeight: '700' }}>${opt.monthly.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Total Payout</span>
                      <span style={{ fontSize: '1rem', fontWeight: '600' }}>${opt.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SettlementPredictor;
