import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconLockDots from '../../components/Icon/IconLockDots';
import IconEye from '../../components/Icon/IconEye';

const ResetPassword = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    useEffect(() => {
        dispatch(setPageTitle('Reset Password'));
    });

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, text: '', color: '' });

    const calculatePasswordStrength = (pass: string) => {
        let score = 0;
        if (!pass) return { score: 0, text: '', color: '' };

        // Length
        if (pass.length >= 8) score += 1;
        if (pass.length >= 12) score += 1;

        // Contains lowercase
        if (/[a-z]/.test(pass)) score += 1;

        // Contains uppercase
        if (/[A-Z]/.test(pass)) score += 1;

        // Contains numbers
        if (/\d/.test(pass)) score += 1;

        // Contains special characters
        if (/[^A-Za-z0-9]/.test(pass)) score += 1;

        const levels = [
            { score: 0, text: '', color: '' },
            { score: 1, text: 'Very Weak', color: 'danger' },
            { score: 2, text: 'Weak', color: 'warning' },
            { score: 3, text: 'Fair', color: 'warning' },
            { score: 4, text: 'Good', color: 'info' },
            { score: 5, text: 'Strong', color: 'success' },
            { score: 6, text: 'Very Strong', color: 'success' },
        ];

        return levels[score];
    };

    useEffect(() => {
        setPasswordStrength(calculatePasswordStrength(password));
    }, [password]);

    const validatePassword = () => {
        if (password.length < 8) {
            return 'Password must be at least 8 characters long';
        }
        if (!/[a-z]/.test(password)) {
            return 'Password must contain at least one lowercase letter';
        }
        if (!/[A-Z]/.test(password)) {
            return 'Password must contain at least one uppercase letter';
        }
        if (!/\d/.test(password)) {
            return 'Password must contain at least one number';
        }
        if (!/[^A-Za-z0-9]/.test(password)) {
            return 'Password must contain at least one special character';
        }
        if (password !== confirmPassword) {
            return 'Passwords do not match';
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const validationError = validatePassword();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsLoading(true);

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Mock validation
            if (!token) {
                setError('Invalid or expired reset token');
                return;
            }

            setIsSuccess(true);
            setTimeout(() => {
                navigate('/auth/login');
            }, 3000);
        } catch (err) {
            setError('Failed to reset password. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="flex min-h-screen items-center justify-center p-8 bg-white dark:bg-black">
                <div className="w-full max-w-md text-center">
                    <div className="w-20 h-20 bg-danger/10 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Invalid Reset Link</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">
                        This password reset link is invalid or has expired. Please request a new one.
                    </p>
                    <Link to="/auth/forgot-password" className="btn btn-primary w-full py-3">
                        Request New Link
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary-light relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/assets/images/auth/pattern.png')] opacity-10"></div>
                <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
                    <div className="max-w-lg">
                        <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-8">
                            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                        </div>
                        <h1 className="text-5xl font-bold mb-6">Create New Password</h1>
                        <p className="text-xl text-white/90 mb-8">
                            Choose a strong, unique password to protect your account. Make sure it's something you can remember!
                        </p>
                        <div className="space-y-4 bg-white/10 rounded-lg p-6">
                            <h3 className="font-semibold text-lg mb-3">Password Requirements:</h3>
                            <ul className="space-y-2">
                                <li className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-white/90">At least 8 characters long</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-white/90">Contains uppercase & lowercase letters</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-white/90">Contains at least one number</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <svg className="w-5 h-5 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-white/90">Contains special character (!@#$%^&*)</span>
                                </li>
                            </ul>
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
                        // Reset Password Form
                        <div>
                            <div className="mb-8">
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Set New Password</h2>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Enter your new password below to complete the reset process
                                </p>
                            </div>

                            {error && (
                                <div className="mb-6 p-4 bg-danger-light/10 border border-danger rounded-lg text-danger text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                                            <IconLockDots className="w-5 h-5" />
                                        </div>
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="form-input pl-10 pr-10 w-full"
                                            placeholder="Enter new password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                        >
                                            <IconEye className="w-5 h-5" />
                                        </button>
                                    </div>
                                    
                                    {/* Password Strength Indicator */}
                                    {password && (
                                        <div className="mt-2">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs text-gray-600 dark:text-gray-400">Password Strength:</span>
                                                <span className={`text-xs font-semibold text-${passwordStrength.color}`}>
                                                    {passwordStrength.text}
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                <div
                                                    className={`bg-${passwordStrength.color} h-2 rounded-full transition-all duration-300`}
                                                    style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Confirm New Password
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                                            <IconLockDots className="w-5 h-5" />
                                        </div>
                                        <input
                                            id="confirmPassword"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="form-input pl-10 pr-10 w-full"
                                            placeholder="Confirm new password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                        >
                                            <IconEye className="w-5 h-5" />
                                        </button>
                                    </div>
                                    {confirmPassword && password !== confirmPassword && (
                                        <p className="mt-1 text-xs text-danger">Passwords do not match</p>
                                    )}
                                    {confirmPassword && password === confirmPassword && (
                                        <p className="mt-1 text-xs text-success flex items-center gap-1">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            Passwords match
                                        </p>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading || password !== confirmPassword || !password}
                                    className="btn btn-primary w-full py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-5 h-5 inline-block"></span>
                                            Resetting Password...
                                        </span>
                                    ) : (
                                        'Reset Password'
                                    )}
                                </button>

                                <Link to="/auth/login" className="btn btn-outline-primary w-full py-3 text-center block">
                                    Cancel
                                </Link>
                            </form>
                        </div>
                    ) : (
                        // Success Message
                        <div className="text-center">
                            <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-10 h-10 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Password Reset Successfully!</h2>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
                                Your password has been updated. You can now sign in with your new password.
                            </p>
                            
                            <div className="space-y-4">
                                <div className="p-4 bg-success-light/10 border border-success rounded-lg">
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        Redirecting you to the login page in a few seconds...
                                    </p>
                                </div>

                                <Link to="/auth/login" className="btn btn-primary w-full py-3 block">
                                    Sign In Now
                                </Link>
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

export default ResetPassword;
