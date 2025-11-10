import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { approveIdea, fetchIdeas, Idea, promoteIdea, rejectIdea } from '../../../utils/ideasApi';
import { getUser } from '../../../utils/auth';
import { useNavigate } from 'react-router-dom';
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

  useEffect(() => {
    dispatch(setPageTitle('Review Ideas'));
  }, [dispatch]);

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
        if (!cancelled) setIdeas(data);
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

  const openNotes = (idea: Idea, action: 'approve' | 'reject') => {
    setSelectedIdea(idea);
    setNoteAction(action);
    setNotesText('');
    setShowNotes(true);
  };

  const submitNotes = async () => {
    if (!selectedIdea || !noteAction) return;
    try {
      if (noteAction === 'approve') {
        const updated = await approveIdea(selectedIdea.id, notesText || undefined);
        setIdeas((prev) => prev.filter((i) => i.id !== selectedIdea.id));
        if (active === 'approved') setIdeas((prev) => [updated, ...prev]);
        Swal.fire({ icon: 'success', title: 'Approved', toast: true, position: 'bottom-end', timer: 1800, showConfirmButton: false });
      } else {
        const updated = await rejectIdea(selectedIdea.id, notesText || undefined);
        setIdeas((prev) => prev.filter((i) => i.id !== selectedIdea.id));
        if (active === 'rejected') setIdeas((prev) => [updated, ...prev]);
        Swal.fire({ icon: 'success', title: 'Rejected', toast: true, position: 'bottom-end', timer: 1800, showConfirmButton: false });
      }
    } catch (e: any) {
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

  const onPromote = async (idea: Idea) => {
    try {
      if (idea.status !== 'APPROVED') {
        const { isConfirmed } = await Swal.fire({
          icon: 'question', title: 'Approve & Promote?', text: 'This idea isn\'t approved yet. Approve and promote now?',
          showCancelButton: true, confirmButtonText: 'Yes, continue'
        });
        if (!isConfirmed) return;
        await approveIdea(idea.id);
      }
      const { value: projectCode } = await Swal.fire({
        title: 'Project Code', input: 'text', inputLabel: 'Optional - leave blank to auto-generate',
        inputPlaceholder: 'e.g. INNO-2025-001', showCancelButton: true
      });
      const updated = await promoteIdea(idea.id, projectCode || undefined);
      setIdeas((prev) => prev.filter((i) => i.id !== idea.id));
      Swal.fire({ icon: 'success', title: `Promoted to ${updated.projectCode}`, toast: true, position: 'bottom-end', timer: 2000, showConfirmButton: false });
    } catch (e: any) {
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

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return ideas.filter(i => {
      const matchesSearch = !s || i.title.toLowerCase().includes(s) || i.description.toLowerCase().includes(s);
      const matchesCategory = categoryFilter === 'all' || i.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [ideas, search, categoryFilter]);

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
      </div>

      <div className="panel">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-10"
              placeholder="Search title or description"
            />
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="form-select w-auto">
            {categories.map(c => (<option key={c} value={c}>{c === 'all' ? 'All Categories' : c.replaceAll('_',' ')}</option>))}
          </select>
        </div>
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`px-4 py-2 -mb-px border-b-2 ${active === t.key ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {t.label}
            </button>
          ))}
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

        {!loading && !error && filtered.length > 0 && (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filtered.map((idea) => (
              <div key={idea.id} className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
    </div>
  );
}
