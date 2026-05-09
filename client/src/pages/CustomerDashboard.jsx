import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
    ShieldCheck, TrendingUp, ArrowUpRight, ArrowDownLeft, 
    CheckCircle2, AlertCircle, Send, Lock, Download, Users, Divide, ArrowRight,
    Bell, UserPlus, ArrowDownToLine, Filter, X 
} from 'lucide-react';
import Sidebar from '../components/Sidebar'; 

const CustomerDashboard = () => {
    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [beneficiaries, setBeneficiaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [transferData, setTransferData] = useState({ receiverAccount: '', amount: '' });
    const [pin, setPin] = useState(['', '', '', '']); 
    const pinRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
    
    const [isTransferring, setIsTransferring] = useState(false);
    const [transferStatus, setTransferStatus] = useState({ type: '', message: '' });

    const [showSplitModal, setShowSplitModal] = useState(false);
    const [splitBillTotal, setSplitBillTotal] = useState('');
    const [selectedFriends, setSelectedFriends] = useState([]);
    const [isSplitting, setIsSplitting] = useState(false);

    const [pendingRequests, setPendingRequests] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);

    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        type: 'All', 
        minAmount: '',
        maxAmount: '',
        startDate: '',
        endDate: ''
    });

    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('finflow_user') || '{}');

    const fetchDashboardData = useCallback(async () => {
        const token = localStorage.getItem('finflow_token');
        if (!token) { navigate('/login'); return; }

        try {
            const res = await axios.get('http://localhost:5000/api/customer/dashboard', {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            if (res.data.success) {
                const fetchedAccounts = res.data.accounts;
                setAccounts(fetchedAccounts);
                
                const primaryAccount = fetchedAccounts[0];
                const activeAcc = prev => prev ? (fetchedAccounts.find(a => a.AccountNumber === prev.AccountNumber) || primaryAccount) : primaryAccount;
                setSelectedAccount(activeAcc);
                setTransactions(res.data.transactions);

                if (primaryAccount) {
                    const benRes = await axios.get(`http://localhost:5000/api/customer/beneficiaries/${primaryAccount.AccountNumber}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (benRes.data.success) setBeneficiaries(benRes.data.beneficiaries);

                    try {
                        const reqRes = await axios.get(`http://localhost:5000/api/customer/actions/pending/${primaryAccount.AccountNumber}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        if (reqRes.data.success) setPendingRequests(reqRes.data.requests);
                    } catch (err) {
                        console.error("Failed to fetch notifications");
                    }
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load dashboard.');
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

    const blockInvalidChars = (e) => {
        if (['e', 'E', '+', '-', '.'].includes(e.key)) {
            e.preventDefault();
        }
    };

    const handleTransferChange = (e) => {
        const { name, value } = e.target;
        if (name === 'receiverAccount') {
            if (!/^\d*$/.test(value) || value.length > 4) return;
        }
        if (name === 'amount') {
            if (!/^\d*$/.test(value)) return; 
        }
        setTransferData({ ...transferData, [name]: value });
        setTransferStatus({ type: '', message: '' });
    };

    const handlePinChange = (index, value) => {
        if (!/^[0-9]*$/.test(value)) return;
        const newPin = [...pin];
        newPin[index] = value.slice(-1);
        setPin(newPin);
        setTransferStatus({ type: '', message: '' });
        if (value && index < 3) pinRefs[index + 1].current.focus();
    };

    const handlePinKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            pinRefs[index - 1].current.focus();
        }
    };

    const handleTransferSubmit = async (e) => {
        e.preventDefault();
        const fullPin = pin.join('');
        const amountNum = parseInt(transferData.amount);
        const fullReceiverAccount = `PK-FIN-${transferData.receiverAccount}`;
        
        if (transferData.receiverAccount.length < 4 || !transferData.amount || fullPin.length < 4) {
            return setTransferStatus({ type: 'error', message: 'Please enter a 4-digit ID and all other fields.' });
        }

        if (amountNum <= 0) {
            return setTransferStatus({ type: 'error', message: 'Amount must be at least Rs. 1' });
        }

        if (amountNum > selectedAccount.Balance) {
            return setTransferStatus({ 
                type: 'error', 
                message: `Insufficient funds. Balance: Rs. ${parseFloat(selectedAccount.Balance).toLocaleString()}` 
            });
        }

        setIsTransferring(true);
        setTransferStatus({ type: '', message: '' });

        try {
            const token = localStorage.getItem('finflow_token');
            const res = await axios.post('http://localhost:5000/api/customer/transfer', {
                senderAccount: selectedAccount.AccountNumber,
                receiverAccount: fullReceiverAccount,
                amount: amountNum,
                pin: fullPin
            }, { headers: { Authorization: `Bearer ${token}` } });

            if (res.data.success) {
                setTransferStatus({ type: 'success', message: 'Transfer successful!' });
                setTransferData({ receiverAccount: '', amount: '' });
                setPin(['', '', '', '']); 
                fetchDashboardData(); 
            }
        } catch (err) {
            setTransferStatus({ type: 'error', message: err.response?.data?.message || 'Transfer failed.' });
        } finally {
            setIsTransferring(false);
        }
    };

    const handleSplitBillSubmit = async (e) => {
        e.preventDefault();
        const total = parseInt(splitBillTotal);

        if (selectedFriends.length === 0 || !splitBillTotal) {
            return setTransferStatus({ type: 'error', message: 'Select friends and enter amount.' });
        }
        if (total <= 0) {
            return setTransferStatus({ type: 'error', message: 'Amount must be positive.' });
        }
        if (total > selectedAccount.Balance) {
            return setTransferStatus({ type: 'error', message: 'Total exceeds your account balance.' });
        }
        
        setIsSplitting(true);
        setTransferStatus({ type: '', message: '' });

        try {
            const token = localStorage.getItem('finflow_token');
            const res = await axios.post('http://localhost:5000/api/customer/transfer/split', {
                payerAccount: selectedAccount.AccountNumber,
                totalAmount: total,
                participants: selectedFriends
            }, { headers: { Authorization: `Bearer ${token}` } });
    
            if (res.data.success) {
                setTransferStatus({ type: 'success', message: 'Split requests sent!' });
                setShowSplitModal(false);
                setSplitBillTotal('');
                setSelectedFriends([]);
                fetchDashboardData(); 
            }
        } catch (err) {
            setTransferStatus({ type: 'error', message: 'Failed to send split requests.' });
        } finally {
            setIsSplitting(false);
        }
    };

    const toggleFriendSelection = (accNum) => {
        if (selectedFriends.includes(accNum)) {
            setSelectedFriends(selectedFriends.filter(f => f !== accNum));
        } else {
            setSelectedFriends([...selectedFriends, accNum]);
        }
    };

    const handleDownloadStatement = async () => {
        if (!selectedAccount) return;
        try {
            const token = localStorage.getItem('finflow_token');
            const response = await axios.get(`http://localhost:5000/api/customer/statement/${selectedAccount.AccountNumber}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob' 
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `FinFlow_Statement_${selectedAccount.AccountNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove(); 
        } catch (err) {
            setTransferStatus({ type: 'error', message: "Error downloading statement." });
        }
    };

    const handleRequestAction = async (reqObj, action) => {
        try {
            const token = localStorage.getItem('finflow_token');
            await axios.post('http://localhost:5000/api/customer/actions/process', {
                requestId: reqObj.RequestID,
                action: action, 
                requestType: reqObj.RequestType,
                senderAcc: reqObj.SenderAcc,
                receiverAcc: reqObj.ReceiverAcc,
                amount: reqObj.Amount
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            setTransferStatus({ type: 'success', message: `Split request ${action}d!` });
            fetchDashboardData(); 
        } catch (err) {
            setTransferStatus({ type: 'error', message: "Failed to process request." });
        }
    };

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const clearFilters = () => {
        setFilters({ type: 'All', minAmount: '', maxAmount: '', startDate: '', endDate: '' });
    };

    const filteredTransactions = transactions.filter(trx => {
        const isMoneyOut = trx.SenderAccount === selectedAccount?.AccountNumber;
        const amt = parseFloat(trx.Amount);
        const trxDate = new Date(trx.FormattedDate || trx.TransactionDate);

        if (filters.type === 'In' && isMoneyOut) return false;
        if (filters.type === 'Out' && !isMoneyOut) return false;
        if (filters.minAmount && amt < parseFloat(filters.minAmount)) return false;
        if (filters.maxAmount && amt > parseFloat(filters.maxAmount)) return false;

        if (filters.startDate) {
            const start = new Date(filters.startDate);
            start.setHours(0, 0, 0, 0);
            if (trxDate < start) return false;
        }
        if (filters.endDate) {
            const end = new Date(filters.endDate);
            end.setHours(23, 59, 59, 999);
            if (trxDate > end) return false;
        }
        return true;
    });

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-slate-500">Decrypting Vault...</div>;

    const totalLiquidity = accounts.reduce((acc, curr) => acc + parseFloat(curr.Balance), 0);
    
    return (
        <div className="bg-[#f7f9ff] font-sans text-slate-900 flex overflow-hidden h-screen">
            <Sidebar />

            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <header className="w-full h-20 sticky top-0 z-40 bg-white/60 backdrop-blur-xl border-b border-slate-200/60 flex justify-end items-center px-8">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <button 
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors relative"
                            >
                                <Bell size={20} className="text-slate-600" />
                                {pendingRequests.length > 0 && (
                                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
                                )}
                            </button>

                            {showNotifications && (
                                <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 z-50">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Pending Requests</h4>
                                    {pendingRequests.length === 0 ? (
                                        <p className="text-sm text-slate-500 text-center py-4">No pending requests.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {pendingRequests.map(req => (
                                                <div key={req.RequestID} className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Divide size={16} className="text-purple-500"/>
                                                        <p className="text-sm font-bold text-slate-800">Split Bill Request</p>
                                                    </div>
                                                    <p className="text-xs text-slate-600 mb-3">
                                                        <span className="font-bold">{req.SenderName || req.SenderAcc}</span> is requesting Rs. {parseFloat(req.Amount).toLocaleString()} for a shared bill.
                                                    </p>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleRequestAction(req, 'Approve')} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2 rounded-lg transition-colors">
                                                            Pay Now
                                                        </button>
                                                        <button onClick={() => handleRequestAction(req, 'Reject')} className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold py-2 rounded-lg transition-colors">
                                                            Decline
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="h-6 w-px bg-slate-300"></div>
                        <p className="text-xs font-bold text-indigo-950 uppercase tracking-widest">{user.name}</p>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
                        <div>
                            <h2 className="font-serif text-4xl md:text-5xl text-indigo-950 font-bold tracking-tight">Good Morning, {user.name?.split(' ')[0]}</h2>
                            <p className="text-slate-500 mt-2 text-lg">Your private portfolio is active and secure.</p>
                        </div>
                        <div className="text-left md:text-right">
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-1">Total Liquidity</p>
                            <p className="font-serif text-3xl md:text-4xl text-slate-800 font-bold">Rs. {totalLiquidity.toLocaleString()}</p>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        <div className="col-span-12 lg:col-span-8 space-y-8">
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-serif text-2xl text-indigo-950 font-bold">Your Accounts</h3>
                                </div>
                                <div className="flex gap-6 overflow-x-auto pb-4 snap-x hide-scrollbar">
                                    {accounts.map((acc) => {
                                        const isSelected = selectedAccount?.AccountNumber === acc.AccountNumber;
                                        const isSavings = acc.AccountType === 'Savings';
                                        return (
                                            <div 
                                                key={acc.AccountNumber}
                                                onClick={() => { setSelectedAccount(acc); setTransferStatus({ type: '', message: '' }); }}
                                                className={`min-w-[340px] h-[200px] rounded-2xl p-7 relative overflow-hidden cursor-pointer snap-start transition-all duration-300 border ${
                                                    isSelected 
                                                    ? 'bg-gradient-to-br from-[#1a1a2e] to-[#2a2a4a] text-white border-transparent shadow-xl ring-4 ring-emerald-500/20 scale-[1.02]' 
                                                    : 'bg-white text-slate-800 border-slate-200 shadow-sm hover:shadow-md'
                                                }`}
                                            >
                                                {isSelected && <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl"></div>}
                                                <div className="relative z-10 h-full flex flex-col justify-between">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className={`text-[10px] font-bold uppercase tracking-widest ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                                                                {acc.AccountType} Account
                                                            </p>
                                                            <p className={`text-lg font-serif italic mt-0.5 ${isSelected ? 'text-white' : 'text-indigo-900'}`}>
                                                                {isSavings ? 'Strategic Growth' : 'Everyday Banking'}
                                                            </p>
                                                        </div>
                                                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-100 text-slate-500'}`}>
                                                            {isSavings ? <TrendingUp size={20}/> : <ShieldCheck size={20}/>}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-3xl font-serif font-bold">Rs. {parseFloat(acc.Balance || 0).toLocaleString()}</p>
                                                        <p className={`text-xs mt-2 font-mono tracking-widest ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                                                            {acc.AccountNumber.replace('PK-FIN-', '•••• ')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            <section>
                                <div className="flex items-center justify-between mb-4 mt-1">
                                    <h3 className="font-serif text-2xl text-indigo-950 font-bold">Ledger History</h3>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setShowFilters(!showFilters)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${showFilters ? 'bg-indigo-950 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                                        >
                                            <Filter size={16} /> Filter
                                        </button>
                                        <button 
                                            onClick={handleDownloadStatement}
                                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors"
                                        >
                                            <Download size={16} /> PDF Statement
                                        </button>
                                    </div>
                                </div>

                                {showFilters && (
                                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/60 mb-4 animate-in slide-in-from-top-2">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Filter Transactions</h4>
                                            <button onClick={clearFilters} className="text-[10px] text-red-500 font-bold hover:underline">Clear All</button>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 block mb-1">TYPE</label>
                                                <select name="type" value={filters.type} onChange={handleFilterChange} className="w-full text-sm p-2.5 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 bg-slate-50 text-slate-700 font-bold">
                                                    <option value="All">All Transactions</option>
                                                    <option value="In">Money In (+)</option>
                                                    <option value="Out">Money Out (-)</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 block mb-1">AMOUNT RANGE (PKR)</label>
                                                <div className="flex gap-2">
                                                    <input type="number" name="minAmount" placeholder="Min" value={filters.minAmount} onChange={handleFilterChange} onKeyDown={blockInvalidChars} className="w-full text-sm p-2.5 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 bg-slate-50 font-bold" />
                                                    <input type="number" name="maxAmount" placeholder="Max" value={filters.maxAmount} onChange={handleFilterChange} onKeyDown={blockInvalidChars} className="w-full text-sm p-2.5 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 bg-slate-50 font-bold" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 block mb-1">DATE RANGE</label>
                                                <div className="flex gap-2">
                                                    <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="w-full text-xs p-2.5 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 bg-slate-50 text-slate-600 font-bold" />
                                                    <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="w-full text-xs p-2.5 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 bg-slate-50 text-slate-600 font-bold" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
                                    <div className="space-y-2">
                                        {filteredTransactions.length > 0 ? filteredTransactions.map((trx) => {
                                            const isMoneyOut = trx.SenderAccount === selectedAccount?.AccountNumber;
                                            return (
                                                <div key={trx.TransactionID} className="flex items-center justify-between p-4 hover:bg-[#f8fafc] rounded-xl transition-colors border border-transparent hover:border-slate-100">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isMoneyOut ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                            {isMoneyOut ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-slate-900">{isMoneyOut ? 'Funds Transferred' : 'Funds Received'}</p>
                                                            <p className="text-xs text-slate-500 mt-0.5">{isMoneyOut ? `To: ${trx.ReceiverAccount}` : `From: ${trx.SenderAccount}`} • {new Date(trx.FormattedDate || trx.TransactionDate).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`font-bold text-lg ${isMoneyOut ? 'text-slate-900' : 'text-emerald-600'}`}>
                                                            {isMoneyOut ? '-' : '+'}Rs. {parseFloat(trx.Amount).toLocaleString()}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Completed</p>
                                                    </div>
                                                </div>
                                            );
                                        }) : (
                                            <div className="text-center py-12 text-slate-400 font-medium">
                                                {transactions.length === 0 ? "Ledger is currently empty." : "No transactions match your filters."}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </div>

                        <aside className="col-span-12 lg:col-span-4 space-y-8">
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                                    <h4 className="font-serif text-xl text-indigo-950 font-bold">Secure Transfer</h4>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded">Quick Action</span>
                                </div>

                                <div className="mb-6">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quick Contacts</label>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setShowSplitModal(!showSplitModal)} 
                                                className={`text-xs px-3 py-1 rounded-full font-bold transition flex items-center gap-1 ${showSplitModal ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                            >
                                                <Divide size={12}/> Split
                                            </button>
                                            
                                            <Link to="/contacts" className="text-xs px-3 py-1 rounded-full font-bold transition flex items-center gap-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100">
                                                Manage <ArrowRight size={12}/>
                                            </Link>
                                        </div>
                                    </div>

                                    {showSplitModal && (
                                        <form onSubmit={handleSplitBillSubmit} className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mb-6 shadow-inner">
                                            <h5 className="text-sm font-bold text-indigo-950 mb-3 flex items-center gap-2">
                                                <Divide size={16} className="text-indigo-600"/> Smart Bill Splitter
                                            </h5>
                                            <input 
                                                type="number" placeholder="Total Bill Amount (Rs.)" required min="1"
                                                value={splitBillTotal} 
                                                onKeyDown={blockInvalidChars}
                                                onChange={e => setSplitBillTotal(e.target.value)} 
                                                className="w-full text-sm p-3 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 font-bold mb-3" 
                                            />
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Select Friends:</p>
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {beneficiaries.map(ben => (
                                                    <div 
                                                        key={ben.BeneficiaryID}
                                                        onClick={() => toggleFriendSelection(ben.BeneficiaryAccountNumber)}
                                                        className={`cursor-pointer px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                                            selectedFriends.includes(ben.BeneficiaryAccountNumber) 
                                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                                                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                                                        }`}
                                                    >
                                                        {ben.Nickname}
                                                    </div>
                                                ))}
                                            </div>
                                            <button type="submit" disabled={isSplitting || selectedFriends.length === 0} className="w-full bg-indigo-950 text-white text-sm font-bold py-3 rounded-lg hover:bg-indigo-900 disabled:opacity-50 transition-all">
                                                {isSplitting ? 'Processing...' : 'Send Request'}
                                            </button>
                                        </form>
                                    )}

                                    <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                                        {beneficiaries.length > 0 ? beneficiaries.map(ben => (
                                            <div 
                                                key={ben.BeneficiaryID} 
                                                onClick={() => {
                                                    const digits = ben.BeneficiaryAccountNumber.replace('PK-FIN-', '');
                                                    setTransferData({ ...transferData, receiverAccount: digits });
                                                }}
                                                className={`flex flex-col items-center gap-1 cursor-pointer group min-w-[60px] ${transferData.receiverAccount === ben.BeneficiaryAccountNumber.replace('PK-FIN-', '') ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                                            >
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${transferData.receiverAccount === ben.BeneficiaryAccountNumber.replace('PK-FIN-', '') ? 'bg-emerald-500 text-white shadow-md ring-2 ring-emerald-500 ring-offset-2' : 'bg-indigo-50 text-indigo-900 group-hover:bg-indigo-100'}`}>
                                                    {ben.Nickname.charAt(0).toUpperCase()}
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-600 truncate w-full text-center">{ben.Nickname}</p>
                                            </div>
                                        )) : (
                                            <div className="text-xs text-slate-400 italic">No contacts.</div>
                                        )}
                                    </div>
                                </div>

                                {transferStatus.message && (
                                    <div className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 mb-6 ${transferStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                        {transferStatus.type === 'success' ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
                                        {transferStatus.message}
                                    </div>
                                )}

                                <form onSubmit={handleTransferSubmit} className="space-y-5">
                                   <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Recipient Account</label>
                                        <div className="flex items-center w-full bg-[#f8fafc] border border-slate-200 rounded-lg px-4 focus-within:border-emerald-500 transition-all overflow-hidden">
                                            <span className="text-sm font-mono font-bold text-slate-400 select-none whitespace-nowrap flex-shrink-0">PK-FIN-</span>
                                            <input 
                                                type="text" name="receiverAccount" required
                                                value={transferData.receiverAccount} 
                                                onKeyDown={blockInvalidChars}
                                                onChange={handleTransferChange}
                                                placeholder="XXXX" 
                                                className="w-full bg-transparent py-3 px-1 text-sm font-mono font-bold outline-none text-slate-900" 
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Amount (PKR)</label>
                                        <input 
                                            type="number" name="amount" min="1" required
                                            value={transferData.amount} 
                                            onKeyDown={blockInvalidChars}
                                            onChange={handleTransferChange}
                                            placeholder="0" 
                                            className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg py-3 px-4 text-lg font-bold text-slate-900 outline-none focus:border-emerald-500 transition-all" 
                                        />
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-end mb-2">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Security PIN</label>
                                            <Lock size={12} className="text-slate-300"/>
                                        </div>
                                        <div className="flex gap-2">
                                            {[0, 1, 2, 3].map((index) => (
                                                <input
                                                    key={index} ref={pinRefs[index]} type="password" maxLength="1"
                                                    value={pin[index]} 
                                                    onKeyDown={(e) => {
                                                        blockInvalidChars(e);
                                                        handlePinKeyDown(index, e);
                                                    }}
                                                    onChange={(e) => handlePinChange(index, e.target.value)} 
                                                    className="w-full h-12 bg-white border border-slate-200 rounded-lg text-center text-xl font-bold text-indigo-950 outline-none focus:border-emerald-500 shadow-sm"
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <button type="submit" disabled={isTransferring} className="w-full mt-2 py-3.5 rounded-lg bg-indigo-950 hover:bg-indigo-900 text-white text-sm font-bold shadow-lg transition-all flex justify-center items-center gap-2">
                                        {isTransferring ? 'Authorizing...' : <><Send size={16} /> Execute Transfer</>}
                                    </button>
                                </form>
                            </div>
                        </aside>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default CustomerDashboard;