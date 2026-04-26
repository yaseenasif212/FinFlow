// client/src/components/Floatingcards.jsx
import React from 'react';
import { CreditCard, TrendingUp, DollarSign } from 'lucide-react';
import '../styles/login.css'; 

const Floatingcards = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {/* Top Right Card */}
            <div className="absolute top-24 right-12 glass-card rounded-2xl p-5 w-56 text-white animate-float-1">
                <div className="flex items-center justify-between mb-6">
                    <div className="bg-white/20 p-2 rounded-xl"><CreditCard size={20} className="text-blue-100" /></div>
                    <span className="text-xs font-semibold tracking-wider opacity-90 uppercase">Platinum</span>
                </div>
                <p className="text-xs opacity-80 mb-1">Available Balance</p>
                <p className="text-2xl font-bold tracking-tight">$24,500.00</p>
            </div>

            {/* Bottom Left Card */}
            <div className="absolute bottom-32 left-12 glass-card rounded-2xl p-5 w-64 text-white animate-float-2">
                <div className="flex items-center gap-4">
                    <div className="bg-green-400/20 p-3 rounded-xl text-green-300">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="text-xs opacity-80 mb-0.5">Monthly Portfolio Yield</p>
                        <p className="text-lg font-bold text-green-300">+ 8.4% <span className="text-sm font-normal text-white opacity-70 ml-1">($1,240)</span></p>
                    </div>
                </div>
            </div>

            {/* Middle Abstract Element */}
            <div className="absolute top-1/2 right-1/3 transform -translate-y-1/2 glass-card rounded-full p-6 text-white animate-float-3">
                <DollarSign size={40} className="opacity-80" />
            </div>
        </div>
    );
};

export default Floatingcards;