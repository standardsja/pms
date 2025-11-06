import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconMail from '../../../components/Icon/IconMail';
import IconLockDots from '../../../components/Icon/IconLockDots';
import IconEye from '../../../components/Icon/IconEye';
// @ts-ignore
import packageInfo from '../../../../package.json';
import { setAuth } from '../../../utils/auth';
import { loginWithMicrosoft, initializeMsal, isMsalConfigured } from '../../../auth/msal';
import PlatformFeatures from '../../../components/PlatformFeatures';

const Login = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        dispatch(setPageTitle('Login'));
        // Initialize MSAL early so button clicks don't race initialization
        if (isMsalConfigured) {
            initializeMsal().catch(() => {});
        }
    });

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showMFA, setShowMFA] = useState(false);
    const [capsLockOn, setCapsLockOn] = useState(false);
    const [mfaCode, setMfaCode] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const DISABLE_API = (import.meta as any).env?.VITE_DISABLE_API === 'true';

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (DISABLE_API) {
                // Client-only mock login (no backend)
                const name = email ? email.split('@')[0] : 'User';
                const mockUser = {
                    id: 'u-' + Math.random().toString(36).slice(2, 8),
                    name,
                    email,
                    role: /committee/i.test(email) ? 'INNOVATION_COMMITTEE' : 'PROCUREMENT_OFFICER',
                };
                setAuth('dev-token', mockUser, rememberMe);
                navigate(mockUser.role === 'INNOVATION_COMMITTEE' ? '/innovation/committee/dashboard' : '/onboarding');
                return;
            }

            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                const msg = (data && (data.message || data.error)) || 'Login failed';
                throw new Error(msg);
            }
            const { token, user } = data || {};
            if (!token || !user) throw new Error('Invalid login response');
            setAuth(token, user, rememberMe);
            navigate(user.role === 'INNOVATION_COMMITTEE' ? '/innovation/committee/dashboard' : '/onboarding');
        } catch (err: any) {
            if (DISABLE_API) {
                // As a fallback, allow offline login even on error
                const name = email ? email.split('@')[0] : 'User';
                const mockUser = { id: 'u-offline', name, email, role: 'PROCUREMENT_OFFICER' };
                setAuth('dev-token', mockUser, rememberMe);
                navigate('/onboarding');
                return;
            }
            setError(err?.message || 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const verifyMFA = async (codeOverride?: string) => {
        setError('');
        setIsLoading(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const code = (codeOverride ?? mfaCode.join(''));
            if (code.length === 6) {
                localStorage.setItem('isAuthenticated', 'true');
                const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
                if (userData) {
                    const user = JSON.parse(userData);
                    if (user.role === 'INNOVATION_COMMITTEE') {
                        navigate('/innovation/committee/dashboard');
                        return;
                    }
                }
                navigate('/onboarding');
            } else {
                setError('Please enter a valid 6-digit code');
            }
        } catch (_) {
            setError('MFA verification failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMFAVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
        await verifyMFA();
    };

    const handleMFAInput = (index: number, value: string) => {
        if (value.length > 1) value = value.charAt(0);
        if (!/^\d*$/.test(value)) return;

        const newMfaCode = [...mfaCode];
        newMfaCode[index] = value;
        setMfaCode(newMfaCode);

        // Auto-submit when all 6 digits are present
        const candidate = newMfaCode.join('');
        if (candidate.length === 6) {
            // Slight microtask delay to ensure state commit
            setTimeout(() => verifyMFA(candidate), 0);
        }

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

        if (pastedData.length === 6) {
            setTimeout(() => verifyMFA(pastedData), 0);
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
                        {/* Heading intentionally removed per branding update */}
                        <p className="text-xl text-white/90 mb-8">
                            Streamline your work across Procurement (PMS), Innovation, and future modules with a unified platform for requests, RFQs, ideas, suppliers, and more.
                        </p>
                        <PlatformFeatures />
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
                                <div role="alert" aria-live="polite" className="mb-6 p-4 bg-danger-light/10 border border-danger rounded-lg text-danger text-sm">
                                    <div className="mb-1">{error}</div>
                                    <Link to="/help" className="text-xs underline text-danger hover:text-danger/80">Need help? Visit Help Center</Link>
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
                                            onKeyUp={(e) => setCapsLockOn(e.getModifierState('CapsLock'))}
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
                                    {capsLockOn && (
                                        <p className="mt-2 text-xs text-amber-600">Caps Lock is ON</p>
                                    )}
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
                                    disabled={!isMsalConfigured || isLoading}
                                    onClick={async () => {
                                        setError('');
                                        setIsLoading(true);
                                        try {
                                            if (!isMsalConfigured) {
                                                throw new Error('Microsoft SSO is not configured. Set VITE_AZURE_CLIENT_ID and VITE_AZURE_TENANT_ID.');
                                            }
                                            const result = await loginWithMicrosoft();
                                            const idToken = result.idToken;
                                            if (!idToken) throw new Error('No idToken from Microsoft');
                                            if (DISABLE_API) {
                                                // Client-only: create a mock user from the ID token claims
                                                const emailFromToken = (result?.account?.username || '').toLowerCase();
                                                const name = result?.account?.name || emailFromToken.split('@')[0] || 'User';
                                                const mockUser = {
                                                    id: 'msal-' + Math.random().toString(36).slice(2, 8),
                                                    name,
                                                    email: emailFromToken || `${name.replace(/\s+/g,'').toLowerCase()}@example.com`,
                                                    role: /committee|review|approver/i.test(name) ? 'INNOVATION_COMMITTEE' : 'PROCUREMENT_OFFICER',
                                                };
                                                setAuth('dev-token', mockUser, rememberMe);
                                                navigate(mockUser.role === 'INNOVATION_COMMITTEE' ? '/innovation/committee/dashboard' : '/onboarding');
                                            } else {
                                                // Real backend path
                                                const res = await fetch('/api/auth/microsoft', {
                                                    method: 'POST',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify({ idToken }),
                                                });
                                                const data = await res.json().catch(() => null);
                                                if (!res.ok) {
                                                    const msg = (data && (data.message || data.error)) || 'Microsoft sign-in failed';
                                                    throw new Error(msg);
                                                }
                                                const { token, user } = data || {};
                                                if (!token || !user) throw new Error('Invalid Microsoft login response');
                                                setAuth(token, user, rememberMe);
                                                navigate(user.role === 'INNOVATION_COMMITTEE' ? '/innovation/committee/dashboard' : '/onboarding');
                                            }
                                        } catch (e: any) {
                                            const msg = e?.message || 'Microsoft sign-in failed';
                                            if (!/Redirecting/.test(msg)) setError(msg);
                                        } finally {
                                            setIsLoading(false);
                                        }
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
                                <p className="text-xs text-gray-500 text-center">Microsoft Entra ID</p>
                                {!isMsalConfigured && (
                                    <p className="text-xs text-amber-600 mt-2">
                                        Microsoft SSO not configured. Please set VITE_AZURE_CLIENT_ID and VITE_AZURE_TENANT_ID and restart the dev server.
                                    </p>
                                )}
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
                                <div role="alert" aria-live="polite" className="mb-6 p-4 bg-danger-light/10 border border-danger rounded-lg text-danger text-sm">
                                    <div className="mb-1">{error}</div>
                                    <Link to="/help" className="text-xs underline text-danger hover:text-danger/80">Need help? Visit Help Center</Link>
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
