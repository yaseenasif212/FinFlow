import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, LogOut, ShieldAlert, Activity, Search, ArrowRightLeft } from 'lucide-react';
import AdminCardApprover from '../components/AdminCardApprover';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('users'); 
    const [users, setUsers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // --> NEW: Search State <--
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

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    // --> NEW: Tab Switcher that clears the search bar <--
    const handleTabSwitch = (tabName) => {
        setActiveTab(tabName);
        setSearchQuery(''); // Clear search when switching tabs
    };

    // --> NEW: Dynamic Filtering Logic <--
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
                            <p className="text-3xl font-bold text-slate-800">{users.length}</p>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="bg-purple-50 p-4 rounded-full text-purple-500"><ArrowRightLeft size={28} /></div>
                        <div>
                            <p className="text-sm text-slate-500 font-medium">Total Transactions</p>
                            <p className="text-3xl font-bold text-slate-800">{transactions.length}</p>
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

                {/* --- NEW: ADMIN CARD APPROVER PLACED HERE --- */}
                <div className="mb-8">
                    <AdminCardApprover />
                </div>
                {/* ------------------------------------------- */}

                <div className="flex gap-4 mb-6 border-b border-slate-200 pb-2">
                    <button onClick={() => handleTabSwitch('users')} className={`px-4 py-2 font-bold transition-colors ${activeTab === 'users' ? 'text-[#2eb998] border-b-2 border-[#2eb998]' : 'text-slate-400 hover:text-slate-600'}`}>
                        User Management
                    </button>
                    <button onClick={() => handleTabSwitch('transactions')} className={`px-4 py-2 font-bold transition-colors ${activeTab === 'transactions' ? 'text-[#2eb998] border-b-2 border-[#2eb998]' : 'text-slate-400 hover:text-slate-600'}`}>
                        Global Ledger
                    </button>
                    <button onClick={() => handleTabSwitch('logs')} className={`px-4 py-2 font-bold transition-colors ${activeTab === 'logs' ? 'text-[#2eb998] border-b-2 border-[#2eb998]' : 'text-slate-400 hover:text-slate-600'}`}>
                        Security Logs
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between sm:items-center bg-white">
                        <h2 className="text-lg font-bold text-slate-800">
                            {activeTab === 'users' ? 'User Directory' : activeTab === 'transactions' ? 'System Transactions' : 'Security Audit Logs'}
                        </h2>
                        
                        {/* --> NEW: Search Input wired to State <-- */}
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
                                                <td className="px-6 py-4 font-mono text-xs font-bold text-blue-600">
                                                    {log.UserID || 'SYSTEM'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                                        {log.ActionID}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs text-slate-500">
                                                    {log.TargetID && log.TargetID !== 'NULL' ? (
                                                        <span className="font-bold text-slate-700">{log.TargetID}</span>
                                                    ) : (
                                                        <span className="italic text-slate-400">
                                                            {log.ActionID === 'ACT-01' ? 'Auth System' : log.ActionID === 'ACT-02' ? 'User Dashboard' : log.ActionID === 'ACT-03' ? 'Login Portal' : 'System Component'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-xs text-slate-600">
                                                    {log.Description && log.Description !== 'NULL' ? (
                                                        <span className="font-medium text-slate-800">{log.Description}</span>
                                                    ) : (
                                                        <span className="text-slate-500">
                                                            {log.ActionID === 'ACT-01' ? 'User authenticated and logged in successfully.' : log.ActionID === 'ACT-02' ? 'User accessed secure account data.' : log.ActionID === 'ACT-03' ? 'Failed login attempt detected.' : 'Standard system event recorded.'}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-500 italic">{logs.length === 0 ? "No security events recorded yet." : `No logs found matching "${searchQuery}"`}</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                            
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;