import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { clearModule } from '../../../store/moduleSlice';
import IconMail from '../../../components/Icon/IconMail';
import IconLockDots from '../../../components/Icon/IconLockDots';
import IconEye from '../../../components/Icon/IconEye';
// @ts-ignore
import packageInfo from '../../../../package.json';
import { setAuth } from '../../../utils/auth';
import { loginWithMicrosoft, initializeMsal, isMsalConfigured } from '../../../auth/msal';

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
    const [mfaCode, setMfaCode] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
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
            
            // Clear Redux module state before setting new auth (forces re-initialization with new user)
            dispatch(clearModule());
            
            setAuth(token, user, rememberMe);
            // Also persist legacy userProfile structure expected by RequestForm & index pages
            try {
                const legacyProfile = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    department: user.department || null,
                    primaryRole: user.roles?.[0] || user.role || '',
                    roles: user.roles || (user.role ? [user.role] : []),
                };
                localStorage.setItem('userProfile', JSON.stringify(legacyProfile));
            } catch {}
            // Migrate legacy global onboarding keys to per-user to avoid cross-user leakage
            try {
                const suffix = user.id || user.email || 'anon';
                const k = (base: string) => `${base}:${suffix}`;
                const legacyKeys = ['onboardingComplete', 'selectedModule', 'lastModule'] as const;
                legacyKeys.forEach((base) => {
                    const legacyVal = localStorage.getItem(base);
                    if (legacyVal !== null && localStorage.getItem(k(base)) === null) {
                        localStorage.setItem(k(base), legacyVal);
                    }
                    // Remove legacy key to prevent affecting other users on the same device
                    if (legacyVal !== null) localStorage.removeItem(base);
                });
            } catch {}

            // Flag to show onboarding helper image exactly once after successful login
            try { sessionStorage.setItem('showOnboardingImage', '1'); } catch {}
            
            // Check if user has completed onboarding (per-user check)
            const userSuffix = user.id || user.email || 'anon';
            const hasCompletedOnboarding = localStorage.getItem(`onboardingComplete:${userSuffix}`) === 'true';
            const hasLastModule = localStorage.getItem(`lastModule:${userSuffix}`) !== null;
            
            console.log('[Login] User:', userSuffix);
            console.log('[Login] Has completed onboarding?', hasCompletedOnboarding);
            console.log('[Login] Has last module?', hasLastModule);
            
            // Role-based redirect after login - BUT respect onboarding for first-time/non-remembered users
            const userRoles = user.roles || (user.role ? [user.role] : []);
            
            // Only auto-redirect to role-specific dashboards if user has completed onboarding
            if (hasCompletedOnboarding && hasLastModule) {
                if (userRoles.includes('INNOVATION_COMMITTEE')) {
                    navigate('/innovation/committee/dashboard');
                } else if (
                    userRoles.includes('PROCUREMENT_MANAGER') ||
                    userRoles.includes('MANAGER') ||
                    userRoles.some((r: string) => r && r.toUpperCase().includes('MANAGER'))
                ) {
                    navigate('/procurement/manager');
                } else if (
                    userRoles.includes('PROCUREMENT_OFFICER') ||
                    userRoles.includes('PROCUREMENT')
                ) {
                    navigate('/procurement/dashboard');
                } else if (userRoles.includes('SUPPLIER') || userRoles.some((r: string) => r && r.toUpperCase().includes('SUPPLIER'))) {
                    navigate('/supplier');
                } else if (userRoles.some((r: string) => r && r.toUpperCase().includes('REQUEST'))) {
                    navigate('/apps/requests');
                } else {
                    // Fallback to onboarding selector
                    navigate('/onboarding');
                }
            } else {
                // First time or user didn't check "Remember" - always show onboarding
                navigate('/onboarding');
            }
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
                
                // Check stored user data for committee role
                const userData = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
                if (userData) {
                    const user = JSON.parse(userData);
                    const userRoles = user.roles || (user.role ? [user.role] : []);
                    if (userRoles.includes('INNOVATION_COMMITTEE')) {
                        navigate('/innovation/committee/dashboard');
                        return;
                    }
                }
                navigate('/onboarding');
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
                {/* Animated Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-light to-primary opacity-50 animate-gradient-shift"></div>
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
                        <h1 className="text-5xl font-bold mb-6 animate-fade-in-up">Smart Portal for Information Exchange</h1>
                        <p className="text-xl text-white/90 mb-8 animate-fade-in-up animation-delay-200">
                            Your unified digital hub for seamless collaboration, innovation, and procurement management across the Bureau of Standards Jamaica, with additional enterprise modules on the horizon.
                        </p>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3 animate-fade-in-up animation-delay-300 group cursor-default">
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:bg-white/30 group-hover:scale-110 group-hover:shadow-lg">
                                    <svg className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">Secure & Compliant</h3>
                                    <p className="text-sm text-white/80">Multi-factor authentication enabled</p>
                                </div>
                            </div>
                            <div className="space-y-3 animate-fade-in-up animation-delay-400 group cursor-default">
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:bg-white/30 group-hover:scale-110 group-hover:shadow-lg">
                                    <svg className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">Fast & Efficient</h3>
                                    <p className="text-sm text-white/80">Real-time processing & updates</p>
                                </div>
                            </div>
                            <div className="space-y-3 animate-fade-in-up animation-delay-500 group cursor-default">
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:bg-white/30 group-hover:scale-110 group-hover:shadow-lg">
                                    <svg className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">Collaborative Platform</h3>
                                    <p className="text-sm text-white/80">Unified workspace for teams</p>
                                </div>
                            </div>
                            <div className="space-y-3 animate-fade-in-up animation-delay-600 group cursor-default">
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:bg-white/30 group-hover:scale-110 group-hover:shadow-lg">
                                    <svg className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">Integrated Modules</h3>
                                    <p className="text-sm text-white/80">Innovation, procurement & more</p>
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

                            {/* Optional SSO (hidden when not configured) */}
                            {isMsalConfigured && (
                                <>
                                    <div className="relative my-8">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
                                        </div>
                                        <div className="relative flex justify-center text-sm">
                                            <span className="px-4 bg-white dark:bg-black text-gray-500">Or continue with</span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary w-full py-3 flex items-center justify-center gap-3"
                                            disabled={!isMsalConfigured || isLoading}
                                            onClick={async () => {
                                                setError('');
                                                setIsLoading(true);
                                                try {
                                                    const result = await loginWithMicrosoft();
                                                    const idToken = result.idToken;
                                                    if (!idToken) throw new Error('No idToken from Microsoft');
                                                    // TODO: implement backend endpoint for Microsoft login when enabling Azure AD
                                                    throw new Error('Microsoft SSO is not yet enabled.');
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
                                    </div>
                                </>
                            )}
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
