import { useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { setSelectedModule, setOnboardingComplete, ModuleKey as StoreModuleKey } from '../../../store/moduleSlice';
import { getUser } from '../../../utils/auth';
import { useTranslation } from 'react-i18next';
import { logEvent } from '../../../utils/analytics';
import { getApiUrl } from '../../../config/api';
import { statsService, SystemStats } from '../../../services/statsService';
import { getModuleLocks, type ModuleLockState } from '../../../utils/moduleLocks';

type ModuleKey = 'pms' | 'ih' | 'committee' | 'budgeting' | 'audit' | 'prime' | 'datapoint' | 'maintenance' | 'asset' | 'ppm' | 'kb';

type ModuleDef = {
    id: ModuleKey;
    title: string;
    description: string;
    icon: string;
    gradient: string;
    path: string;
    features: string[];
    comingSoon?: boolean;
    cta?: string;
    locked?: boolean;
    lockedReason?: string;
};

const Onboarding = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { search } = useLocation();
    const query = useMemo(() => new URLSearchParams(search), [search]);
    const forceOnboarding = query.get('force') === '1' || query.get('reset') === '1';

    // Memoize currentUser to prevent infinite loops
    const currentUser = useMemo(() => getUser(), []);

    // Safely extract roles - handle both string arrays and object arrays
    const userRoles: string[] = useMemo(() => {
        const rawRoles = (currentUser as any)?.roles;
        if (Array.isArray(rawRoles)) {
            return rawRoles.map((r: any) => (typeof r === 'string' ? r : r?.name || r?.role?.name)).filter(Boolean);
        } else if ((currentUser as any)?.role) {
            const singleRole = (currentUser as any).role;
            return [typeof singleRole === 'string' ? singleRole : singleRole?.name || ''].filter(Boolean);
        }
        return [];
    }, [currentUser]);

    const isCommittee = userRoles.includes('INNOVATION_COMMITTEE');
    // More precise procurement manager check - must have BOTH "PROCUREMENT" AND "MANAGER" in role
    const isProcurementManager = userRoles.some((role) => {
        const roleUpper = role.toUpperCase();
        return roleUpper === 'PROCUREMENT_MANAGER' || roleUpper === 'PROCUREMENT MANAGER' || (roleUpper.includes('PROCUREMENT') && roleUpper.includes('MANAGER'));
    });
    const isRequester = !isProcurementManager && userRoles.some((r) => r && r.toUpperCase().includes('REQUEST'));

    const [selected, setSelected] = useState<ModuleKey | null>(null);
    const [error, setError] = useState<string>('');
    const [isBusy, setIsBusy] = useState<boolean>(false);
    const [rememberChoice, setRememberChoice] = useState<boolean>(false);
    const [lastModule, setLastModule] = useState<ModuleKey | null>(null);
    const radiosRef = useRef<HTMLDivElement | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const [showProcurementSteps, setShowProcurementSteps] = useState<boolean>(false);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(true);
    const [showStats, setShowStats] = useState(true);
    const [systemStats, setSystemStats] = useState<SystemStats>({
        activeUsers: 0,
        requestsThisMonth: 0,
        innovationIdeas: 0,
        pendingApprovals: 0,
        systemUptime: 99.9,
        totalProcessedRequests: 0,
        timestamp: new Date().toISOString(),
    });
    const [moduleStats, setModuleStats] = useState<{
        pms: { totalUsers: number; activeNow: number; today: number };
        ih: { totalUsers: number; activeNow: number; today: number };
    }>({
        pms: { totalUsers: 0, activeNow: 0, today: 0 },
        ih: { totalUsers: 0, activeNow: 0, today: 0 },
    });
    const [moduleLocks, setModuleLocks] = useState<ModuleLockState>(() => getModuleLocks());

    useEffect(() => {
        // Fetch real-time system statistics
        const fetchSystemStats = async () => {
            try {
                const data = await statsService.getSystemStats();
                setSystemStats(data);
            } catch (error) {
                console.error('Failed to fetch system stats:', error);
            }
        };

        // Fetch real-time module statistics
        const fetchModuleStats = async () => {
            try {
                // In development, use relative URL to leverage Vite proxy
                const url = import.meta.env.DEV ? '/api/stats/modules' : getApiUrl('/api/stats/modules');

                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    setModuleStats({
                        pms: {
                            totalUsers: data.procurement?.totalUsers || 0,
                            activeNow: data.procurement?.activeNow || 0,
                            today: data.procurement?.today || 0,
                        },
                        ih: {
                            totalUsers: data.innovation?.totalUsers || 0,
                            activeNow: data.innovation?.activeNow || 0,
                            today: data.innovation?.today || 0,
                        },
                    });
                }
            } catch (error) {
                console.error('Failed to fetch module stats:', error);
            }
        };

        fetchSystemStats();
        fetchModuleStats();
        // Refresh stats every 30 seconds
        const interval = setInterval(() => {
            fetchSystemStats();
            fetchModuleStats();
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    // Use ref to track if initial setup has run to prevent infinite loops
    const hasInitialized = useRef(false);

    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        dispatch(setPageTitle(t('onboarding.title')));

        // If a committee-ONLY member lands here, redirect them to their dashboard
        const isCommitteeOnly = isCommittee && userRoles.length === 1;
        if (isCommitteeOnly) {
            navigate('/innovation/committee/dashboard', { replace: true });
            return;
        }
        // Preselect last used module for convenience
        const last = (localStorage.getItem('lastModule') as ModuleKey | null) || null;
        if (last) setSelected(last);
        setLastModule(last);

        // Auto-redirect returning users who completed onboarding and have a last module
        const done = localStorage.getItem('onboardingComplete') === 'true';
        // Support override via query param: /onboarding?force=1 or ?reset=1
        if (query.get('clear') === '1') {
            localStorage.removeItem('onboardingComplete');
            localStorage.removeItem('lastModule');
        } else if (query.get('reset') === '1') {
            localStorage.removeItem('onboardingComplete');
        }
        if (!forceOnboarding && done && last) {
            // ensure last still exists in modules once computed below
            setTimeout(() => {
                const map = modulesMap.current;
                if (map && map[last]) {
                    navigate(map[last].path, { replace: true });
                }
            }, 0);
        }
        // If a module was previously selected, redirect away from onboarding
        const previouslySelected = (localStorage.getItem('selectedModule') as ModuleKey | null) || null;
        if (!forceOnboarding && previouslySelected) {
            setTimeout(() => {
                const map = modulesMap.current;
                if (map && map[previouslySelected]) {
                    navigate(map[previouslySelected].path, { replace: true });
                }
            }, 0);
        }
        // Show procurement steps image once after login if flagged
        try {
            const flag = sessionStorage.getItem('showOnboardingImage');
            if (flag === '1') {
                setShowProcurementSteps(true);
                sessionStorage.removeItem('showOnboardingImage');
            }
        } catch {}

        // analytics: page viewed
        logEvent('onboarding_viewed', { role: (userRoles && userRoles[0]) || 'unknown', force: forceOnboarding, hasLast: !!last, done });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const syncLocks = () => setModuleLocks(getModuleLocks());
        window.addEventListener('storage', syncLocks);
        return () => window.removeEventListener('storage', syncLocks);
    }, []);

    const modules = useMemo<ModuleDef[]>(() => {
        const base: ModuleDef[] = [
            {
                id: 'pms' as ModuleKey,
                title: t('onboarding.modules.pms.title'),
                description: t('onboarding.modules.pms.description'),
                icon: '📦',
                gradient: 'from-blue-500 to-blue-700',
                path: isProcurementManager ? '/procurement/manager' : isRequester ? '/apps/requests' : '/procurement/dashboard',
                features: [t('onboarding.modules.pms.features.0'), t('onboarding.modules.pms.features.1'), t('onboarding.modules.pms.features.2')],
                locked: moduleLocks.procurement.locked,
                lockedReason: moduleLocks.procurement.reason,
            },
            {
                id: 'ih' as ModuleKey,
                title: t('onboarding.modules.ih.title'),
                description: t('onboarding.modules.ih.description'),
                icon: '💡',
                gradient: 'from-purple-500 to-pink-600',
                path: '/innovation/dashboard',
                features: [t('onboarding.modules.ih.features.0'), t('onboarding.modules.ih.features.1'), t('onboarding.modules.ih.features.2')],
                locked: moduleLocks.innovation.locked,
                lockedReason: moduleLocks.innovation.reason,
            },
            {
                id: 'budgeting',
                title: 'Budgeting & Financial Planning',
                description: 'Plan, forecast, and control budgets across departments.',
                icon: '💰',
                gradient: 'from-emerald-500 to-teal-600',
                path: '/budgeting',
                features: ['Scenarios & forecasting', 'Approvals & headroom checks', 'Variance tracking'],
                comingSoon: true,
                cta: 'Coming Soon',
                locked: moduleLocks.budgeting.locked,
                lockedReason: moduleLocks.budgeting.reason,
            },
            {
                id: 'audit',
                title: 'Audit Management System',
                description: 'Plan audits, track findings, and manage remediation.',
                icon: '📋',
                gradient: 'from-blue-500 to-indigo-600',
                path: '#',
                features: ['Audit planning', 'Issue tracking', 'Evidence repository'],
                comingSoon: true,
                cta: 'Coming Soon',
                locked: moduleLocks.audit.locked,
                lockedReason: moduleLocks.audit.reason,
            },
            {
                id: 'prime',
                title: 'PRIME – Policy, Risk, Integrated Management Engine',
                description: 'Centralize policies and risk with integrated controls.',
                icon: '🛡️',
                gradient: 'from-violet-500 to-purple-600',
                path: '#',
                features: ['Policy registry', 'Risk matrix', 'Control library'],
                comingSoon: true,
                cta: 'Coming Soon',
                locked: moduleLocks.prime.locked,
                lockedReason: moduleLocks.prime.reason,
            },
            {
                id: 'datapoint',
                title: 'Data Point – Analytics & BI Centre',
                description: 'Dashboards and insights across all modules.',
                icon: '📊',
                gradient: 'from-cyan-500 to-blue-600',
                path: '#',
                features: ['Self-service dashboards', 'KPIs & drilldowns', 'Data exports'],
                comingSoon: true,
                cta: 'Coming Soon',
                locked: moduleLocks.datapoint.locked,
                lockedReason: moduleLocks.datapoint.reason,
            },
            {
                id: 'maintenance',
                title: 'Maintenance & Service Management',
                description: 'Work orders, schedules, and vendor SLAs.',
                icon: '🔧',
                gradient: 'from-orange-500 to-red-600',
                path: '#',
                features: ['Work orders', 'Preventive schedules', 'SLA tracking'],
                comingSoon: true,
                cta: 'Coming Soon',
                locked: moduleLocks.maintenance.locked,
                lockedReason: moduleLocks.maintenance.reason,
            },
            {
                id: 'asset',
                title: 'Asset & Inventory Management',
                description: 'Track assets, lifecycle, and inventory levels.',
                icon: '📦',
                gradient: 'from-amber-500 to-orange-600',
                path: '#',
                features: ['Asset registry', 'Depreciation', 'Stock control'],
                comingSoon: true,
                cta: 'Coming Soon',
                locked: moduleLocks.asset.locked,
                lockedReason: moduleLocks.asset.reason,
            },
            {
                id: 'ppm',
                title: 'Project & Portfolio Management',
                description: 'Deliver projects with timelines and governance.',
                icon: '🎯',
                gradient: 'from-pink-500 to-rose-600',
                path: '#',
                features: ['Roadmaps', 'Resource planning', 'Issue tracking'],
                comingSoon: true,
                cta: 'Coming Soon',
                locked: moduleLocks.project.locked,
                lockedReason: moduleLocks.project.reason,
            },
            {
                id: 'kb',
                title: 'Knowledge Base & Policy Repository',
                description: 'Author, search, and version policies and SOPs.',
                icon: '📚',
                gradient: 'from-indigo-500 to-blue-600',
                path: '#',
                features: ['Rich authoring', 'Structured taxonomy', 'Approvals & versioning'],
                comingSoon: true,
                cta: 'Coming Soon',
                locked: moduleLocks.knowledge.locked,
                lockedReason: moduleLocks.knowledge.reason,
            },
        ];
        // Only expose Committee module to committee members
        if (isCommittee) {
            base.push({
                id: 'committee' as ModuleKey,
                title: t('onboarding.modules.committee.title'),
                description: t('onboarding.modules.committee.description'),
                icon: '⚖️',
                gradient: 'from-violet-600 to-fuchsia-600',
                path: '/innovation/committee/dashboard',
                features: [t('onboarding.modules.committee.features.0'), t('onboarding.modules.committee.features.1'), t('onboarding.modules.committee.features.2')],
                locked: moduleLocks.committee.locked,
                lockedReason: moduleLocks.committee.reason,
            });
        }
        return base;
        // Use JSON stringify to ensure stable comparison
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCommittee, isProcurementManager, isRequester, JSON.stringify(moduleLocks), t]);

    // Map for quick lookups after render
    const modulesMap = useRef<{ [k in ModuleKey]?: { path: string; title: string; comingSoon?: boolean; cta?: string } }>({});
    modulesMap.current = modules.reduce((acc, m) => {
        acc[m.id] = { path: m.path, title: m.title, comingSoon: m.comingSoon, cta: m.cta };
        return acc;
    }, {} as { [k in ModuleKey]?: { path: string; title: string; comingSoon?: boolean; cta?: string } });

    const modulePath = (key: ModuleKey) => {
        const m = modules.find((mm) => mm.id === key);
        if (!m) return '/procurement/dashboard';
        if (m.comingSoon) return '';
        return m.path || '/procurement/dashboard';
    };

    // Auto-route if only one available module (e.g., restricted role)
    useEffect(() => {
        if (!isCommittee && modules.length === 1) {
            navigate(modules[0].path, { replace: true });
        }
    }, [modules, navigate, isCommittee]);

    const handleContinue = async () => {
        setError('');
        if (!selected) {
            setError(t('onboarding.errors.selectOne'));
            return;
        }
        // Block coming soon modules
        const selDef = modules.find((m) => m.id === selected);
        if (selDef?.locked) {
            setError(selDef.lockedReason || 'This module has been locked by an administrator.');
            return;
        }
        if (selDef && selDef.comingSoon) {
            setError('This module is coming soon.');
            return;
        }
        // Narrow selection to store-supported modules only
        const isStoreModule = (k: ModuleKey): k is StoreModuleKey => (['pms', 'ih', 'committee', 'budgeting'] as string[]).includes(k);
        if (!isStoreModule(selected)) {
            setError('This module is not available yet.');
            return;
        }
        try {
            setIsBusy(true);
            // Remember last used module for convenience
            localStorage.setItem('lastModule', selected);
            localStorage.setItem('selectedModule', selected);
            setLastModule(selected);
            dispatch(setSelectedModule(selected));
            // Persist onboarding completion only if the user opts in
            if (rememberChoice) {
                localStorage.setItem('onboardingComplete', 'true');
                dispatch(setOnboardingComplete(true));
            } else {
                dispatch(setOnboardingComplete(false));
            }
            // Small UX delay
            await new Promise((r) => setTimeout(r, 200));
            // analytics: continue
            logEvent('onboarding_continue', { selected, rememberChoice });
            navigate(modulePath(selected), { replace: true });
        } finally {
            setIsBusy(false);
        }
    };

    const checkScrollButtons = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        setCanScrollLeft(container.scrollLeft > 0);
        setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth - 10);
    }, []);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (container) {
            checkScrollButtons();
            container.addEventListener('scroll', checkScrollButtons);
            window.addEventListener('resize', checkScrollButtons);
            return () => {
                container.removeEventListener('scroll', checkScrollButtons);
                window.removeEventListener('resize', checkScrollButtons);
            };
        }
    }, [checkScrollButtons, modules]);

    const scroll = (direction: 'left' | 'right') => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const scrollAmount = 400;
        container.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth',
        });
    };

    const onKeyDownRadios = useCallback(
        (e: React.KeyboardEvent<HTMLDivElement>) => {
            if (!modules.length) return;
            const order = modules.map((m) => m.id);
            const idx = selected ? order.indexOf(selected) : 0;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                const next = order[(idx + 1) % order.length];
                setSelected(next);
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                const prev = order[(idx - 1 + order.length) % order.length];
                setSelected(prev);
            } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleContinue();
            }
        },
        [modules, selected]
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
            {/* Header */}
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="text-5xl motion-safe:animate-[spin_20s_linear_infinite]">🌀</div>
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-full blur-xl"></div>
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-3xl font-black bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent tracking-widest">SPINX</h1>
                                    <span className="px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-bold rounded-full border border-primary/20">ENTERPRISE</span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Bureau of Standards Jamaica</p>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center gap-6">
                            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200/50 dark:border-blue-700/50">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Welcome, {currentUser?.name || 'User'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Onboarding Procurement Steps Modal */}
            {showProcurementSteps && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Procurement Process Steps">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-[92vw] max-w-6xl relative overflow-hidden animate__animated animate__fadeIn">
                        <button
                            type="button"
                            onClick={() => setShowProcurementSteps(false)}
                            className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            aria-label="Close procurement steps"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                            <span className="text-2xl">📊</span>
                            <h2 className="text-xl font-semibold tracking-wide">6 Steps of the Procurement Process</h2>
                        </div>
                        <div className="p-6 bg-white dark:bg-gray-800">
                            <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 max-h-[75vh]">
                                {/* Prefer a custom image if present (drop your replacement as
                                    public/assets/images/procurement/steps-custom.jpg).
                                    If that file is missing the code falls back to the
                                    original `steps.jpg`. */}
                                <img
                                    src="/assets/images/procurement/steps-custom.jpg"
                                    alt="Diagram showing the 6 steps of the procurement process"
                                    className="w-full h-auto max-h-[70vh] object-contain"
                                    loading="lazy"
                                    onError={(e) => {
                                        // fallback to the original filename if custom not present
                                        try {
                                            (e.currentTarget as HTMLImageElement).onerror = null;
                                            (e.currentTarget as HTMLImageElement).src = '/assets/images/procurement/steps.png';
                                        } catch (err) {
                                            // noop
                                        }
                                    }}
                                />
                            </div>
                            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                This overview highlights each phase from sourcing methodology through supplier relationship management. Use it as a quick refresher before selecting a module.
                            </p>
                        </div>
                        <div className="px-6 pb-6 flex justify-end gap-3">
                            <button type="button" onClick={() => setShowProcurementSteps(false)} className="btn btn-outline-secondary btn-sm">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {/* Quick Stats Banner */}
                {showStats && (
                    <div className="mb-12 grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeInUp">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                                <svg className="w-8 h-8 opacity-80" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                </svg>
                            </div>
                            <div className="text-3xl font-black mb-1">{systemStats.activeUsers.toLocaleString()}</div>
                            <div className="text-blue-100 text-sm font-medium">Active Users</div>
                        </div>
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                                <svg className="w-8 h-8 opacity-80" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </div>
                            <div className="text-3xl font-black mb-1">{systemStats.requestsThisMonth.toLocaleString()}</div>
                            <div className="text-purple-100 text-sm font-medium">Requests This Month</div>
                        </div>
                        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                                <svg className="w-8 h-8 opacity-80" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            </div>
                            <div className="text-3xl font-black mb-1">{systemStats.innovationIdeas.toLocaleString()}</div>
                            <div className="text-green-100 text-sm font-medium">Innovation Ideas</div>
                        </div>
                        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                                <svg className="w-8 h-8 opacity-80" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </div>
                            <div className="text-3xl font-black mb-1">{systemStats.pendingApprovals.toLocaleString()}</div>
                            <div className="text-orange-100 text-sm font-medium">Pending Approvals</div>
                        </div>
                    </div>
                )}

                <div className="text-center mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 text-primary rounded-full text-sm font-bold mb-6 border border-primary/20 shadow-sm">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                        </svg>
                        Your Integrated Enterprise Platform
                    </div>
                    <h2 id="onboarding-title" className="text-5xl md:text-6xl font-black text-gray-900 dark:text-white mb-4 leading-tight">
                        {t('onboarding.title')}
                    </h2>
                    <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed mb-6">{t('onboarding.subtitle')}</p>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </svg>
                        <span className="font-medium">Powered by SPINX Enterprise Platform</span>
                    </div>
                    <div className="flex items-center justify-center gap-8 mt-8 text-sm text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span>All systems operational</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                            </svg>
                            <span>Secure connection</span>
                        </div>
                    </div>
                </div>

                {error && (
                    <div
                        role="alert"
                        aria-live="polite"
                        className="max-w-3xl mx-auto mb-8 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg text-red-700 dark:text-red-400 text-sm flex items-center gap-3 shadow-sm animate-shake"
                    >
                        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                {/* Module Cards (radiogroup) */}
                <div className="relative group/carousel">
                    {/* Left Arrow */}
                    {canScrollLeft && (
                        <button
                            type="button"
                            onClick={() => scroll('left')}
                            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-full shadow-xl flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-all opacity-0 group-hover/carousel:opacity-100"
                            aria-label="Scroll left"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}

                    {/* Right Arrow */}
                    {canScrollRight && (
                        <button
                            type="button"
                            onClick={() => scroll('right')}
                            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-full shadow-xl flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 transition-all opacity-0 group-hover/carousel:opacity-100"
                            aria-label="Scroll right"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    )}

                    <div
                        ref={scrollContainerRef}
                        className="overflow-x-auto pb-6 hide-scrollbar scroll-smooth"
                        style={{
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                            WebkitOverflowScrolling: 'touch',
                        }}
                    >
                        <div ref={radiosRef} role="radiogroup" aria-labelledby="onboarding-title" className="flex gap-6 min-w-max px-2" onKeyDown={onKeyDownRadios} tabIndex={0}>
                            {modules.map((m, index) => {
                                const isActive = selected === m.id;
                                const isLocked = m.locked === true;
                                return (
                                    <button
                                        role="radio"
                                        aria-checked={isActive}
                                        aria-disabled={isLocked || m.comingSoon}
                                        tabIndex={isActive ? 0 : -1}
                                        key={m.id}
                                        type="button"
                                        onClick={() => {
                                            if (isLocked) {
                                                setError(m.lockedReason || 'This module has been locked by an administrator.');
                                                return;
                                            }
                                            setSelected(m.id);
                                            logEvent('onboarding_selected', { selected: m.id });
                                        }}
                                        style={{ animationDelay: `${index * 50}ms` }}
                                        className={`group relative text-left bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl overflow-hidden border-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 animate-fadeInUp flex-shrink-0 w-[380px] h-[540px] flex flex-col transition-all duration-500 ${
                                            isActive
                                                ? 'border-primary shadow-primary/20 shadow-2xl scale-110 z-20 opacity-100 translate-y-0'
                                                : selected
                                                ? 'border-gray-200 dark:border-gray-700 hover:border-primary/60 opacity-50 hover:opacity-70 scale-95 translate-y-2'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-primary/60 opacity-100 hover:scale-105 hover:-translate-y-1'
                                        } ${m.comingSoon ? 'opacity-80' : ''} ${isLocked ? 'cursor-not-allowed opacity-60' : ''}`}
                                    >
                                        {/* Gradient Header */}
                                        <div className={`bg-gradient-to-br ${m.gradient} p-6 text-white relative overflow-hidden flex-shrink-0`}>
                                            {/* Animated background pattern */}
                                            <div className="absolute inset-0 opacity-10">
                                                <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full mix-blend-overlay filter blur-xl animate-blob"></div>
                                                <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full mix-blend-overlay filter blur-xl animate-blob animation-delay-2000"></div>
                                                <div className="absolute bottom-0 left-20 w-40 h-40 bg-white rounded-full mix-blend-overlay filter blur-xl animate-blob animation-delay-4000"></div>
                                            </div>

                                            {/* Top badges */}
                                            <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                                                {m.comingSoon && (
                                                    <span className="bg-white/30 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border border-white/20">
                                                        Coming Soon
                                                    </span>
                                                )}
                                                {m.locked && (
                                                    <span className="bg-red-500/80 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border border-red-100/30">
                                                        Locked by Admin
                                                    </span>
                                                )}
                                                {isActive && !m.comingSoon && (
                                                    <span className="bg-white/30 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg border border-white/20 animate-pulse">
                                                        ✓ {t('onboarding.badges.selected')}
                                                    </span>
                                                )}
                                                {!m.comingSoon && (m.id === 'pms' || m.id === 'ih') && (
                                                    <span className="bg-white/20 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-lg border border-white/20 flex items-center gap-1">
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                                        </svg>
                                                        {moduleStats[m.id as 'pms' | 'ih'].activeNow} {moduleStats[m.id as 'pms' | 'ih'].activeNow === 1 ? 'user' : 'users'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="absolute top-0 right-0 text-9xl opacity-5 transform translate-x-6 -translate-y-6 group-hover:scale-110 transition-transform duration-500">
                                                {m.icon}
                                            </div>
                                            <div className="relative z-10">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <div className="text-5xl transform group-hover:scale-110 transition-transform duration-300">{m.icon}</div>
                                                    {!m.comingSoon && m.id === 'pms' && (
                                                        <span className="px-2 py-1 bg-yellow-400/90 text-yellow-900 text-[10px] font-black rounded uppercase tracking-wider shadow-sm">
                                                            Most Popular
                                                        </span>
                                                    )}
                                                    {!m.comingSoon && m.id === 'ih' && (
                                                        <span className="px-2 py-1 bg-green-400/90 text-green-900 text-[10px] font-black rounded uppercase tracking-wider shadow-sm flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                <path
                                                                    fillRule="evenodd"
                                                                    d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
                                                                    clipRule="evenodd"
                                                                />
                                                            </svg>
                                                            Trending
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-xl font-bold mb-2 leading-tight">{m.title}</h3>
                                                <p className="text-white/90 text-sm leading-relaxed">{m.description}</p>
                                            </div>
                                        </div>

                                        {/* Features List */}
                                        <div className="p-6 flex-1 flex flex-col">
                                            <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                                {t('onboarding.keyFeatures')}
                                            </h4>
                                            <ul className="space-y-2.5 flex-1">
                                                {m.features.map((feature, idx) => (
                                                    <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-gray-300 text-sm">
                                                        <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                                            <path
                                                                fillRule="evenodd"
                                                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                                clipRule="evenodd"
                                                            />
                                                        </svg>
                                                        <span className="leading-snug">{feature}</span>
                                                    </li>
                                                ))}
                                            </ul>

                                            {/* Selected Indicator */}
                                            <div className="mt-auto pt-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                                                {m.locked && (
                                                    <div className="mb-3 flex items-center gap-2 text-xs text-red-600 dark:text-red-300">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                                            />
                                                        </svg>
                                                        <span>{m.lockedReason || 'Locked by administrator'}</span>
                                                    </div>
                                                )}
                                                {!m.comingSoon && (m.id === 'pms' || m.id === 'ih') && (
                                                    <div className="mb-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                        <div className="flex items-center gap-1">
                                                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                                                            <span className="font-medium">{moduleStats[m.id].activeNow} active now</span>
                                                        </div>
                                                        <span>•</span>
                                                        <span>{moduleStats[m.id].today} today</span>
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {lastModule === m.id && (
                                                            <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary font-semibold border border-primary/20">
                                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                                </svg>
                                                                {t('onboarding.badges.recommended')}
                                                            </span>
                                                        )}
                                                        <span className={`text-xs font-semibold ${isActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`}>
                                                            {isActive ? '✓ ' + t('onboarding.selected') : t('onboarding.clickToSelect')}
                                                        </span>
                                                    </div>
                                                    {isActive &&
                                                        (m.comingSoon ? (
                                                            <div
                                                                className="btn btn-sm px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed rounded-lg font-semibold text-xs"
                                                                role="button"
                                                                tabIndex={-1}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {m.cta || 'Coming Soon'}
                                                            </div>
                                                        ) : m.locked ? (
                                                            <div
                                                                className="btn btn-sm px-4 py-2 bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-200 cursor-not-allowed rounded-lg font-semibold text-xs"
                                                                role="button"
                                                                tabIndex={-1}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                Locked
                                                            </div>
                                                        ) : (
                                                            <div
                                                                role="button"
                                                                tabIndex={0}
                                                                className="btn btn-primary btn-sm px-4 py-2 rounded-lg font-semibold text-xs cursor-pointer transform hover:scale-105 transition-transform shadow-lg hover:shadow-xl"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleContinue();
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        handleContinue();
                                                                    }
                                                                }}
                                                            >
                                                                {m.cta ||
                                                                    (selected === 'pms'
                                                                        ? t('onboarding.goTo.pms')
                                                                        : selected === 'ih'
                                                                        ? t('onboarding.goTo.ih')
                                                                        : selected === 'committee'
                                                                        ? t('onboarding.goTo.committee')
                                                                        : t('onboarding.continue'))}
                                                                <svg className="w-4 h-4 inline-block ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                                </svg>
                                                            </div>
                                                        ))}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Controls */}
                <div className="max-w-4xl mx-auto mt-16">
                    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8">
                        <div className="flex items-center justify-between flex-col lg:flex-row gap-6">
                            <div className="flex gap-4 w-full lg:w-auto">
                                <button
                                    type="button"
                                    className="btn btn-primary px-8 py-3 rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 transition-all w-full lg:w-auto"
                                    disabled={!selected || isBusy || (selected ? modulesMap.current[selected]?.comingSoon : false)}
                                    onClick={handleContinue}
                                >
                                    {isBusy ? (
                                        <span className="flex items-center justify-center gap-3">
                                            <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-5 h-5"></span>
                                            <span>{t('onboarding.redirecting')}</span>
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            {selected && modulesMap.current[selected]?.cta
                                                ? modulesMap.current[selected]?.cta
                                                : selected === 'pms'
                                                ? t('onboarding.goTo.pms')
                                                : selected === 'ih'
                                                ? t('onboarding.goTo.ih')
                                                : selected === 'committee'
                                                ? t('onboarding.goTo.committee')
                                                : t('onboarding.continue')}
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </span>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer note */}
                    <div className="text-center mt-10 space-y-4">
                        <div className="flex items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                                <span className="font-medium">Enterprise-Grade Security</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <span className="font-medium">ISO 9001 Certified</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                        fillRule="evenodd"
                                        d="M2 5a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm14 1a1 1 0 11-2 0 1 1 0 012 0zM2 13a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2zm14 1a1 1 0 11-2 0 1 1 0 012 0z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                <span className="font-medium">99.9% Uptime SLA</span>
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Powered by SPINX Enterprise Platform v2.0.1-beta.1 • © 2025 Bureau of Standards Jamaica</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
