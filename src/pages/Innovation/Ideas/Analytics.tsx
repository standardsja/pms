import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import ReactApexChart from 'react-apexcharts';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { getToken } from '../../../utils/auth';

interface AnalyticsData {
  kpis: {
    totalIdeas: number;
    underReview: number;
    approved: number;
    promoted: number;
    totalEngagement: number;
  };
  monthlySubmissions: {
    labels: string[];
    data: number[];
  };
  categoryBreakdown: Array<{ category: string; count: number }>;
  statusCounts: Array<{ status: string; count: number }>;
  topContributors: Array<{ name: string; count: number }>;
}

const Analytics = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    dispatch(setPageTitle(t('innovation.analytics.title', { defaultValue: 'Innovation Analytics' })));
    loadAnalytics();
  }, [dispatch, t]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/innovation/analytics', {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('Failed to fetch analytics');
      const data = await res.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Chart configurations using real data
  const submissionsSeries = [{
    name: t('innovation.analytics.series.submissions', { defaultValue: 'Submissions' }),
    data: analytics.monthlySubmissions.data
  }];
  const submissionsOptions: ApexCharts.ApexOptions = {
    chart: { id: 'submissions', toolbar: { show: false } },
    xaxis: { categories: analytics.monthlySubmissions.labels },
    stroke: { curve: 'smooth', width: 3 },
    colors: ['#3b82f6'],
  };

  const categorySeries = analytics.categoryBreakdown.map(c => c.count);
  const categoryLabels = analytics.categoryBreakdown.map(c => {
    const key = c.category.toLowerCase().replace('_', '');
    return t(`innovation.categories.${key}`, { defaultValue: c.category.replace(/_/g, ' ') });
  });
  const categoryOptions: ApexCharts.ApexOptions = {
    labels: categoryLabels,
    legend: { position: 'bottom' },
    colors: ['#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#6366f1']
  };

  const statusData = analytics.statusCounts.reduce((acc, s) => {
    acc[s.status] = s.count;
    return acc;
  }, {} as Record<string, number>);

  const statusOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', stacked: false, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
    xaxis: { categories: ['Pending Review','Approved','Rejected','Promoted'] },
    colors: ['#fbbf24','#34d399','#f87171','#8b5cf6']
  };
  const statusSeries = [{
    name: t('innovation.analytics.status.count', { defaultValue: 'Count' }),
    data: [
      statusData.PENDING_REVIEW || 0,
      statusData.APPROVED || 0,
      statusData.REJECTED || 0,
      statusData.PROMOTED_TO_PROJECT || 0
    ]
  }];

  const topContributorsOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
    xaxis: { categories: analytics.topContributors.map(c => c.name) },
    colors: ['#22c55e']
  };
  const topContributorsSeries = [{
    name: t('innovation.analytics.series.ideas', { defaultValue: 'Ideas' }),
    data: analytics.topContributors.map(c => c.count)
  }];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <span className="text-4xl" role="img" aria-label="chart">📈</span>
            {t('innovation.analytics.title', { defaultValue: 'Innovation Analytics' })}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('innovation.analytics.subtitle', { defaultValue: 'Key metrics across ideas, categories, and engagement.' })}
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[{
          label: t('innovation.analytics.kpis.totalIdeas', { defaultValue: 'Total Ideas' }), value: analytics.kpis.totalIdeas, icon: '💡'
        },{
          label: t('innovation.analytics.kpis.underReview', { defaultValue: 'Under Review' }), value: analytics.kpis.underReview, icon: '🕵️'
        },{
          label: t('innovation.analytics.kpis.approved', { defaultValue: 'Approved' }), value: analytics.kpis.approved, icon: '✅'
        },{
          label: t('innovation.analytics.kpis.promoted', { defaultValue: 'Promoted' }), value: analytics.kpis.promoted, icon: '�'
        }].map((kpi, i) => (
          <div className="panel" key={i}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{kpi.label}</p>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white">{kpi.value}</h3>
              </div>
              <div className="text-4xl" aria-hidden="true">{kpi.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="panel">
          <h3 className="text-lg font-semibold mb-4">{t('innovation.analytics.cards.submissions', { defaultValue: 'Submissions by Month' })}</h3>
          <ReactApexChart options={submissionsOptions} series={submissionsSeries} type="line" height={320} />
        </div>

        <div className="panel">
          <h3 className="text-lg font-semibold mb-4">{t('innovation.analytics.cards.byCategory', { defaultValue: 'Ideas by Category' })}</h3>
          <ReactApexChart options={categoryOptions} series={categorySeries} type="donut" height={320} />
        </div>

        <div className="panel">
          <h3 className="text-lg font-semibold mb-4">{t('innovation.analytics.cards.status', { defaultValue: 'Status Pipeline' })}</h3>
          <ReactApexChart options={statusOptions} series={statusSeries} type="bar" height={340} />
        </div>

        <div className="panel">
          <h3 className="text-lg font-semibold mb-4">{t('innovation.analytics.cards.topContributors', { defaultValue: 'Top Contributors' })}</h3>
          <ReactApexChart options={topContributorsOptions} series={topContributorsSeries} type="bar" height={340} />
        </div>
      </div>
    </div>
  );
};

export default Analytics;
