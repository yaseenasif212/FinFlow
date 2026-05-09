import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '', cnic: '', email: '', password: '', 
        phone: '', address: '', transactionPin: '', 
        accountType: 'Current'
    });
    
    // TOAST STATE
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    // Helper to show modern toast notifications
    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        let formattedValue = value;

        // CONSTRAINT: Name can ONLY contain alphabets and spaces (No numbers or special characters)
        if (name === 'name') {
            formattedValue = value.replace(/[^a-zA-Z\s]/g, '');
        }
        // CONSTRAINT: CNIC strictly numbers, no negatives, auto-formatted
        else if (name === 'cnic') {
            const rawDigits = value.replace(/\D/g, ''); // \D removes everything that isn't a 0-9 digit
            if (rawDigits.length <= 5) {
                formattedValue = rawDigits;
            } else if (rawDigits.length <= 12) {
                formattedValue = `${rawDigits.slice(0, 5)}-${rawDigits.slice(5)}`;
            } else {
                formattedValue = `${rawDigits.slice(0, 5)}-${rawDigits.slice(5, 12)}-${rawDigits.slice(12, 13)}`;
            }
        } 
        // CONSTRAINT: Phone strictly numbers, no negatives, auto-formatted
        else if (name === 'phone') {
            const rawDigits = value.replace(/\D/g, '');
            if (rawDigits.length <= 4) {
                formattedValue = rawDigits;
            } else {
                formattedValue = `${rawDigits.slice(0, 4)}-${rawDigits.slice(4, 11)}`;
            }
        }
        // CONSTRAINT: PIN strictly 4 numbers
        else if (name === 'transactionPin') {
            formattedValue = value.replace(/\D/g, '').slice(0, 4);
        }

        setFormData({ ...formData, [name]: formattedValue });
    };

    const handleRegister = async (e) => {
        e.preventDefault();

        // 1. Check for empty fields
        const requiredFields = ['name', 'cnic', 'email', 'password', 'phone', 'address', 'transactionPin'];
        for (let field of requiredFields) {
            if (!formData[field].trim()) {
                return showToast("Please fill out all required fields.", "error");
            }
        }

        // 2. Strict Email Regex Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            return showToast("Please enter a valid email format.", "error");
        }

        // 3. Password Length
        if (formData.password.length < 6) {
            return showToast("Password must be at least 6 characters long.", "error");
        }

        // 4. Exact Digit Length Constraints
        if (formData.cnic.length !== 15) {
            return showToast('CNIC must be exactly 13 digits.', 'error');
        }
        if (formData.phone.length !== 12) {
            return showToast('Phone number must be exactly 11 digits.', 'error');
        }
        if (formData.transactionPin.length !== 4) {
            return showToast('Transaction PIN must be exactly 4 digits.', 'error');
        }

        setIsLoading(true);

        try {
            const response = await axios.post('http://localhost:5000/api/auth/register', formData);
            if (response.data.success) {
                showToast('Account created successfully! Redirecting to login...', 'success');
                setTimeout(() => navigate('/login'), 2000); 
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Registration failed. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4 font-sans relative">
            
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

            <div className="max-w-[950px] w-full bg-white rounded-2xl shadow-xl flex flex-col md:flex-row overflow-hidden min-h-[600px]">
                
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

                        <form onSubmit={handleRegister} className="w-full space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <input
                                    type="text" name="name" placeholder="Full Name"
                                    value={formData.name} onChange={handleChange}
                                    className="w-full h-11 bg-[#f0f4f3] text-gray-700 px-5 rounded-full outline-none focus:ring-2 focus:ring-[#2eb998] text-sm font-medium"
                                />
                                <input
                                    type="text" name="cnic" placeholder="CNIC (e.g. 35201-1234567-1)"
                                    value={formData.cnic} onChange={handleChange}
                                    className="w-full h-11 bg-[#f0f4f3] text-gray-700 px-5 rounded-full outline-none focus:ring-2 focus:ring-[#2eb998] text-sm font-medium"
                                />
                            </div>

                            <input
                                type="email" name="email" placeholder="Email Address"
                                value={formData.email} onChange={handleChange}
                                className="w-full h-11 bg-[#f0f4f3] text-gray-700 px-5 rounded-full outline-none focus:ring-2 focus:ring-[#2eb998] text-sm font-medium"
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <input
                                    type="password" name="password" placeholder="Password"
                                    value={formData.password} onChange={handleChange}
                                    className="w-full h-11 bg-[#f0f4f3] text-gray-700 px-5 rounded-full outline-none focus:ring-2 focus:ring-[#2eb998] text-sm font-medium"
                                />
                                <input
                                    type="text" name="transactionPin" placeholder="4-Digit PIN"
                                    value={formData.transactionPin} onChange={handleChange}
                                    className="w-full h-11 bg-[#f0f4f3] text-gray-700 px-5 rounded-full outline-none focus:ring-2 focus:ring-[#2eb998] text-sm font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <input
                                    type="text" name="phone" placeholder="Phone (e.g. 0300-1234567)"
                                    value={formData.phone} onChange={handleChange}
                                    className="w-full h-11 bg-[#f0f4f3] text-gray-700 px-5 rounded-full outline-none focus:ring-2 focus:ring-[#2eb998] text-sm font-medium"
                                />
                                <input
                                    type="text" name="address" placeholder="City / Address"
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
                                    className="h-11 w-48 bg-[#2eb998] hover:bg-[#259b7d] text-white font-bold rounded-full transition-colors flex items-center justify-center disabled:opacity-70 text-sm tracking-wide shadow-md"
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