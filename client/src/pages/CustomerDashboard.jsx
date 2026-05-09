import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
    ShieldCheck, TrendingUp, ArrowUpRight, ArrowDownLeft, 
    CheckCircle2, AlertCircle, Send, Lock, Download, Users, Divide, ArrowRight
} from 'lucide-react';
import Sidebar from '../components/Sidebar'; 

const CustomerDashboard = () => {
    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [beneficiaries, setBeneficiaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Transfer Form States
    const [transferData, setTransferData] = useState({ receiverAccount: '', amount: '' });
    const [pin, setPin] = useState(['', '', '', '']); 
    const pinRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
    
    const [isTransferring, setIsTransferring] = useState(false);
    const [transferStatus, setTransferStatus] = useState({ type: '', message: '' });

    // Split Bill States
    const [showSplitModal, setShowSplitModal] = useState(false);
    const [splitBillTotal, setSplitBillTotal] = useState('');
    const [selectedFriends, setSelectedFriends] = useState([]);
    const [isSplitting, setIsSplitting] = useState(false);

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
                }
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load dashboard.');
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

    const handleTransferChange = (e) => {
        setTransferData({ ...transferData, [e.target.name]: e.target.value });
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
        
        if (!transferData.receiverAccount || !transferData.amount || fullPin.length < 4) {
            return setTransferStatus({ type: 'error', message: 'Please fill out all fields.' });
        }
        setIsTransferring(true);
        setTransferStatus({ type: '', message: '' });

        try {
            const token = localStorage.getItem('finflow_token');
            const res = await axios.post('http://localhost:5000/api/customer/transfer', {
                senderAccount: selectedAccount.AccountNumber,
                receiverAccount: transferData.receiverAccount,
                amount: transferData.amount,
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
        if (selectedFriends.length === 0 || !splitBillTotal) return alert("Select at least one friend and enter an amount.");
        
        setIsSplitting(true);
        try {
            const token = localStorage.getItem('finflow_token');
            const res = await axios.post('http://localhost:5000/api/customer/transfer/split', {
                payerAccount: selectedAccount.AccountNumber,
                totalAmount: parseFloat(splitBillTotal),
                participants: selectedFriends
            }, { headers: { Authorization: `Bearer ${token}` } });
    
            if (res.data.success) {
                alert(res.data.message);
                setShowSplitModal(false);
                setSplitBillTotal('');
                setSelectedFriends([]);
                fetchDashboardData(); 
            }
        } catch (err) {
            alert('Failed to split bill. Ensure all friends have sufficient balance.');
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
            alert("Error downloading statement.");
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-slate-500">Decrypting Vault...</div>;

    const totalLiquidity = accounts.reduce((acc, curr) => acc + parseFloat(curr.Balance), 0);
    
    return (
        <div className="bg-[#f7f9ff] font-sans text-slate-900 flex overflow-hidden h-screen">
            <Sidebar />

            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <header className="w-full h-20 sticky top-0 z-40 bg-white/60 backdrop-blur-xl border-b border-slate-200/60 flex justify-end items-center px-8">
                    <div className="flex items-center gap-4">
                        <div className="h-6 w-px bg-slate-300 mx-2"></div>
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
                        
                        {/* LEFT COLUMN: ACCOUNTS & LEDGER */}
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
                                    <button 
                                        onClick={handleDownloadStatement}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors"
                                    >
                                        <Download size={16} /> PDF Statement
                                    </button>
                                </div>
                                
                                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
                                    <div className="space-y-2">
                                        {transactions.length > 0 ? transactions.map((trx) => {
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
                                            <div className="text-center py-12 text-slate-400 font-medium">Ledger is currently empty.</div>
                                        )}
                                    </div>
                                </div>
                            </section>
                            
                        </div>

                        {/* RIGHT COLUMN: SECURE TRANSFER HUB & CONTACTS */}
                        <aside className="col-span-12 lg:col-span-4 space-y-8">
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60">
                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                                    <h4 className="font-serif text-xl text-indigo-950 font-bold">Secure Transfer</h4>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-100 px-2 py-1 rounded">Quick Action</span>
                                </div>

                                {/* ---> QUICK CONTACTS (BENEFICIARIES) UI <--- */}
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

                                    {/* SPLIT BILL MODAL/INTERFACE */}
                                    {showSplitModal && (
                                        <form onSubmit={handleSplitBillSubmit} className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mb-6 shadow-inner">
                                            <h5 className="text-sm font-bold text-indigo-950 mb-3 flex items-center gap-2">
                                                <Divide size={16} className="text-indigo-600"/> Smart Bill Splitter
                                            </h5>
                                            
                                            <input 
                                                type="number" placeholder="Total Bill Amount (Rs.)" required min="100"
                                                value={splitBillTotal} onChange={e => setSplitBillTotal(e.target.value)} 
                                                className="w-full text-sm p-3 rounded-lg border border-slate-200 outline-none focus:border-indigo-500 font-bold mb-3" 
                                            />

                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Select Friends to split with:</p>
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

                                            {splitBillTotal && selectedFriends.length > 0 && (
                                                <div className="bg-white p-3 rounded-lg border border-indigo-100 flex justify-between items-center mb-4">
                                                    <span className="text-xs font-bold text-slate-500">Each Person Pays:</span>
                                                    <span className="text-lg font-bold text-indigo-700">
                                                        Rs. {Math.round(splitBillTotal / (selectedFriends.length + 1)).toLocaleString()}
                                                    </span>
                                                </div>
                                            )}

                                            <button type="submit" disabled={isSplitting || selectedFriends.length === 0} className="w-full bg-indigo-950 text-white text-sm font-bold py-3 rounded-lg hover:bg-indigo-900 disabled:opacity-50 transition-all">
                                                {isSplitting ? 'Processing Batch...' : 'Execute Split Transaction'}
                                            </button>
                                        </form>
                                    )}

                                    <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                                        {beneficiaries.length > 0 ? beneficiaries.map(ben => (
                                            <div 
                                                key={ben.BeneficiaryID} 
                                                onClick={() => setTransferData({ ...transferData, receiverAccount: ben.BeneficiaryAccountNumber })}
                                                className={`flex flex-col items-center gap-1 cursor-pointer group min-w-[60px] ${transferData.receiverAccount === ben.BeneficiaryAccountNumber ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
                                            >
                                                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg transition-all ${transferData.receiverAccount === ben.BeneficiaryAccountNumber ? 'bg-emerald-500 text-white shadow-md ring-2 ring-emerald-500 ring-offset-2' : 'bg-indigo-50 text-indigo-900 group-hover:bg-indigo-100'}`}>
                                                    {ben.Nickname.charAt(0).toUpperCase()}
                                                </div>
                                                <p className="text-[10px] font-bold text-slate-600 truncate w-full text-center">{ben.Nickname}</p>
                                            </div>
                                        )) : (
                                            <div className="text-xs text-slate-400 italic">No contacts saved yet.</div>
                                        )}
                                    </div>
                                </div>
                                {/* --------------------------------------- */}

                                {transferStatus.message && (
                                    <div className={`p-3 rounded-lg text-xs font-bold flex items-center gap-2 mb-6 ${transferStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                        {transferStatus.type === 'success' ? <CheckCircle2 size={16}/> : <AlertCircle size={16}/>}
                                        {transferStatus.message}
                                    </div>
                                )}

                                <form onSubmit={handleTransferSubmit} className="space-y-5">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Recipient Account</label>
                                        <input 
                                            type="text" name="receiverAccount" required
                                            value={transferData.receiverAccount} onChange={handleTransferChange}
                                            placeholder="PK-FIN-XXXX" 
                                            className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg py-3 px-4 text-sm font-mono font-bold outline-none focus:border-emerald-500 transition-all uppercase" 
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Amount (PKR)</label>
                                        <input 
                                            type="number" name="amount" min="1" required
                                            value={transferData.amount} onChange={handleTransferChange}
                                            placeholder="0.00" 
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
                                                    value={pin[index]} onChange={(e) => handlePinChange(index, e.target.value)} onKeyDown={(e) => handlePinKeyDown(index, e)}
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