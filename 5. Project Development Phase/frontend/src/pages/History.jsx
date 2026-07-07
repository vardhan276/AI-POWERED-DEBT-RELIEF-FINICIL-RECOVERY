import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { History as HistoryIcon, Copy, Download, Eye, Calendar, Sparkles, Check, ChevronDown, ChevronUp } from 'lucide-react';

const History = () => {
  const { token, user } = useAuth();
  const [letters, setLetters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState(null); // for modal view
  const [copiedId, setCopiedId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [loansMap, setLoansMap] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all loans to map LoanID -> LenderName
        const loansResponse = await fetch(`${API_BASE_URL}/api/loans`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        let loansData = [];
        if (loansResponse.ok) {
          loansData = await loansResponse.json();
          const mapping = {};
          loansData.forEach(l => {
            mapping[l.LoanID] = l;
          });
          setLoansMap(mapping);
        }

        // Fetch AI negotiation letters history
        const response = await fetch(`${API_BASE_URL}/api/negotiate/history`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setLetters(data);
        }
      } catch (err) {
        console.error('Failed to fetch negotiation history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (letter, lenderName) => {
    const dateStr = new Date(letter.GeneratedDate).toLocaleDateString().replace(/\//g, '-');
    const filename = `${lenderName.replace(/\s+/g, '_')}_settlement_${dateStr}.txt`;
    const element = document.createElement("a");
    const file = new Blob([letter.NegotiationLetter], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const toggleExpand = (id) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading negotiation history...</p>
      </div>
    );
  }

  return (
    <div className="slide-up">
      <div style={{ marginBottom: '32px' }}>
        <h1 className="dashboard-title">Negotiation &amp; History Logs</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Retrieve and manage your past AI-generated settlement documents</p>
      </div>

      <div className="glass-panel">
        <h3 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HistoryIcon size={18} color="var(--color-primary)" /> Historical Letter Records
        </h3>

        {letters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
            <HistoryIcon size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px', opacity: 0.3 }} />
            <h4>No Letters Drafted Yet</h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px' }}>
              When you generate hardship proposals using the AI Letter Generator, they will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {letters.map((letter) => {
              const loan = loansMap[letter.LoanID] || { LenderName: 'Unknown Lender', LoanType: 'Account' };
              const date = new Date(letter.GeneratedDate).toLocaleString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
              });
              const isExpanded = expandedId === letter.AI_ID;

              return (
                <div key={letter.AI_ID} style={{
                  background: 'rgba(255, 255, 255, 0.01)',
                  border: '1px solid var(--border-muted)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  transition: 'var(--transition-smooth)'
                }}>
                  {/* Header Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <h4 style={{ fontSize: '1.1rem', color: 'white', marginBottom: '4px' }}>
                        Proposal to {loan.LenderName}
                      </h4>
                      <div style={{ display: 'flex', gap: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} /> {date}
                        </span>
                        <span>•</span>
                        <span>Account Type: {loan.LoanType}</span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => handleCopy(letter.AI_ID, letter.NegotiationLetter)}
                        style={{ padding: '6px 12px', fontSize: '0.8rem', gap: '4px' }}
                      >
                        {copiedId === letter.AI_ID ? <Check size={12} color="var(--color-success)" /> : <Copy size={12} />}
                        {copiedId === letter.AI_ID ? 'Copied' : 'Copy'}
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => handleDownload(letter, loan.LenderName)}
                        style={{ padding: '6px 12px', fontSize: '0.8rem', gap: '4px' }}
                      >
                        <Download size={12} /> Download
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        onClick={() => toggleExpand(letter.AI_ID)}
                        style={{ padding: '6px 12px', fontSize: '0.8rem', gap: '4px' }}
                      >
                        {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {isExpanded ? 'Hide Draft' : 'View Draft'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content Panels */}
                  {isExpanded && (
                    <div className="fade-in" style={{ marginTop: '20px', borderTop: '1px solid var(--border-muted)', paddingTop: '20px' }}>
                      
                      {/* Strategy Box */}
                      {letter.NegotiationStrategy && (
                        <div style={{ background: 'rgba(99, 102, 241, 0.03)', border: '1px solid rgba(99, 102, 241, 0.1)', borderRadius: 'var(--radius-sm)', padding: '16px', marginBottom: '16px' }}>
                          <h5 style={{ color: 'var(--color-primary)', fontSize: '0.85rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            <Sparkles size={12} /> AI Strategy Employed
                          </h5>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line', lineHeight: '1.5' }}>
                            {letter.NegotiationStrategy}
                          </p>
                        </div>
                      )}

                      {/* Letter Box */}
                      <div>
                        <h5 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Letter Body
                        </h5>
                        <pre style={{
                          fontFamily: 'Courier New, monospace',
                          fontSize: '0.85rem',
                          color: 'var(--text-primary)',
                          background: '#0d111d',
                          border: '1px solid var(--border-muted)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '16px',
                          whiteSpace: 'pre-wrap',
                          lineHeight: '1.5',
                          overflowX: 'auto'
                        }}>
                          {letter.NegotiationLetter}
                        </pre>
                      </div>

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
