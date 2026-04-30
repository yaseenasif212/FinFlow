import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PieChart as PieChartIcon, BarChart3, ShieldCheck } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';

// 1. IMPORT YOUR NEW SIDEBAR COMPONENT
import Sidebar from '../components/Sidebar';

const Analytics = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('finflow_user') || '{}');
    
    const [spendingData, setSpendingData] = useState([]);
    const [cashFlowData, setCashFlowData] = useState([]);
    const [creditScore, setCreditScore] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [chartType, setChartType] = useState('pie'); 

    const fetchAnalytics = useCallback(async () => {
        const token = localStorage.getItem('finflow_token');
        if (!token) { navigate('/login'); return; }

        try {
            const dashRes = await axios.get('http://localhost:5000/api/customer/dashboard', { headers: { Authorization: `Bearer ${token}` }});
            
            if (dashRes.data.success && dashRes.data.accounts.length > 0) {
                const accNum = dashRes.data.accounts[0].AccountNumber;
                const analyticsRes = await axios.get(`http://localhost:5000/api/customer/analytics/${accNum}`, { headers: { Authorization: `Bearer ${token}` }});
                
                if (analyticsRes.data.success) {
                    const { spending, cashFlow, creditScore } = analyticsRes.data.data;
                    setSpendingData(spending);
                    setCreditScore(creditScore);
                    
                    // Format Cash Flow for Recharts
                    setCashFlowData([
                        { name: 'Income (In)', amount: cashFlow.MoneyIn, fill: '#10b981' },
                        { name: 'Expenses (Out)', amount: cashFlow.MoneyOut, fill: '#ef4444' }
                    ]);
                }
            }
        } catch (err) {
            console.error("Failed to fetch analytics", err);
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

    const SPENDING_COLORS = ['#6366f1', '#f59e0b', '#8b5cf6', '#3b82f6'];

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-slate-500">Loading Financial Insights...</div>;

    return (
        <div className="bg-[#f7f9ff] font-sans text-slate-900 flex overflow-hidden h-screen">
            
            {/* 2. INJECT THE REUSABLE SIDEBAR HERE */}
            <Sidebar />

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <header className="w-full h-20 sticky top-0 z-40 bg-white/60 backdrop-blur-xl border-b border-slate-200/60 flex justify-end items-center px-8">
                    <p className="text-xs font-bold text-indigo-950 uppercase tracking-widest">{user.name}</p>
                </header>

                <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full space-y-8">
                    
                    <div>
                        <h2 className="font-serif text-4xl text-indigo-950 font-bold tracking-tight mb-2">Financial Insights</h2>
                        <p className="text-slate-500 text-lg">Track your credit score, cash flow, and spending habits.</p>
                    </div>

                    {/* TOP ROW: CREDIT SCORE & CASH FLOW SUMMARY */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* CREDIT SCORE GAUGE */}
                        <div className="bg-gradient-to-br from-indigo-950 to-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col items-center justify-center text-white min-h-[250px]">
                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
                            <ShieldCheck className="absolute top-6 left-6 text-emerald-400 opacity-50" size={32}/>
                            <h3 className="font-serif text-lg font-bold mb-2 z-10 text-slate-200">Live Credit Score</h3>
                            
                            <div className="h-40 w-full relative z-10">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={15} data={[{ name: 'Score', value: creditScore, fill: '#34d399' }]} startAngle={180} endAngle={0}>
                                        <PolarAngleAxis type="number" domain={[300, 850]} angleAxisId={0} tick={false} />
                                        <RadialBar minAngle={15} background clockWise dataKey="value" cornerRadius={10} />
                                    </RadialBarChart>
                                </ResponsiveContainer>
                                <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                                    <p className="text-4xl font-bold font-serif">{creditScore}</p>
                                    <p className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold mt-1">Excellent</p>
                                </div>
                            </div>
                        </div>

                        {/* CASH FLOW GRAPH */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 lg:col-span-2 min-h-[250px] flex flex-col">
                            <h3 className="font-serif text-xl text-indigo-950 font-bold mb-4">Cash Flow Overview</h3>
                            <div className="flex-1 w-full min-h-[180px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={cashFlowData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9"/>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#475569', fontWeight: 600, fontSize: 12}} width={100}/>
                                        <Tooltip cursor={{fill: '#f8fafc'}} formatter={(value) => `Rs. ${value.toLocaleString()}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                                        <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={30}>
                                            {cashFlowData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>

                    {/* BOTTOM ROW: SMART BUDGETING TOGGLE */}
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
                        <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                            <h3 className="font-serif text-2xl text-indigo-950 font-bold">Smart Budgeting Categories</h3>
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button onClick={() => setChartType('pie')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${chartType === 'pie' ? 'bg-white text-indigo-950 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                    <PieChartIcon size={16}/> Pie Chart
                                </button>
                                <button onClick={() => setChartType('bar')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${chartType === 'bar' ? 'bg-white text-indigo-950 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                    <BarChart3 size={16}/> Bar Graph
                                </button>
                            </div>
                        </div>

                        {spendingData.length > 0 ? (
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    {chartType === 'pie' ? (
                                        <PieChart>
                                            <Pie data={spendingData} cx="50%" cy="50%" innerRadius={80} outerRadius={110} paddingAngle={5} dataKey="value">
                                                {spendingData.map((entry, index) => <Cell key={`cell-${index}`} fill={SPENDING_COLORS[index % SPENDING_COLORS.length]} />)}
                                            </Pie>
                                            <Tooltip formatter={(value) => `Rs. ${value.toLocaleString()}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    ) : (
                                        <BarChart data={spendingData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 600}} dy={10}/>
                                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 600}} tickFormatter={(val) => `Rs.${val/1000}k`}/>
                                            <Tooltip cursor={{fill: '#f8fafc'}} formatter={(value) => `Rs. ${value.toLocaleString()}`} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                                            <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60}>
                                                {spendingData.map((entry, index) => <Cell key={`cell-${index}`} fill={SPENDING_COLORS[index % SPENDING_COLORS.length]} />)}
                                            </Bar>
                                        </BarChart>
                                    )}
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="text-center py-20 text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                                No spending data available yet. Make a transfer to see your charts!
                            </div>
                        )}
                    </div>

                </div>
            </main>
        </div>
    );
};

export default Analytics;