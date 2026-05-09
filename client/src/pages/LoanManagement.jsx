import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    Banknote, CalendarDays, Clock, CheckCircle2, XCircle, ChevronRight, Loader2, FileText
} from 'lucide-react';

import Sidebar from '../components/Sidebar';

const LoanManagement = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('finflow_user') || '{}');
    
    const [accountNumber, setAccountNumber] = useState('');
    const [activeLoans, setActiveLoans] = useState([]);
    const [applications, setApplications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Form & Processing States
    const [isApplying, setIsApplying] = useState(false);
    const [processingId, setProcessingId] = useState(null); // Tracks which loan is currently being paid

    const [formData, setFormData] = useState({
        loanType: 'Personal Loan',
        amount: 50000,
        repaymentDuration: 12
    });

    const fetchLoanData = async () => {
        const token = localStorage.getItem('finflow_token');
        if (!token) return navigate('/login');

        try {
            const dashRes = await axios.get('http://localhost:5000/api/customer/dashboard', { 
                headers: { Authorization: `Bearer ${token}` }
            });
            const accNum = dashRes.data.accounts[0]?.AccountNumber;
            setAccountNumber(accNum);

            if (accNum) {
                const loanRes = await axios.get(`http://localhost:5000/api/customer/loans/${accNum}`, { 
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                if (loanRes.data.success) {
                    setActiveLoans(loanRes.data.activeLoans || []);
                    setApplications(loanRes.data.applications || []);
                }
            }
        } catch (err) {
            console.error("Failed to load loan data:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLoanData();
    }, [navigate]);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleApply = async (e) => {
        e.preventDefault();
        setIsApplying(true);
        try {
            const token = localStorage.getItem('finflow_token');
            await axios.post('http://localhost:5000/api/customer/loan/apply', 
                { 
                    accountNumber, 
                    loanType: formData.loanType,
                    amount: formData.amount,
                    repaymentDuration: formData.repaymentDuration
                }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('Loan application securely submitted for review!');
            fetchLoanData(); // Refresh UI without reloading the whole page
        } catch (err) {
            alert('Failed to submit application.');
        } finally {
            setIsApplying(false);
        }
    };

    // ---> NEW: LOAN REPAYMENT HANDLER <---
    const handleLoanPayment = async (loan) => {
        setProcessingId(loan.LoanID);
        try {
            const token = localStorage.getItem('finflow_token');
            const res = await axios.post('http://localhost:5000/api/customer/loans/repay', {
                accountNumber: accountNumber,
                loanId: loan.LoanID,
                paymentAmount: loan.MonthlyInstallment
            }, { headers: { Authorization: `Bearer ${token}` } });

            if (res.data.success) {
                alert(res.data.message);
                fetchLoanData(); // Instantly refresh balance & progress bar!
            }
        } catch (err) {
            alert("Payment failed. Make sure you have enough funds in your main account.");
        } finally {
            setProcessingId(null);
        }
    };

    const estimatedTotal = parseFloat(formData.amount) * 1.05;
    const estimatedMonthly = estimatedTotal / parseInt(formData.repaymentDuration);

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-slate-500">Loading Debt Portfolio...</div>;

    const hasPendingApp = applications.some(app => app.Status === 'Pending');

    return (
        <div className="bg-[#f7f9ff] font-sans text-slate-900 flex overflow-hidden h-screen">
            
            <Sidebar />

            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <header className="w-full h-20 sticky top-0 z-40 bg-white/60 backdrop-blur-xl border-b border-slate-200/60 flex justify-end items-center px-8">
                    <p className="text-xs font-bold text-indigo-950 uppercase tracking-widest">{user.name}</p>
                </header>

                <div className="flex-1 overflow-y-auto p-8">
                    <h2 className="font-serif text-4xl text-indigo-950 font-bold tracking-tight mb-2">Lending & Financing</h2>
                    <p className="text-slate-500 text-lg mb-8">Manage your active debts and request new financing.</p>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        
                        <div className="col-span-12 lg:col-span-7 space-y-8">
                            
                            <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
                                <h3 className="font-serif text-xl text-indigo-950 font-bold mb-6 flex items-center gap-2">
                                    <Banknote className="text-emerald-600" /> Active Financing
                                </h3>
                                
                                {activeLoans.length > 0 ? (
                                    <div className="space-y-4">
                                        {activeLoans.map(loan => {
                                            // Calculate Progress Bar Width
                                            const progress = loan.TotalAmount ? ((loan.TotalAmount - loan.RemainingBalance) / loan.TotalAmount) * 100 : 0;

                                            return (
                                                <div key={loan.LoanID} className="border border-slate-200 rounded-xl p-5 hover:border-emerald-200 transition-colors bg-[#f8fafc] relative overflow-hidden">
                                                    {/* Accent Top Border */}
                                                    <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
                                                    
                                                    <div className="flex justify-between items-start mb-4 pt-1">
                                                        <div>
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Loan ID: {loan.LoanID}</p>
                                                            <p className="font-bold text-indigo-950 text-lg mt-1">Remaining: Rs. {parseFloat(loan.RemainingBalance).toLocaleString()}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Active</p>
                                                        </div>
                                                    </div>

                                                    {/* ---> UPDATED: PROGRESS BAR <--- */}
                                                    <div className="mb-5 bg-white p-3 rounded-lg border border-slate-100">
                                                        <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                                                            <span>Paid: {progress.toFixed(0)}%</span>
                                                            <span>Total: Rs. {parseFloat(loan.TotalAmount || 0).toLocaleString()}</span>
                                                        </div>
                                                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                                                            <div className="bg-amber-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200">
                                                        <div>
                                                            <p className="text-[10px] uppercase text-slate-400 font-bold">Monthly Installment</p>
                                                            <p className="font-mono font-bold text-slate-700">Rs. {parseFloat(loan.MonthlyInstallment).toLocaleString()}</p>
                                                            {loan.NextDueDate && (
                                                                <p className="text-[10px] font-bold text-amber-600 mt-0.5 flex items-center gap-1">
                                                                    <CalendarDays size={12}/> Due: {new Date(loan.NextDueDate).toLocaleDateString()}
                                                                </p>
                                                            )}
                                                        </div>
                                                        
                                                        {/* ---> UPDATED: PAY INSTALLMENT BUTTON <--- */}
                                                        <button 
                                                            onClick={() => handleLoanPayment(loan)}
                                                            disabled={processingId === loan.LoanID}
                                                            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                                                        >
                                                            {processingId === loan.LoanID ? <><Loader2 className="animate-spin" size={14}/> Processing...</> : 'Pay Installment'}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500">
                                        You have no active loans.
                                    </div>
                                )}
                            </section>

                            <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
                                <h3 className="font-serif text-xl text-indigo-950 font-bold mb-4 flex items-center gap-2">
                                    <FileText className="text-indigo-600" /> Application History
                                </h3>
                                <div className="space-y-3">
                                    {applications.length > 0 ? applications.map(app => (
                                        <div key={app.LoanID} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{app.LoanType}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">Req. Amount: Rs. {app.Amount.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                {app.Status === 'Pending' && <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded"><Clock size={14}/> Pending</span>}
                                                {app.Status === 'Approved' && <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded"><CheckCircle2 size={14}/> Approved</span>}
                                                {app.Status === 'Rejected' && <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded"><XCircle size={14}/> Denied</span>}
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-6 text-slate-400 text-sm">No recent applications.</div>
                                    )}
                                </div>
                            </section>

                        </div>

                        <div className="col-span-12 lg:col-span-5">
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 sticky top-8">
                                <h3 className="font-serif text-xl text-indigo-950 font-bold mb-6">Request Financing</h3>
                                
                                {hasPendingApp ? (
                                    <div className="p-5 bg-amber-50 rounded-xl border border-amber-100 text-amber-700 text-sm font-bold text-center">
                                        <Clock className="mx-auto mb-2 opacity-50" size={32} />
                                        You currently have a loan application under review. Please wait for an Admin decision before applying again.
                                    </div>
                                ) : (
                                    <form onSubmit={handleApply} className="space-y-5">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Loan Purpose</label>
                                            <select 
                                                name="loanType" value={formData.loanType} onChange={handleInputChange}
                                                className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg py-3 px-4 outline-none focus:border-indigo-500 font-bold text-slate-700"
                                            >
                                                <option value="Personal Loan">Personal Loan</option>
                                                <option value="Education Loan">Education Loan</option>
                                                <option value="Auto Loan">Auto Financing</option>
                                                <option value="Business Loan">Business Capital</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Requested Amount (PKR)</label>
                                            <input 
                                                type="number" name="amount" required min="10000" max="5000000" step="10000"
                                                value={formData.amount} onChange={handleInputChange}
                                                className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg py-3 px-4 outline-none focus:border-indigo-500 font-bold text-lg"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Repayment Tenure (Months)</label>
                                            <input 
                                                type="range" name="repaymentDuration" min="3" max="60" step="3"
                                                value={formData.repaymentDuration} onChange={handleInputChange}
                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                            <div className="text-right mt-1 font-bold text-indigo-900">{formData.repaymentDuration} Months</div>
                                        </div>

                                        <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 mt-6">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold text-slate-500">Interest Rate (Flat)</span>
                                                <span className="text-xs font-bold text-indigo-900">5.00%</span>
                                            </div>
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="text-xs font-bold text-slate-500">Total to Repay</span>
                                                <span className="text-xs font-bold text-indigo-900">Rs. {estimatedTotal.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-indigo-100">
                                                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Est. Monthly</span>
                                                <span className="text-lg font-bold text-emerald-600">Rs. {Math.round(estimatedMonthly).toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <button type="submit" disabled={isApplying} className="w-full py-4 mt-2 bg-indigo-950 text-white rounded-lg font-bold text-sm shadow-xl hover:bg-indigo-900 hover:shadow-2xl transition-all flex items-center justify-center gap-2">
                                            {isApplying ? <Loader2 className="animate-spin" size={18}/> : <>Submit Application <ChevronRight size={18}/></>}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
};

export default LoanManagement;