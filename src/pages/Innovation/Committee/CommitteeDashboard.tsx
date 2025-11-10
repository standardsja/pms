import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import Swal from 'sweetalert2';
import { approveIdea, fetchIdeas, Idea, promoteIdea, rejectIdea } from '../../../utils/ideasApi';
import { getUser } from '../../../utils/auth';

type PendingIdea = Idea;

const CommitteeDashboard = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const currentUser = getUser();
    const isCommittee = currentUser?.roles?.includes('INNOVATION_COMMITTEE') || currentUser?.role === 'INNOVATION_COMMITTEE';

    const [pendingIdeas, setPendingIdeas] = useState<PendingIdea[]>([]);
    const [approvedIdeas, setApprovedIdeas] = useState<Idea[]>([]);
    const [promotedIdeas, setPromotedIdeas] = useState<Idea[]>([]);
    const [loadingList, setLoadingList] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedTab, setSelectedTab] = useState<'pending' | 'approved' | 'promoted'>('pending');
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<string>('ALL');
    const [page, setPage] = useState(1);
    const pageSize = 5;

    const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, promoted: 0 });

    useEffect(() => {
        dispatch(setPageTitle('Innovation Committee'));
    }, [dispatch]);

    // Guard: redirect non-committee roles to Innovation Hub dashboard
    useEffect(() => {
        if (!isCommittee) {
            navigate('/innovation/dashboard', { replace: true });
        }
    }, [isCommittee, navigate]);

    // Load counts summary
    useEffect(() => {
        let cancelled = false;
        async function loadCounts() {
            try {
                const [pending, approved, rejected, promoted] = await Promise.all([
                    fetchIdeas({ status: 'PENDING_REVIEW' }),
                    fetchIdeas({ status: 'APPROVED' }),
                    fetchIdeas({ status: 'REJECTED' }),
                    fetchIdeas({ status: 'PROMOTED_TO_PROJECT' }),
                ]);
                if (!cancelled) {
                    setCounts({ pending: pending.length, approved: approved.length, rejected: rejected.length, promoted: promoted.length });
                }
            } catch (e) {
                // Soft-fail counts; leave defaults
            }
        }
        loadCounts();
        return () => { cancelled = true; };
    }, []);

    // Load lists per tab
    useEffect(() => {
        let cancelled = false;
        async function loadList() {
            setLoadingList(true); setError(null);
            try {
                if (selectedTab === 'pending') {
                    const data = await fetchIdeas({ status: 'PENDING_REVIEW' });
                    if (!cancelled) setPendingIdeas(data);
                } else if (selectedTab === 'approved') {
                    const data = await fetchIdeas({ status: 'APPROVED' });
                    if (!cancelled) setApprovedIdeas(data);
                } else {
                    const data = await fetchIdeas({ status: 'PROMOTED_TO_PROJECT' });
                    if (!cancelled) setPromotedIdeas(data);
                }
            } catch (e: any) {
                if (!cancelled) setError(e?.message || 'Failed to load ideas');
            } finally {
                if (!cancelled) setLoadingList(false);
            }
        }
        loadList();
        // reset pagination on tab change
        setPage(1);
    }, [selectedTab]);

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
            try {
                await approveIdea(ideaId);
                setPendingIdeas((prev) => prev.filter((i) => i.id !== ideaId));
                setCounts((c) => ({ ...c, pending: Math.max(0, c.pending - 1), approved: c.approved + 1 }));
                Swal.fire('Approved!', 'The idea has been approved and is now visible for viewing.', 'success');
            } catch (e: any) {
                Swal.fire('Error', e?.message || 'Failed to approve idea', 'error');
            }
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
            try {
                await rejectIdea(ideaId, (result.value as string) || undefined);
                setPendingIdeas((prev) => prev.filter((i) => i.id !== ideaId));
                setCounts((c) => ({ ...c, pending: Math.max(0, c.pending - 1), rejected: c.rejected + 1 }));
                Swal.fire('Rejected', 'The idea has been rejected and the submitter will be notified.', 'success');
            } catch (e: any) {
                Swal.fire('Error', e?.message || 'Failed to reject idea', 'error');
            }
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
            try {
                const updated = await promoteIdea(ideaId, (result.value as any)?.projectCode);
                // If in approved tab, move it out; if in pending, ignore; in promoted tab, add
                setApprovedIdeas((prev) => prev.filter((i) => i.id !== ideaId));
                setPromotedIdeas((prev) => [updated, ...prev]);
                setCounts((c) => ({ ...c, approved: Math.max(0, c.approved - 1), promoted: c.promoted + 1 }));
                Swal.fire({
                    icon: 'success',
                    title: 'Promoted!',
                    text: `"${ideaTitle}" has been promoted to BSJ Project ${updated.projectCode || ''}`,
                });
            } catch (e: any) {
                Swal.fire('Error', e?.message || 'Failed to promote idea', 'error');
            }
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

    const availableCategories = useMemo(() => {
        const cats = new Set<string>();
        (selectedTab === 'pending' ? pendingIdeas : selectedTab === 'approved' ? approvedIdeas : promotedIdeas).forEach(i => cats.add(i.category));
        return ['ALL', ...Array.from(cats)];
    }, [pendingIdeas, approvedIdeas, promotedIdeas, selectedTab]);

    const filteredPending = useMemo(() => {
        const src = selectedTab === 'pending' ? pendingIdeas : selectedTab === 'approved' ? approvedIdeas : promotedIdeas;
        const q = search.trim().toLowerCase();
        return src.filter(i => {
            const matchesText = !q || i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.submittedBy.toLowerCase().includes(q);
            const matchesCategory = category === 'ALL' || i.category === category;
            return matchesText && matchesCategory;
        });
    }, [pendingIdeas, approvedIdeas, promotedIdeas, selectedTab, search, category]);

    const paginated = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredPending.slice(start, start + pageSize);
    }, [filteredPending, page]);

    const totalPages = Math.max(1, Math.ceil(filteredPending.length / pageSize));

    const exportCsv = () => {
        const rows = [['ID','Title','Category','Submitted By','Submitted At','Status']];
        filteredPending.forEach(i => rows.push([i.id, i.title, i.category, i.submittedBy, i.submittedAt, i.status]));
        const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `ideas-${selectedTab}.csv`; a.click();
        URL.revokeObjectURL(url);
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
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="panel">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending Review</p>
                            <h3 className="text-3xl font-bold text-orange-600 dark:text-orange-400">{counts.pending}</h3>
                        </div>
                        <div className="text-5xl text-orange-600 dark:text-orange-400">⏳</div>
                    </div>
                </div>
                <div className="panel">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Approved Ideas</p>
                            <h3 className="text-3xl font-bold text-green-600 dark:text-green-400">{counts.approved}</h3>
                        </div>
                        <div className="text-5xl text-green-600 dark:text-green-400">✅</div>
                    </div>
                </div>
                <div className="panel">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">BSJ Projects</p>
                            <h3 className="text-3xl font-bold text-blue-600 dark:text-blue-400">{counts.promoted}</h3>
                        </div>
                        <div className="text-5xl text-blue-600 dark:text-blue-400">🚀</div>
                    </div>
                </div>
                <div className="panel">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Rejected</p>
                            <h3 className="text-3xl font-bold text-red-600 dark:text-red-400">{counts.rejected}</h3>
                        </div>
                        <div className="text-5xl text-red-600 dark:text-red-400">❌</div>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="panel flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        placeholder="Search by title, description, submitter…"
                        className="form-input w-72 max-w-full"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        aria-label="Search ideas"
                    />
                    <select
                        className="form-select"
                        value={category}
                        onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                        aria-label="Filter by category"
                    >
                        {availableCategories.map(c => (
                            <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : getCategoryLabel(c)}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <button className="btn btn-outline-secondary" onClick={exportCsv}>Export CSV</button>
                    <Link to="/innovation/committee/review" className="btn btn-primary">Open Review Workspace</Link>
                    <Link to="/innovation/ideas/analytics" className="btn bg-purple-600 hover:bg-purple-700 text-white">Analytics</Link>
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
                    Pending Review ({counts.pending})
                </button>
                <button
                    onClick={() => setSelectedTab('approved')}
                    className={`px-6 py-3 font-semibold ${
                        selectedTab === 'approved'
                            ? 'border-b-2 border-primary text-primary'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    Approved ({counts.approved})
                </button>
                <button
                    onClick={() => setSelectedTab('promoted')}
                    className={`px-6 py-3 font-semibold ${
                        selectedTab === 'promoted'
                            ? 'border-b-2 border-primary text-primary'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                    BSJ Projects ({counts.promoted})
                </button>
            </div>

            {/* Pending Ideas */}
            {(selectedTab === 'pending' || selectedTab === 'approved') && (
                <div className="space-y-4">
                    {loadingList && (
                        <div className="panel py-10 text-center text-gray-500">Loading…</div>
                    )}
                    {error && (
                        <div className="panel py-6 text-center text-red-500">{error}</div>
                    )}
                    {!loadingList && !error && paginated.map((idea) => (
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
                                <Link to={`/innovation/committee/review`} className="btn btn-outline-primary">Open in Review</Link>
                                {selectedTab === 'pending' && (
                                    <>
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
                                    </>
                                )}
                                {selectedTab === 'approved' && (
                                    <button
                                        onClick={() => handlePromote(idea.id, idea.title)}
                                        className="btn bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        🚀 Promote to Project
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {!loadingList && !error && paginated.length === 0 && (
                        <div className="panel text-center py-12">
                            <div className="text-6xl mb-4">✨</div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">All Caught Up!</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                {selectedTab === 'pending' ? 'No ideas pending review at the moment.' : 'No approved ideas to show.'}
                            </p>
                        </div>
                    )}

                    {/* Pagination */}
                    {!loadingList && !error && filteredPending.length > pageSize && (
                        <div className="flex items-center justify-center gap-2">
                            <button className="btn btn-outline-secondary" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                            <span className="text-sm">Page {page} of {totalPages}</span>
                            <button className="btn btn-outline-secondary" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
                        </div>
                    )}
                </div>
            )}

            {/* Promoted Projects */}
            {selectedTab === 'promoted' && (
                <div className="space-y-4">
                    {loadingList && (
                        <div className="panel py-10 text-center text-gray-500">Loading…</div>
                    )}
                    {error && (
                        <div className="panel py-6 text-center text-red-500">{error}</div>
                    )}
                    {!loadingList && !error && paginated.map((idea) => (
                        <div key={idea.id} className="panel">
                            <div className="flex items-start justify-between gap-4 mb-2">
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                        {idea.title}
                                    </h3>
                                    <div className="flex items-center gap-3 mb-1 text-sm text-gray-500 dark:text-gray-400">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getCategoryColor(idea.category)}`}>
                                            {getCategoryLabel(idea.category)}
                                        </span>
                                        <span>Project Code: <strong>{idea.projectCode || 'TBD'}</strong></span>
                                        <span>Promoted: {idea.promotedAt ? new Date(idea.promotedAt).toLocaleDateString() : '-'}</span>
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 line-clamp-2">
                                        {idea.description}
                                    </p>
                                </div>
                            </div>
                            <div className="pt-3 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                                Submitted by <strong>{idea.submittedBy}</strong> • {new Date(idea.submittedAt).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                    {!loadingList && !error && paginated.length === 0 && (
                        <div className="panel text-center py-12">
                            <div className="text-6xl mb-4">🚀</div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">BSJ Projects</h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                Ideas that have been promoted to official BSJ projects
                            </p>
                        </div>
                    )}

                    {/* Pagination */}
                    {!loadingList && !error && filteredPending.length > pageSize && (
                        <div className="flex items-center justify-center gap-2">
                            <button className="btn btn-outline-secondary" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                            <span className="text-sm">Page {page} of {totalPages}</span>
                            <button className="btn btn-outline-secondary" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CommitteeDashboard;
