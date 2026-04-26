import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LayoutDashboard, CreditCard, ShieldCheck, Loader2, Plus, Clock, XCircle, CheckCircle2, Trash2, Activity, Landmark } from 'lucide-react'; 

const CardManagement = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('finflow_user') || '{}');
    
    const [accountNumber, setAccountNumber] = useState('');
    const [cards, setCards] = useState([]);
    const [applications, setApplications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Application Form State
    const [isApplying, setIsApplying] = useState(false);
    const [requestedLimit, setRequestedLimit] = useState(50000);

    useEffect(() => {
        const fetchAllCardData = async () => {
            const token = localStorage.getItem('finflow_token');
            if (!token) return navigate('/login');

            try {
                // First, get the user's account number from the dashboard endpoint
                const dashRes = await axios.get('http://localhost:5000/api/customer/dashboard', { headers: { Authorization: `Bearer ${token}` }});
                const accNum = dashRes.data.accounts[0]?.AccountNumber;
                setAccountNumber(accNum);

                if (accNum) {
                    // Fetch Active Cards
                    const cardsRes = await axios.get(`http://localhost:5000/api/customer/cards/${accNum}`, { headers: { Authorization: `Bearer ${token}` }});
                    if (cardsRes.data.success) setCards(cardsRes.data.cards);

                    // Fetch Application History (Pending, Rejected, etc)
                    const appsRes = await axios.get(`http://localhost:5000/api/customer/cards/applications/${accNum}`, { headers: { Authorization: `Bearer ${token}` }});
                    if (appsRes.data.success) setApplications(appsRes.data.applications);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllCardData();
    }, [navigate]);

    const handleApply = async (e) => {
        e.preventDefault();
        setIsApplying(true);
        try {
            const token = localStorage.getItem('finflow_token');
            await axios.post('http://localhost:5000/api/customer/card/apply', 
                { accountNumber, requestedLimit }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('Application submitted successfully!');
            window.location.reload(); 
        } catch (err) {
            alert('Failed to submit application.');
        } finally {
            setIsApplying(false);
        }
    };

    // Delete Burner Card Function
    const handleDeleteCard = async (cardNumber) => {
        if (!window.confirm("Are you sure you want to permanently delete this virtual card?")) return;
        
        try {
            const token = localStorage.getItem('finflow_token');
            await axios.delete(`http://localhost:5000/api/customer/cards/${cardNumber}`, { 
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Virtual card securely destroyed.');
            window.location.reload(); 
        } catch (err) {
            console.error(err);
            alert('Failed to delete card.');
        }
    };

    const handleLogout = () => { localStorage.clear(); navigate('/login'); };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-slate-500">Loading Secure Vault...</div>;

    // LOGIC CHECKS FOR APPLICATION FORM
    const hasActiveCard = cards.length > 0;
    const hasPendingApp = applications.some(app => app.Status === 'Pending');

    return (
        <div className="bg-[#f7f9ff] font-sans text-slate-900 flex overflow-hidden h-screen">
            
            {/* SIDEBAR */}
            <aside className="hidden md:flex flex-col h-full py-8 px-4 bg-slate-50 w-64 border-r border-slate-200/60 shrink-0 z-20">
                <div className="mb-10 px-4">
                    <h1 className="font-serif italic text-2xl text-indigo-950 font-bold tracking-tight">FinFlow.</h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Digital Vault</p>
                </div>
                <nav className="flex-1 space-y-2">
                    <button onClick={() => navigate('/dashboard')} className="w-full flex items-center gap-4 py-3 text-slate-500 hover:text-indigo-950 pl-4 transition-colors font-bold text-left">
                        <LayoutDashboard size={20} /> <span className="font-serif text-lg tracking-tight">Dashboard</span>
                    </button>
                    <button className="w-full flex items-center gap-4 py-3 text-emerald-600 font-bold border-r-4 border-emerald-500 pl-4 bg-emerald-50/50 text-left">
                        <CreditCard size={20} /> <span className="font-serif text-lg tracking-tight">Virtual Cards</span>
                    </button>
                    <button onClick={() => navigate('/analytics')} className="w-full flex items-center gap-4 py-3 text-slate-500 hover:text-indigo-950 pl-4 transition-colors font-bold text-left">
                        <Activity size={20} /> <span className="font-serif text-lg tracking-tight">Analytics</span>
                    </button>
                </nav>
                <div className="mt-auto px-4">
                    <button onClick={handleLogout} className="w-full py-3 rounded-full border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-100 transition-colors mb-6">
                        Secure Logout
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-900 text-white flex items-center justify-center font-bold text-lg uppercase">
                            {user.name?.charAt(0)}
                        </div>
                        <div>
                            <p className="text-sm font-bold text-indigo-950">{user.name?.split(' ')[0]}</p>
                            <p className="text-[10px] text-slate-400">Vault ID: #{user.id?.slice(-4)}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <header className="w-full h-20 sticky top-0 z-40 bg-white/60 backdrop-blur-xl border-b border-slate-200/60 flex justify-end items-center px-8">
                    <p className="text-xs font-bold text-indigo-950 uppercase tracking-widest">{user.name}</p>
                </header>

                <div className="flex-1 overflow-y-auto p-8">
                    <h2 className="font-serif text-4xl text-indigo-950 font-bold tracking-tight mb-2">Card Management</h2>
                    <p className="text-slate-500 text-lg mb-6">Manage your active virtual cards and track applications.</p>
                    
                    {/* NEW: DISPLAY LINKED BANK ACCOUNT */}
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
                                            const spentPercentage = ((card.CreditLimit - card.AvailableCredit) / card.CreditLimit) * 100;
                                            return (
                                                <div key={card.CardID} className="bg-gradient-to-tr from-slate-900 to-indigo-950 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden group">
                                                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
                                                    
                                                    <div className="flex justify-between items-start mb-8 relative z-10">
                                                        <div className="font-serif italic tracking-wider">FinFlow Platinum</div>
                                                        <div className="flex items-center gap-4">
                                                            {/* DELETE BUTTON */}
                                                            <button 
                                                                onClick={() => handleDeleteCard(card.CardNumber)}
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
                                                            <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Available Credit</p>
                                                            <p className="font-bold text-lg">Rs. {card.AvailableCredit.toLocaleString()}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Limit</p>
                                                            <p className="font-bold">Rs. {card.CreditLimit.toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="w-full bg-white/10 h-1.5 rounded-full mt-4 overflow-hidden relative z-10">
                                                        <div className="bg-emerald-400 h-full" style={{ width: `${spentPercentage}%` }}></div>
                                                    </div>
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
                            
                            {/* APPLY FOR NEW CARD */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
                                <h3 className="font-serif text-xl text-indigo-950 font-bold mb-4 flex items-center gap-2">
                                    <Plus className="text-emerald-600" /> Request New Card
                                </h3>
                                
                                {/* CONDITIONAL RENDERING FOR APPLICATION FORM */}
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
                                                type="number" required min="1000" max="500000"
                                                value={requestedLimit} 
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

                            {/* APPLICATION STATUS TRACKER */}
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
                                <h3 className="font-serif text-xl text-indigo-950 font-bold mb-4">Application History</h3>
                                <div className="space-y-3">
                                    {applications.length > 0 ? applications.map(app => (
                                        <div key={app.ApplicationID} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">FinFlow {app.DesiredTier}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">Req. Limit: Rs. {app.CreditLimit.toLocaleString()}</p>
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