import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AlertCircle, CheckCircle, ShieldCheck } from 'lucide-react';

const Register = () => {
 const [formData, setFormData] = useState({
        name: '', cnic: '', email: '', password: '', 
        phone: '', address: '', transactionPin: '', 
        accountType: 'Current' // <-- ADD THIS DEFAULT VALUE
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    // SMART INPUT HANDLER
    const handleChange = (e) => {
        const { name, value } = e.target;
        let formattedValue = value;

        if (name === 'cnic') {
            const rawDigits = value.replace(/\D/g, ''); 
            if (rawDigits.length <= 5) {
                formattedValue = rawDigits;
            } else if (rawDigits.length <= 12) {
                formattedValue = `${rawDigits.slice(0, 5)}-${rawDigits.slice(5)}`;
            } else {
                formattedValue = `${rawDigits.slice(0, 5)}-${rawDigits.slice(5, 12)}-${rawDigits.slice(12, 13)}`;
            }
        } 
        else if (name === 'phone') {
            // Auto-format phone to XXXX-XXXXXXX
            const rawDigits = value.replace(/\D/g, '');
            if (rawDigits.length <= 4) {
                formattedValue = rawDigits;
            } else {
                formattedValue = `${rawDigits.slice(0, 4)}-${rawDigits.slice(4, 11)}`;
            }
        }
        else if (name === 'transactionPin') {
            formattedValue = value.replace(/\D/g, '').slice(0, 4);
        }

        setFormData({ ...formData, [name]: formattedValue });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);

        // Strict Pre-Flight Checks
        if (formData.cnic.length !== 15) {
            setError('CNIC must be exactly 13 digits (formatted as XXXXX-XXXXXXX-X).');
            setIsLoading(false); return;
        }
        // Phone length is now 12 because of the dash (e.g., 0300-1234567)
        if (formData.phone && formData.phone.length !== 12) {
            setError('Phone number must be exactly 11 digits (formatted as XXXX-XXXXXXX).');
            setIsLoading(false); return;
        }
        if (formData.transactionPin.length !== 4) {
            setError('Transaction PIN must be exactly 4 digits.');
            setIsLoading(false); return;
        }

        try {
            const response = await axios.post('http://localhost:5000/api/auth/register', formData);
            if (response.data.success) {
                setSuccess('Account created successfully! Redirecting to login...');
                setTimeout(() => navigate('/login'), 2000); 
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4 font-sans">
            <div className="max-w-[950px] w-full bg-white rounded-2xl shadow-xl flex flex-col md:flex-row overflow-hidden min-h-[600px]">
                
                {/* Left Side: Welcome Back Promo */}
                <div className="w-full md:w-[40%] bg-gradient-to-br from-[#2eb998] to-[#259b7d] p-10 flex flex-col items-center justify-center text-center relative overflow-hidden order-2 md:order-1">
                    <div className="relative z-10 flex flex-col items-center w-full max-w-[260px]">
                        <h2 className="text-4xl font-extrabold text-white mb-5 tracking-tight">Welcome Back!</h2>
                        <p className="text-white/95 text-[15px] font-light mb-8 leading-relaxed">
                            To keep connected with us please login with your personal info.
                        </p>
                        <button 
                            type="button"
                            onClick={() => navigate('/login')}
                            className="h-11 w-40 bg-transparent border-2 border-white text-white font-bold rounded-full hover:bg-white hover:text-[#2eb998] transition-all flex items-center justify-center text-sm"
                        >
                            Sign In
                        </button>
                    </div>

                    <div className="absolute top-10 right-10 w-24 h-24 rounded-full border-[12px] border-white/10"></div>
                    <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-white/10 rounded-full"></div>
                </div>

                {/* Right Side: Registration Form */}
                <div className="w-full md:w-[60%] p-8 sm:p-12 flex flex-col relative order-1 md:order-2">
                    <div className="flex justify-end items-center gap-2 mb-4">
                        <span className="text-lg font-bold text-gray-700">FinFlow</span>
                        <div className="w-6 h-6 border-2 border-[#2eb998] rounded-sm flex items-center justify-center">
                            <div className="w-2 h-2 bg-[#2eb998] rounded-sm"></div>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col items-center w-full max-w-[420px] mx-auto">
                        <h1 className="text-3xl font-extrabold text-[#333] mb-6 text-center tracking-tight">
                            Create Account
                        </h1>

                        {error && (
                            <div className="w-full mb-4 bg-red-50 border border-red-100 p-2.5 rounded-lg flex items-center gap-2 text-xs text-red-600">
                                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                            </div>
                        )}
                        {success && (
                            <div className="w-full mb-4 bg-green-50 border border-green-100 p-2.5 rounded-lg flex items-center gap-2 text-xs text-green-700">
                                <CheckCircle className="w-4 h-4 shrink-0" /> {success}
                            </div>
                        )}

                        <form onSubmit={handleRegister} className="w-full space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <input
                                    type="text" name="name" required placeholder="Full Name"
                                    value={formData.name} onChange={handleChange}
                                    className="w-full h-11 bg-[#f0f4f3] text-gray-700 px-5 rounded-full outline-none focus:ring-2 focus:ring-[#2eb998] text-sm font-medium"
                                />
                                <input
                                    type="text" name="cnic" required placeholder="CNIC (e.g. 35201-1234567-1)"
                                    value={formData.cnic} onChange={handleChange}
                                    className="w-full h-11 bg-[#f0f4f3] text-gray-700 px-5 rounded-full outline-none focus:ring-2 focus:ring-[#2eb998] text-sm font-medium"
                                />
                            </div>

                            <input
                                type="email" name="email" required placeholder="Email Address"
                                value={formData.email} onChange={handleChange}
                                className="w-full h-11 bg-[#f0f4f3] text-gray-700 px-5 rounded-full outline-none focus:ring-2 focus:ring-[#2eb998] text-sm font-medium"
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <input
                                    type="password" name="password" required placeholder="Password"
                                    value={formData.password} onChange={handleChange}
                                    className="w-full h-11 bg-[#f0f4f3] text-gray-700 px-5 rounded-full outline-none focus:ring-2 focus:ring-[#2eb998] text-sm font-medium"
                                />
                                <input
                                    type="text" name="transactionPin" required placeholder="4-Digit PIN"
                                    value={formData.transactionPin} onChange={handleChange}
                                    className="w-full h-11 bg-[#f0f4f3] text-gray-700 px-5 rounded-full outline-none focus:ring-2 focus:ring-[#2eb998] text-sm font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <input
                                    type="text" name="phone" required placeholder="Phone Number (e.g. 0300-1234567)"
                                    value={formData.phone} onChange={handleChange}
                                    className="w-full h-11 bg-[#f0f4f3] text-gray-700 px-5 rounded-full outline-none focus:ring-2 focus:ring-[#2eb998] text-sm font-medium"
                                />
                                <input
                                    type="text" name="address" required placeholder="City / Address"
                                    value={formData.address} onChange={handleChange}
                                    className="w-full h-11 bg-[#f0f4f3] text-gray-700 px-5 rounded-full outline-none focus:ring-2 focus:ring-[#2eb998] text-sm font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <select 
                                    name="accountType" 
                                    value={formData.accountType} 
                                    onChange={handleChange}
                                    className="w-full h-11 bg-[#f0f4f3] text-gray-700 px-5 rounded-full outline-none focus:ring-2 focus:ring-[#2eb998] text-sm font-medium appearance-none cursor-pointer"
                                >
                                    <option value="Current">Current Account (Everyday banking)</option>
                                    <option value="Savings">Savings Account (Grow your wealth)</option>
                                </select>
                            </div>

                            <div className="pt-4 flex justify-center">
                                <button
                                    type="submit" disabled={isLoading}
                                    className="h-11 w-48 bg-[#2eb998] hover:bg-[#259b7d] text-white font-bold rounded-full transition-colors flex items-center justify-center disabled:opacity-70 text-sm tracking-wide"
                                >
                                    {isLoading ? 'Processing...' : 'Sign Up'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;