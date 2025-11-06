import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import Swal from 'sweetalert2';

interface PendingIdea {
    id: string;
    title: string;
    description: string;
    category: string;
    submittedBy: string;
    submittedAt: string;
    status: string;
}

const CommitteeDashboard = () => {
    const dispatch = useDispatch();
    const [pendingIdeas, setPendingIdeas] = useState<PendingIdea[]>([]);
    const [selectedTab, setSelectedTab] = useState<'pending' | 'approved' | 'promoted'>('pending');

    useEffect(() => {
        dispatch(setPageTitle('Innovation Committee'));
        // TODO: Fetch from API
        setPendingIdeas([
            {
                id: '1',
                title: 'Blockchain for Certificate Verification',
                description: 'Implement blockchain technology to create tamper-proof digital certificates that can be verified instantly by third parties.',
                category: 'TECHNOLOGY',
                submittedBy: 'Michael Chen',
                submittedAt: '2025-11-05',
                status: 'PENDING_REVIEW',
            },
            {
                id: '2',
                title: 'Virtual Reality Training Program',
                description: 'Develop VR training modules for safety procedures and equipment handling, improving training effectiveness.',
                category: 'PROCESS_IMPROVEMENT',
                submittedBy: 'Sarah Williams',
                submittedAt: '2025-11-04',
                status: 'PENDING_REVIEW',
            },
        ]);
    }, [dispatch]);

    const handleApprove = async (ideaId: string, ideaTitle: string) => {
        const result = await Swal.fire({
            title: 'Approve Idea?',
            text: `Approve "${ideaTitle}" and make it visible for voting?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, Approve',
            cancelButtonText: 'Cancel',
        });

        if (result.isConfirmed) {
            // TODO: API call
            setPendingIdeas(pendingIdeas.filter(idea => idea.id !== ideaId));
            Swal.fire('Approved!', 'The idea has been approved and is now visible for voting.', 'success');
        }
    };

    const handleReject = async (ideaId: string, ideaTitle: string) => {
        const result = await Swal.fire({
            title: 'Reject Idea?',
            text: `Reject "${ideaTitle}"?`,
            icon: 'warning',
            input: 'textarea',
            inputPlaceholder: 'Reason for rejection (will be sent to submitter)',
            inputAttributes: {
                'aria-label': 'Reason for rejection'
            },
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Reject',
            cancelButtonText: 'Cancel',
        });

        if (result.isConfirmed) {
            // TODO: API call
            setPendingIdeas(pendingIdeas.filter(idea => idea.id !== ideaId));
            Swal.fire('Rejected', 'The idea has been rejected and the submitter will be notified.', 'success');
        }
    };

    const handlePromote = async (ideaId: string, ideaTitle: string) => {
        const result = await Swal.fire({
            title: 'Promote to BSJ Project?',
            html: `
                <p>Promote "${ideaTitle}" to an official BSJ project?</p>
                <div class="mt-4">
                    <label class="block text-sm font-semibold text-left mb-2">Project Code:</label>
                    <input id="projectCode" class="swal2-input" placeholder="e.g., BSJ-PROJ-2025-001">
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Promote to Project',
            cancelButtonText: 'Cancel',
            preConfirm: () => {
                const projectCode = (document.getElementById('projectCode') as HTMLInputElement).value;
                if (!projectCode) {
                    Swal.showValidationMessage('Please enter a project code');
                }
                return { projectCode };
            }
        });

        if (result.isConfirmed) {
            // TODO: API call
            Swal.fire({
                icon: 'success',
                title: 'Promoted!',
                text: `"${ideaTitle}" has been promoted to BSJ Project ${result.value.projectCode}`,
            });
        }
    };

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            TECHNOLOGY: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
            SUSTAINABILITY: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
            CUSTOMER_SERVICE: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
            PROCESS_IMPROVEMENT: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
            COST_REDUCTION: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
            PRODUCT_INNOVATION: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
            OTHER: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
        };
        return colors[category] || colors.OTHER;
    };

    const getCategoryLabel = (category: string) => {
        return category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <span className="text-4xl">🏛️</span>
                    Innovation Committee
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Review submissions, approve ideas, and promote innovations to BSJ projects
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="panel">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending Review</p>
                            <h3 className="text-3xl font-bold text-orange-600 dark:text-orange-400">{pendingIdeas.length}</h3>
                        </div>
                        <div className="text-5xl text-orange-600 dark:text-orange-400">⏳</div>
                    </div>
                </div>
                <div className="panel">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Approved Ideas</p>
                            <h3 className="text-3xl font-bold text-green-600 dark:text-green-400">24</h3>
                        </div>
                        <div className="text-5xl text-green-600 dark:text-green-400">✅</div>
                    </div>
                </div>
                <div className="panel">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">BSJ Projects</p>
                            <h3 className="text-3xl font-bold text-blue-600 dark:text-blue-400">5</h3>
                        </div>
                        <div className="text-5xl text-blue-600 dark:text-blue-400">🚀</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setSelectedTab('pending')}
                    className={`px-6 py-3 font-semibold ${
                        selectedTab === 'pending'
                            ? 'border-b-2 border-primary text-primary'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    Pending Review ({pendingIdeas.length})
                </button>
                <button
                    onClick={() => setSelectedTab('approved')}
                    className={`px-6 py-3 font-semibold ${
                        selectedTab === 'approved'
                            ? 'border-b-2 border-primary text-primary'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    Approved (24)
                </button>
                <button
                    onClick={() => setSelectedTab('promoted')}
                    className={`px-6 py-3 font-semibold ${
                        selectedTab === 'promoted'
                            ? 'border-b-2 border-primary text-primary'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    BSJ Projects (5)
                </button>
            </div>

            {/* Pending Ideas */}
            {selectedTab === 'pending' && (
                <div className="space-y-4">
                    {pendingIdeas.map((idea) => (
                        <div key={idea.id} className="panel">
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                        {idea.title}
                                    </h3>
                                    <div className="flex items-center gap-3 mb-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(idea.category)}`}>
                                            {getCategoryLabel(idea.category)}
                                        </span>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            Submitted by <strong>{idea.submittedBy}</strong>
                                        </span>
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                            • {new Date(idea.submittedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                                        {idea.description}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <Link
                                    to={`/innovation/committee/review/${idea.id}`}
                                    className="btn btn-outline-primary"
                                >
                                    View Full Details
                                </Link>
                                <button
                                    onClick={() => handleApprove(idea.id, idea.title)}
                                    className="btn bg-green-600 hover:bg-green-700 text-white"
                                >
                                    ✅ Approve
                                </button>
                                <button
                                    onClick={() => handleReject(idea.id, idea.title)}
                                    className="btn bg-red-600 hover:bg-red-700 text-white"
                                >
                                    ❌ Reject
                                </button>
                            </div>
                        </div>
                    ))}
                    {pendingIdeas.length === 0 && (
                        <div className="panel text-center py-12">
                            <div className="text-6xl mb-4">✨</div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">All Caught Up!</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                No ideas pending review at the moment.
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Approved Ideas */}
            {selectedTab === 'approved' && (
                <div className="panel text-center py-12">
                    <div className="text-6xl mb-4">✅</div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Approved Ideas</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        View approved ideas and promote popular ones to BSJ projects
                    </p>
                    <button
                        onClick={() => handlePromote('sample', 'Sample Idea')}
                        className="btn bg-blue-600 hover:bg-blue-700 text-white gap-2"
                    >
                        <span className="text-xl">🚀</span>
                        Promote Top Ideas to Projects
                    </button>
                </div>
            )}

            {/* Promoted Projects */}
            {selectedTab === 'promoted' && (
                <div className="panel text-center py-12">
                    <div className="text-6xl mb-4">🚀</div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">BSJ Projects</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                        Ideas that have been promoted to official BSJ projects
                    </p>
                </div>
            )}
        </div>
    );
};

export default CommitteeDashboard;
