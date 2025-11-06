import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { getUser } from '../../../utils/auth';

type ModuleKey = 'pms' | 'ih' | 'committee';

const Onboarding = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const currentUser = getUser();
    const isCommittee = currentUser?.role === 'INNOVATION_COMMITTEE';

    const [selected, setSelected] = useState<ModuleKey | null>(null);
    const [error, setError] = useState<string>('');
    const [isBusy, setIsBusy] = useState<boolean>(false);

    useEffect(() => {
        dispatch(setPageTitle('Welcome — Choose Your Module'));
        // If a committee member somehow lands here, redirect them to their dashboard
        if (isCommittee) {
            navigate('/innovation/committee/dashboard', { replace: true });
        }
    }, [dispatch, isCommittee, navigate]);

    const modules = useMemo(() => {
        const base = [
            {
                id: 'pms' as ModuleKey,
                title: 'Procurement Management System',
                description: 'Manage requests, RFQs, suppliers, purchase orders, and payments',
                icon: '📦',
                gradient: 'from-blue-500 to-blue-700',
                path: '/procurement/dashboard',
                features: ['Request Management', 'RFQ & Quotes', 'Supplier Management', 'Purchase Orders', 'Payment Processing'],
            },
            {
                id: 'ih' as ModuleKey,
                title: 'Innovation Hub',
                description: 'Submit ideas, vote on innovations, and drive BSJ projects forward',
                icon: '💡',
                gradient: 'from-purple-500 to-pink-600',
                path: '/innovation/dashboard',
                features: ['Submit Ideas', 'Vote on Innovations', 'Browse Popular Ideas', 'Track Your Submissions', 'Project Promotions'],
            },
        ];
        // Only expose Committee module to committee members
        if (isCommittee) {
            base.push({
                id: 'committee' as ModuleKey,
                title: 'Committee Dashboard',
                description: 'Review and approve innovation idea submissions',
                icon: '⚖️',
                gradient: 'from-violet-600 to-fuchsia-600',
                path: '/innovation/committee/dashboard',
                features: ['Review Submissions', 'Approve/Reject Ideas', 'Set Priorities', 'Manage Implementation', 'View Analytics'],
            });
        }
        return base;
    }, [isCommittee]);

    const modulePath = (key: ModuleKey) => modules.find((m) => m.id === key)?.path || '/procurement/dashboard';

    const handleContinue = async () => {
        setError('');
        if (!selected) {
            setError('Please select a module to continue');
            return;
        }
        try {
            setIsBusy(true);
            // Mark onboarding as complete
            localStorage.setItem('onboardingComplete', 'true');
            // Small UX delay
            await new Promise((r) => setTimeout(r, 200));
            navigate(modulePath(selected));
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center gap-4">
                        <div className="text-5xl animate-[spin_20s_linear_infinite]">🌀</div>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white" style={{ letterSpacing: '0.1em' }}>
                                SPINX
                            </h1>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Bureau of Standards Jamaica</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Welcome! Let’s get you started</h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Choose which module you want to use right now. You can switch anytime from the header.
                    </p>
                </div>

                {error && (
                    <div className="max-w-3xl mx-auto mb-6 p-4 bg-danger-light/10 border border-danger rounded-lg text-danger text-sm text-center">
                        {error}
                    </div>
                )}

                {/* Module Cards */}
                <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                    {modules.map((m) => {
                        const isActive = selected === m.id;
                        return (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => setSelected(m.id)}
                                className={`group relative text-left bg-white dark:bg-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 ${
                                    isActive ? 'border-primary' : 'border-transparent hover:border-primary/60'
                                }`}
                            >
                                {/* Gradient Header */}
                                <div className={`bg-gradient-to-r ${m.gradient} p-8 text-white relative overflow-hidden`}>
                                    <div className="absolute top-0 right-0 text-9xl opacity-10 transform translate-x-4 -translate-y-4">{m.icon}</div>
                                    <div className="relative z-10">
                                        <div className="text-6xl mb-4">{m.icon}</div>
                                        <h3 className="text-2xl font-bold mb-2">{m.title}</h3>
                                        <p className="text-white/90">{m.description}</p>
                                    </div>
                                </div>

                                {/* Features List */}
                                <div className="p-8">
                                    <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Key Features</h4>
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
                                        <span className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}`}>
                                            {isActive ? 'Selected' : 'Click to select'}
                                        </span>
                                        {isActive && (
                                            <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
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
                                Need Help
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
                                        Redirecting...
                                    </span>
                                ) : (
                                    'Continue'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Onboarding;
