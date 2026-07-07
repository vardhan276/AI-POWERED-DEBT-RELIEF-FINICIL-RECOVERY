import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { Sparkles, FileText, Copy, Download, RefreshCw, ChevronLeft, Check, Compass, AlertCircle } from 'lucide-react';

const LetterGenerator = () => {
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [loans, setLoans] = useState([]);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [hardshipReason, setHardshipReason] = useState('Job Loss');
  const [proposedPercent, setProposedPercent] = useState('45');
  const [additionalDetails, setAdditionalDetails] = useState('');
  
  const [strategy, setStrategy] = useState('');
  const [letterText, setLetterText] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Auto-fill loan details from SettlementPredictor redirect state if present
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
          
          if (location.state && location.state.loanId) {
            setSelectedLoanId(location.state.loanId.toString());
            if (location.state.proposedPercent) {
              setProposedPercent(location.state.proposedPercent.toString());
            }
          } else if (data.length > 0) {
            setSelectedLoanId(data[0].LoanID.toString());
          }
        }
      } catch (err) {
        console.error('Error fetching loans:', err);
      }
    };
    fetchLoans();
  }, [token, location.state]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!selectedLoanId) {
      setError('Please select an active loan account.');
      return;
    }
    
    setLoading(true);
    setError('');
    setStrategy('');
    setLetterText('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/negotiate/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          LoanID: parseInt(selectedLoanId),
          HardshipReason: hardshipReason,
          ProposedSettlementPercent: parseFloat(proposedPercent),
          AdditionalDetails: additionalDetails
        })
      });

      if (response.ok) {
        const data = await response.json();
        setStrategy(data.NegotiationStrategy);
        setLetterText(data.NegotiationLetter);
      } else {
        const errData = await response.json();
        throw new Error(errData.detail || 'AI Generation failed');
      }
    } catch (err) {
      setError(err.message || 'Could not compile letter.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(letterText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const activeLoan = loans.find(l => l.LoanID === parseInt(selectedLoanId));
    const filename = `${activeLoan?.LenderName.replace(/\s+/g, '_')}_settlement_proposal.txt`;
    const element = document.createElement("a");
    const file = new Blob([letterText], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="slide-up">
      <div style={{ marginBottom: '32px' }}>
        <h1 className="dashboard-title">AI Negotiation Letter Generator</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Draft professional lender settlement offers backed by Google Gemini AI</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
        
        {/* Setup Parameters Panel */}
        <div className="glass-panel" style={{ height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={18} color="var(--color-primary)" /> Negotiation Parameters
          </h3>
          
          {loans.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <p>No active loan accounts found. Add one on the dashboard first.</p>
            </div>
          ) : (
            <form onSubmit={handleGenerate}>
              <div className="form-group">
                <label className="form-label">Creditor Account</label>
                <select 
                  className="form-control"
                  value={selectedLoanId}
                  onChange={(e) => setSelectedLoanId(e.target.value)}
                  required
                >
                  {loans.map(l => (
                    <option key={l.LoanID} value={l.LoanID}>
                      {l.LenderName} ({l.LoanType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Primary Hardship Reason</label>
                <select 
                  className="form-control"
                  value={hardshipReason}
                  onChange={(e) => setHardshipReason(e.target.value)}
                >
                  <option value="Job Loss">Job Loss / Unemployment</option>
                  <option value="Medical Issue">Medical Expenses / Emergency</option>
                  <option value="Divorce">Divorce / Family Restructuring</option>
                  <option value="Interest Rate Hike">Interest Rate Hike / Inflation</option>
                  <option value="Other">Other Financial Hardship</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Proposed Settlement Percentage (%)</label>
                <input 
                  type="number" 
                  className="form-control"
                  min="20"
                  max="90"
                  required
                  placeholder="e.g. 45"
                  value={proposedPercent}
                  onChange={(e) => setProposedPercent(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Typical targets range from 35% to 55%</span>
              </div>

              <div className="form-group" style={{ marginBottom: '28px' }}>
                <label className="form-label">Hardship Narrative &amp; Details <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>(optional)</span></label>
                <textarea 
                  className="form-control"
                  rows="4"
                  placeholder="Provide supporting details, e.g. dates of job loss, types of medical conditions, or details of salary cuts. AI will weave this professionally into the draft."
                  value={additionalDetails}
                  onChange={(e) => setAdditionalDetails(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {error && (
                <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '16px', display: 'flex', gap: '8px' }}>
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading}
                style={{ width: '100%', gap: '10px' }}
              >
                {loading ? (
                  <>
                    <RefreshCw className="spin" size={16} style={{ animation: 'spin 1.5s linear infinite' }} /> Processing with Gemini...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Generate Proposal Draft
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* AI Output Workspace */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', minHeight: '500px' }}>
          {!letterText ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>
              <FileText size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.3 }} />
              <h4>Preview Workspace</h4>
              <p style={{ fontSize: '0.9rem', maxWidth: '280px', margin: '8px auto 0 auto' }}>
                Configure parameters and submit to draft your hardship letter.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }} className="fade-in">
              
              {/* Strategy Advice section */}
              {strategy && (
                <div style={{ background: 'rgba(99, 102, 241, 0.05)', border: '1px solid rgba(99, 102, 241, 0.15)', borderRadius: 'var(--radius-sm)', padding: '16px', marginBottom: '24px' }}>
                  <h4 style={{ color: 'var(--color-primary)', fontSize: '0.95rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={14} /> AI Suggested Negotiation Strategy
                  </h4>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6', whiteSpace: 'pre-line' }}>
                    {strategy}
                  </div>
                </div>
              )}

              {/* Editable Letter text area */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>Generated Settlement Letter</h4>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-secondary" onClick={handleCopy} style={{ padding: '6px 12px', fontSize: '0.8rem', gap: '4px' }}>
                      {copied ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button className="btn btn-secondary" onClick={handleDownload} style={{ padding: '6px 12px', fontSize: '0.8rem', gap: '4px' }}>
                      <Download size={14} /> Download
                    </button>
                  </div>
                </div>
                <textarea 
                  className="form-control"
                  value={letterText}
                  onChange={(e) => setLetterText(e.target.value)}
                  style={{ 
                    flex: 1, 
                    minHeight: '350px', 
                    fontFamily: 'Courier New, monospace', 
                    fontSize: '0.9rem', 
                    lineHeight: '1.5',
                    background: '#0d111d',
                    borderColor: 'var(--border-muted)',
                    resize: 'vertical',
                    padding: '16px'
                  }}
                />
              </div>
            </div>
          )}
        </div>
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

export default LetterGenerator;
