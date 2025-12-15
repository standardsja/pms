import { useState, useEffect } from 'react';
import { getUser } from '../utils/auth';

interface ChangelogEntry {
    version: string;
    date: string;
    type: 'feature' | 'improvement' | 'bugfix' | 'security';
    changes: string[];
}

const changelog: ChangelogEntry[] = [
    {
        version: '2.5.0',
        date: 'December 15, 2025',
        type: 'feature',
        changes: [
            'Removed character limits for Innovation Hub idea titles and descriptions',
            'Removed Evaluation Committee module from the system',
            'Fixed profile photo upload and display issues on production server',
            'Improved sidebar scrolling functionality',
        ],
    },
    {
        version: '2.4.0',
        date: 'December 12, 2025',
        type: 'improvement',
        changes: [
            'Implemented YouTube-style view tracking for Innovation Hub ideas',
            'Added session-based view counting with 24-hour window',
            'Fixed idea visibility in MyIdeas page - now shows all statuses',
            'Enhanced view tracking to exclude submitter views automatically',
        ],
    },
    {
        version: '2.3.0',
        date: 'December 10, 2025',
        type: 'feature',
        changes: [
            'Added comprehensive LDAP integration for user authentication',
            'Implemented role-based access control (RBAC) system',
            'Enhanced Innovation Hub with committee dashboard',
            'Added real-time notifications and messaging system',
        ],
    },
];

const typeIcons = {
    feature: '✨',
    improvement: '🚀',
    bugfix: '🐛',
    security: '🔒',
};

const typeColors = {
    feature: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    improvement: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    bugfix: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    security: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
};

const typeLabels = {
    feature: 'New Feature',
    improvement: 'Improvement',
    bugfix: 'Bug Fix',
    security: 'Security Update',
};

interface ChangelogModalProps {
    forceOpen?: boolean;
    onClose?: () => void;
}

export default function ChangelogModal({ forceOpen = false, onClose }: ChangelogModalProps = {}) {
    const [isOpen, setIsOpen] = useState(false);
    const [hasSeenChangelog, setHasSeenChangelog] = useState(true);

    useEffect(() => {
        if (forceOpen) {
            setIsOpen(true);
            return;
        }

        const user = getUser();
        if (!user) return;

        const lastSeenVersion = localStorage.getItem(`changelog-seen-${user.id}`);
        const latestVersion = changelog[0]?.version;

        // Show modal if user hasn't seen the latest version
        if (lastSeenVersion !== latestVersion) {
            setHasSeenChangelog(false);
            setIsOpen(true);
        }
    }, []);

    const handleClose = () => {
        const user = getUser();
        if (user && changelog[0]) {
            localStorage.setItem(`changelog-seen-${user.id}`, changelog[0].version);
        }
        setHasSeenChangelog(true);
        setIsOpen(false);
        onClose?.();
    };

    const openChangelog = () => {
        setIsOpen(true);
    };

    if (!isOpen) {
        // Show a badge if there are unseen updates
        return !hasSeenChangelog ? (
            <button
                onClick={openChangelog}
                className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-primary text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all animate-bounce"
                aria-label="View latest updates"
            >
                <span className="text-lg">🎉</span>
                <span className="font-semibold text-sm">What's New</span>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
            </button>
        ) : null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="System Updates">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden animate__animated animate__fadeInUp">
                {/* Header */}
                <div className="sticky top-0 z-10 px-6 py-5 bg-gradient-to-r from-primary to-primary-dark text-white">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        aria-label="Close changelog"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div className="flex items-center gap-3">
                        <span className="text-3xl">📝</span>
                        <div>
                            <h2 className="text-2xl font-bold">What's New</h2>
                            <p className="text-sm text-white/80 mt-1">Latest updates and improvements to the system</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[calc(85vh-180px)] p-6">
                    <div className="space-y-6">
                        {changelog.map((entry, index) => (
                            <div
                                key={entry.version}
                                className={`${
                                    index === 0 ? 'border-2 border-primary' : 'border border-gray-200 dark:border-gray-700'
                                } rounded-xl p-5 bg-white dark:bg-gray-900 transition-all hover:shadow-md`}
                            >
                                {/* Version Header */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${typeColors[entry.type]}`}>
                                            <span>{typeIcons[entry.type]}</span>
                                            <span>{typeLabels[entry.type]}</span>
                                        </span>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Version {entry.version}</h3>
                                        {index === 0 && <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded uppercase">Latest</span>}
                                    </div>
                                    <time className="text-sm text-gray-500 dark:text-gray-400">{entry.date}</time>
                                </div>

                                {/* Changes List */}
                                <ul className="space-y-2">
                                    {entry.changes.map((change, i) => (
                                        <li key={i} className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
                                            <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-primary"></span>
                                            <span>{change}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    {/* Footer Info */}
                    <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">💡</span>
                            <div>
                                <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-1">Need Help?</h4>
                                <p className="text-sm text-blue-700 dark:text-blue-300">If you encounter any issues or have feedback about these updates, please contact the IT Support team.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Showing {changelog.length} recent update{changelog.length !== 1 ? 's' : ''}
                    </p>
                    <button type="button" onClick={handleClose} className="btn btn-primary btn-sm">
                        Got it, thanks!
                    </button>
                </div>
            </div>
        </div>
    );
}
