import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CreditCard, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const AdminCardApprover = () => {
    const [pendingApps, setPendingApps] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    const fetchPendingApps = async () => {
        try {
            const token = localStorage.getItem('finflow_token');
            const res = await axios.get('http://localhost:5000/api/admin/cards/pending', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setPendingApps(res.data.applications);
            }
        } catch (err) {
            console.error("Failed to fetch applications", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingApps();
    }, []);

    const handleAction = async (applicationId, accountNumber, creditLimit, action) => {
        setProcessingId(applicationId);
        try {
            const token = localStorage.getItem('finflow_token');
            const endpoint = action === 'approve' 
                ? 'http://localhost:5000/api/admin/card/approve' 
                : 'http://localhost:5000/api/admin/card/reject';

            await axios.post(endpoint, {
                applicationId,
                accountNumber,
                approvedLimit: creditLimit // Using the limit they requested
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            alert(`Application ${action}d successfully!`);
            fetchPendingApps(); // Refresh the list
        } catch (err) {
            alert(`Failed to ${action} application.`);
        } finally {
            setProcessingId(null);
        }
    };

    if (isLoading) return <div className="p-6 text-slate-400">Loading pending requests...</div>;

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-serif text-xl text-indigo-950 font-bold mb-4 flex items-center gap-2">
                <CreditCard className="text-emerald-600" /> Pending Card Applications
            </h3>
            
            <div className="space-y-4">
                {pendingApps.map(app => (
                    <div key={app.ApplicationID} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                            <p className="font-bold text-slate-800">
                                Rs. {app.CreditLimit.toLocaleString()} <span className="text-xs font-normal text-slate-500">Tier: {app.DesiredTier}</span>
                            </p>
                            <p className="text-xs text-slate-500 mt-1">App ID: {app.ApplicationID} | Account: {app.AccountNumber}</p>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handleAction(app.ApplicationID, app.AccountNumber, app.CreditLimit, 'reject')}
                                disabled={processingId === app.ApplicationID}
                                className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                                title="Reject"
                            >
                                <XCircle size={24} />
                            </button>
                            <button 
                                onClick={() => handleAction(app.ApplicationID, app.AccountNumber, app.CreditLimit, 'approve')}
                                disabled={processingId === app.ApplicationID}
                                className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-lg transition"
                                title="Approve"
                            >
                                {processingId === app.ApplicationID ? <Loader2 className="animate-spin" size={24}/> : <CheckCircle size={24} />}
                            </button>
                        </div>
                    </div>
                ))}
                
                {pendingApps.length === 0 && (
                    <div className="text-center py-6 text-slate-400 text-sm">No pending applications at this time.</div>
                )}
            </div>
        </div>
    );
};

export default AdminCardApprover;