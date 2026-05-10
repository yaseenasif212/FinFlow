import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PieChart, Activity, ShieldCheck, Lock } from 'lucide-react'; 
import Sidebar from '../components/Sidebar';

const Analytics = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('finflow_user') || '{}');
    
    const [spendingData, setSpendingData] = useState([]);
    const [creditScore, setCreditScore] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAnalytics = useCallback(async () => {
        const token = localStorage.getItem('finflow_token');
        if (!token) { navigate('/login'); return; }

        try {
            const dashRes = await axios.get('http://localhost:5000/api/customer/dashboard', { headers: { Authorization: `Bearer ${token}` }});
            
            if (dashRes.data.success && dashRes.data.accounts.length > 0) {
                const accNum = dashRes.data.accounts[0].AccountNumber;
                const analyticsRes = await axios.get(`http://localhost:5000/api/customer/analytics/${accNum}`, { headers: { Authorization: `Bearer ${token}` }});
                
                if (analyticsRes.data.success) {
                    const { spending, creditScore } = analyticsRes.data.data;
                    setSpendingData(spending || []);
                    setCreditScore(creditScore || 0);
                }
            }
        } catch (err) {
            console.error("Failed to fetch analytics", err);
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    const totalSpent = spendingData.reduce((sum, item) => sum + (item.value || 0), 0);
    
 
    const SPENDING_COLORS = ['bg-indigo-500', 'bg-amber-500', 'bg-emerald-500', 'bg-purple-500', 'bg-rose-500'];
    
    const spendingBreakdown = spendingData.map((item, idx) => ({
        name: item.name,
        amount: item.value,
        color: SPENDING_COLORS[idx % SPENDING_COLORS.length],
        percentage: totalSpent > 0 ? ((item.value / totalSpent) * 100).toFixed(1) : 0
    })).sort((a, b) => b.amount - a.amount);

    const scoreColor = creditScore >= 700 ? 'text-emerald-500' : creditScore >= 580 ? 'text-amber-500' : 'text-red-500';

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-slate-500">Loading Financial Insights...</div>;

    return (
        <div className="bg-[#f7f9ff] font-sans text-slate-900 flex overflow-hidden h-screen">
            <Sidebar />

            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <header className="w-full h-20 sticky top-0 z-40 bg-white/60 backdrop-blur-xl border-b border-slate-200/60 flex justify-end items-center px-8">
                    <p className="text-xs font-bold text-indigo-950 uppercase tracking-widest">{user.name}</p>
                </header>

                <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full space-y-8">
                    
                    <div>
                        <h2 className="font-serif text-4xl text-indigo-950 font-bold tracking-tight mb-2">Intelligent Insights</h2>
                        <p className="text-slate-500 text-lg">Your automated financial health and budgeting analysis.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* 1. CREDIT SCORE / HEALTH GAUGE */}
                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200/60 flex flex-col justify-center items-center text-center relative overflow-hidden">
                            {totalSpent > 0 ? (
                                <>
                                    <Activity className={`absolute -right-4 -top-4 w-32 h-32 opacity-5 ${scoreColor}`} />
                                    <ShieldCheck className={`mb-2 opacity-80 ${scoreColor}`} size={28} />
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Live Credit Score</p>
                                    
                                    <div className="relative">
                                        <svg className="w-32 h-32 transform -rotate-90">
                                            <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                                            <circle cx="64" cy="64" r="50" stroke="currentColor" strokeWidth="12" fill="transparent" 
                                                strokeDasharray={`${(creditScore / 850) * 314} 314`} 
                                                strokeLinecap="round"
                                                className={`${scoreColor} transition-all duration-1000 ease-out`} 
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center flex-col">
                                            <span className="text-3xl font-bold text-slate-800">{Math.round(creditScore)}</span>
                                        </div>
                                    </div>
                                    
                                    <p className={`text-sm font-bold mt-4 uppercase tracking-wider ${scoreColor}`}>
                                        {creditScore >= 700 ? 'Excellent Standing' : creditScore >= 580 ? 'Fair Standing' : 'High Risk'}
                                    </p>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full">
                                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                        <Lock size={24} className="text-slate-300" />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Credit Score Locked</p>
                                    <p className="text-xs text-slate-500 leading-relaxed px-4">
                                        Insufficient transaction history to calculate your score.
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* 2. SMART BUDGET BREAKDOWN */}
                        <div className="md:col-span-2 bg-white rounded-2xl p-8 shadow-sm border border-slate-200/60 flex flex-col justify-center">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Outflow</p>
                                    <p className="text-3xl font-bold text-slate-800">Rs. {totalSpent.toLocaleString()}</p>
                                </div>
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <PieChart size={24} />
                                </div>
                            </div>

                            {totalSpent > 0 ? (
                                <>
                                    <div className="w-full h-4 flex rounded-full overflow-hidden mb-6 shadow-inner">
                                        {spendingBreakdown.map((item, idx) => (
                                            <div 
                                                key={idx} 
                                                className={`h-full ${item.color} transition-all duration-1000`} 
                                                style={{ width: `${item.percentage}%` }}
                                                title={`${item.name}: ${item.percentage}%`}
                                            ></div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {spendingBreakdown.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-3 h-3 rounded-full ${item.color} shadow-sm`}></div>
                                                    <span className="text-sm font-bold text-slate-700 truncate">{item.name}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-xs font-mono font-bold text-slate-900">Rs. {item.amount.toLocaleString()}</span>
                                                    <span className="block text-[10px] text-slate-400 font-bold mt-0.5">{item.percentage}%</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="py-12 text-center text-slate-400 text-sm font-medium border-2 border-dashed border-slate-100 rounded-xl">
                                    No spending data to analyze yet. Start making transfers!
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Analytics;