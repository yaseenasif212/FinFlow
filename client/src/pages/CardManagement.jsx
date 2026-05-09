import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    ShieldCheck, Loader2, Plus, Clock, XCircle, CheckCircle2, Trash2, Landmark, CreditCard, ChevronRight, AlertCircle, X 
} from 'lucide-react'; 
import Sidebar from '../components/Sidebar'; 

const CardManagement = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('finflow_user') || '{}');
    
    const [accountNumber, setAccountNumber] = useState('');
    const [cards, setCards] = useState([]);
    const [applications, setApplications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Toast Notification State
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    // Application Form State
    const [isApplying, setIsApplying] = useState(false);
    const [requestedLimit, setRequestedLimit] = useState(50000);

    // Repayment States
    const [activeRepayCard, setActiveRepayCard] = useState(null); 
    const [repayAmount, setRepayAmount] = useState('');
    const [isRepaying, setIsRepaying] = useState(false);

    // Helper to show modern toast notifications instead of alerts
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
    };

    useEffect(() => {
        const fetchAllCardData = async () => {
            const token = localStorage.getItem('finflow_token');
            if (!token) return navigate('/login');

            try {
                const dashRes = await axios.get('http://localhost:5000/api/customer/dashboard', { headers: { Authorization: `Bearer ${token}` }});
                const accNum = dashRes.data.accounts[0]?.AccountNumber;
                setAccountNumber(accNum);

                if (accNum) {
                    const cardsRes = await axios.get(`http://localhost:5000/api/customer/cards/${accNum}`, { headers: { Authorization: `Bearer ${token}` }});
                    if (cardsRes.data.success) setCards(cardsRes.data.cards);

                    const appsRes = await axios.get(`http://localhost:5000/api/customer/cards/applications/${accNum}`, { headers: { Authorization: `Bearer ${token}` }});
                    if (appsRes.data.success) setApplications(appsRes.data.applications);
                }
            } catch (err) {
                console.error(err);
                showToast("Failed to load card data.", "error");
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllCardData();
    }, [navigate]);

    const blockInvalidChars = (e) => {
        if (['e', 'E', '+', '-', '.'].includes(e.key)) {
            e.preventDefault();
        }
    };

    const handleApply = async (e) => {
        e.preventDefault();
        
        // STRICT CONSTRAINT: Ensure requested limit is in multiples of 10,000
        const limitNum = parseInt(requestedLimit);
        if (limitNum % 10000 !== 0) {
            return showToast("Requested limit must be in multiples of 10,000 (e.g., 10000, 20000, 50000).", "error");
        }

        setIsApplying(true);
        try {
            const token = localStorage.getItem('finflow_token');
            await axios.post('http://localhost:5000/api/customer/card/apply', 
                { accountNumber, requestedLimit: limitNum }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showToast('Application submitted successfully!');
            setTimeout(() => window.location.reload(), 1500); 
        } catch (err) {
            showToast('Failed to submit application.', 'error');
        } finally {
            setIsApplying(false);
        }
    };

    const handleRepaySubmit = async (e, outstandingBalance) => {
        e.preventDefault();
        const amountNum = parseInt(repayAmount);

        if (!amountNum || amountNum <= 0) return showToast("Please enter a valid amount to repay.", "error");
        if (amountNum > outstandingBalance) return showToast("You cannot pay more than your outstanding balance.", "error");

        setIsRepaying(true);
        try {
            const token = localStorage.getItem('finflow_token');
            const res = await axios.post('http://localhost:5000/api/customer/cards/repay', {
                accountNumber: accountNumber, 
                cardNumber: activeRepayCard,  
                amount: amountNum
            }, { headers: { Authorization: `Bearer ${token}` } });

            if (res.data.success) {
                showToast(`Successfully paid Rs. ${amountNum} towards your credit card!`);
                setActiveRepayCard(null);
                setRepayAmount('');
                setTimeout(() => window.location.reload(), 1500); 
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to process repayment. Check account balance.', 'error');
        } finally {
            setIsRepaying(false);
        }
    };

    const handleDeleteCard = async (cardNumber, outstandingBalance) => {
        if (outstandingBalance > 0) {
            return showToast("You cannot destroy a card that has an outstanding balance. Please pay your bill first.", "error");
        }
        if (!window.confirm("Are you sure you want to permanently delete this virtual card?")) return;
        
        try {
            const token = localStorage.getItem('finflow_token');
            await axios.delete(`http://localhost:5000/api/customer/cards/${cardNumber}`, { 
                headers: { Authorization: `Bearer ${token}` }
            });
            showToast('Virtual card securely destroyed.');
            setTimeout(() => window.location.reload(), 1500); 
        } catch (err) {
            console.error(err);
            showToast('Failed to delete card.', 'error');
        }
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-slate-500">Loading Secure Vault...</div>;

    const hasActiveCard = cards.length > 0;
    const hasPendingApp = applications.some(app => app.Status === 'Pending');

    return (
        <div className="bg-[#f7f9ff] font-sans text-slate-900 flex overflow-hidden h-screen relative">
            <Sidebar />

            {/* TOAST NOTIFICATION */}
            {toast.show && (
                <div className={`fixed bottom-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl transition-all duration-300 text-white font-bold text-sm ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
                    {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                    {toast.message}
                    <button onClick={() => setToast({ show: false, message: '', type: 'success' })} className="ml-4 hover:opacity-75 transition-opacity">
                        <X size={16} />
                    </button>
                </div>
            )}

            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <header className="w-full h-20 sticky top-0 z-40 bg-white/60 backdrop-blur-xl border-b border-slate-200/60 flex justify-end items-center px-8">
                    <p className="text-xs font-bold text-indigo-950 uppercase tracking-widest">{user.name}</p>
                </header>

                <div className="flex-1 overflow-y-auto p-8">
                    <h2 className="font-serif text-4xl text-indigo-950 font-bold tracking-tight mb-2">Card Management</h2>
                    <p className="text-slate-500 text-lg mb-6">Manage your active virtual cards and track applications.</p>
                    
                    <div className="inline-flex items-center gap-3 px-5 py-3 bg-indigo-50/80 text-indigo-950 rounded-xl border border-indigo-100 mb-10 shadow-sm">
                        <Landmark size={20} className="text-indigo-600" />
                        <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-indigo-400">Linked Bank Account</p>
                            <p className="font-mono font-bold text-sm">{accountNumber || 'Loading...'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        
                        {/* LEFT COLUMN: ACTIVE CARDS */}
                        <section className="col-span-12 lg:col-span-7">
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 mb-8">
                                <h3 className="font-serif text-xl text-indigo-950 font-bold mb-6 flex items-center gap-2">
                                    <ShieldCheck className="text-emerald-600" /> Active Platinum Cards
                                </h3>
                                
                                {cards.length > 0 ? (
                                    <div className="space-y-6">
                                        {cards.map(card => {
                                            const maskedCard = card.CardNumber.replace(/(\d{4})(\d{8})(\d{4})/, '$1 •••• •••• $3');
                                            
                                            const outstanding = parseFloat(card.OutstandingBalance || 0);
                                            const limit = parseFloat(card.CreditLimit || 0);
                                            const available = limit - outstanding;
                                            const spentPercentage = limit > 0 ? (outstanding / limit) * 100 : 0;

                                            return (
                                                <div key={card.CardNumber} className="flex flex-col gap-3">
                                                    <div className="bg-gradient-to-tr from-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden group">
                                                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
                                                        
                                                        <div className="flex justify-between items-start mb-8 relative z-10">
                                                            <div className="font-serif italic tracking-wider">FinFlow Platinum</div>
                                                            <div className="flex items-center gap-4">
                                                                <button 
                                                                    onClick={() => handleDeleteCard(card.CardNumber, outstanding)}
                                                                    className="p-1.5 bg-red-500/20 hover:bg-red-500/80 rounded-full text-white transition-colors opacity-0 group-hover:opacity-100" 
                                                                    title="Destroy Burner Card"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                                <ShieldCheck size={24} className="text-emerald-400" />
                                                            </div>
                                                        </div>
                                                        
                                                        <p className="font-mono text-xl tracking-[0.2em] mb-6 relative z-10">{maskedCard}</p>
                                                        
                                                        <div className="flex justify-between items-end relative z-10">
                                                            <div>
                                                                <p className="text-[10px] text-red-300 uppercase tracking-widest mb-1">Outstanding Bill</p>
                                                                <p className="font-bold text-lg text-white">Rs. {outstanding.toLocaleString()}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Total Limit</p>
                                                                <p className="font-bold">Rs. {limit.toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="w-full bg-white/10 h-1.5 rounded-full mt-4 overflow-hidden relative z-10">
                                                            <div className="bg-red-400 h-full transition-all" style={{ width: `${spentPercentage}%` }}></div>
                                                        </div>
                                                    </div>

                                                    {/* REPAYMENT UI */}
                                                    {outstanding > 0 && activeRepayCard !== card.CardNumber && (
                                                        <button 
                                                            onClick={() => setActiveRepayCard(card.CardNumber)}
                                                            className="self-end px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 border border-emerald-200"
                                                        >
                                                            <CreditCard size={14} /> Settle Outstanding Bill
                                                        </button>
                                                    )}

                                                    {activeRepayCard === card.CardNumber && (
                                                        <form onSubmit={(e) => handleRepaySubmit(e, outstanding)} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
                                                            <div className="flex justify-between items-center">
                                                                <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Repayment Amount</p>
                                                                <button type="button" onClick={() => setActiveRepayCard(null)} className="text-slate-400 hover:text-slate-600"><XCircle size={16}/></button>
                                                            </div>
                                                            <div className="flex gap-3">
                                                                <input 
                                                                    type="number" required min="1"
                                                                    value={repayAmount}
                                                                    onKeyDown={blockInvalidChars}
                                                                    onChange={(e) => setRepayAmount(e.target.value)}
                                                                    placeholder={`Max: ${outstanding}`}
                                                                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 font-bold"
                                                                />
                                                                <button 
                                                                    type="submit" 
                                                                    disabled={isRepaying}
                                                                    className="px-6 bg-indigo-950 hover:bg-indigo-900 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
                                                                >
                                                                    {isRepaying ? 'Processing...' : 'Pay Bill'}
                                                                </button>
                                                            </div>
                                                            <p className="text-[10px] text-slate-500">Funds will be instantly deducted from {accountNumber}.</p>
                                                        </form>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-slate-400 font-medium bg-slate-50 rounded-xl border border-slate-100">
                                        No active cards. Apply for one on the right.
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* RIGHT COLUMN: APPLICATION FORM & STATUS TRACKER */}
                        <section className="col-span-12 lg:col-span-5 space-y-8">
                            
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
                                <h3 className="font-serif text-xl text-indigo-950 font-bold mb-4 flex items-center gap-2">
                                    <Plus className="text-emerald-600" /> Request New Card
                                </h3>
                                
                                {hasActiveCard ? (
                                    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-emerald-700 text-sm font-bold text-center">
                                        You already hold an active FinFlow Virtual Card. Limit reached.
                                    </div>
                                ) : hasPendingApp ? (
                                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-700 text-sm font-bold text-center flex items-center justify-center gap-2">
                                        <Clock size={16} /> Application currently under review.
                                    </div>
                                ) : (
                                    <form onSubmit={handleApply} className="space-y-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Requested Limit (PKR)</label>
                                            <input 
                                                type="number" required min="10000" max="500000" step="10000"
                                                value={requestedLimit} 
                                                onKeyDown={blockInvalidChars}
                                                onChange={(e) => setRequestedLimit(e.target.value)}
                                                className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg py-3 px-4 outline-none focus:border-emerald-500 font-bold"
                                            />
                                        </div>
                                        <button type="submit" disabled={isApplying} className="w-full py-3 bg-indigo-950 text-white rounded-lg font-bold text-sm shadow-md hover:bg-indigo-900 transition flex items-center justify-center gap-2">
                                            {isApplying ? <Loader2 className="animate-spin" size={16}/> : 'Submit Application'}
                                        </button>
                                    </form>
                                )}
                            </div>

                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
                                <h3 className="font-serif text-xl text-indigo-950 font-bold mb-4">Application History</h3>
                                <div className="space-y-3">
                                    {applications.length > 0 ? applications.map(app => (
                                        <div key={app.ApplicationID} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">FinFlow {app.DesiredTier || 'Card'}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">Req. Limit: Rs. {parseFloat(app.RequestedLimit || app.CreditLimit || 0).toLocaleString()}</p>
                                            </div>
                                            <div>
                                                {app.Status === 'Pending' && <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded"><Clock size={14}/> Pending</span>}
                                                {app.Status === 'Approved' && <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded"><CheckCircle2 size={14}/> Approved</span>}
                                                {app.Status === 'Rejected' && <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded"><XCircle size={14}/> Denied</span>}
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-6 text-slate-400 text-sm">No applications on record.</div>
                                    )}
                                </div>
                            </div>

                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CardManagement;