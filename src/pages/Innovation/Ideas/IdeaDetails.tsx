import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { fetchIdeaById, voteForIdea, removeVote, type Idea } from '../../../utils/ideasApi';
import IconThumbUp from '../../../components/Icon/IconThumbUp';

export default function IdeaDetails() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { id = '' } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [idea, setIdea] = useState<Idea | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  useEffect(() => {
    const title = idea ? `${idea.title}` : t('innovation.view.title');
    dispatch(setPageTitle(title));
  }, [dispatch, idea, t]);

  useEffect(() => {
    loadIdea();
  }, [id]);

  async function loadIdea() {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchIdeaById(id);
      setIdea(data);
    } catch (err) {
      console.error('[IdeaDetails] Error loading idea:', err);
      setError(err instanceof Error ? err.message : 'Failed to load idea');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVote() {
    if (!id || !idea || isVoting) return;
    
    try {
      setIsVoting(true);
      if (idea.hasVoted) {
        const updated = await removeVote(id);
        setIdea({ ...idea, ...updated, hasVoted: false });
      } else {
        const updated = await voteForIdea(id);
        setIdea({ ...idea, ...updated, hasVoted: true });
      }
    } catch (err) {
      console.error('[IdeaDetails] Error voting:', err);
      alert(err instanceof Error ? err.message : 'Failed to vote');
    } finally {
      setIsVoting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-1/2 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
        <div className="panel space-y-3">
          <div className="h-5 w-1/3 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
          <div className="h-24 w-full bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (error || !idea) {
    return (
      <div className="panel text-center py-16">
        <div className="text-6xl mb-3" role="img" aria-label="magnify">🔎</div>
        <h2 className="text-2xl font-bold mb-2">{t('innovation.view.empty.title')}</h2>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          {error || t('innovation.view.empty.message')}
        </p>
        <Link to="/innovation/ideas/browse" className="btn btn-primary">
          {t('innovation.browse.viewDetails', { defaultValue: 'Back to Ideas' })}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <ul className="flex space-x-2 rtl:space-x-reverse text-sm">
        <li>
          <Link to="/innovation/dashboard" className="text-primary hover:underline">
            {t('innovation.hub')}
          </Link>
        </li>
        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
          <Link to="/innovation/ideas/browse" className="text-primary hover:underline">
            {t('innovation.view.title')}
          </Link>
        </li>
        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
          <span className="font-semibold">{idea.title}</span>
        </li>
      </ul>

      {/* Header */}
      <div className="panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">{idea.title}</h1>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              <span>{t('innovation.view.submittedBy', { name: idea.submittedBy })}</span>
              <span className="mx-2">•</span>
              <span>{new Date(idea.submittedAt).toLocaleDateString()}</span>
            </div>
          </div>
          <Link to="/innovation/ideas/browse" className="btn btn-outline-primary">
            {t('innovation.view.viewDetails', { defaultValue: 'Back' })}
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="panel space-y-4">
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{idea.description}</p>
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
          <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 font-medium">
            {t(`innovation.categories.${idea.category}`)}
          </span>
          <span>•</span>
          <span>{t('innovation.view.engagement.votes', { count: idea.voteCount })}</span>
          <span>•</span>
          <span>{t('innovation.view.engagement.views', { count: idea.viewCount })}</span>
        </div>
        
        {/* Vote Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleVote}
            disabled={isVoting}
            className={`btn ${idea.hasVoted ? 'btn-primary' : 'btn-outline-primary'} gap-2`}
          >
            <IconThumbUp className="w-4 h-4" />
            {isVoting ? 'Processing...' : idea.hasVoted ? 'Voted' : 'Vote for this idea'}
          </button>
        </div>
      </div>

      {/* Votes Section */}
      {idea.votes && idea.votes.length > 0 && (
        <div className="panel">
          <h2 className="text-lg font-bold mb-4">Votes ({idea.votes.length})</h2>
          <div className="space-y-2">
            {idea.votes.map((vote) => (
              <div key={vote.id} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconThumbUp className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-medium">{vote.userName}</span>
                </div>
                <span className="text-sm text-gray-500">
                  {new Date(vote.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
