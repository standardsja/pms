import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../store/themeConfigSlice';
import { selectUser } from '../store/authSlice';

const ModuleSelector = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const user = useSelector(selectUser);

    useEffect(() => {
        dispatch(setPageTitle('Select Module'));
        
        // Redirect committee users directly to their dashboard
        if (user?.roles?.includes('INNOVATION_COMMITTEE')) {
            navigate('/innovation/committee/dashboard', { replace: true });
        }
    }, [dispatch, user, navigate]);

    const modules = [
        {
            id: 'pms',
            title: 'Smart Portal for Information Exchange',
            description: 'Manage requests, RFQs, suppliers, purchase orders, and payments',
            icon: '📦',
            gradient: 'from-blue-500 to-blue-700',
            path: '/procurement/dashboard',
            features: [
                'Request Management',
                'RFQ & Quotes',
                'Supplier Management',
                'Purchase Orders',
                'Payment Processing'
            ]
        },
        {
            id: 'ih',
            title: 'Innovative Hub',
            description: 'Submit ideas, vote on innovations, and drive BSJ projects forward',
            icon: '💡',
            gradient: 'from-purple-500 to-pink-600',
            path: '/innovation/dashboard',
            features: [
                'Submit Ideas',
                'Vote on Innovations',
                'Browse Popular Ideas',
                'Track Your Submissions',
                'Project Promotions'
            ]
        }
    ];

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
                    <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        Welcome! Choose Your Module
                    </h2>
                    <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                        Select the system you'd like to access. You can switch between modules anytime.
                    </p>
                </div>

                {/* Module Cards */}
                <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                    {modules.map((module) => (
                        <div
                            key={module.id}
                            onClick={() => navigate(module.path)}
                            className="group relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border-2 border-transparent hover:border-primary"
                        >
                            {/* Gradient Header */}
                            <div className={`bg-gradient-to-r ${module.gradient} p-8 text-white relative overflow-hidden`}>
                                <div className="absolute top-0 right-0 text-9xl opacity-10 transform translate-x-4 -translate-y-4">
                                    {module.icon}
                                </div>
                                <div className="relative z-10">
                                    <div className="text-6xl mb-4">{module.icon}</div>
                                    <h3 className="text-2xl font-bold mb-2">{module.title}</h3>
                                    <p className="text-white/90">{module.description}</p>
                                </div>
                            </div>

                            {/* Features List */}
                            <div className="p-8">
                                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
                                    Key Features
                                </h4>
                                <ul className="space-y-3">
                                    {module.features.map((feature, idx) => (
                                        <li key={idx} className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                                            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                {/* CTA Button */}
                                <button className="mt-8 w-full btn btn-primary py-3 text-base font-semibold group-hover:scale-105 transition-transform">
                                    Access {module.title.split(' ')[0]}
                                    <svg className="w-5 h-5 ml-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Info */}
                <div className="mt-12 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Need help? Contact{' '}
                        <a href="/help" className="text-primary hover:underline">
                            IT Support
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ModuleSelector;
