import { useLocation, useNavigate } from 'react-router-dom';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { setSelectedModule, setOnboardingComplete } from '../../../store/moduleSlice';
import { getUser } from '../../../utils/auth';
import { useTranslation } from 'react-i18next';
import { logEvent } from '../../../utils/analytics';

type ModuleKey = 'pms' | 'ih' | 'committee';

const Onboarding = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { search } = useLocation();
    const query = useMemo(() => new URLSearchParams(search), [search]);
    const forceOnboarding = query.get('force') === '1' || query.get('reset') === '1';
    const currentUser = getUser();
    const userRoles: string[] = (currentUser as any)?.roles || ((currentUser as any)?.role ? [(currentUser as any).role] : []);
    const isCommittee = userRoles.includes('INNOVATION_COMMITTEE');
    const isProcurementManager =
        userRoles.includes('PROCUREMENT_MANAGER') ||
        userRoles.includes('MANAGER') ||
        userRoles.some((r) => r && r.toUpperCase().includes('MANAGER'));
    const isRequester = !isProcurementManager && userRoles.some((r) => r && r.toUpperCase().includes('REQUEST'));

    const [selected, setSelected] = useState<ModuleKey | null>(null);
    const [error, setError] = useState<string>('');
    const [isBusy, setIsBusy] = useState<boolean>(false);
    const [rememberChoice, setRememberChoice] = useState<boolean>(false);
    const [lastModule, setLastModule] = useState<ModuleKey | null>(null);
    const radiosRef = useRef<HTMLDivElement | null>(null);
    const [showProcurementSteps, setShowProcurementSteps] = useState<boolean>(false);

    useEffect(() => {
        dispatch(setPageTitle(t('onboarding.title')));
        // If a committee member somehow lands here, redirect them to their dashboard
        if (isCommittee) {
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
    }, [dispatch, isCommittee, navigate, query, forceOnboarding, t, userRoles]);

    const modules = useMemo(() => {
        const base = [
            {
                id: 'pms' as ModuleKey,
                title: t('onboarding.modules.pms.title'),
                description: t('onboarding.modules.pms.description'),
                icon: '📦',
                gradient: 'from-blue-500 to-blue-700',
                path: isProcurementManager ? '/procurement/manager' : isRequester ? '/apps/requests' : '/procurement/dashboard',
                features: [
                    t('onboarding.modules.pms.features.0'),
                    t('onboarding.modules.pms.features.1'),
                    t('onboarding.modules.pms.features.2'),
                ],
            },
            {
                id: 'ih' as ModuleKey,
                title: t('onboarding.modules.ih.title'),
                description: t('onboarding.modules.ih.description'),
                icon: '💡',
                gradient: 'from-purple-500 to-pink-600',
                path: '/innovation/dashboard',
                features: [
                    t('onboarding.modules.ih.features.0'),
                    t('onboarding.modules.ih.features.1'),
                    t('onboarding.modules.ih.features.2'),
                ],
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
                features: [
                    t('onboarding.modules.committee.features.0'),
                    t('onboarding.modules.committee.features.1'),
                    t('onboarding.modules.committee.features.2'),
                ],
            });
        }
        return base;
    }, [isCommittee, t]);

    // Map for quick lookups after render
    const modulesMap = useRef<{ [k in ModuleKey]?: { path: string; title: string } }>({});
    modulesMap.current = modules.reduce((acc, m) => {
        acc[m.id] = { path: m.path, title: m.title };
        return acc;
    }, {} as { [k in ModuleKey]?: { path: string; title: string } });

    const modulePath = (key: ModuleKey) => modules.find((m) => m.id === key)?.path || '/procurement/dashboard';

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
            navigate(modulePath(selected));
        } finally {
            setIsBusy(false);
        }
    };

    const onKeyDownRadios = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
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
    }, [modules, selected]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-4">
                        <div className="text-5xl motion-safe:animate-[spin_20s_linear_infinite]">🌀</div>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-widest">SPINX</h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Bureau of Standards Jamaica</p>
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
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                            <span className="text-2xl">📊</span>
                            <h2 className="text-xl font-semibold tracking-wide">7 Steps of the Procurement Process</h2>
                        </div>
                        <div className="p-6 bg-white dark:bg-gray-800">
                            <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 max-h-[75vh]">
                                {/* Replace src below with final asset if needed */}
                                <img
                                    src="/assets/images/procurement/steps.jpg"
                                    alt="Diagram showing the 7 steps of the procurement process"
                                    className="w-full h-auto max-h-[70vh] object-contain"
                                    loading="lazy"
                                />
                            </div>
                            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                This overview highlights each phase from sourcing methodology through supplier relationship management. Use it as a quick refresher before selecting a module.
                            </p>
                        </div>
                        <div className="px-6 pb-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setShowProcurementSteps(false)}
                                className="btn btn-outline-secondary btn-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-12">
                    <h2 id="onboarding-title" className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{t('onboarding.title')}</h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        {t('onboarding.subtitle')}
                    </p>
                </div>

                {error && (
                    <div role="alert" aria-live="polite" className="max-w-3xl mx-auto mb-6 p-4 bg-danger-light/10 border border-danger rounded-lg text-danger text-sm text-center">
                        {error}
                    </div>
                )}

                {/* Module Cards (radiogroup) */}
                <div
                    ref={radiosRef}
                    role="radiogroup"
                    aria-labelledby="onboarding-title"
                    className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto"
                    onKeyDown={onKeyDownRadios}
                    tabIndex={0}
                >
                    {modules.map((m) => {
                        const isActive = selected === m.id;
                        return (
                            <button
                                role="radio"
                                aria-checked={isActive}
                                tabIndex={isActive ? 0 : -1}
                                key={m.id}
                                type="button"
                                onClick={() => {
                                    setSelected(m.id);
                                    logEvent('onboarding_selected', { selected: m.id });
                                }}
                                className={`group relative text-left bg-white dark:bg-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 ${
                                    isActive ? 'border-primary' : 'border-transparent hover:border-primary/60'
                                }`}
                            >
                                {/* Gradient Header */}
                                <div className={`bg-gradient-to-r ${m.gradient} p-6 md:p-8 text-white relative overflow-hidden`}>
                                    {isActive && (
                                        <span className="absolute top-3 right-3 bg-white/20 text-white text-xs font-bold px-2 py-1 rounded-full backdrop-blur-sm">
                                            {t('onboarding.badges.selected')}
                                        </span>
                                    )}
                                    <div className="absolute top-0 right-0 text-9xl opacity-10 transform translate-x-4 -translate-y-4">{m.icon}</div>
                                    <div className="relative z-10">
                                        <div className="text-5xl md:text-6xl mb-4">{m.icon}</div>
                                        <h3 className="text-2xl font-bold mb-2">{m.title}</h3>
                                        <p className="text-white/90">{m.description}</p>
                                    </div>
                                </div>

                                {/* Features List */}
                                <div className="p-8">
                                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">{t('onboarding.keyFeatures')}</h4>
                                    <ul className="space-y-3">
                                        {m.features.map((feature, idx) => (
                                            <li key={idx} className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                                                <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* Selected Indicator */}
                                    <div className="mt-6 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            {/* Recommended badge if last-used */}
                                            {lastModule === m.id && (
                                                <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">{t('onboarding.badges.recommended')}</span>
                                            )}
                                            <span className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`}>
                                                {isActive ? t('onboarding.selected') : t('onboarding.clickToSelect')}
                                            </span>
                                        </div>
                                        {isActive && (
                                            <button
                                                type="button"
                                                className="btn btn-primary btn-sm"
                                                onClick={handleContinue}
                                            >
                                                {selected === 'pms' && t('onboarding.goTo.pms')}
                                                {selected === 'ih' && t('onboarding.goTo.ih')}
                                                {selected === 'committee' && t('onboarding.goTo.committee')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Controls */}
                <div className="max-w-3xl mx-auto mt-10">
                    <div className="flex items-center justify-center flex-col sm:flex-row gap-4">
                        <div className="flex gap-3 w-full sm:w-auto">
                            <button
                                type="button"
                                className="btn btn-outline-primary w-full sm:w-auto"
                                onClick={() => navigate('/help')}
                            >
                                {t('onboarding.needHelp')}
                            </button>
                            <button
                                type="button"
                                className="btn btn-primary w-full sm:w-auto min-w-[160px] disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!selected || isBusy}
                                onClick={handleContinue}
                            >
                                {isBusy ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-5 h-5"></span>
                                        {t('onboarding.redirecting')}
                                    </span>
                                ) : (
                                    selected === 'pms' ? t('onboarding.goTo.pms') : selected === 'ih' ? t('onboarding.goTo.ih') : t('onboarding.continue')
                                )}
                            </button>
                        </div>
                        <div className="mt-2 sm:mt-0">
                            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="form-checkbox"
                                    checked={rememberChoice}
                                    onChange={(e) => {
                                        setRememberChoice(e.target.checked);
                                        logEvent('onboarding_remember_toggled', { checked: e.target.checked });
                                    }}
                                />
                                {t('onboarding.remember')}
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;