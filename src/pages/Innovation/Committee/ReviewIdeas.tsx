import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { approveIdea, fetchIdeas, Idea, promoteIdea, rejectIdea } from '../../../utils/ideasApi';
import { getUser } from '../../../utils/auth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';

const tabs = [
  { key: 'pending', label: 'Pending Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'popular', label: 'Popular' },
] as const;

export default function ReviewIdeas() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentUser = getUser();
  const roles: string[] = (currentUser?.roles as any) || (currentUser?.role ? [currentUser.role] : []);
  const isCommittee = roles?.includes?.('INNOVATION_COMMITTEE');

  const [active, setActive] = useState<(typeof tabs)[number]['key']>('pending');
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showNotes, setShowNotes] = useState(false);
  const [notesText, setNotesText] = useState('');
  const [noteAction, setNoteAction] = useState<'approve' | 'reject' | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkNotes, setShowBulkNotes] = useState(false);
  const [bulkNotesText, setBulkNotesText] = useState('');
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | null>(null);
  
  // Advanced filters
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minScore, setMinScore] = useState('');
  const [submitterFilter, setSubmitterFilter] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  
  // Keyboard nav
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const ideasListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(setPageTitle('Review Ideas'));
  }, [dispatch]);

  // Sync URL params with state
  useEffect(() => {
    const urlTab = searchParams.get('tab');
    const urlSearch = searchParams.get('search');
    const urlCategory = searchParams.get('category');
    const urlDateFrom = searchParams.get('dateFrom');
    const urlDateTo = searchParams.get('dateTo');
    const urlMinScore = searchParams.get('minScore');
    const urlSubmitter = searchParams.get('submitter');
    const urlPage = searchParams.get('page');
    
    if (urlTab && tabs.some(t => t.key === urlTab)) setActive(urlTab as any);
    if (urlSearch) setSearch(urlSearch);
    if (urlCategory) setCategoryFilter(urlCategory);
    if (urlDateFrom) setDateFrom(urlDateFrom);
    if (urlDateTo) setDateTo(urlDateTo);
    if (urlMinScore) setMinScore(urlMinScore);
    if (urlSubmitter) setSubmitterFilter(urlSubmitter);
    if (urlPage) setPage(parseInt(urlPage) || 1);
  }, []);

  // Update URL params when filters change
  const updateUrlParams = useCallback(() => {
    const params: any = {};
    if (active !== 'pending') params.tab = active;
    if (search) params.search = search;
    if (categoryFilter !== 'all') params.category = categoryFilter;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (minScore) params.minScore = minScore;
    if (submitterFilter) params.submitter = submitterFilter;
    if (page > 1) params.page = page.toString();
    setSearchParams(params, { replace: true });
  }, [active, search, categoryFilter, dateFrom, dateTo, minScore, submitterFilter, page, setSearchParams]);

  useEffect(() => {
    updateUrlParams();
  }, [updateUrlParams]);

  useEffect(() => {
    let cancelled = false;
    async function load(showLoader = true) {
      if (showLoader) setLoading(true);
      setError(null);
      try {
        const data = await fetchIdeas(
          active === 'popular'
            ? { sort: 'popularity' }
            : { status: active }
        );
        if (!cancelled) {
          setIdeas(data);
          setTotalCount(data.length);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load ideas');
        Swal.fire({ icon: 'error', title: 'Failed to load ideas', text: e?.message || 'Please try again', toast: true, position: 'bottom-end', timer: 2500, showConfirmButton: false });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(() => load(false), 15000);
    const vis = () => { if (document.visibilityState === 'visible') load(false); };
    document.addEventListener('visibilitychange', vis);
    return () => { cancelled = true; clearInterval(id); document.removeEventListener('visibilitychange', vis); };
  }, [active]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Focus search on /
      if (e.key === '/' && !showNotes && !showBulkNotes) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      
      // Skip if typing in input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as any)?.tagName)) return;
      
      const visibleIdeas = paginatedIdeas;
      
      // Arrow navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, visibleIdeas.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
      }
      
      // Actions (only on pending tab and with focused item)
      if (active === 'pending' && focusedIndex >= 0 && focusedIndex < visibleIdeas.length) {
        const focused = visibleIdeas[focusedIndex];
        if (e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          onApprove(focused);
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          onReject(focused);
        }
      }
      
      // Promote shortcut on approved/popular
      if ((active === 'approved' || active === 'popular') && focusedIndex >= 0 && focusedIndex < visibleIdeas.length) {
        const focused = visibleIdeas[focusedIndex];
        if (e.key === 'p' || e.key === 'P') {
          e.preventDefault();
          onPromote(focused);
        }
      }
    };
    
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [focusedIndex, active, showNotes, showBulkNotes]);

  const openNotes = (idea: Idea, action: 'approve' | 'reject') => {
    setSelectedIdea(idea);
    setNoteAction(action);
    setNotesText('');
    setShowNotes(true);
  };

  const submitNotes = async () => {
    if (!selectedIdea || !noteAction) return;
    
    // Optimistic update
    const optimisticIdeas = ideas.filter((i) => i.id !== selectedIdea.id);
    const rollbackIdeas = [...ideas];
    setIdeas(optimisticIdeas);
    
    try {
      if (noteAction === 'approve') {
        const updated = await approveIdea(selectedIdea.id, notesText || undefined);
        if (active === 'approved') setIdeas((prev) => [updated, ...prev]);
        Swal.fire({ icon: 'success', title: 'Approved', toast: true, position: 'bottom-end', timer: 1800, showConfirmButton: false });
      } else {
        const updated = await rejectIdea(selectedIdea.id, notesText || undefined);
        if (active === 'rejected') setIdeas((prev) => [updated, ...prev]);
        Swal.fire({ icon: 'success', title: 'Rejected', toast: true, position: 'bottom-end', timer: 1800, showConfirmButton: false });
      }
    } catch (e: any) {
      // Rollback on failure
      setIdeas(rollbackIdeas);
      Swal.fire({ icon: 'error', title: 'Action failed', text: e?.message || 'Please try again', toast: true, position: 'bottom-end', timer: 2200, showConfirmButton: false });
    } finally {
      setShowNotes(false);
      setSelectedIdea(null);
      setNoteAction(null);
      setNotesText('');
    }
  };

  const onApprove = (idea: Idea) => openNotes(idea, 'approve');
  const onReject = (idea: Idea) => openNotes(idea, 'reject');

  // Bulk actions
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(i => i.id)));
    }
  };

  const openBulkNotes = (action: 'approve' | 'reject') => {
    if (selectedIds.size === 0) {
      Swal.fire({ icon: 'warning', title: 'No selection', text: 'Select at least one idea first', toast: true, position: 'bottom-end', timer: 2000, showConfirmButton: false });
      return;
    }
    setBulkAction(action);
    setBulkNotesText('');
    setShowBulkNotes(true);
  };

  const submitBulkNotes = async () => {
    if (!bulkAction || selectedIds.size === 0) return;
    
    const selectedList = ideas.filter(i => selectedIds.has(i.id));
    const optimisticIdeas = ideas.filter(i => !selectedIds.has(i.id));
    const rollbackIdeas = [...ideas];
    setIdeas(optimisticIdeas);
    
    try {
      const promises = selectedList.map(idea =>
        bulkAction === 'approve'
          ? approveIdea(idea.id, bulkNotesText || undefined)
          : rejectIdea(idea.id, bulkNotesText || undefined)
      );
      const results = await Promise.all(promises);
      
      if (bulkAction === 'approve' && active === 'approved') {
        setIdeas(prev => [...results, ...prev]);
      } else if (bulkAction === 'reject' && active === 'rejected') {
        setIdeas(prev => [...results, ...prev]);
      }
      
      Swal.fire({ icon: 'success', title: `${bulkAction === 'approve' ? 'Approved' : 'Rejected'} ${selectedIds.size} idea(s)`, toast: true, position: 'bottom-end', timer: 2000, showConfirmButton: false });
      setSelectedIds(new Set());
    } catch (e: any) {
      setIdeas(rollbackIdeas);
      Swal.fire({ icon: 'error', title: 'Bulk action failed', text: e?.message || 'Some items may not have been processed', toast: true, position: 'bottom-end', timer: 2500, showConfirmButton: false });
    } finally {
      setShowBulkNotes(false);
      setBulkAction(null);
      setBulkNotesText('');
    }
  };

  const onPromote = async (idea: Idea) => {
    // Optimistic removal
    const optimisticIdeas = ideas.filter(i => i.id !== idea.id);
    const rollbackIdeas = [...ideas];
    
    try {
      if (idea.status !== 'APPROVED') {
        const { isConfirmed } = await Swal.fire({
          icon: 'question', title: 'Approve & Promote?', text: 'This idea isn\'t approved yet. Approve and promote now?',
          showCancelButton: true, confirmButtonText: 'Yes, continue'
        });
        if (!isConfirmed) return;
        await approveIdea(idea.id);
      }
      
      // Generate a default project code
      const year = new Date().getFullYear();
      const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
      const defaultCode = `INNO-${year}-${randomPart}`;
      
      const { value: projectCode } = await Swal.fire({
        title: 'Project Code',
        input: 'text',
        inputLabel: 'Enter project code or leave blank to auto-generate',
        inputValue: defaultCode,
        inputPlaceholder: 'e.g. INNO-2025-001',
        showCancelButton: true
      });
      
      if (projectCode === undefined) return; // User cancelled
      
      // If user cleared the field, use the default code
      const finalCode = projectCode && projectCode.trim() ? projectCode.trim() : defaultCode;
      
      setIdeas(optimisticIdeas);
      const updated = await promoteIdea(idea.id, finalCode);
      Swal.fire({ icon: 'success', title: `Promoted to ${updated.projectCode}`, toast: true, position: 'bottom-end', timer: 2000, showConfirmButton: false });
    } catch (e: any) {
      setIdeas(rollbackIdeas);
      Swal.fire({ icon: 'error', title: 'Promote failed', text: e?.message || 'Please try again', toast: true, position: 'bottom-end', timer: 2200, showConfirmButton: false });
    }
  };

  const emptyMessage = useMemo(() => {
    switch (active) {
      case 'pending': return 'No submissions are awaiting review.';
      case 'approved': return 'No approved ideas yet.';
      case 'rejected': return 'No rejected ideas.';
      case 'popular': return 'No popular ideas found.';
    }
  }, [active]);

  if (!isCommittee) {
    setTimeout(() => navigate('/innovation/committee/dashboard'), 2000);
    return (
      <div className="panel">
        <h2 className="text-xl font-bold mb-2">Access restricted</h2>
        <p className="text-gray-600 dark:text-gray-400">This page is for Innovation Committee members only. Redirecting…</p>
      </div>
    );
  }

  const categories = useMemo(() => {
    const set = new Set<string>();
    ideas.forEach(i => { if (i.category) set.add(i.category); });
    return ['all', ...Array.from(set)];
  }, [ideas]);

  const submitters = useMemo(() => {
    const set = new Set<string>();
    ideas.forEach(i => { if (i.submittedBy) set.add(i.submittedBy); });
    return ['all', ...Array.from(set)];
  }, [ideas]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return ideas.filter(i => {
      const matchesSearch = !s || i.title.toLowerCase().includes(s) || i.description.toLowerCase().includes(s);
      const matchesCategory = categoryFilter === 'all' || i.category === categoryFilter;
      const matchesSubmitter = !submitterFilter || submitterFilter === 'all' || i.submittedBy === submitterFilter;
      
      // Date range filter
      let matchesDateRange = true;
      if (dateFrom || dateTo) {
        const submittedDate = new Date(i.submittedAt);
        if (dateFrom && submittedDate < new Date(dateFrom)) matchesDateRange = false;
        if (dateTo && submittedDate > new Date(dateTo)) matchesDateRange = false;
      }
      
      // Min score filter
      let matchesMinScore = true;
      if (minScore) {
        const min = parseInt(minScore);
        if (!isNaN(min) && i.voteCount < min) matchesMinScore = false;
      }
      
      return matchesSearch && matchesCategory && matchesSubmitter && matchesDateRange && matchesMinScore;
    });
  }, [ideas, search, categoryFilter, submitterFilter, dateFrom, dateTo, minScore]);

  // Pagination
  const paginatedIdeas = useMemo(() => {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return filtered.slice(start, end);
  }, [filtered, page, perPage]);

  const totalPages = Math.ceil(filtered.length / perPage);

  const statusBadge = (status: Idea['status'] | string) => {
    if (status === 'APPROVED') return 'bg-blue-100 text-blue-700';
    if (status === 'REJECTED') return 'bg-red-100 text-red-700';
    if (status === 'IMPLEMENTED') return 'bg-emerald-100 text-emerald-700';
    return 'bg-yellow-100 text-yellow-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">Review Ideas</h1>
          <p className="text-gray-600 dark:text-gray-400">Approve, reject, and promote community submissions.</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn ${showFilters ? 'btn-primary' : 'btn-outline-primary'}`}
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Advanced Filters
        </button>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="panel">
          <h3 className="text-lg font-bold mb-3">Advanced Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="form-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="form-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Min Score</label>
              <input
                type="number"
                value={minScore}
                onChange={(e) => { setMinScore(e.target.value); setPage(1); }}
                className="form-input"
                placeholder="e.g. 5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Submitter</label>
              <select
                value={submitterFilter || 'all'}
                onChange={(e) => { setSubmitterFilter(e.target.value === 'all' ? '' : e.target.value); setPage(1); }}
                className="form-select"
              >
                <option value="all">All Submitters</option>
                {submitters.filter(s => s !== 'all').map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setMinScore('');
                setSubmitterFilter('');
                setPage(1);
              }}
              className="btn btn-outline-secondary"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      <div className="panel">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="form-input pl-10"
                placeholder="Search title or description (press / to focus)"
              />
              <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="form-select w-auto">
              {categories.map(c => (<option key={c} value={c}>{c === 'all' ? 'All Categories' : c.replaceAll('_',' ')}</option>))}
            </select>
          </div>
          
          {/* Bulk actions (only on pending) */}
          {active === 'pending' && (
            <div className="flex items-center gap-2">
              <button
                onClick={selectAll}
                className="btn btn-outline-secondary btn-sm"
                disabled={filtered.length === 0}
              >
                {selectedIds.size === filtered.length && filtered.length > 0 ? 'Deselect All' : 'Select All'}
              </button>
              {selectedIds.size > 0 && (
                <>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{selectedIds.size} selected</span>
                  <button onClick={() => openBulkNotes('approve')} className="btn btn-success btn-sm">
                    Approve Selected
                  </button>
                  <button onClick={() => openBulkNotes('reject')} className="btn btn-danger btn-sm">
                    Reject Selected
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setActive(t.key); setPage(1); setSelectedIds(new Set()); }}
              className={`px-4 py-2 -mb-px border-b-2 ${active === t.key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Keyboard hints */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex flex-wrap gap-3">
          <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">/</kbd> Focus search</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">↑↓</kbd> Navigate</span>
          {active === 'pending' && (
            <>
              <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">A</kbd> Approve</span>
              <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">R</kbd> Reject</span>
            </>
          )}
          {(active === 'approved' || active === 'popular') && (
            <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">P</kbd> Promote</span>
          )}
        </div>

        {loading && (
          <div className="py-4 space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="animate-pulse py-4 flex items-center justify-between">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
                <div className="w-40 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        )}
        {error && (
          <div className="py-6 text-center text-red-500">{error}</div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="py-12 text-center text-gray-500">{emptyMessage}</div>
        )}

        {!loading && !error && paginatedIdeas.length > 0 && (
          <>
            <div ref={ideasListRef} className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedIdeas.map((idea, idx) => (
                <div
                  key={idea.id}
                  className={`py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${
                    focusedIndex === idx ? 'bg-blue-50 dark:bg-blue-900/20 -mx-4 px-4' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    {/* Checkbox for bulk selection (pending only) */}
                    {active === 'pending' && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(idea.id)}
                        onChange={() => toggleSelection(idea.id)}
                        className="form-checkbox mt-1"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{idea.category.replace('_', ' ')}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${statusBadge(idea.status)}`}>{idea.status.replaceAll('_',' ')}</span>
                      </div>
                      <h3 className="text-lg font-bold mt-1">{idea.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{idea.description}</p>
                      <div className="mt-2 text-xs text-gray-500 flex flex-wrap items-center gap-3">
                        <span>by {idea.submittedBy || 'Unknown'} on {new Date(idea.submittedAt).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"/></svg>
                          {idea.upvoteCount ?? 0}
                        </span>
                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" transform="rotate(180)"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"/></svg>
                          {idea.downvoteCount ?? 0}
                        </span>
                        <span>Score {idea.voteCount > 0 ? `+${idea.voteCount}` : idea.voteCount}</span>
                        <span>Views {idea.viewCount}</span>
                        <span>Comments {(idea as any).commentCount ?? 0}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {active === 'pending' && (
                      <>
                        <button className="btn btn-success" onClick={() => onApprove(idea)}>Approve</button>
                        <button className="btn btn-danger" onClick={() => onReject(idea)}>Reject</button>
                      </>
                    )}
                    {active === 'approved' && (
                      <>
                        <button className="btn btn-primary" onClick={() => onPromote(idea)}>Promote to Project</button>
                      </>
                    )}
                    {active === 'popular' && (
                      <>
                        <button className="btn btn-primary" onClick={() => onPromote(idea)}>
                          {idea.status === 'APPROVED' ? 'Promote' : 'Approve & Promote'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, filtered.length)} of {filtered.length} results
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn btn-outline-primary btn-sm"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn btn-outline-primary btn-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Notes Modal */}
      {showNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="panel w-full max-w-lg">
            <h3 className="text-lg font-bold mb-2">{noteAction === 'approve' ? 'Approve Idea' : 'Reject Idea'}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Optionally add review notes.</p>
            <textarea className="form-textarea w-full mb-4" rows={4} value={notesText} onChange={(e) => setNotesText(e.target.value)} placeholder="Add notes (optional)" />
            <div className="flex justify-end gap-2">
              <button className="btn btn-outline-secondary" onClick={() => { setShowNotes(false); setNoteAction(null); setSelectedIdea(null); }}>Cancel</button>
              <button className={`btn ${noteAction === 'approve' ? 'btn-success' : 'btn-danger'}`} onClick={submitNotes}>
                {noteAction === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Notes Modal */}
      {showBulkNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="panel w-full max-w-lg">
            <h3 className="text-lg font-bold mb-2">
              {bulkAction === 'approve' ? 'Approve' : 'Reject'} {selectedIds.size} Idea(s)
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Add shared review notes for all selected ideas (optional).
            </p>
            <textarea
              className="form-textarea w-full mb-4"
              rows={4}
              value={bulkNotesText}
              onChange={(e) => setBulkNotesText(e.target.value)}
              placeholder="Add notes (optional)"
            />
            <div className="flex justify-end gap-2">
              <button
                className="btn btn-outline-secondary"
                onClick={() => { setShowBulkNotes(false); setBulkAction(null); setBulkNotesText(''); }}
              >
                Cancel
              </button>
              <button
                className={`btn ${bulkAction === 'approve' ? 'btn-success' : 'btn-danger'}`}
                onClick={submitBulkNotes}
              >
                {bulkAction === 'approve' ? 'Approve' : 'Reject'} All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
