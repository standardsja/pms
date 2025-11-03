import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconMail from '../../components/Icon/IconMail';

const ForgotPassword = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(setPageTitle('Forgot Password'));
    });

    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Mock validation
            if (email) {
                setIsSuccess(true);
            } else {
                setError('Please enter a valid email address');
            }
        } catch (err) {
            setError('Failed to send reset link. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary-light relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/assets/images/auth/pattern.png')] opacity-10"></div>
                <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
                    <div className="max-w-lg">
                        <div className="flex items-center justify-center mb-12">
                            <div className="relative">
                                <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full"></div>
                                <div className="relative flex items-center gap-4 bg-white/10 backdrop-blur-sm px-8 py-6 rounded-2xl border-2 border-white/30 shadow-2xl">
                                    <span className="text-7xl drop-shadow-lg animate-[spin_20s_linear_infinite]">🌀</span>
                                    <span className="text-6xl font-black text-white drop-shadow-2xl flex" style={{ letterSpacing: '0.15em' }}>
                                        SPINX
                                    </span>
                                </div>
                            </div>
                        </div>
                        <h1 className="text-5xl font-bold mb-6">Forgot Your Password?</h1>
                        <p className="text-xl text-white/90 mb-8">
                            Don't worry! It happens. Enter your email address and we'll send you a link to reset your password.
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                                    <span className="text-lg font-bold">1</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">Enter Your Email</h3>
                                    <p className="text-sm text-white/80">Provide the email address associated with your account</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                                    <span className="text-lg font-bold">2</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">Check Your Inbox</h3>
                                    <p className="text-sm text-white/80">We'll send you a secure link to reset your password</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                                    <span className="text-lg font-bold">3</span>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-1">Create New Password</h3>
                                    <p className="text-sm text-white/80">Follow the link and set a new secure password</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-white dark:bg-black">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden mb-8 text-center">
                        <img src="/assets/images/logo.svg" alt="Logo" className="w-16 h-16 mx-auto mb-4" />
                    </div>

                    {!isSuccess ? (
                        // Request Reset Form
                        <div>
                            <div className="mb-8">
                                <Link to="/auth/login" className="text-primary hover:text-primary-dark mb-4 flex items-center gap-2 w-fit">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Back to Login
                                </Link>
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Reset Password</h2>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Enter your email address and we'll send you instructions to reset your password
                                </p>
                            </div>

                            {error && (
                                <div className="mb-6 p-4 bg-danger-light/10 border border-danger rounded-lg text-danger text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                                            <IconMail className="w-5 h-5" />
                                        </div>
                                        <input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="form-input pl-10 w-full"
                                            placeholder="your.email@example.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="btn btn-primary w-full py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-5 h-5 inline-block"></span>
                                            Sending...
                                        </span>
                                    ) : (
                                        'Send Reset Link'
                                    )}
                                </button>
                            </form>

                            <div className="mt-8 p-4 bg-info-light/10 border border-info rounded-lg">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                    <svg className="w-5 h-5 text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Need Help?
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    If you don't receive an email within a few minutes, check your spam folder or contact your system administrator.
                                </p>
                            </div>
                        </div>
                    ) : (
                        // Success Message
                        <div className="text-center">
                            <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-10 h-10 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Check Your Email</h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                We've sent password reset instructions to <strong className="text-gray-900 dark:text-white">{email}</strong>
                            </p>
                            
                            <div className="space-y-4">
                                <div className="p-4 bg-warning-light/10 border border-warning rounded-lg text-left">
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        <strong>Security Note:</strong> The password reset link will expire in 1 hour for your security. If you don't see the email, check your spam folder.
                                    </p>
                                </div>

                                <button
                                    onClick={() => setIsSuccess(false)}
                                    className="btn btn-outline-primary w-full py-3"
                                >
                                    Send Another Link
                                </button>

                                <Link to="/auth/login" className="btn btn-primary w-full py-3 block text-center">
                                    Return to Login
                                </Link>
                            </div>

                            <div className="mt-8 text-sm text-gray-500">
                                <p>Didn't request a password reset?</p>
                                <p className="mt-1">You can safely ignore this email.</p>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="mt-12 text-center text-sm text-gray-500">
                        <p>© {new Date().getFullYear()} Procurement Management System. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
