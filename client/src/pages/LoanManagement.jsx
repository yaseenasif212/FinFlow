import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    Banknote, CalendarDays, Clock, CheckCircle2, XCircle, ChevronRight, Loader2, FileText, AlertCircle, X
} from 'lucide-react';
import Sidebar from '../components/Sidebar';

const LoanManagement = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('finflow_user') || '{}');
    
    const [accountNumber, setAccountNumber] = useState('');
    const [accountBalance, setAccountBalance] = useState(0); 
    const [activeLoans, setActiveLoans] = useState([]);
    const [applications, setApplications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [isApplying, setIsApplying] = useState(false);
    const [processingId, setProcessingId] = useState(null);

    const [formData, setFormData] = useState({
        loanType: 'Personal Loan',
        amount: 50000,
        repaymentDuration: 12
    });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
    };

    const fetchLoanData = async () => {
        const token = localStorage.getItem('finflow_token');
        if (!token) return navigate('/login');

        try {
            const dashRes = await axios.get('http://localhost:5000/api/customer/dashboard', { 
                headers: { Authorization: `Bearer ${token}` }
            });
            const accNum = dashRes.data.accounts[0]?.AccountNumber;
            const balance = dashRes.data.accounts[0]?.Balance; 
            
            setAccountNumber(accNum);
            setAccountBalance(balance || 0);

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
            showToast("Failed to load debt portfolio.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLoanData();
    }, [navigate]);

    const blockInvalidChars = (e) => {
        if (['e', 'E', '+', '-', '.'].includes(e.key)) {
            e.preventDefault();
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name === 'amount') {
            if (!/^\d*$/.test(value)) return; 
        }
        setFormData({ ...formData, [name]: value });
    };

    const handleApply = async (e) => {
        e.preventDefault();
        const requestedAmount = parseInt(formData.amount);
        if (requestedAmount % 10000 !== 0) {
            return showToast("Loan amount must be requested in multiples of 10,000.", "error");
        }

        setIsApplying(true);
        try {
            const token = localStorage.getItem('finflow_token');
            await axios.post('http://localhost:5000/api/customer/loan/apply', 
                { 
                    accountNumber, 
                    loanType: formData.loanType,
                    amount: requestedAmount,
                    repaymentDuration: formData.repaymentDuration
                }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            showToast('Loan application securely submitted for review!');
            fetchLoanData(); 
        } catch (err) {
            showToast('Failed to submit application.', 'error');
        } finally {
            setIsApplying(false);
        }
    };

    const handleLoanPayment = async (loan) => {
        const amountToPay = Math.min(loan.MonthlyInstallment, loan.RemainingBalance);

        if (loan.RemainingBalance <= 0) {
            return showToast("This loan is already fully paid off!", "error");
        }

        if (accountBalance < amountToPay) {
            return showToast(`Insufficient funds.`, "error");
        }

        setProcessingId(loan.LoanID);
        try {
            const token = localStorage.getItem('finflow_token');
            const res = await axios.post('http://localhost:5000/api/customer/loans/repay', {
                accountNumber: accountNumber,
                loanId: loan.LoanID,
                paymentAmount: amountToPay 
            }, { headers: { Authorization: `Bearer ${token}` } });

            if (res.data.success) {
                if (res.data.isFullyPaid) {
                    showToast(`🎉 Congratulations! Your loan is fully repaid. The Admin has been notified!`);
                } else {
                    showToast(`Successfully paid Rs. ${amountToPay.toLocaleString()}`);
                }
                fetchLoanData(); 
            }
        } catch (err) {
            showToast("Payment failed. Ensure you have enough funds.", "error");
        } finally {
            setProcessingId(null);
        }
    };

    const estimatedTotal = parseFloat(formData.amount || 0) * 1.05;
    const estimatedMonthly = estimatedTotal / parseInt(formData.repaymentDuration || 1);

    
    const visibleLoans = activeLoans.filter(loan => parseFloat(loan.RemainingBalance) > 0);
    const hasPendingApp = applications.some(app => app.Status === 'Pending');

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-slate-500">Loading Debt Portfolio...</div>;

    return (
        <div className="bg-[#f7f9ff] font-sans text-slate-900 flex overflow-hidden h-screen relative">
            <Sidebar />

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
                    <h2 className="font-serif text-4xl text-indigo-950 font-bold tracking-tight mb-2">Lending & Financing</h2>
                    <p className="text-slate-500 text-lg mb-8">Manage your active debts and request new financing.</p>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="col-span-12 lg:col-span-7 space-y-8">
                            <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
                                <h3 className="font-serif text-xl text-indigo-950 font-bold mb-6 flex items-center gap-2">
                                    <Banknote className="text-emerald-600" /> Active Financing
                                </h3>
                                
                                {visibleLoans.length > 0 ? (
                                    <div className="space-y-4">
                                        {visibleLoans.map(loan => {
                                            let progress = loan.TotalAmount ? ((loan.TotalAmount - loan.RemainingBalance) / loan.TotalAmount) * 100 : 0;
                                            if (progress > 100) progress = 100;
                                            if (progress < 0) progress = 0;

                                            return (
                                                <div key={loan.LoanID} className="border border-slate-200 rounded-xl p-5 hover:border-emerald-200 transition-colors bg-[#f8fafc] relative overflow-hidden">
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
                                                        </div>
                                                        
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
                                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 flex flex-col items-center">
                                        <CheckCircle2 size={40} className="mb-2 text-emerald-500 opacity-50" />
                                        <p className="font-bold text-indigo-950">Debt Free!</p>
                                        <p className="text-xs">You have no active loans to display.</p>
                                    </div>
                                )}
                            </section>

                            <section className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
                                <h3 className="font-serif text-xl text-indigo-950 font-bold mb-4 flex items-center gap-2">
                                    <FileText className="text-indigo-600" /> Application History
                                </h3>
                                <div className="space-y-3">
                                    {applications.length > 0 ? applications.map(app => (
                                        <div key={app.LoanID || app.ApplicationID} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
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
                                        You currently have a loan application under review.
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
                                                value={formData.amount} 
                                                onKeyDown={blockInvalidChars}
                                                onChange={handleInputChange}
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
                                                <span className="text-xs font-bold text-slate-500">Interest Rate</span>
                                                <span className="text-xs font-bold text-indigo-900">5.00%</span>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-indigo-100">
                                                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Est. Monthly</span>
                                                <span className="text-lg font-bold text-emerald-600">Rs. {Math.round(estimatedMonthly).toLocaleString()}</span>
                                            </div>
                                        </div>

                                        <button type="submit" disabled={isApplying} className="w-full py-4 mt-2 bg-indigo-950 text-white rounded-lg font-bold text-sm shadow-xl hover:bg-indigo-900 transition-all flex items-center justify-center gap-2">
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