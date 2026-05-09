import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, UserPlus, Trash2, Landmark, Loader2 } from 'lucide-react';
import Sidebar from '../components/Sidebar';

const Beneficiaries = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('finflow_user') || '{}');
    
    const [accountNumber, setAccountNumber] = useState('');
    const [beneficiaries, setBeneficiaries] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Add Contact Form State
    const [isAdding, setIsAdding] = useState(false);
    const [newContact, setNewContact] = useState({ nickname: '', accountNumber: '' });

    const fetchData = useCallback(async () => {
        const token = localStorage.getItem('finflow_token');
        if (!token) return navigate('/login');

        try {
            // 1. Get primary account
            const dashRes = await axios.get('http://localhost:5000/api/customer/dashboard', { 
                headers: { Authorization: `Bearer ${token}` }
            });
            const accNum = dashRes.data.accounts[0]?.AccountNumber;
            setAccountNumber(accNum);

            // 2. Fetch contacts
            if (accNum) {
                const benRes = await axios.get(`http://localhost:5000/api/customer/beneficiaries/${accNum}`, { 
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (benRes.data.success) setBeneficiaries(benRes.data.beneficiaries);
            }
        } catch (err) {
            console.error("Failed to load contacts:", err);
        } finally {
            setIsLoading(false);
        }
    }, [navigate]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAddContact = async (e) => {
        e.preventDefault();
        setIsAdding(true);
        try {
            const token = localStorage.getItem('finflow_token');
            const res = await axios.post('http://localhost:5000/api/customer/beneficiaries/add', {
                ownerAccount: accountNumber,
                beneficiaryAccount: newContact.accountNumber,
                nickname: newContact.nickname
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            if (res.data.success) {
                setNewContact({ nickname: '', accountNumber: '' });
                fetchData(); // Refresh the list
                alert('Contact saved to your vault!');
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to add contact.');
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteContact = async (beneficiaryId) => {
        if (!window.confirm("Remove this contact from your saved list?")) return;
        try {
            const token = localStorage.getItem('finflow_token');
            await axios.delete(`http://localhost:5000/api/customer/beneficiaries/${beneficiaryId}`, { 
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData(); 
        } catch (err) {
            alert('Failed to remove contact.');
        }
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-slate-500">Loading Address Book...</div>;

    return (
        <div className="bg-[#f7f9ff] font-sans text-slate-900 flex overflow-hidden h-screen">
            <Sidebar />

            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <header className="w-full h-20 sticky top-0 z-40 bg-white/60 backdrop-blur-xl border-b border-slate-200/60 flex justify-end items-center px-8">
                    <p className="text-xs font-bold text-indigo-950 uppercase tracking-widest">{user.name}</p>
                </header>

                <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">
                    <h2 className="font-serif text-4xl text-indigo-950 font-bold tracking-tight mb-2">Address Book</h2>
                    <p className="text-slate-500 text-lg mb-8">Manage your saved contacts for instant transfers.</p>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        
                        {/* LEFT COLUMN: ADD CONTACT FORM */}
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
                                        <input 
                                            type="text" required placeholder="PK-FIN-XXXX"
                                            value={newContact.accountNumber} 
                                            onChange={(e) => setNewContact({...newContact, accountNumber: e.target.value})}
                                            className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg py-3 px-4 outline-none focus:border-indigo-500 font-bold text-slate-700 uppercase font-mono"
                                        />
                                    </div>
                                    <button type="submit" disabled={isAdding} className="w-full py-4 mt-2 bg-indigo-950 text-white rounded-lg font-bold text-sm shadow-xl hover:bg-indigo-900 transition-all flex items-center justify-center gap-2">
                                        {isAdding ? <Loader2 className="animate-spin" size={18}/> : 'Save to Address Book'}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: CONTACT GRID */}
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
                                                    onClick={() => handleDeleteContact(ben.BeneficiaryID)}
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