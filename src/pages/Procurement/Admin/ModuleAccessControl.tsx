import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconLock from '../../../components/Icon/IconLock';
import IconLockOpen from '../../../components/Icon/IconLockOpen';
import IconChevronRight from '../../../components/Icon/IconChevronRight';
import IconInfoCircle from '../../../components/Icon/IconInfoCircle';
import { getModuleLocks, LOCKABLE_MODULES, setModuleLock, type LockableModuleKey, type ModuleLockState } from '../../../utils/moduleLocks';
import { getUser } from '../../../utils/auth';

// Pre-made reason templates
const PRESET_REASONS = [
    'Coming soon',
    'Under maintenance',
    'System update in progress',
    'Security audit',
    'Performance optimization',
    'Database migration',
    'Temporary feature disabled',
    'Bug fix in progress',
    'Awaiting approval',
];

const ModuleAccessControl = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(setPageTitle('Module Access Control'));
    }, [dispatch]);

    const [moduleLocks, setModuleLocks] = useState<ModuleLockState>(getModuleLocks());
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [transitioningModule, setTransitioningModule] = useState<LockableModuleKey | null>(null);
    const [showReasonModal, setShowReasonModal] = useState(false);
    const [reasonModalModule, setReasonModalModule] = useState<LockableModuleKey | null>(null);
    const [reasonType, setReasonType] = useState<'preset' | 'custom'>('preset');
    const [selectedPreset, setSelectedPreset] = useState(PRESET_REASONS[0]);
    const [customReason, setCustomReason] = useState('');

    const adminIdentity = useMemo(() => {
        const user = getUser();
        return user?.name || user?.email || 'Admin';
    }, []);

    // Sync lock state across tabs
    useEffect(() => {
        const handleStorageChange = () => {
            setModuleLocks(getModuleLocks());
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const openReasonModal = (key: LockableModuleKey) => {
        setReasonModalModule(key);
        setReasonType('preset');
        setSelectedPreset(PRESET_REASONS[0]);
        setCustomReason('');
        setShowReasonModal(true);
    };

    const handleLockWithReason = async () => {
        if (!reasonModalModule) return;

        try {
            const reason = reasonType === 'preset' ? selectedPreset : customReason.trim();

            if (!reason) {
                setErrorMessage('Please enter or select a reason');
                setShowError(true);
                setTimeout(() => setShowError(false), 3000);
                return;
            }

            setTransitioningModule(reasonModalModule);
            setShowReasonModal(false);

            try {
                const updatedLocks = await updateModuleLock(reasonModalModule, true, { reason });
                setModuleLocks(updatedLocks);

                const label = LOCKABLE_MODULES.find((m) => m.key === reasonModalModule)?.label || reasonModalModule;
                setSuccessMessage(`${label} locked with reason: "${reason}"`);
                setShowSuccess(true);

                setTimeout(() => setShowSuccess(false), 2200);
            } catch (error) {
                console.error('Failed to update module lock:', error);
                setErrorMessage('Failed to update module lock. Please try again.');
                setShowError(true);
                setTimeout(() => setShowError(false), 3000);
            } finally {
                setTransitioningModule(null);
                setReasonModalModule(null);
            }
        } catch (error) {
            console.error('Error locking module with reason:', error);
            setTransitioningModule(null);
            setErrorMessage('An error occurred. Please try again.');
            setShowError(true);
            setTimeout(() => setShowError(false), 3000);
        }
    };

    const handleToggleLock = (key: LockableModuleKey) => {
        const currentState = moduleLocks[key]?.locked ?? false;

        // If unlocking, just toggle
        if (currentState) {
            // Module is currently locked, so unlock without asking for reason
            setTransitioningModule(key);
            setTimeout(() => {
                const updatedLocks = setModuleLock(key, false, { updatedBy: adminIdentity });
                setModuleLocks(updatedLocks);
                setTransitioningModule(null);

                const label = LOCKABLE_MODULES.find((m) => m.key === key)?.label || key;
                setSuccessMessage(`${label} successfully unlocked`);
                setShowSuccess(true);

                setTimeout(() => setShowSuccess(false), 2200);
            }, 300);
        } else {
            // Module is currently unlocked, show reason modal before locking
            openReasonModal(key);
        }
    };  }, 300);
    };          <p className="text-gray-600 dark:text-gray-400">Manage which modules are available to users. Lock modules to prevent access without code deployment.</p>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 rounded-lg">
                    <div className="flex items-center gap-2">
                        <IconLoader className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
                        <span className="text-blue-800 dark:text-blue-200 font-semibold">Loading module lock states...</span>
                    </div>
                </div>
            )}

            {/* Error Toast */}
            {showError && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 rounded-lg">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                            <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <span className="text-red-800 dark:text-red-200 font-semibold">{errorMessage}</span>
                    </div>
                </div>
            )}

            {/* Success Toast */}
            {showSuccess && (
            {/* Success Toast */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{module.label}</h3>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{module.description}</p>

                                        {/* Status Badge */}
                                        <div className="flex items-center gap-2 mb-3">
                                            {isLocked ? (
                                                <>
                                                    <IconLock className={`w-4 h-4 ${getStatusColor(true)}`} />
                                                    <span className={`text-sm font-semibold ${getStatusColor(true)}`}>Locked</span>
                                                </>
                                            ) : (
                                                <>
                                                    <IconLockOpen className={`w-4 h-4 ${getStatusColor(false)}`} />
                                                    <span className={`text-sm font-semibold ${getStatusColor(false)}`}>Unlocked</span>
                                                </>
                                            )}
                                        </div>

                                        {/* Metadata */}
                                        {lockState?.updatedAt && <div className="text-xs text-gray-500 dark:text-gray-500 mb-2">Last changed: {new Date(lockState.updatedAt).toLocaleString()}</div>}
                                        {lockState?.updatedBy && <div className="text-xs text-gray-500 dark:text-gray-500 mb-2">By: {lockState.updatedBy}</div>}
                                        {lockState?.reason && (
                                            <div className="text-xs text-gray-700 dark:text-gray-300 italic bg-white/50 dark:bg-black/20 px-2 py-1 rounded">Reason: {lockState.reason}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Toggle Button */}
                                <button
                                    type="button"
                                    onClick={() => handleToggleLock(module.key)}
                                    disabled={isTransitioning}
                                    className={`w-full py-2 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                                        isLocked
                                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                                            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                                    } ${isTransitioning ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isTransitioning ? (
                                        <>
                                            <IconLoader className="w-4 h-4 animate-spin" />
                                            <span>Updating...</span>
                                        </>
                                    ) : isLocked ? (
                                        <>
                                            <IconLockOpen className="w-4 h-4" />
                                            <span>Unlock Module</span>
                                        </>
                                    ) : (
                                        <>
                                            <IconLock className="w-4 h-4" />
                                            <span>Lock Module</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Info Section */}
            <div className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 rounded-lg">
                <div className="flex gap-3">
                    <IconInfoCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">How Module Locking Works</h4>
                        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                            <li>• Locked modules are hidden from sidebar navigation and the module switcher in the header</li>
                            <li>• Users with locked modules will see a lock notice and cannot switch to or access those modules</li>
                            <li>• Onboarding flow will mark locked modules as unavailable during module selection</li>
                            <li>• Lock state persists across browser sessions using localStorage</li>
                            <li>• Use locks to temporarily disable features without code deployment</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Reason Modal */}
            {showReasonModal && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add Lock Reason</h3>

                        {/* Reason Type Toggle */}
                        <div className="mb-4 flex gap-2">
                            <button
                                onClick={() => setReasonType('preset')}
                                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                                    reasonType === 'preset' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                            >
                                Pre-made
                            </button>
                            <button
                                onClick={() => setReasonType('custom')}
                                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                                    reasonType === 'custom' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600'
                                }`}
                            >
                                Custom
                            </button>
                        </div>

                        {/* Preset Reasons */}
                        {reasonType === 'preset' && (
                            <div className="mb-4 space-y-2">
                                {PRESET_REASONS.map((reason) => (
                                    <label key={reason} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="preset-reason"
                                            value={reason}
                                            checked={selectedPreset === reason}
                                            onChange={(e) => setSelectedPreset(e.target.value)}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-gray-900 dark:text-gray-100">{reason}</span>
                                    </label>
                                ))}
                            </div>
                        )}

                        {/* Custom Reason */}
                        {reasonType === 'custom' && (
                            <div className="mb-4">
                                <textarea
                                    value={customReason}
                                    onChange={(e) => setCustomReason(e.target.value)}
                                    placeholder="Enter your custom reason for locking this module..."
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows={4}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Max 200 characters</p>
                            </div>
                        )}

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowReasonModal(false)}
                                className="flex-1 py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLockWithReason}
                                className="flex-1 py-2 px-4 rounded-lg bg-red-500 text-white hover:bg-red-600 font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                {transitioningModule ? (
                                    <>
                                        <IconLoader className="w-4 h-4 animate-spin" />
                                        <span>Locking...</span>
                                    </>
                                ) : (
                                    <>
                                        <IconLock className="w-4 h-4" />
                                        <span>Lock Module</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModuleAccessControl;
