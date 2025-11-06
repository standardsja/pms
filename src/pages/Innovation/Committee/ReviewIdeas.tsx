import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { approveIdea, fetchIdeas, Idea, promoteIdea, rejectIdea } from '../../../utils/ideasApi';
import { getUser } from '../../../utils/auth';

const tabs = [
  { key: 'pending', label: 'Pending Review' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'popular', label: 'Popular' },
] as const;

export default function ReviewIdeas() {
  const dispatch = useDispatch();
  const currentUser = getUser();
  const isCommittee = currentUser?.role === 'INNOVATION_COMMITTEE';

  const [active, setActive] = useState<(typeof tabs)[number]['key']>('pending');
  const [loading, setLoading] = useState(false);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(setPageTitle('Review Ideas'));
  }, [dispatch]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(null);
      try {
        const data = await fetchIdeas(
          active === 'popular'
            ? { sort: 'popularity' }
            : { status: active }
        );
        if (!cancelled) setIdeas(data);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load ideas');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [active]);

  const onApprove = async (idea: Idea) => {
    const notes = prompt('Optional: add review notes for approval', '');
    try {
      const updated = await approveIdea(idea.id, notes || undefined);
      setIdeas((prev) => prev.filter((i) => i.id !== idea.id));
      // If currently in approved tab, add to list
      if (active === 'approved') setIdeas((prev) => [updated, ...prev]);
    } catch (e: any) {
      alert(e?.message || 'Approve failed');
    }
  };

  const onReject = async (idea: Idea) => {
    const notes = prompt('Optional: add review notes for rejection', '');
    try {
      const updated = await rejectIdea(idea.id, notes || undefined);
      setIdeas((prev) => prev.filter((i) => i.id !== idea.id));
      if (active === 'rejected') setIdeas((prev) => [updated, ...prev]);
    } catch (e: any) {
      alert(e?.message || 'Reject failed');
    }
  };

  const onPromote = async (idea: Idea) => {
    let code = '';
    // Force approved first if not
    try {
      if (idea.status !== 'APPROVED') {
        const ok = confirm('This idea is not yet approved. Approve and promote now?');
        if (!ok) return;
        await approveIdea(idea.id);
      }
      code = prompt('Optional: enter a project code or leave blank to auto-generate', '') || '';
      const updated = await promoteIdea(idea.id, code || undefined);
      setIdeas((prev) => prev.filter((i) => i.id !== idea.id));
      alert(`Promoted to project ${updated.projectCode}`);
    } catch (e: any) {
      alert(e?.message || 'Promote failed');
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
    return (
      <div className="panel">
        <h2 className="text-xl font-bold mb-2">Access restricted</h2>
        <p className="text-gray-600 dark:text-gray-400">This page is for Innovation Committee members only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">Review Ideas</h1>
          <p className="text-gray-600 dark:text-gray-400">Approve, reject, and promote community submissions.</p>
        </div>
      </div>

      <div className="panel">
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
          <div className="py-10 text-center text-gray-500">Loading…</div>
        )}
        {error && (
          <div className="py-6 text-center text-red-500">{error}</div>
        )}

        {!loading && !error && ideas.length === 0 && (
          <div className="py-12 text-center text-gray-500">{emptyMessage}</div>
        )}

        {!loading && !error && ideas.length > 0 && (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {ideas.map((idea) => (
              <div key={idea.id} className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{idea.category.replace('_', ' ')}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${idea.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' : idea.status === 'PENDING_REVIEW' ? 'bg-yellow-100 text-yellow-700' : idea.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {idea.status.replaceAll('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold mt-1">{idea.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{idea.description}</p>
                  <div className="mt-2 text-xs text-gray-500">Votes: {idea.voteCount} • Views: {idea.viewCount}</div>
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
    </div>
  );
}
