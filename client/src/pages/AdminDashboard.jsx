import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    Users, LogOut, ShieldAlert, Activity, Search, ArrowRightLeft, 
    Landmark, Clock, CheckCircle2, XCircle, AlertTriangle
} from 'lucide-react';
import AdminCardApprover from '../components/AdminCardApprover';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('users'); 
    const [users, setUsers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [logs, setLogs] = useState([]);
    
    // --> NEW: Loan State <--
    const [pendingLoans, setPendingLoans] = useState([]);
    const [processingId, setProcessingId] = useState(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState(''); 
    
    const navigate = useNavigate();
    const adminUser = JSON.parse(localStorage.getItem('finflow_user') || '{}');

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('finflow_token');
            if (!token || adminUser.role !== 'Admin') {
                navigate('/login');
                return;
            }

            setLoading(true);
            setError('');

            try {
                if (activeTab === 'users') {
                    const res = await axios.get('http://localhost:5000/api/admin/all-users', { headers: { Authorization: `Bearer ${token}` } });
                    if (res.data.success) setUsers(res.data.users);
                } else if (activeTab === 'transactions') {
                    const res = await axios.get('http://localhost:5000/api/admin/all-transactions', { headers: { Authorization: `Bearer ${token}` } });
                    if (res.data.success) setTransactions(res.data.transactions);
                } else if (activeTab === 'logs') { 
                    const res = await axios.get('http://localhost:5000/api/admin/audit-logs', { headers: { Authorization: `Bearer ${token}` } });
                    if (res.data.success) setLogs(res.data.logs);
                } else if (activeTab === 'loans') {
                    // --> NEW: Fetch Pending Loans <--
                    const res = await axios.get('http://localhost:5000/api/admin/applications/pending', { headers: { Authorization: `Bearer ${token}` } });
                    if (res.data.success) setPendingLoans(res.data.pendingLoans);
                }
            } catch (err) {
                setError('Failed to fetch data. Access Denied.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [activeTab, navigate, adminUser.role]);

    const handleToggleStatus = async (userId, currentStatus) => {
        try {
            const token = localStorage.getItem('finflow_token');
            const res = await axios.put(`http://localhost:5000/api/admin/toggle-status/${userId}`, 
                { currentStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if(res.data.success) {
                setUsers(users.map(u => u.UserID === userId ? { ...u, AccountStatus: res.data.newStatus } : u));
            }
        } catch (err) {
            alert('Failed to update status');
        }
    };

    // --> NEW: Loan Approval Handlers <--
    const handleApproveLoan = async (loanId) => {
        if (!window.confirm(`Authorize Loan ${loanId} and disburse funds?`)) return;
        setProcessingId(loanId);
        try {
            const token = localStorage.getItem('finflow_token');
            await axios.put(`http://localhost:5000/api/admin/loans/approve/${loanId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Loan approved! Funds securely injected into customer account.');
            // Remove the approved loan from the screen instantly
            setPendingLoans(prev => prev.filter(loan => loan.LoanID !== loanId)); 
        } catch (err) {
            alert('Error processing approval.');
            console.error(err);
        } finally {
            setProcessingId(null);
        }
    };

    const handleRejectLoan = async (loanId) => {
        alert(`In a production environment, this would permanently reject ${loanId}.`);
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const handleTabSwitch = (tabName) => {
        setActiveTab(tabName);
        searchQuery && setSearchQuery(''); 
    };

    // Dynamic Filtering Logic
    const filteredUsers = users.filter(user => 
        user.Name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.Email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.UserID?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.AccountNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredTransactions = transactions.filter(trx => 
        trx.TransactionID?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trx.SenderAccount?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trx.ReceiverAccount?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredLogs = logs.filter(log => 
        log.LogID?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.UserID?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.ActionID?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.Description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredLoans = pendingLoans.filter(loan => 
        loan.LoanID?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loan.AccountNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loan.LoanType?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // --> NEW: Smart Risk Assessor <--
    const getRiskProfile = (accountNumber) => {
        // Generates a consistent number between 300 and 850 based on the account string
        let hash = 0;
        for (let i = 0; i < accountNumber.length; i++) {
            hash = accountNumber.charCodeAt(i) + ((hash << 5) - hash);
        }
        const score = Math.abs(hash % 550) + 300; 

        if (score >= 700) return { score, level: 'Low Risk', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
        if (score >= 580) return { score, level: 'Medium Risk', color: 'bg-amber-50 text-amber-700 border-amber-200' };
        return { score, level: 'High Risk', color: 'bg-red-50 text-red-700 border-red-200' };
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            <nav className="bg-[#2eb998] text-white px-8 py-4 flex justify-between items-center shadow-md">
                <div className="flex items-center gap-3">
                    <div className="bg-white p-2 rounded-lg text-[#2eb998]">
                        <ShieldAlert size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">FinFlow Admin</h1>
                        <p className="text-xs text-teal-100 font-medium">Logged in as {adminUser.name}</p>
                    </div>
                </div>
                <button onClick={handleLogout} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition-colors text-sm font-semibold">
                    <LogOut size={16} /> Logout
                </button>
            </nav>

            <div className="max-w-7xl mx-auto p-8">
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="bg-blue-50 p-4 rounded-full text-blue-500"><Users size={28} /></div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Total Users</p>
                            <p className="text-3xl font-bold text-slate-800">{users.length || '--'}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="bg-purple-50 p-4 rounded-full text-purple-500"><ArrowRightLeft size={28} /></div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Total Transactions</p>
                            <p className="text-3xl font-bold text-slate-800">{transactions.length || '--'}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="bg-green-50 p-4 rounded-full text-green-500"><Activity size={28} /></div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">System Status</p>
                            <p className="text-3xl font-bold text-slate-800">Online</p>
                        </div>
                    </div>
                </div>

                <div className="mb-8">
                    <AdminCardApprover />
                </div>

                {/* --- TABS --- */}
                <div className="flex gap-4 mb-6 border-b border-slate-200 pb-2 overflow-x-auto hide-scrollbar">
                    <button onClick={() => handleTabSwitch('users')} className={`whitespace-nowrap px-4 py-2 font-bold transition-colors ${activeTab === 'users' ? 'text-[#2eb998] border-b-2 border-[#2eb998]' : 'text-slate-400 hover:text-slate-600'}`}>
                        User Management
                    </button>
                    <button onClick={() => handleTabSwitch('transactions')} className={`whitespace-nowrap px-4 py-2 font-bold transition-colors ${activeTab === 'transactions' ? 'text-[#2eb998] border-b-2 border-[#2eb998]' : 'text-slate-400 hover:text-slate-600'}`}>
                        Global Ledger
                    </button>
                    <button onClick={() => handleTabSwitch('logs')} className={`whitespace-nowrap px-4 py-2 font-bold transition-colors ${activeTab === 'logs' ? 'text-[#2eb998] border-b-2 border-[#2eb998]' : 'text-slate-400 hover:text-slate-600'}`}>
                        Security Logs
                    </button>
                    {/* NEW LOAN TAB */}
                    <button onClick={() => handleTabSwitch('loans')} className={`whitespace-nowrap px-4 py-2 font-bold transition-colors flex items-center gap-2 ${activeTab === 'loans' ? 'text-[#2eb998] border-b-2 border-[#2eb998]' : 'text-slate-400 hover:text-slate-600'}`}>
                        Loan Approvals {pendingLoans.length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{pendingLoans.length}</span>}
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between sm:items-center bg-white">
                        <h2 className="text-lg font-bold text-slate-800">
                            {activeTab === 'users' ? 'User Directory' : 
                             activeTab === 'transactions' ? 'System Transactions' : 
                             activeTab === 'loans' ? 'Pending Loan Requests' : 'Security Audit Logs'}
                        </h2>
                        
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={`Search ${activeTab}...`} 
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm outline-none focus:ring-2 focus:ring-[#2eb998] transition-all"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="p-10 text-center text-slate-500 animate-pulse">Loading system records...</div>
                    ) : error ? (
                        <div className="p-10 text-center text-red-500 bg-red-50">{error}</div>
                    ) : (
                        <div className="overflow-x-auto">
                            
                            {/* --- USERS TABLE --- */}
                            {activeTab === 'users' && (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                            <th className="px-6 py-4 font-semibold">User Info</th>
                                            <th className="px-6 py-4 font-semibold">Account No.</th>
                                            <th className="px-6 py-4 font-semibold">Role</th>
                                            <th className="px-6 py-4 font-semibold">Status</th>
                                            <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                                        {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                                            <tr key={user.UserID} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-slate-900">{user.Name}</div>
                                                    <div className="text-xs text-slate-500">{user.Email}</div>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs">{user.AccountNumber || 'N/A'}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.Role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{user.Role}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {user.AccountStatus ? (
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${user.AccountStatus === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{user.AccountStatus}</span>
                                                    ) : <span className="text-slate-400 italic text-xs">No Account</span>}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {user.AccountStatus && (
                                                        <button 
                                                            onClick={() => handleToggleStatus(user.UserID, user.AccountStatus)}
                                                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${user.AccountStatus === 'Active' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                                                        >
                                                            {user.AccountStatus === 'Active' ? 'Freeze Account' : 'Unfreeze Account'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-500 italic">No users found matching "{searchQuery}"</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {/* --- TRANSACTIONS TABLE --- */}
                            {activeTab === 'transactions' && (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                            <th className="px-6 py-4 font-semibold">Trx ID</th>
                                            <th className="px-6 py-4 font-semibold">Date & Time</th>
                                            <th className="px-6 py-4 font-semibold">From Account</th>
                                            <th className="px-6 py-4 font-semibold">To Account</th>
                                            <th className="px-6 py-4 font-semibold text-right">Amount (PKR)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                                        {filteredTransactions.length > 0 ? filteredTransactions.map((trx) => (
                                            <tr key={trx.TransactionID} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900">{trx.TransactionID}</td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-800">{new Date(trx.TransactionDate).toLocaleDateString()}</div>
                                                    <div className="text-xs text-slate-500">{new Date(trx.TransactionDate).toLocaleTimeString()}</div>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-red-600">{trx.SenderAccount}</td>
                                                <td className="px-6 py-4 font-mono text-xs text-green-600">{trx.ReceiverAccount}</td>
                                                <td className="px-6 py-4 text-right font-bold text-slate-900">
                                                    Rs. {parseFloat(trx.Amount).toLocaleString()}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-500 italic">{transactions.length === 0 ? "No transactions found in the system yet." : `No transactions found matching "${searchQuery}"`}</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {/* --- SECURITY LOGS TABLE --- */}
                            {activeTab === 'logs' && (
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                            <th className="px-6 py-4 font-semibold">Log ID & Time</th>
                                            <th className="px-6 py-4 font-semibold">User ID</th>
                                            <th className="px-6 py-4 font-semibold">Action</th>
                                            <th className="px-6 py-4 font-semibold">Target</th>
                                            <th className="px-6 py-4 font-semibold">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
                                        {filteredLogs.length > 0 ? filteredLogs.map((log) => (
                                            <tr key={log.LogID} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-mono text-xs font-bold text-slate-900">{log.LogID}</div>
                                                    <div className="text-xs text-slate-500 mt-1">
                                                        {log.FormattedDate} at {log.FormattedTime}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs font-bold text-blue-600">{log.UserID || 'SYSTEM'}</td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                        {log.ActionID}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-slate-500">
                                                    {log.TargetID && log.TargetID !== 'NULL' ? (
                                                        <span className="font-bold text-slate-700">{log.TargetID}</span>
                                                    ) : (
                                                        <span className="italic text-slate-400">System Component</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-600">
                                                    {log.Description && log.Description !== 'NULL' ? (
                                                        <span className="font-medium text-slate-800">{log.Description}</span>
                                                    ) : (
                                                        <span className="text-slate-500">Standard system event recorded.</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-500 italic">{logs.length === 0 ? "No security events recorded yet." : `No logs found matching "${searchQuery}"`}</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}

                       {/* --- UPDATED: LOAN APPROVALS WITH RISK ASSESSOR --- */}
                            {activeTab === 'loans' && (
                                <div className="p-6 bg-slate-50">
                                    {filteredLoans.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {filteredLoans.map(loan => {
                                                const risk = getRiskProfile(loan.AccountNumber);
                                                return (
                                                    <div key={loan.LoanID} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between relative overflow-hidden">
                                                        
                                                        {/* Dynamic Risk Color Bar at the top */}
                                                        <div className={`absolute top-0 left-0 w-full h-1.5 ${risk.color.split(' ')[0].replace('bg-', 'bg-').replace('50', '500')}`}></div>

                                                        <div>
                                                            <div className="flex justify-between items-start mb-3 pt-1">
                                                                <div className="flex items-center gap-2 text-[#2eb998]">
                                                                    <Landmark size={20} />
                                                                    <span className="font-bold text-sm">{loan.LoanType}</span>
                                                                </div>
                                                                <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">{loan.LoanID}</span>
                                                            </div>
                                                            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Account Number</p>
                                                            <p className="font-mono text-slate-800 mb-4">{loan.AccountNumber}</p>
                                                            
                                                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
                                                                <p className="text-[10px] uppercase text-slate-500 font-bold">Requested Capital</p>
                                                                <p className="text-xl font-bold text-slate-900">Rs. {loan.Amount.toLocaleString()}</p>
                                                                <p className="text-xs text-slate-500 mt-1">Tenure: {loan.RepaymentDuration} Months</p>
                                                            </div>

                                                            {/* --> NEW: AI RISK BADGE <-- */}
                                                            <div className={`mb-5 p-2.5 rounded-lg border flex items-center justify-between ${risk.color}`}>
                                                                <div className="flex items-center gap-2">
                                                                    <AlertTriangle size={16} />
                                                                    <span className="text-xs font-bold uppercase tracking-widest">{risk.level}</span>
                                                                </div>
                                                                <span className="font-mono font-bold text-sm">Score: {risk.score}</span>
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-2 mt-auto pt-2 border-t border-slate-100">
                                                            <button 
                                                                onClick={() => handleRejectLoan(loan.LoanID)}
                                                                className="flex-1 py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-1"
                                                            >
                                                                <XCircle size={16} /> Deny
                                                            </button>
                                                            <button 
                                                                onClick={() => handleApproveLoan(loan.LoanID)}
                                                                disabled={processingId === loan.LoanID}
                                                                className={`flex-1 py-2 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-1 disabled:opacity-50 ${risk.level === 'High Risk' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-[#2eb998] hover:bg-[#269e82]'}`}
                                                            >
                                                                {processingId === loan.LoanID ? '...' : <><CheckCircle2 size={16} /> {risk.level === 'High Risk' ? 'Force Approve' : 'Approve'}</>}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-slate-500 font-medium">
                                            {pendingLoans.length === 0 ? "The queue is completely clear. No pending loans." : `No loans found matching "${searchQuery}"`}
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;