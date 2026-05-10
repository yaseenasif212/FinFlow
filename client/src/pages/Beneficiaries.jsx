import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
    Users, UserPlus, Trash2, Landmark, Loader2, 
    CheckCircle2, AlertCircle, X, AlertTriangle
} from 'lucide-react';
import Sidebar from '../components/Sidebar';

const Beneficiaries = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('finflow_user') || '{}');
    
    const [accountNumber, setAccountNumber] = useState('');
    const [beneficiaries, setBeneficiaries] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    
   
    const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });
    
    
    const [isAdding, setIsAdding] = useState(false);
    const [newContact, setNewContact] = useState({ nickname: '', accountNumber: '' });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
    };

    const fetchData = useCallback(async () => {
        const token = localStorage.getItem('finflow_token');
        if (!token) return navigate('/login');

        try {
            const dashRes = await axios.get('http://localhost:5000/api/customer/dashboard', { 
                headers: { Authorization: `Bearer ${token}` }
            });
            const accNum = dashRes.data.accounts[0]?.AccountNumber;
            setAccountNumber(accNum);

            if (accNum) {
                const benRes = await axios.get(`http://localhost:5000/api/customer/beneficiaries/${accNum}`, { 
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (benRes.data.success) setBeneficiaries(benRes.data.beneficiaries);
            }
        } catch (err) {
            console.error("Failed to load contacts:", err);
            showToast("Failed to load address book data.", "error");
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAccountChange = (e) => {
        const val = e.target.value;
        if (!/^\d*$/.test(val) || val.length > 4) return;
        setNewContact({ ...newContact, accountNumber: val });
    };

    const handleAddContact = async (e) => {
        e.preventDefault();

        if (newContact.accountNumber.length !== 4) {
            return showToast("Account ID must be exactly 4 digits.", "error");
        }

        const fullNewAccount = `PK-FIN-${newContact.accountNumber}`;

        if (fullNewAccount === accountNumber) {
            return showToast("You cannot add your own account to the address book.", "error");
        }

        const isDuplicate = beneficiaries.some(
            (ben) => ben.BeneficiaryAccountNumber === fullNewAccount
        );

        if (isDuplicate) {
            return showToast("This user is already registered in your address book.", "error");
        }

        setIsAdding(true);
        try {
            const token = localStorage.getItem('finflow_token');
            const res = await axios.post('http://localhost:5000/api/customer/beneficiaries/add', {
                ownerAccount: accountNumber,
                beneficiaryAccount: fullNewAccount, 
                nickname: newContact.nickname
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            if (res.data.success) {
                setNewContact({ nickname: '', accountNumber: '' });
                fetchData(); 
                showToast("Contact successfully saved to your vault!");
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to add contact.', "error");
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteContact = async () => {
        const beneficiaryId = deleteConfirm.id;
        try {
            const token = localStorage.getItem('finflow_token');
            await axios.delete(`http://localhost:5000/api/customer/beneficiaries/${beneficiaryId}`, { 
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData(); 
            showToast("Contact removed successfully.");
        } catch (err) {
            showToast("Failed to remove contact.", "error");
        } finally {
            setDeleteConfirm({ show: false, id: null });
        }
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-slate-500">Loading Address Book...</div>;

    return (
        <div className="bg-[#f7f9ff] font-sans text-slate-900 flex overflow-hidden h-screen relative">
            <Sidebar />

            {/* TOAST NOTIFICATION */}
            {toast.show && (
                <div className={`fixed bottom-8 right-8 z-50 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl transition-all duration-300 text-white font-bold text-sm ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
                    {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                    {toast.message}
                    <button onClick={() => setToast({ show: false, message: '', type: 'success' })} className="ml-4 hover:opacity-75 transition-opacity">
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* MODERN CONFIRMATION MODAL (REPLACES ALERT) */}
            {deleteConfirm.show && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100">
                        <div className="flex items-center gap-3 text-amber-600 mb-4">
                            <AlertTriangle size={24} />
                            <h4 className="font-serif text-lg font-bold">Remove Contact?</h4>
                        </div>
                        <p className="text-slate-500 text-sm mb-6">Are you sure you want to remove this contact from your vault? This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm({ show: false, id: null })} className="flex-1 py-2.5 rounded-lg font-bold text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
                            <button onClick={handleDeleteContact} className="flex-1 py-2.5 rounded-lg font-bold text-xs text-white bg-red-500 hover:bg-red-600 transition-colors">Confirm Remove</button>
                        </div>
                    </div>
                </div>
            )}

            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <header className="w-full h-20 sticky top-0 z-40 bg-white/60 backdrop-blur-xl border-b border-slate-200/60 flex justify-end items-center px-8">
                    <p className="text-xs font-bold text-indigo-950 uppercase tracking-widest">{user.name}</p>
                </header>

                <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
                    <h2 className="font-serif text-4xl text-indigo-950 font-bold tracking-tight mb-2">Address Book</h2>
                    <p className="text-slate-500 text-lg mb-8">Manage your saved contacts for instant transfers.</p>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        <div className="col-span-12 lg:col-span-4">
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 sticky top-8">
                                <h3 className="font-serif text-xl text-indigo-950 font-bold mb-6 flex items-center gap-2">
                                    <UserPlus className="text-emerald-600" size={24}/> Add Contact
                                </h3>
                                <form onSubmit={handleAddContact} className="space-y-5">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Display Name / Nickname</label>
                                        <input 
                                            type="text" required placeholder="e.g. Talmeez"
                                            value={newContact.nickname} 
                                            onChange={(e) => setNewContact({...newContact, nickname: e.target.value})}
                                            className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg py-3 px-4 outline-none focus:border-indigo-500 font-bold text-slate-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">FinFlow Account Number</label>
                                        <div className="flex items-center w-full bg-[#f8fafc] border border-slate-200 rounded-lg px-4 focus-within:border-indigo-500 transition-all overflow-hidden">
                                            <span className="text-sm font-mono font-bold text-slate-400 select-none whitespace-nowrap flex-shrink-0">PK-FIN-</span>
                                            <input 
                                                type="text" required placeholder="XXXX" maxLength="4"
                                                value={newContact.accountNumber} 
                                                onChange={handleAccountChange}
                                                className="w-full bg-transparent py-3 px-1 text-sm font-mono font-bold outline-none text-slate-700 uppercase" 
                                            />
                                        </div>
                                    </div>
                                    <button type="submit" disabled={isAdding} className="w-full py-4 mt-2 bg-indigo-950 text-white rounded-lg font-bold text-sm shadow-xl hover:bg-indigo-900 transition-all flex items-center justify-center gap-2">
                                        {isAdding ? <Loader2 className="animate-spin" size={18}/> : 'Save to Address Book'}
                                    </button>
                                </form>
                            </div>
                        </div>

                        <div className="col-span-12 lg:col-span-8">
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/60 min-h-[400px]">
                                <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                                    <h3 className="font-serif text-xl text-indigo-950 font-bold flex items-center gap-2">
                                        <Users className="text-indigo-600" /> Saved Beneficiaries
                                    </h3>
                                    <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">{beneficiaries.length} Contacts</span>
                                </div>

                                {beneficiaries.length > 0 ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {beneficiaries.map(ben => (
                                            <div key={ben.BeneficiaryID} className="border border-slate-200 rounded-xl p-5 hover:border-indigo-200 transition-colors bg-[#f8fafc] flex items-center justify-between group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xl uppercase shadow-sm">
                                                        {ben.Nickname.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 text-lg">{ben.Nickname}</p>
                                                        <p className="text-xs font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                                                            <Landmark size={12}/> {ben.BeneficiaryAccountNumber}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => setDeleteConfirm({ show: true, id: ben.BeneficiaryID })}
                                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Remove Contact"
                                                >
                                                    <Trash2 size={18}/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                                        <Users size={48} className="mb-4 opacity-20" />
                                        <p>Your address book is empty.</p>
                                        <p className="text-sm mt-1">Add friends using the form on the left.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Beneficiaries;