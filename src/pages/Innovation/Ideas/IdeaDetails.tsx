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
      const data = await fetchIdeaById(id, { includeAttachments: true });
      setIdea(data);
    } catch (err) {
      console.error('[IdeaDetails] Error loading idea:', err);
      setError(err instanceof Error ? err.message : 'Failed to load idea');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVote(voteType: 'UPVOTE' | 'DOWNVOTE' = 'UPVOTE') {
    if (!id || !idea || isVoting) return;
    try {
      setIsVoting(true);
      if (idea.userVoteType === voteType) {
        const updated = await removeVote(id);
        setIdea({ ...updated, hasVoted: false, userVoteType: null });
      } else if (idea.userVoteType && idea.userVoteType !== voteType) {
        // Switch vote
        const updated = await voteForIdea(id, voteType);
        setIdea({ ...updated, hasVoted: true });
      } else {
        const updated = await voteForIdea(id, voteType);
        setIdea({ ...updated, hasVoted: true });
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
        
        {/* Attachments/Images */}
        {idea.attachments && idea.attachments.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              {t('innovation.view.attachments', { defaultValue: 'Attachments' })} ({idea.attachments.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {idea.attachments.map((attachment) => (
                <div key={attachment.id} className="group relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
                  {attachment.mimeType?.startsWith('image/') ? (
                    <img
                      src={attachment.fileUrl}
                      alt={attachment.fileName}
                      className="w-full h-48 object-cover cursor-pointer hover:scale-105 transition-transform"
                      loading="lazy"
                      onClick={() => window.open(attachment.fileUrl, '_blank')}
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="mt-2 text-xs text-gray-500">{attachment.fileName}</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs truncate">{attachment.fileName}</p>
                    <p className="text-xs text-gray-300">{(attachment.fileSize / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 font-medium">
            {t(`innovation.categories.${idea.category}`)}
          </span>
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"/></svg>
            {idea.upvoteCount ?? 0}
          </span>
          <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" transform="rotate(180)"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z"/></svg>
            {idea.downvoteCount ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <span className={`font-semibold ${idea.voteCount > 0 ? 'text-green-600 dark:text-green-400' : idea.voteCount < 0 ? 'text-red-600 dark:text-red-400' : ''}`}>{idea.voteCount > 0 ? `+${idea.voteCount}` : idea.voteCount}</span> score
          </span>
          <span className="flex items-center gap-1">
            {t('innovation.view.engagement.views', { count: idea.viewCount })}
          </span>
        </div>
        
        {/* Vote Button */}
        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={() => handleVote('UPVOTE')}
            disabled={isVoting}
            className={`btn ${idea.userVoteType === 'UPVOTE' ? 'btn-primary' : 'btn-outline-primary'} gap-2`}
          >
            <IconThumbUp className="w-4 h-4" />
            {isVoting && idea.userVoteType === 'UPVOTE' ? 'Processing...' : idea.userVoteType === 'UPVOTE' ? 'Upvoted' : 'Upvote'}
          </button>
          <button
            type="button"
            onClick={() => handleVote('DOWNVOTE')}
            disabled={isVoting}
            className={`btn ${idea.userVoteType === 'DOWNVOTE' ? 'btn-danger' : 'btn-outline-danger'} gap-2`}
          >
            <IconThumbUp className="w-4 h-4 rotate-180" />
            {isVoting && idea.userVoteType === 'DOWNVOTE' ? 'Processing...' : idea.userVoteType === 'DOWNVOTE' ? 'Downvoted' : 'Downvote'}
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
