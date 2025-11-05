import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconMail from '../../components/Icon/IconMail';
import IconLockDots from '../../components/Icon/IconLockDots';
import IconEye from '../../components/Icon/IconEye';
// @ts-ignore
import packageInfo from '../../../package.json';

const Login = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        dispatch(setPageTitle('Login'));
    });

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showMFA, setShowMFA] = useState(false);
    const [mfaCode, setMfaCode] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Dev-only: call backend test-login to fetch user + department + roles
            const resp = await fetch('http://localhost:4000/auth/test-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                throw new Error(err.error || resp.statusText || 'Login failed');
            }
            const data = await resp.json();
            const user = data.user || {};

            // Normalize profile
            const profile = {
                id: user.id,
                email: user.email,
                name: user.name,
                department: user.department || null,
                roles: Array.isArray(user.roles) ? user.roles : [],
                primaryRole: Array.isArray(user.roles) && user.roles.length ? user.roles[0] : '',
                permissions: [],
            };

            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('userProfile', JSON.stringify(profile));
            localStorage.setItem('authToken', data.token || '');
            try { window.dispatchEvent(new Event('userProfileChanged')); } catch {}
            navigate('/');
        } catch (err: any) {
            setError(err?.message || 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMFAVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            const code = mfaCode.join('');
            if (code.length === 6) {
                // Mock successful MFA verification
                localStorage.setItem('isAuthenticated', 'true');
                navigate('/');
            } else {
                setError('Please enter a valid 6-digit code');
            }
        } catch (err) {
            setError('MFA verification failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMFAInput = (index: number, value: string) => {
        if (value.length > 1) value = value.charAt(0);
        if (!/^\d*$/.test(value)) return;

        const newMfaCode = [...mfaCode];
        newMfaCode[index] = value;
        setMfaCode(newMfaCode);

        // Auto-focus next input
        if (value && index < 5) {
            const nextInput = document.getElementById(`mfa-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleMFAKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !mfaCode[index] && index > 0) {
            const prevInput = document.getElementById(`mfa-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handleMFAPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 6);
        if (!/^\d+$/.test(pastedData)) return;

        const newMfaCode = pastedData.split('');
        while (newMfaCode.length < 6) newMfaCode.push('');
        setMfaCode(newMfaCode);

        // Focus last filled input
        const lastIndex = Math.min(pastedData.length - 1, 5);
        document.getElementById(`mfa-${lastIndex}`)?.focus();
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
                        <h1 className="text-5xl font-bold mb-6">Procurement Management System</h1>
                        <p className="text-xl text-white/90 mb-8">
                            Streamline your procurement process with our comprehensive solution for request management, RFQ handling, and supplier coordination.
                        </p>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold">Secure & Compliant</h3>
                                    <p className="text-sm text-white/80">Multi-factor authentication enabled</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold">Fast & Efficient</h3>
                                    <p className="text-sm text-white/80">Real-time processing & updates</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-white dark:bg-black">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden mb-8 text-center">
                        <img src="/assets/images/logo.svg" alt="Logo" className="w-16 h-16 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome Back</h2>
                    </div>

                    {!showMFA ? (
                        // Login Form
                        <div>
                            <div className="mb-8">
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Sign In</h2>
                                <p className="text-gray-600 dark:text-gray-400">Enter your credentials to access your account</p>
                            </div>

                            {error && (
                                <div className="mb-6 p-4 bg-danger-light/10 border border-danger rounded-lg text-danger text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleLogin} className="space-y-5">
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

                                <div>
                                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Password
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
                                            placeholder="Enter your password"
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
                                </div>

                                <div className="flex items-center justify-between">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="form-checkbox"
                                        />
                                        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Remember me</span>
                                    </label>
                                    <Link to="/auth/forgot-password" className="text-sm text-primary hover:text-primary-dark font-semibold">
                                        Forgot Password?
                                    </Link>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="btn btn-primary w-full py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-5 h-5 inline-block"></span>
                                            Signing In...
                                        </span>
                                    ) : (
                                        'Sign In'
                                    )}
                                </button>
                            </form>

                            {/* Divider */}
                            <div className="relative my-8">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-white dark:bg-black text-gray-500">Or continue with</span>
                                </div>
                            </div>

                            {/* SSO Options */}
                            <div className="space-y-3">
                                <button
                                    type="button"
                                    className="btn btn-outline-primary w-full py-3 flex items-center justify-center gap-3"
                                    onClick={() => {
                                        // Microsoft SSO integration
                                        console.log('Microsoft SSO clicked');
                                    }}
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 23 23" fill="none">
                                        <path fill="#f25022" d="M1 1h10v10H1z"/>
                                        <path fill="#00a4ef" d="M12 1h10v10H12z"/>
                                        <path fill="#7fba00" d="M1 12h10v10H1z"/>
                                        <path fill="#ffb900" d="M12 12h10v10H12z"/>
                                    </svg>
                                    <span className="font-semibold">Sign in with Microsoft</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        // MFA Verification Form
                        <div>
                            <div className="mb-8">
                                <button
                                    onClick={() => setShowMFA(false)}
                                    className="text-primary hover:text-primary-dark mb-4 flex items-center gap-2"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Back
                                </button>
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Two-Factor Authentication</h2>
                                <p className="text-gray-600 dark:text-gray-400">
                                    Enter the 6-digit verification code from your authenticator app
                                </p>
                            </div>

                            {error && (
                                <div className="mb-6 p-4 bg-danger-light/10 border border-danger rounded-lg text-danger text-sm">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleMFAVerify} className="space-y-6">
                                <div className="flex justify-center gap-3" onPaste={handleMFAPaste}>
                                    {mfaCode.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`mfa-${index}`}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleMFAInput(index, e.target.value)}
                                            onKeyDown={(e) => handleMFAKeyDown(index, e)}
                                            className="w-14 h-14 text-center text-2xl font-bold form-input"
                                            required
                                        />
                                    ))}
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading || mfaCode.some(d => !d)}
                                    className="btn btn-primary w-full py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-5 h-5 inline-block"></span>
                                            Verifying...
                                        </span>
                                    ) : (
                                        'Verify & Sign In'
                                    )}
                                </button>

                                <div className="text-center">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                        Didn't receive the code?
                                    </p>
                                    <button
                                        type="button"
                                        className="text-primary hover:text-primary-dark font-semibold text-sm"
                                    >
                                        Resend Code
                                    </button>
                                </div>

                                <div className="p-4 bg-info-light/10 border border-info rounded-lg">
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        <strong>Having trouble?</strong> Contact your system administrator or use your backup codes.
                                    </p>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="mt-12 text-center text-sm text-gray-500">
                        <p>© {new Date().getFullYear()} Bureau of Standards Jamaica. All rights reserved.</p>
                        <p className="mt-2 text-xs text-gray-400">Version {packageInfo.version}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
