import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import Swal from 'sweetalert2';
import { approveIdea, fetchIdeas, fetchIdeaCounts, Idea, promoteIdea as promoteIdeaApi, rejectIdea } from '../../../utils/ideasApi';
import { getUser } from '../../../utils/auth';
import HolidayBanner from '../../../components/HolidayBanner';
import HolidayCountdown from '../../../components/HolidayCountdown';

const CommitteeDashboard = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const currentUser = getUser();
    const roles: string[] = Array.isArray(currentUser?.roles) ? currentUser.roles : currentUser?.role ? [currentUser.role] : [];
    const isCommittee = roles?.includes?.('INNOVATION_COMMITTEE');

    // State for ideas lists
    const [pendingIdeas, setPendingIdeas] = useState<Idea[]>([]);
    const [approvedIdeas, setApprovedIdeas] = useState<Idea[]>([]);
    const [promotedIdeas, setPromotedIdeas] = useState<Idea[]>([]);
    const [loadingList, setLoadingList] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // UI state
    const [selectedTab, setSelectedTab] = useState<'pending' | 'approved' | 'promoted'>('pending');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [category, setCategory] = useState<string>('ALL');
    const [page, setPage] = useState(1);
    const pageSize = 6;

    // Counts for stats
    const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, promoted: 0 });

    // Modal state for approve/reject
    const [showNotesModal, setShowNotesModal] = useState(false);
    const [modalAction, setModalAction] = useState<'approve' | 'reject' | null>(null);
    const [modalNotes, setModalNotes] = useState('');
    const [modalIdea, setModalIdea] = useState<Idea | null>(null);

    // Modal state for promote
    const [showPromoteModal, setShowPromoteModal] = useState(false);
    const [promoteProjectCode, setPromoteProjectCode] = useState('');
    const [selectedPromoteIdea, setSelectedPromoteIdea] = useState<Idea | null>(null);

    // Recent activity state
    type ActivityItem = {
        id: string;
        action: 'approved' | 'rejected' | 'promoted';
        ideaTitle: string;
        ideaId: string;
        timestamp: string;
        reviewer: string;
    };
    const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

    useEffect(() => {
        dispatch(setPageTitle('Innovation Committee'));
    }, [dispatch]);

    useEffect(() => {
        if (!isCommittee) {
            setTimeout(() => navigate('/innovation/dashboard', { replace: true }), 2000);
        }
    }, [isCommittee, navigate]);

    // Debounce search input (500ms delay)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    // Real-time counts refresh - optimized with counts endpoint
    const loadCounts = useCallback(async () => {
        try {
            const counts = await fetchIdeaCounts();
            setCounts({
                pending: counts.pending || 0,
                approved: counts.approved || 0,
                rejected: counts.rejected || 0,
                promoted: counts.promoted || 0,
            });
        } catch (e) {
            console.error('Failed to load counts:', e);
        }
    }, []);

    useEffect(() => {
        loadCounts();
        // Reduced polling from 15s to 60s
        const interval = setInterval(() => loadCounts(), 60000);
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') loadCounts();
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [loadCounts]);

    // Real-time list refresh
    const loadList = useCallback(
        async (showLoader = true) => {
            if (showLoader) setLoadingList(true);
            setError(null);
            try {
                if (selectedTab === 'pending') {
                    const response = await fetchIdeas({ status: 'pending' });
                    const data = response.ideas || response;
                    setPendingIdeas(data);
                } else if (selectedTab === 'approved') {
                    const response = await fetchIdeas({ status: 'approved' });
                    const data = response.ideas || response;
                    setApprovedIdeas(data);
                } else {
                    const response = await fetchIdeas({ status: 'promoted' });
                    const data = response.ideas || response;
                    setPromotedIdeas(data);
                }
            } catch (e) {
                const errorMessage = e instanceof Error ? e.message : 'Unable to load ideas';
                setError(errorMessage);

                // Only show toast for foreground loads, not background polling
                if (showLoader) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Unable to Load Ideas',
                        text: 'We encountered a problem loading the ideas. Please try refreshing the page.',
                        toast: true,
                        position: 'bottom-end',
                        timer: 3500,
                        showConfirmButton: false,
                    });
                }
            } finally {
                if (showLoader) setLoadingList(false);
            }
        },
        [selectedTab]
    );

    useEffect(() => {
        loadList();
        setPage(1);
        // Reduced polling from 15s to 60s
        const interval = setInterval(() => loadList(false), 60000);
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') loadList(false);
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [loadList]);

    // Modal handlers
    const openNotesModal = (idea: Idea, action: 'approve' | 'reject') => {
        setModalIdea(idea);
        setModalAction(action);
        setModalNotes('');
        setShowNotesModal(true);
    };

    const submitNotes = async () => {
        if (!modalIdea || !modalAction) return;

        const rollbackPending = [...pendingIdeas];
        const rollbackCounts = { ...counts };

        // Optimistic update
        setPendingIdeas((prev) => prev.filter((i) => i.id !== modalIdea.id));
        if (modalAction === 'approve') {
            setCounts((c) => ({ ...c, pending: Math.max(0, c.pending - 1), approved: c.approved + 1 }));
        } else {
            setCounts((c) => ({ ...c, pending: Math.max(0, c.pending - 1), rejected: c.rejected + 1 }));
        }

        try {
            if (modalAction === 'approve') {
                const updated = await approveIdea(modalIdea.id, modalNotes || undefined);
                if (selectedTab === 'approved') setApprovedIdeas((prev) => [updated, ...prev]);

                // Add to recent activity
                setRecentActivity((prev) =>
                    [
                        {
                            id: Date.now().toString(),
                            action: 'approved' as const,
                            ideaTitle: modalIdea.title,
                            ideaId: modalIdea.id,
                            timestamp: new Date().toISOString(),
                            reviewer: currentUser?.name || 'Committee Member',
                        },
                        ...prev,
                    ].slice(0, 10)
                );

                Swal.fire({
                    icon: 'success',
                    title: 'Approved',
                    toast: true,
                    position: 'bottom-end',
                    timer: 1800,
                    showConfirmButton: false,
                });
            } else {
                await rejectIdea(modalIdea.id, modalNotes || undefined);

                // Add to recent activity
                setRecentActivity((prev) =>
                    [
                        {
                            id: Date.now().toString(),
                            action: 'rejected' as const,
                            ideaTitle: modalIdea.title,
                            ideaId: modalIdea.id,
                            timestamp: new Date().toISOString(),
                            reviewer: currentUser?.name || 'Committee Member',
                        },
                        ...prev,
                    ].slice(0, 10)
                );

                Swal.fire({
                    icon: 'success',
                    title: 'Rejected',
                    toast: true,
                    position: 'bottom-end',
                    timer: 1800,
                    showConfirmButton: false,
                });
            }
        } catch (e) {
            // Rollback on error
            setPendingIdeas(rollbackPending);
            setCounts(rollbackCounts);
            Swal.fire({
                icon: 'error',
                title: 'Action Failed',
                text: e instanceof Error ? e.message : 'We were unable to process your request. Please try again.',
                toast: true,
                position: 'bottom-end',
                timer: 3000,
                showConfirmButton: false,
            });
        } finally {
            setShowNotesModal(false);
            setModalIdea(null);
            setModalAction(null);
            setModalNotes('');
        }
    };

    const handleApprove = (idea: Idea) => openNotesModal(idea, 'approve');
    const handleReject = (idea: Idea) => openNotesModal(idea, 'reject');

    const openPromoteModal = (idea: Idea) => {
        setSelectedPromoteIdea(idea);
        setPromoteProjectCode('');
        setShowPromoteModal(true);
    };

    const submitPromotion = async () => {
        if (!selectedPromoteIdea) return;

        const rollbackApproved = [...approvedIdeas];
        const rollbackPromoted = [...promotedIdeas];
        const rollbackCounts = { ...counts };

        // Optimistic update
        setApprovedIdeas((prev) => prev.filter((i) => i.id !== selectedPromoteIdea.id));
        setCounts((c) => ({ ...c, approved: Math.max(0, c.approved - 1), promoted: c.promoted + 1 }));

        try {
            const updated = await promoteIdeaApi(selectedPromoteIdea.id, promoteProjectCode || undefined);
            setPromotedIdeas((prev) => [updated, ...prev]);

            // Add to recent activity
            setRecentActivity((prev) =>
                [
                    {
                        id: Date.now().toString(),
                        action: 'promoted' as const,
                        ideaTitle: selectedPromoteIdea.title,
                        ideaId: selectedPromoteIdea.id,
                        timestamp: new Date().toISOString(),
                        reviewer: currentUser?.name || 'Committee Member',
                    },
                    ...prev,
                ].slice(0, 10)
            );

            Swal.fire({
                icon: 'success',
                title: updated.projectCode ? `Promoted to ${updated.projectCode}` : 'Promoted successfully!',
                toast: true,
                position: 'bottom-end',
                timer: 2000,
                showConfirmButton: false,
            });
        } catch (e) {
            // Rollback
            setApprovedIdeas(rollbackApproved);
            setPromotedIdeas(rollbackPromoted);
            setCounts(rollbackCounts);
            Swal.fire({
                icon: 'error',
                title: 'Promotion Failed',
                text: e instanceof Error ? e.message : 'We were unable to promote this idea. Please try again.',
                toast: true,
                position: 'bottom-end',
                timer: 3000,
                showConfirmButton: false,
            });
        } finally {
            setShowPromoteModal(false);
            setSelectedPromoteIdea(null);
            setPromoteProjectCode('');
        }
    };

    // Utility functions
    const getCategoryColor = (cat: string) => {
        const colors: Record<string, string> = {
            TECHNOLOGY: 'bg-blue-500 text-white',
            SUSTAINABILITY: 'bg-green-500 text-white',
            CUSTOMER_SERVICE: 'bg-purple-500 text-white',
            PROCESS_IMPROVEMENT: 'bg-orange-500 text-white',
            COST_REDUCTION: 'bg-yellow-500 text-white',
            PRODUCT_INNOVATION: 'bg-pink-500 text-white',
            OTHER: 'bg-gray-500 text-white',
        };
        return colors[cat] || colors.OTHER;
    };

    const getCategoryLabel = (cat: string) => {
        return cat
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, (l) => l.toUpperCase());
    };

    const availableCategories = useMemo(() => {
        const cats = new Set<string>();
        (selectedTab === 'pending' ? pendingIdeas : selectedTab === 'approved' ? approvedIdeas : promotedIdeas).forEach((i) => cats.add(i.category));
        return ['ALL', ...Array.from(cats)];
    }, [pendingIdeas, approvedIdeas, promotedIdeas, selectedTab]);

    const filteredIdeas = useMemo(() => {
        const src = selectedTab === 'pending' ? pendingIdeas : selectedTab === 'approved' ? approvedIdeas : promotedIdeas;
        const q = debouncedSearch.trim().toLowerCase();
        return src.filter((i) => {
            const matchesText = !q || i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.submittedBy.toLowerCase().includes(q);
            const matchesCategory = category === 'ALL' || i.category === category;
            return matchesText && matchesCategory;
        });
    }, [pendingIdeas, approvedIdeas, promotedIdeas, selectedTab, debouncedSearch, category]);

    const paginatedIdeas = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredIdeas.slice(start, start + pageSize);
    }, [filteredIdeas, page, pageSize]);

    const totalPages = Math.max(1, Math.ceil(filteredIdeas.length / pageSize));

    const exportCsv = () => {
        const rows = [['ID', 'Title', 'Category', 'Submitted By', 'Submitted At', 'Status', 'Votes', 'Views']];
        filteredIdeas.forEach((i) => rows.push([i.id, i.title, i.category, i.submittedBy, i.submittedAt, i.status, String(i.voteCount), String(i.viewCount)]));
        const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `committee-ideas-${selectedTab}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Quick actions
    const copyProjectCode = (code: string) => {
        navigator.clipboard.writeText(code);
        Swal.fire({
            icon: 'success',
            title: 'Copied!',
            text: `Project code ${code} copied to clipboard`,
            toast: true,
            position: 'bottom-end',
            timer: 1500,
            showConfirmButton: false,
        });
    };

    const shareIdea = (ideaId: string, title: string) => {
        const url = `${window.location.origin}/innovation/ideas/${ideaId}`;
        navigator.clipboard.writeText(url);
        Swal.fire({
            icon: 'success',
            title: 'Link Copied!',
            text: `Share link for "${title}" copied to clipboard`,
            toast: true,
            position: 'bottom-end',
            timer: 2000,
            showConfirmButton: false,
        });
    };

    if (!isCommittee) {
        return (
            <div className="panel">
                <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
                <p className="text-gray-600 dark:text-gray-400">Committee members only. Redirecting...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Holiday Banner */}
            <HolidayBanner />

            {/* Holiday Countdown */}
            <HolidayCountdown />

            {/* Header - Committee-specific gradient styling */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 text-white shadow-xl">
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <svg className="w-14 h-14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                        </svg>
                        <h1 className="text-4xl font-black">Innovation Committee</h1>
                    </div>
                    <p className="text-indigo-100 text-lg">Review community ideas, manage approvals, and guide BSJ innovation initiatives</p>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white opacity-5 rounded-full -ml-24 -mb-24"></div>
            </div>

            {/* Enhanced Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <p className="text-orange-100 text-sm font-medium mb-1">Awaiting Review</p>
                            <h3 className="text-4xl font-black">{counts.pending}</h3>
                        </div>
                        <div className="text-6xl opacity-30">⏳</div>
                    </div>
                    <div className="mt-3 text-sm text-orange-100">Requires action</div>
                </div>

                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <p className="text-green-100 text-sm font-medium mb-1">Approved Ideas</p>
                            <h3 className="text-4xl font-black">{counts.approved}</h3>
                        </div>
                        <svg className="w-16 h-16 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="mt-3 text-sm text-green-100">Live for voting</div>
                </div>

                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <p className="text-blue-100 text-sm font-medium mb-1">BSJ Projects</p>
                            <h3 className="text-4xl font-black">{counts.promoted}</h3>
                        </div>
                        <svg className="w-16 h-16 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div className="mt-3 text-sm text-blue-100">In implementation</div>
                </div>

                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-500 to-red-600 p-6 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <p className="text-red-100 text-sm font-medium mb-1">Rejected</p>
                            <h3 className="text-4xl font-black">{counts.rejected}</h3>
                        </div>
                        <svg className="w-16 h-16 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div className="mt-3 text-sm text-red-100">Not approved</div>
                </div>
            </div>

            {/* Recent Activity Feed */}
            {recentActivity.length > 0 && (
                <div className="panel">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                                />
                            </svg>
                            Recent Activity
                        </h2>
                    </div>
                    <div className="space-y-3">
                        {recentActivity.map((activity) => {
                            const actionColors = {
                                approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
                                rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
                                promoted: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
                            };
                            const actionIcons: Record<string, JSX.Element> = {
                                approved: (
                                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                ),
                                rejected: (
                                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                ),
                                promoted: (
                                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                ),
                            };
                            const actionLabels = {
                                approved: 'Approved',
                                rejected: 'Rejected',
                                promoted: 'Promoted',
                            };

                            return (
                                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                    <div className="mt-0.5">{actionIcons[activity.action]}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${actionColors[activity.action]}`}>{actionLabels[activity.action]}</span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(activity.timestamp).toLocaleString()}</span>
                                        </div>
                                        <Link
                                            to={`/innovation/ideas/${activity.ideaId}`}
                                            className="text-sm font-medium text-gray-900 dark:text-white hover:text-primary transition-colors truncate block"
                                        >
                                            {activity.ideaTitle}
                                        </Link>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">by {activity.reviewer}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Toolbar */}
            <div className="panel">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-1">
                        <div className="relative flex-1 max-w-md">
                            <input
                                type="text"
                                placeholder="Search ideas..."
                                className="form-input pl-10"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                            />
                            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <select
                            className="form-select"
                            value={category}
                            onChange={(e) => {
                                setCategory(e.target.value);
                                setPage(1);
                            }}
                        >
                            {availableCategories.map((c) => (
                                <option key={c} value={c}>
                                    {c === 'ALL' ? 'All Categories' : getCategoryLabel(c)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="btn btn-outline-secondary" onClick={exportCsv}>
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                            Export CSV
                        </button>
                        <Link to="/innovation/committee/review" className="btn btn-primary">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                />
                            </svg>
                            Review Workspace
                        </Link>
                    </div>
                </div>
            </div>

            {/* Tabs with colored indicators */}
            <div className="panel p-0">
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setSelectedTab('pending')}
                        className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                            selectedTab === 'pending'
                                ? 'border-b-3 border-orange-500 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-2xl">⏳</span>
                            <span>Pending ({counts.pending})</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setSelectedTab('approved')}
                        className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                            selectedTab === 'approved'
                                ? 'border-b-3 border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Approved ({counts.approved})</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setSelectedTab('promoted')}
                        className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                            selectedTab === 'promoted'
                                ? 'border-b-3 border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span>Projects ({counts.promoted})</span>
                        </div>
                    </button>
                </div>

                <div className="p-6">
                    {/* Loading skeletons */}
                    {loadingList && (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="animate-pulse border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-1 space-y-3">
                                            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
                                            <div className="flex gap-2">
                                                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                                                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {error && (
                        <div className="py-12 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Connection Issue</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">We're having trouble loading the ideas. This might be a temporary network issue.</p>
                            <button onClick={() => loadList(true)} className="btn btn-primary">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                </svg>
                                Try Again
                            </button>
                        </div>
                    )}

                    {!loadingList && !error && paginatedIdeas.length === 0 && (
                        <div className="py-16 text-center">
                            <svg className="w-28 h-28 mx-auto mb-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                                />
                            </svg>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">All Clear!</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-lg">
                                {selectedTab === 'pending' && 'No ideas awaiting review.'}
                                {selectedTab === 'approved' && 'No approved ideas at the moment.'}
                                {selectedTab === 'promoted' && 'No projects promoted yet.'}
                            </p>
                        </div>
                    )}

                    {/* Ideas list with vote breakdown */}
                    {!loadingList && !error && paginatedIdeas.length > 0 && (
                        <div className="space-y-4">
                            {paginatedIdeas.map((idea) => (
                                <div key={idea.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow bg-white dark:bg-gray-800">
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-start gap-3 mb-3">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getCategoryColor(idea.category)}`}>{getCategoryLabel(idea.category)}</span>
                                                {selectedTab === 'promoted' && idea.projectCode && (
                                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">{idea.projectCode}</span>
                                                )}
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{idea.title}</h3>
                                            <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">{idea.description}</p>
                                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                                                <span className="flex items-center gap-1">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                                                    </svg>
                                                    <strong>{idea.submittedBy}</strong>
                                                </span>
                                                <span>•</span>
                                                <span>{new Date(idea.submittedAt).toLocaleDateString()}</span>
                                            </div>
                                            {/* Vote breakdown and metadata */}
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                                    </svg>
                                                    {idea.upvoteCount ?? 0}
                                                </span>
                                                <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" transform="rotate(180)">
                                                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                                    </svg>
                                                    {idea.downvoteCount ?? 0}
                                                </span>
                                                <span className="text-gray-600 dark:text-gray-400">Score: {idea.voteCount > 0 ? `+${idea.voteCount}` : idea.voteCount}</span>
                                                <span>•</span>
                                                <span>{idea.viewCount} views</span>
                                                <span>•</span>
                                                <span>{idea.commentCount ?? 0} comments</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                        {selectedTab === 'pending' && (
                                            <>
                                                <button onClick={() => handleApprove(idea)} className="btn bg-green-600 hover:bg-green-700 text-white inline-flex items-center gap-2">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Approve
                                                </button>
                                                <button onClick={() => handleReject(idea)} className="btn bg-red-600 hover:bg-red-700 text-white inline-flex items-center gap-2">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                    Reject
                                                </button>
                                            </>
                                        )}
                                        {selectedTab === 'approved' && (
                                            <button onClick={() => openPromoteModal(idea)} className="btn bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center gap-2">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                                </svg>
                                                Promote to Project
                                            </button>
                                        )}
                                        {selectedTab === 'promoted' && idea.projectCode && (
                                            <button onClick={() => copyProjectCode(idea.projectCode!)} className="btn btn-outline-secondary" title="Copy project code">
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                                    />
                                                </svg>
                                                Copy Code
                                            </button>
                                        )}
                                        <button onClick={() => shareIdea(idea.id, idea.title)} className="btn btn-outline-secondary" title="Copy share link">
                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                                                />
                                            </svg>
                                            Share
                                        </button>
                                        <Link to={`/innovation/ideas/${idea.id}`} className="btn btn-outline-primary">
                                            View Details
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Pagination */}
                    {!loadingList && !error && filteredIdeas.length > pageSize && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredIdeas.length)} of {filteredIdeas.length}
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="btn btn-outline-secondary" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                                    Previous
                                </button>
                                <span className="text-sm px-4">
                                    Page {page} of {totalPages}
                                </span>
                                <button className="btn btn-outline-secondary" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal for approve/reject notes */}
            {showNotesModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="panel w-full max-w-lg">
                        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                            {modalAction === 'approve' ? (
                                <>
                                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Approve Idea
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Reject Idea
                                </>
                            )}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            <strong>{modalIdea?.title}</strong>
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Add review notes (optional)</p>
                        <textarea
                            className="form-textarea w-full mb-4"
                            rows={4}
                            value={modalNotes}
                            onChange={(e) => setModalNotes(e.target.value)}
                            placeholder="e.g., Great concept! Aligns with our sustainability goals."
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                className="btn btn-outline-secondary"
                                onClick={() => {
                                    setShowNotesModal(false);
                                    setModalIdea(null);
                                    setModalAction(null);
                                }}
                            >
                                Cancel
                            </button>
                            <button className={`btn ${modalAction === 'approve' ? 'btn-success' : 'btn-danger'}`} onClick={submitNotes}>
                                {modalAction === 'approve' ? 'Approve' : 'Reject'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for promote to project */}
            {showPromoteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="panel w-full max-w-lg">
                        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Promote to BSJ Project
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            <strong>{selectedPromoteIdea?.title}</strong>
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Enter a project code (optional - will auto-generate if blank)</p>
                        <input
                            type="text"
                            className="form-input w-full mb-4"
                            value={promoteProjectCode}
                            onChange={(e) => setPromoteProjectCode(e.target.value)}
                            placeholder="e.g., BSJ-INNO-2025-001"
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                className="btn btn-outline-secondary"
                                onClick={() => {
                                    setShowPromoteModal(false);
                                    setSelectedPromoteIdea(null);
                                    setPromoteProjectCode('');
                                }}
                            >
                                Cancel
                            </button>
                            <button className="btn bg-blue-600 hover:bg-blue-700 text-white" onClick={submitPromotion}>
                                Promote to Project
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommitteeDashboard;
