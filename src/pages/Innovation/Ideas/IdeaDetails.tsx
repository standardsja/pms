import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { setPageTitle } from '../../../store/themeConfigSlice';

type Idea = {
  id: string;
  title: string;
  description: string;
  category: string;
  submittedBy: string;
  submittedAt: string;
  voteCount: number;
  viewCount: number;
  tags: string[];
};

const mockIdeas: Idea[] = [
  {
    id: '1',
    title: 'AI-Powered Document Analysis',
    description:
      'Implement AI to automatically analyze and categorize incoming documents, reducing manual processing time by 70%. This will streamline our workflow significantly.',
    category: 'TECHNOLOGY',
    submittedBy: 'John Doe',
    submittedAt: '2025-11-01',
    voteCount: 45,
    viewCount: 128,
    tags: ['AI', 'Automation', 'Efficiency'],
  },
  {
    id: '2',
    title: 'Green Energy Initiative',
    description:
      'Install solar panels on all BSJ buildings to reduce electricity costs and carbon footprint. This is a sustainable long-term investment.',
    category: 'SUSTAINABILITY',
    submittedBy: 'Jane Smith',
    submittedAt: '2025-11-03',
    voteCount: 33,
    viewCount: 95,
    tags: ['Green', 'Sustainability', 'Cost Savings'],
  },
  {
    id: '3',
    title: 'Mobile App for Standards Lookup',
    description:
      'Create a mobile application that allows customers to quickly search and access standards on the go. Improve customer experience dramatically.',
    category: 'CUSTOMER_SERVICE',
    submittedBy: 'Bob Johnson',
    submittedAt: '2025-11-04',
    voteCount: 50,
    viewCount: 142,
    tags: ['Mobile', 'Customer Service', 'Digital'],
  },
];

export default function IdeaDetails() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { id = '' } = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const idea = useMemo(() => mockIdeas.find((i) => i.id === id), [id]);

  useEffect(() => {
    const title = idea ? `${idea.title}` : t('innovation.view.title');
    dispatch(setPageTitle(title));
  }, [dispatch, idea, t]);

  useEffect(() => {
    // Simulate load
    const tm = setTimeout(() => setIsLoading(false), 350);
    return () => clearTimeout(tm);
  }, []);

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

  if (!idea) {
    return (
      <div className="panel text-center py-16">
        <div className="text-6xl mb-3" role="img" aria-label="magnify">🔎</div>
        <h2 className="text-2xl font-bold mb-2">{t('innovation.view.empty.title')}</h2>
        <p className="mb-6 text-gray-600 dark:text-gray-400">{t('innovation.view.empty.message')}</p>
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
        {!!idea.tags?.length && (
          <div className="flex flex-wrap gap-2">
            {idea.tags.map((tag) => (
              <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
