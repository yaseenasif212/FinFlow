import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CreditCard, ShieldCheck, Clock, XCircle, CheckCircle2, ArrowRight } from 'lucide-react';

const VirtualCardManager = ({ accountNumber }) => {
    const [cards, setCards] = useState([]);
    const [applications, setApplications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchWidgetData = async () => {
            if (!accountNumber) return;
            try {
                const token = localStorage.getItem('finflow_token');
                
                // Fetch both cards and application history simultaneously
                const [cardsRes, appsRes] = await Promise.all([
                    axios.get(`http://localhost:5000/api/customer/cards/${accountNumber}`, { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get(`http://localhost:5000/api/customer/cards/applications/${accountNumber}`, { headers: { Authorization: `Bearer ${token}` } })
                ]);
                
                if (cardsRes.data.success) setCards(cardsRes.data.cards);
                if (appsRes.data.success) setApplications(appsRes.data.applications);
            } catch (err) {
                console.error("Widget fetch error:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchWidgetData();
    }, [accountNumber]);

    if (isLoading) return <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200/60 text-center text-slate-400 animate-pulse">Syncing Card Data...</div>;

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
            {/* WIDGET HEADER */}
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                <h3 className="font-serif text-xl text-indigo-950 font-bold flex items-center gap-2">
                    <CreditCard className="text-emerald-600" /> Virtual Cards
                </h3>
                <button onClick={() => navigate('/cards')} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-full flex items-center gap-1 uppercase tracking-widest transition-colors">
                    Manage <ArrowRight size={12}/>
                </button>
            </div>

            <div className="space-y-6">
                {/* 1. SHOW ACTIVE CARDS (IF ANY) */}
                {cards.length > 0 && cards.map(card => {
                    const maskedCard = card.CardNumber.replace(/(\d{4})(\d{8})(\d{4})/, '$1 •••• •••• $3');
                    const spentPercentage = ((card.CreditLimit - card.AvailableCredit) / card.CreditLimit) * 100;
                    return (
                        <div key={card.CardID} className="bg-gradient-to-tr from-slate-900 to-indigo-950 p-5 rounded-xl text-white shadow-lg relative overflow-hidden">
                            <div className="flex justify-between items-start mb-6 relative z-10">
                                <div className="font-serif italic tracking-wider text-sm">FinFlow Platinum</div>
                                <ShieldCheck size={18} className="text-emerald-400" />
                            </div>
                            <p className="font-mono text-lg tracking-[0.15em] mb-4 relative z-10">{maskedCard}</p>
                            <div className="flex justify-between items-end relative z-10">
                                <div>
                                    <p className="text-[9px] text-slate-400 uppercase tracking-widest mb-0.5">Available Credit</p>
                                    <p className="font-bold text-sm">Rs. {card.AvailableCredit.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="w-full bg-white/10 h-1 rounded-full mt-3 overflow-hidden relative z-10">
                                <div className="bg-emerald-400 h-full" style={{ width: `${spentPercentage}%` }}></div>
                            </div>
                        </div>
                    );
                })}

                {/* 2. SHOW PENDING/REJECTED APPLICATIONS */}
                {applications.filter(app => app.Status !== 'Approved').length > 0 && (
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Application Status</p>
                        {applications.filter(app => app.Status !== 'Approved').map(app => (
                            <div key={app.ApplicationID} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">Platinum Card Request</p>
                                    <p className="text-[10px] text-slate-500 mt-0.5">Limit: Rs. {app.CreditLimit.toLocaleString()}</p>
                                </div>
                                <div>
                                    {app.Status === 'Pending' && <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100"><Clock size={12}/> PENDING</span>}
                                    {app.Status === 'Rejected' && <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100"><XCircle size={12}/> DENIED</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* 3. SHOW EMPTY STATE IF NOTHING EXISTS */}
                {cards.length === 0 && applications.length === 0 && (
                    <div className="text-center py-8">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-100">
                            <CreditCard size={20} className="text-slate-400" />
                        </div>
                        <p className="text-sm font-bold text-indigo-950">No Cards Active</p>
                        <p className="text-xs text-slate-500 mt-1 mb-4">You don't have any virtual cards or pending applications.</p>
                        <button onClick={() => navigate('/cards')} className="text-xs font-bold text-white bg-indigo-950 px-4 py-2 rounded-lg hover:bg-indigo-900 transition-colors shadow-sm">
                            Apply in Card Center
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VirtualCardManager;