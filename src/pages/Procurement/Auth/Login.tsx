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

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showMFA, setShowMFA] = useState(false);
    const [mfaCode, setMfaCode] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [systemStats, setSystemStats] = useState({ activeUsers: 0, systemUptime: 99.9 });

    useEffect(() => {
        dispatch(setPageTitle('Login'));
        // Initialize MSAL early so button clicks don't race initialization
        if (isMsalConfigured) {
            initializeMsal().catch(() => {});
        }
    });

    // Fetch system stats from backend
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || '';
                const response = await fetch(`${apiUrl}/api/stats/system`);
                if (response.ok) {
                    const data = await response.json();
                    setSystemStats({
                        activeUsers: data.activeUsers || 0,
                        systemUptime: data.systemUptime || 99.9,
                    });
                }
            } catch (err) {
                // Silently fail - use defaults
                console.debug('Failed to fetch system stats');
            }
        };
        fetchStats();
        // Refresh stats every 30 seconds
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Get API URL from environment
            const apiUrl = import.meta.env.VITE_API_URL || '';

            // Try standard password login first
            let res = await fetch(`${apiUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            let data = await res.json().catch(() => null);

            // If standard login fails with 401, try LDAP login
            if (res.status === 401) {
                console.log('Standard login failed, trying LDAP...');
                res = await fetch(`${apiUrl}/api/auth/ldap-login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                data = await res.json().catch(() => null);
            }

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
            try {
                sessionStorage.setItem('showOnboardingImage', '1');
            } catch {}

            // Check if user has completed onboarding (per-user check)
            const userSuffix = user.id || user.email || 'anon';
            const hasCompletedOnboarding = localStorage.getItem(`onboardingComplete:${userSuffix}`) === 'true';
            const hasLastModule = localStorage.getItem(`lastModule:${userSuffix}`) !== null;

            // Role-based redirect after login (evaluation committee overrides onboarding)
            const userRoles: string[] = user.roles || (user.role ? [user.role] : []);
            const normalizedRoles = userRoles.map((r) => String(r).toUpperCase());

            // Evaluation Committee members go straight to their committee dashboard regardless of onboarding state
            if (normalizedRoles.includes('EVALUATION_COMMITTEE')) {
                navigate('/evaluation/committee/dashboard');
                return;
            }

            // Innovation committee members with ONLY committee role go directly to committee dashboard
            const isInnovationCommitteeOnly = normalizedRoles.includes('INNOVATION_COMMITTEE') && normalizedRoles.length === 1;

            if (isInnovationCommitteeOnly) {
                navigate('/innovation/committee/dashboard');
            } else if (hasCompletedOnboarding && hasLastModule) {
                // Returning users with saved preference - go to their last module
                const lastMod = localStorage.getItem(`lastModule:${userSuffix}`);
                if (lastMod === 'pms') {
                    if (normalizedRoles.includes('PROCUREMENT_MANAGER') || normalizedRoles.includes('MANAGER') || normalizedRoles.some((r) => r.includes('MANAGER'))) {
                        navigate('/procurement/manager');
                    } else if (normalizedRoles.includes('PROCUREMENT_OFFICER') || normalizedRoles.includes('PROCUREMENT')) {
                        navigate('/procurement/dashboard');
                    } else if (normalizedRoles.some((r) => r.includes('REQUEST'))) {
                        navigate('/apps/requests');
                    } else {
                        navigate('/procurement/dashboard');
                    }
                } else if (lastMod === 'ih') {
                    navigate('/innovation/dashboard');
                } else if (lastMod === 'committee') {
                    navigate('/innovation/committee/dashboard');
                } else {
                    navigate('/onboarding');
                }
            } else {
                // First time or user didn't check "Remember" - show module selector
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
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const code = mfaCode.join('');
            if (code.length === 6) {
                // Mock successful MFA verification
                localStorage.setItem('isAuthenticated', 'true');

                // Check stored user data for committee role
                const userData = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
                if (userData) {
                    const user = JSON.parse(userData);
                    const userRoles: string[] = user.roles || (user.role ? [user.role] : []);
                    const normalizedRoles = userRoles.map((r) => String(r).toUpperCase());
                    if (normalizedRoles.includes('EVALUATION_COMMITTEE')) {
                        navigate('/evaluation/committee/dashboard');
                        return;
                    }
                    if (normalizedRoles.includes('INNOVATION_COMMITTEE')) {
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

                {/* Floating Stats Cards */}
                <div className="absolute top-8 right-8 space-y-3 animate-fade-in-up">
                    <div className="bg-white/10 backdrop-blur-md rounded-lg px-4 py-3 border border-white/20 shadow-xl">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            <div>
                                <div className="text-white font-bold text-lg">{systemStats.activeUsers.toLocaleString()}</div>
                                <div className="text-white/80 text-xs">Active Users</div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md rounded-lg px-4 py-3 border border-white/20 shadow-xl">
                        <div className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                            </svg>
                            <div>
                                <div className="text-white font-bold text-lg">{systemStats.systemUptime}%</div>
                                <div className="text-white/80 text-xs">Uptime</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
                    <div className="max-w-lg">
                        <div className="flex items-center justify-center mb-12">
                            <div className="relative">
                                <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full"></div>
                                <div className="relative flex flex-col items-center gap-4 bg-white/10 backdrop-blur-sm px-8 py-6 rounded-2xl border-2 border-white/30 shadow-2xl">
                                    <div className="flex items-center gap-4">
                                        <span className="text-7xl drop-shadow-lg animate-[spin_20s_linear_infinite]">🌀</span>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-6xl font-black text-white drop-shadow-2xl" style={{ letterSpacing: '0.15em' }}>
                                                    SPINX
                                                </span>
                                            </div>
                                            <span className="inline-block mt-2 px-3 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold rounded-full border border-white/30">
                                                ENTERPRISE
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="text-center mb-8">
                            <h1 className="text-5xl font-bold mb-4 animate-fade-in-up">Smart Portal for Information Exchange</h1>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-sm font-semibold border border-white/20">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                </svg>
                                Powered by SPINX Enterprise Platform
                            </div>
                        </div>
                        <p className="text-lg text-white/90 mb-10 animate-fade-in-up animation-delay-200 text-center">
                            Your unified digital hub for seamless collaboration, innovation, and procurement management across the Bureau of Standards Jamaica, with additional enterprise modules on
                            the horizon.
                        </p>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3 animate-fade-in-up animation-delay-300 group cursor-default">
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:bg-white/30 group-hover:scale-110 group-hover:shadow-xl backdrop-blur-sm border border-white/10">
                                    <svg className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Secure & Compliant</h3>
                                    <p className="text-sm text-white/80">Multi-factor authentication enabled</p>
                                    <div className="mt-2 flex items-center gap-1.5 text-xs text-white/70">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path
                                                fillRule="evenodd"
                                                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        <span>ISO 9001 Certified</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3 animate-fade-in-up animation-delay-400 group cursor-default">
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:bg-white/30 group-hover:scale-110 group-hover:shadow-xl backdrop-blur-sm border border-white/10">
                                    <svg className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Fast & Efficient</h3>
                                    <p className="text-sm text-white/80">Real-time processing & updates</p>
                                    <div className="mt-2 flex items-center gap-1.5 text-xs text-white/70">
                                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                                        <span>All systems operational</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3 animate-fade-in-up animation-delay-500 group cursor-default">
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:bg-white/30 group-hover:scale-110 group-hover:shadow-xl backdrop-blur-sm border border-white/10">
                                    <svg className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Collaborative Platform</h3>
                                    <p className="text-sm text-white/80">Unified workspace for teams</p>
                                    <div className="mt-2 flex items-center gap-1.5 text-xs text-white/70">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                        </svg>
                                        <span>{systemStats.activeUsers.toLocaleString()} active users today</span>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-3 animate-fade-in-up animation-delay-600 group cursor-default">
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:bg-white/30 group-hover:scale-110 group-hover:shadow-xl backdrop-blur-sm border border-white/10">
                                    <svg className="w-6 h-6 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Integrated Modules</h3>
                                    <p className="text-sm text-white/80">Innovation, procurement & more</p>
                                    <div className="mt-2 flex items-center gap-1.5 text-xs text-white/70">
                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                            <path
                                                fillRule="evenodd"
                                                d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        <span>10+ modules available</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex w-full lg:w-1/2 items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-black">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden mb-8 text-center">
                        <div className="inline-flex items-center gap-3 mb-4">
                            <span className="text-5xl">🌀</span>
                            <div>
                                <h1 className="text-3xl font-black bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">SPINX</h1>
                                <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full border border-primary/20">ENTERPRISE</span>
                            </div>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome Back</h2>
                    </div>

                    {!showMFA ? (
                        // Login Form
                        <div>
                            <div className="mb-8">
                                <h2 className="text-4xl font-black text-gray-900 dark:text-white mb-3">Sign In</h2>
                                <p className="text-gray-600 dark:text-gray-400 text-lg">Enter your credentials to access your account</p>
                                <div className="mt-4 flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        <span className="font-medium">System Online</span>
                                    </div>
                                    <span className="text-gray-300 dark:text-gray-700">•</span>
                                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                        </svg>
                                        <span className="font-medium">Secure Connection</span>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="mb-6 p-4 bg-danger-light/10 border-l-4 border-danger rounded-r-lg text-danger text-sm flex items-start gap-3 animate-shake">
                                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                    <span className="font-medium">{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleLogin} className="space-y-6">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Email Address
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
                                            <IconMail className="w-5 h-5" />
                                        </div>
                                        <input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="form-input pl-11 w-full h-12 text-base border-2 focus:border-primary"
                                            placeholder="youremail@bsj.org.jm"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="password" className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
                                            <IconLockDots className="w-5 h-5" />
                                        </div>
                                        <input
                                            id="password"
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="form-input pl-11 pr-12 w-full h-12 text-base border-2 focus:border-primary"
                                            placeholder="Enter your password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            <IconEye className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <label className="flex items-center cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="form-checkbox w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary/50"
                                        />
                                        <span className="ml-2.5 text-sm text-gray-600 dark:text-gray-400 font-medium group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">
                                            Remember me
                                        </span>
                                    </label>
                                    <Link to="/auth/forgot-password" className="text-sm text-primary hover:text-primary-dark font-bold transition-colors">
                                        Forgot Password?
                                    </Link>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="btn btn-primary w-full py-3.5 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-5 h-5 inline-block"></span>
                                            Signing In...
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center gap-2">
                                            Sign In
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </span>
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
                                                <path fill="#f25022" d="M1 1h10v10H1z" />
                                                <path fill="#00a4ef" d="M12 1h10v10H12z" />
                                                <path fill="#7fba00" d="M1 12h10v10H1z" />
                                                <path fill="#ffb900" d="M12 12h10v10H12z" />
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
                                <button onClick={() => setShowMFA(false)} className="text-primary hover:text-primary-dark mb-4 flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Back
                                </button>
                                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Two-Factor Authentication</h2>
                                <p className="text-gray-600 dark:text-gray-400">Enter the 6-digit verification code from your authenticator app</p>
                            </div>

                            {error && <div className="mb-6 p-4 bg-danger-light/10 border border-danger rounded-lg text-danger text-sm">{error}</div>}

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
                                    disabled={isLoading || mfaCode.some((d) => !d)}
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
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Didn't receive the code?</p>
                                    <button type="button" className="text-primary hover:text-primary-dark font-semibold text-sm">
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
                    <div className="mt-12 space-y-4">
                        <div className="flex items-center justify-center gap-6 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                            <div className="flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium">Enterprise Security</span>
                            </div>
                            <span>•</span>
                            <div className="flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <span className="font-medium">ISO 9001 Certified</span>
                            </div>
                            <span>•</span>
                            <div className="flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M2 5a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm14 1a1 1 0 11-2 0 1 1 0 012 0zM2 13a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2zm14 1a1 1 0 11-2 0 1 1 0 012 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <span className="font-medium">99.9% Uptime</span>
                            </div>
                        </div>
                        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                            <p className="font-medium">© {new Date().getFullYear()} Bureau of Standards Jamaica. All rights reserved.</p>
                            <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500">Powered by SPINX Enterprise Platform v{packageInfo.version}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
