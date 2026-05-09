import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, AlertCircle, X, CheckCircle2 } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    // TOAST STATE
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

    const showToast = (message, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
    };

    const handleLogin = async (e) => {
        e.preventDefault();

        // --- STRICT CONSTRAINTS ---

        // 1. Empty Check
        if (!email.trim() || !password.trim()) {
            return showToast("Please fill in all fields.", "error");
        }

        // 2. Strict Email Regex Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return showToast("Please enter a valid email format.", "error");
        }

        // 3. Password Minimum Length Check
        if (password.length < 6) {
            return showToast("Invalid password length.", "error");
        }

        setIsLoading(true);

        try {
            const response = await axios.post('http://localhost:5000/api/auth/login', { email, password });

            if (response.data.success) {
                localStorage.setItem('finflow_token', response.data.token);
                localStorage.setItem('finflow_user', JSON.stringify(response.data.user));
                
                showToast("Login successful! Decrypting vault...", "success");
                
                setTimeout(() => {
                    if (response.data.user.role === 'Admin') {
                        navigate('/admin-dashboard');
                    } else {
                        navigate('/dashboard'); 
                    }
                }, 1000);
            }
                
        } catch (err) {
            showToast(err.response?.data?.message || 'Authentication failed. Check your connection.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center p-4 relative">
            
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

            <div className="max-w-[900px] w-full bg-white rounded-2xl shadow-xl flex flex-col md:flex-row overflow-hidden min-h-[550px]">
                
                <div className="w-full md:w-[55%] p-10 flex flex-col relative">
                    
                    <div className="flex items-center gap-2 mb-8">
                        <div className="w-6 h-6 border-2 border-[#2eb998] rounded-sm flex items-center justify-center">
                            <div className="w-2 h-2 bg-[#2eb998] rounded-sm"></div>
                        </div>
                        <span className="text-xl font-semibold text-gray-700">FinFlow</span>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[320px] mx-auto">
                        
                        <h1 className="text-3xl font-extrabold text-[#333] mb-8 text-center tracking-tight">
                            Login to Your Account
                        </h1>

                        <form onSubmit={handleLogin} className="w-full space-y-5">
                            <div>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-11 bg-[#f0f4f3] text-gray-700 px-5 rounded-full outline-none focus:ring-2 focus:ring-[#2eb998] placeholder-gray-400 text-sm font-medium"
                                    placeholder="Email"
                                />
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full h-11 bg-[#f0f4f3] text-gray-700 px-5 rounded-full outline-none focus:ring-2 focus:ring-[#2eb998] placeholder-gray-400 text-sm font-medium pr-12"
                                    placeholder="Password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 outline-none"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>

                            <div className="pt-4 flex justify-center">
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="h-11 w-40 bg-[#2eb998] hover:bg-[#259b7d] text-white font-bold rounded-full transition-colors flex items-center justify-center disabled:opacity-70 text-sm tracking-wide shadow-md"
                                >
                                    {isLoading ? 'Please wait...' : 'Sign In'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                <div className="w-full md:w-[45%] bg-gradient-to-br from-[#3bceac] to-[#2eb998] p-10 flex flex-col items-center justify-center text-center relative overflow-hidden">
                    <button className="absolute top-5 right-5 text-white/70 hover:text-white transition-colors">
                        <X size={24} />
                    </button>

                    <div className="relative z-10 flex flex-col items-center w-full max-w-[260px]">
                        <h2 className="text-4xl font-extrabold text-white mb-5 tracking-tight">New Here?</h2>
                        <p className="text-white/95 text-[15px] font-light mb-8 leading-relaxed">
                            Sign up and discover a great amount of new opportunities!
                        </p>
                        
                        <button 
                            type="button"
                            onClick={() => navigate('/register')}
                            className="h-11 w-40 bg-white text-[#333] font-bold rounded-full hover:bg-gray-50 transition-colors flex items-center justify-center text-sm shadow-lg shadow-[#2eb998]/30"
                        >
                            Sign Up
                        </button>
                    </div>

                    <div className="absolute top-12 left-12 w-32 h-32 rounded-full border-[16px] border-white/10"></div>
                    <div className="absolute -bottom-16 -right-16 w-56 h-56 bg-white/10 rounded-full"></div>
                    <div className="absolute top-1/3 right-10 w-0 h-0 border-l-[40px] border-l-transparent border-r-[40px] border-r-transparent border-b-[70px] border-b-white/5 rotate-45"></div>
                </div>
                
            </div>
        </div>
    );
};

export default Login;