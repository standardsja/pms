import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import Swal from 'sweetalert2';
import { fetchIdeas, Idea } from '../../../utils/ideasApi';

const BSJProjects = () => {
    const dispatch = useDispatch();

    const [projects, setProjects] = useState<Idea[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters and search
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-voted' | 'alphabetical'>('newest');

    // Pagination
    const [page, setPage] = useState(1);
    const pageSize = 12;

    useEffect(() => {
        dispatch(setPageTitle('BSJ Projects'));
    }, [dispatch]);

    // Load projects with real-time refresh
    const loadProjects = useCallback(async (showLoader = true) => {
        if (showLoader) setLoading(true);
        setError(null);
        try {
            const response = await fetchIdeas({ status: 'promoted' });
            const data = response.ideas || response;
            setProjects(data);
        } catch (e: any) {
            const errorMessage = e?.message || 'Unable to load projects';
            setError(errorMessage);
            // Only show toast on foreground loads, not background polling
            if (showLoader) {
                Swal.fire({
                    icon: 'error',
                    title: 'Unable to Load Projects',
                    text: 'We encountered a problem loading BSJ projects. Please try again.',
                    toast: true,
                    position: 'bottom-end',
                    timer: 3500,
                    showConfirmButton: false,
                });
            }
        } finally {
            if (showLoader) setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadProjects();
        const interval = setInterval(() => loadProjects(false), 15000);
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') loadProjects(false);
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [loadProjects]);

    // Category utilities
    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            TECHNOLOGY: 'bg-blue-500 text-white',
            SUSTAINABILITY: 'bg-green-500 text-white',
            CUSTOMER_SERVICE: 'bg-purple-500 text-white',
            PROCESS_IMPROVEMENT: 'bg-orange-500 text-white',
            COST_REDUCTION: 'bg-yellow-500 text-white',
            PRODUCT_INNOVATION: 'bg-pink-500 text-white',
            OTHER: 'bg-gray-500 text-white',
        };
        return colors[category] || colors.OTHER;
    };

    const getCategoryLabel = (category: string) => {
        return category
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, (l) => l.toUpperCase());
    };

    // Available categories
    const availableCategories = useMemo(() => {
        const cats = new Set<string>();
        projects.forEach((p) => cats.add(p.category));
        return ['ALL', ...Array.from(cats)];
    }, [projects]);

    // Project stats
    const stats = useMemo(() => {
        const total = projects.length;
        const categoryBreakdown: Record<string, number> = {};
        let totalVotes = 0;
        let mostRecentDate = '';

        projects.forEach((p) => {
            categoryBreakdown[p.category] = (categoryBreakdown[p.category] || 0) + 1;
            totalVotes += p.voteCount;
            if (!mostRecentDate || (p.promotedAt && p.promotedAt > mostRecentDate)) {
                mostRecentDate = p.promotedAt || '';
            }
        });

        return {
            total,
            categoryBreakdown,
            avgVotes: total > 0 ? Math.round(totalVotes / total) : 0,
            mostRecent: mostRecentDate ? new Date(mostRecentDate).toLocaleDateString() : 'N/A',
        };
    }, [projects]);

    // Filtered and sorted projects
    const filteredProjects = useMemo(() => {
        const q = search.trim().toLowerCase();
        let filtered = projects.filter((p) => {
            const matchesSearch =
                !q || p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.projectCode?.toLowerCase().includes(q) || p.submittedBy.toLowerCase().includes(q);
            const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
            return matchesSearch && matchesCategory;
        });

        // Sort
        switch (sortBy) {
            case 'newest':
                filtered.sort((a, b) => new Date(b.promotedAt || b.submittedAt).getTime() - new Date(a.promotedAt || a.submittedAt).getTime());
                break;
            case 'oldest':
                filtered.sort((a, b) => new Date(a.promotedAt || a.submittedAt).getTime() - new Date(b.promotedAt || b.submittedAt).getTime());
                break;
            case 'most-voted':
                filtered.sort((a, b) => b.voteCount - a.voteCount);
                break;
            case 'alphabetical':
                filtered.sort((a, b) => a.title.localeCompare(b.title));
                break;
        }

        return filtered;
    }, [projects, search, categoryFilter, sortBy]);

    // Paginated projects
    const paginatedProjects = useMemo(() => {
        const start = (page - 1) * pageSize;
        return filteredProjects.slice(start, start + pageSize);
    }, [filteredProjects, page, pageSize]);

    const totalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));

    // Copy project code
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

    // Export CSV
    const exportCsv = () => {
        const rows = [['Project Code', 'Title', 'Category', 'Submitted By', 'Promoted Date', 'Votes', 'Views', 'Status']];
        filteredProjects.forEach((p) =>
            rows.push([
                p.projectCode || 'N/A',
                p.title,
                p.category,
                p.submittedBy,
                p.promotedAt ? new Date(p.promotedAt).toLocaleDateString() : 'N/A',
                String(p.voteCount),
                String(p.viewCount),
                p.status,
            ])
        );
        const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bsj-projects-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* Hero Header */}
            <div className="panel bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white overflow-hidden relative">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute -top-20 -right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-white rounded-full blur-3xl" />
                </div>
                <div className="relative z-10 p-6 sm:p-8">
                    <div className="flex items-start justify-between gap-6 flex-wrap">
                        <div className="flex-1 min-w-[280px]">
                            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-3">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <span>Official BSJ Projects</span>
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-black flex items-center gap-3 mb-2">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                BSJ Projects
                            </h1>
                            <p className="text-white/90 max-w-2xl">Innovation ideas that have been approved and promoted to official BSJ projects</p>
                        </div>
                        <div className="bg-white/15 rounded-xl px-6 py-4 backdrop-blur-sm min-w-[200px]">
                            <div className="text-xs text-white/80 mb-2">Active Projects</div>
                            <div className="flex items-end gap-2">
                                <div className="text-4xl font-black">{stats.total}</div>
                                <div className="mb-1.5">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Summary */}
            {!loading && projects.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="panel">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Total Projects</p>
                                <h3 className="text-3xl font-bold text-primary">{stats.total}</h3>
                            </div>
                            <svg className="w-14 h-14 text-gray-400 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                />
                            </svg>
                        </div>
                    </div>

                    <div className="panel">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Top Category</p>
                                <h3 className="text-xl font-bold text-primary">
                                    {Object.entries(stats.categoryBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0]
                                        ? getCategoryLabel(Object.entries(stats.categoryBreakdown).sort((a, b) => b[1] - a[1])[0][0])
                                        : 'N/A'}
                                </h3>
                            </div>
                            <svg className="w-14 h-14 text-yellow-400 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                                />
                            </svg>
                        </div>
                    </div>

                    <div className="panel">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Avg. Votes</p>
                                <h3 className="text-3xl font-bold text-primary">{stats.avgVotes}</h3>
                            </div>
                            <svg className="w-14 h-14 text-gray-400 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
                                />
                            </svg>
                        </div>
                    </div>

                    <div className="panel">
                        <div className="flex items-center justify-between mb-2">
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Latest Project</p>
                                <h3 className="text-sm font-bold text-primary">{stats.mostRecent}</h3>
                            </div>
                            <svg className="w-14 h-14 text-gray-400 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
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
                                placeholder="Search by project code, title, or description..."
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
                            value={categoryFilter}
                            onChange={(e) => {
                                setCategoryFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            {availableCategories.map((c) => (
                                <option key={c} value={c}>
                                    {c === 'ALL' ? 'All Categories' : getCategoryLabel(c)}
                                </option>
                            ))}
                        </select>
                        <select
                            className="form-select"
                            value={sortBy}
                            onChange={(e) => {
                                setSortBy(e.target.value as any);
                                setPage(1);
                            }}
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="most-voted">Most Voted</option>
                            <option value="alphabetical">A-Z</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        {projects.length > 0 && (
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
                        )}
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="panel animate-pulse">
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mb-4"></div>
                            <div className="flex gap-2">
                                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="panel text-center py-12">
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
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Unable to Load Projects</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">We encountered a problem loading BSJ projects. Please try again.</p>
                    <button className="btn btn-primary" onClick={() => loadProjects()}>
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

            {/* Empty State */}
            {!loading && !error && projects.length === 0 && (
                <div className="panel text-center py-16">
                    <svg className="w-32 h-32 mx-auto mb-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">No BSJ Projects Yet</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto mb-6">
                        Projects appear here when the Innovation Committee approves and promotes community ideas to official BSJ initiatives.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <Link to="/innovation/ideas/new" className="btn btn-primary">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Submit an Idea
                        </Link>
                        <Link to="/innovation/ideas/browse" className="btn btn-outline-primary">
                            Browse Ideas
                        </Link>
                    </div>
                </div>
            )}

            {/* Projects Grid */}
            {!loading && !error && paginatedProjects.length > 0 && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {paginatedProjects.map((project) => (
                            <div key={project.id} className="panel hover:shadow-xl transition-shadow">
                                {/* Project Code Badge */}
                                <div className="mb-4">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-bold text-lg">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <span>{project.projectCode || 'N/A'}</span>
                                        <button onClick={() => copyProjectCode(project.projectCode!)} className="ml-2 hover:bg-white/20 p-1 rounded transition-colors" title="Copy project code">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {/* Category Badge */}
                                <div className="mb-3">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getCategoryColor(project.category)}`}>{getCategoryLabel(project.category)}</span>
                                </div>

                                {/* Title */}
                                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2">{project.title}</h3>

                                {/* Description */}
                                <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">{project.description}</p>

                                {/* Metadata */}
                                <div className="space-y-2 mb-4 text-sm text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                                        </svg>
                                        <span>
                                            by <strong>{project.submittedBy}</strong>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path
                                                fillRule="evenodd"
                                                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        <span>Promoted: {project.promotedAt ? new Date(project.promotedAt).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                </div>

                                {/* Vote Stats */}
                                <div className="flex items-center gap-4 mb-4 text-sm">
                                    <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                        </svg>
                                        <span className="text-base">{(project.upvoteCount ?? 0) || (project.voteCount > 0 ? project.voteCount : 0)}</span>
                                    </span>
                                    <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" transform="rotate(180)">
                                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                        </svg>
                                        <span className="text-base">{(project.downvoteCount ?? 0) || (project.voteCount < 0 ? Math.abs(project.voteCount) : 0)}</span>
                                    </span>
                                    <span className="text-gray-600 dark:text-gray-400 font-medium">
                                        Score:{' '}
                                        <span className={project.voteCount > 0 ? 'text-green-600 dark:text-green-400' : project.voteCount < 0 ? 'text-red-600 dark:text-red-400' : ''}>
                                            {project.voteCount > 0 ? `+${project.voteCount}` : project.voteCount}
                                        </span>
                                    </span>
                                </div>

                                {/* Actions */}
                                <Link to={`/innovation/ideas/${project.id}`} className="btn btn-primary w-full">
                                    View Project Details
                                </Link>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {filteredProjects.length > pageSize && (
                        <div className="flex items-center justify-between mt-6">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, filteredProjects.length)} of {filteredProjects.length} projects
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
                </>
            )}

            {/* No Results */}
            {!loading && !error && projects.length > 0 && paginatedProjects.length === 0 && (
                <div className="panel text-center py-12">
                    <svg className="w-24 h-24 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Projects Match Your Search</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Try adjusting your search terms or filters</p>
                    <button
                        className="btn btn-outline-primary"
                        onClick={() => {
                            setSearch('');
                            setCategoryFilter('ALL');
                            setPage(1);
                        }}
                    >
                        Clear Filters
                    </button>
                </div>
            )}

            {/* Trust & Security Footer */}
            <div className="panel">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-sm">
                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Official BSJ Projects
                        </span>
                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                />
                            </svg>
                            Committee Approved
                        </span>
                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Active Development
                        </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Last updated: {stats.mostRecent}</div>
                </div>
            </div>
        </div>
    );
};

export default BSJProjects;
