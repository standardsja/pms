import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { fetchIdeaById, voteForIdea, removeVote, fetchRelatedIdeas, type Idea } from '../../../utils/ideasApi';
import Comments from '../../../components/Comments';
import IconThumbUp from '../../../components/Icon/IconThumbUp';

export default function IdeaDetails() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { id = '' } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [idea, setIdea] = useState<Idea | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [related, setRelated] = useState<Array<{ id: number; title: string; snippet: string; score: number; firstAttachmentUrl?: string | null }>>([]);

  const images = idea?.attachments?.filter(a => a.mimeType?.startsWith('image/')) || [];

  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const showPrev = useCallback(() => {
    if (lightboxIndex === null || !images.length) return;
    setLightboxIndex((prev) => {
      if (prev === null) return null;
      return (prev - 1 + images.length) % images.length;
    });
  }, [lightboxIndex, images.length]);
  const showNext = useCallback(() => {
    if (lightboxIndex === null || !images.length) return;
    setLightboxIndex((prev) => {
      if (prev === null) return null;
      return (prev + 1) % images.length;
    });
  }, [lightboxIndex, images.length]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLightbox();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        showPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        showNext();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, closeLightbox, showPrev, showNext]);

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
      // fire-and-forget related ideas (no block)
      fetchRelatedIdeas(id).then(setRelated).catch(() => {});
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

      {/* Content + Related sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="panel space-y-4 lg:col-span-8">
        {idea.descriptionHtml ? (
          <div
            className="prose dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: idea.descriptionHtml }}
          />
        ) : (
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{idea.description}</p>
        )}
        
        {/* Attachments/Images */}
        {idea.attachments && idea.attachments.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              {t('innovation.view.attachments', { defaultValue: 'Attachments' })} ({idea.attachments.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {idea.attachments.map((attachment, idx) => (
                <div
                  key={attachment.id}
                  className="group relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
                >
                  {attachment.mimeType?.startsWith('image/') ? (
                    <button
                      type="button"
                      aria-label={`Open image ${attachment.fileName} in lightbox`}
                      className="block w-full text-left"
                      onClick={() => setLightboxIndex(images.findIndex(a => a.id === attachment.id))}
                    >
                      <img
                        src={attachment.fileUrl}
                        alt={attachment.fileName}
                        className="w-full h-48 object-cover cursor-zoom-in hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                    </button>
                  ) : (
                    <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center p-3 text-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="mt-2 text-xs text-gray-600 dark:text-gray-300 truncate w-full" title={attachment.fileName}>{attachment.fileName}</span>
                      <a
                        href={attachment.fileUrl}
                        download
                        className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 11l5 5 5-5M12 4v12" /></svg>
                        Download
                      </a>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs truncate" title={attachment.fileName}>{attachment.fileName}</p>
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
        {/* Related */}
        <aside className="lg:col-span-4">
          <div className="panel">
            <h3 className="text-base font-semibold mb-3">Related ideas</h3>
            {related.length === 0 ? (
              <p className="text-sm text-gray-500">No related ideas found.</p>
            ) : (
              <ul className="space-y-3">
                {related.map(r => (
                  <li key={r.id} className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                      {r.firstAttachmentUrl ? (
                        <img src={r.firstAttachmentUrl} alt="thumb" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">📌</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <Link to={`/innovation/ideas/${r.id}`} className="font-medium hover:underline line-clamp-1">{r.title}</Link>
                      <div className="text-xs text-gray-500 line-clamp-2">{r.snippet}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {/* Comments */}
      <Comments ideaId={Number(id)} />

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
      {lightboxIndex !== null && images[lightboxIndex] && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={closeLightbox}
        >
          <div
            className="relative max-w-5xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-2 text-white text-sm">
              <span className="truncate" title={images[lightboxIndex].fileName}>{images[lightboxIndex].fileName}</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.open(images[lightboxIndex!].fileUrl, '_blank')}
                  className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                >Open in new tab</button>
                <a
                  href={images[lightboxIndex!].fileUrl}
                  download
                  className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                >Download</a>
                <button
                  type="button"
                  onClick={closeLightbox}
                  className="px-2 py-1 rounded bg-white/10 hover:bg-white/20"
                  aria-label="Close lightbox"
                >✕</button>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center overflow-auto">
              <img
                src={images[lightboxIndex].fileUrl}
                alt={images[lightboxIndex].fileName}
                className="max-h-[75vh] object-contain rounded shadow-lg"
                draggable={false}
              />
            </div>
            {images.length > 1 && (
              <div className="mt-4 flex justify-between items-center text-white text-xs">
                <button
                  type="button"
                  onClick={showPrev}
                  className="px-3 py-1 rounded bg-white/10 hover:bg-white/20"
                  aria-label="Previous image"
                >Prev</button>
                <span>{lightboxIndex + 1} / {images.length}</span>
                <button
                  type="button"
                  onClick={showNext}
                  className="px-3 py-1 rounded bg-white/10 hover:bg-white/20"
                  aria-label="Next image"
                >Next</button>
              </div>
            )}
            <div className="absolute top-2 left-2 flex gap-2">
              {images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setLightboxIndex(i)}
                  className={`w-12 h-12 rounded border overflow-hidden ${i === lightboxIndex ? 'ring-2 ring-primary' : 'opacity-60 hover:opacity-100'}`}
                  aria-label={`Show image ${img.fileName}`}
                >
                  <img src={img.fileUrl} alt="thumb" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.getElementById('modal-portal') as HTMLElement
      )}
    </div>
  );
}
