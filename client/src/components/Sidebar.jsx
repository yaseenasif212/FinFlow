import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, CreditCard, Activity, Landmark, Users } from 'lucide-react';

const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation(); // This tells us which URL we are currently on
    const user = JSON.parse(localStorage.getItem('finflow_user') || '{}');

    const handleLogout = () => { 
        localStorage.clear(); 
        navigate('/login'); 


    };
    // At the top



const navItems = [
    { path: '/dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { path: '/cards', name: 'Virtual Cards', icon: CreditCard },
    { path: '/loans', name: 'Loans', icon: Landmark },
    { path: '/contacts', name: 'Contacts', icon: Users }, // <-- ADD THIS LINE
    { path: '/analytics', name: 'Analytics', icon: Activity },
];


    return (
        <aside className="hidden md:flex flex-col h-full py-8 px-4 bg-slate-50 w-64 border-r border-slate-200/60 shrink-0 z-20">
            <div className="mb-10 px-4">
                <h1 className="font-serif italic text-2xl text-indigo-950 font-bold tracking-tight">FinFlow.</h1>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Digital Vault</p>
            </div>
            
            <nav className="flex-1 space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                  
                    const isActive = location.pathname === item.path;
                    
                    return (
                        <button 
                            key={item.name}
                            onClick={() => navigate(item.path)} 
                            className={`w-full flex items-center gap-4 py-3 pl-4 text-left transition-colors font-bold ${
                                isActive 
                                ? 'text-emerald-600 border-r-4 border-emerald-500 bg-emerald-50/50' 
                                : 'text-slate-500 hover:text-indigo-950'
                            }`}
                        >
                            <Icon size={20} /> 
                            <span className="font-serif text-lg tracking-tight">{item.name}</span>
                        </button>
                    );
                })}
            </nav>

            <div className="mt-auto px-4">
                <button onClick={handleLogout} className="w-full py-3 rounded-full border-2 border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-100 transition-colors mb-6">
                    Secure Logout
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-900 text-white flex items-center justify-center font-bold text-lg uppercase">
                        {user.name?.charAt(0)}
                    </div>
                    <div>
                        <p className="text-sm font-bold text-indigo-950">{user.name?.split(' ')[0]}</p>
                        <p className="text-[10px] text-slate-400">Vault ID: #{user.id?.slice(-4)}</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;