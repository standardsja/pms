import { useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import ReactApexChart from 'react-apexcharts';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { fetchAnalytics, type AnalyticsData } from '../../../utils/ideasApi';

const Analytics = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dispatch(setPageTitle(t('innovation.analytics.title', { defaultValue: 'Innovation Analytics' })));
  }, [dispatch, t]);

  // Load analytics data with real-time refresh
  const loadAnalytics = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const analyticsData = await fetchAnalytics();
      setData(analyticsData);
    } catch (e: any) {
      const errorMessage = e?.message || 'Unable to load analytics';
      setError(errorMessage);
      // Only show toast on foreground loads, not background polling
      if (showLoader) {
        Swal.fire({
          icon: 'error',
          title: 'Unable to Load Analytics',
          text: 'We encountered a problem loading analytics data. Please try again.',
          toast: true,
          position: 'bottom-end',
          timer: 3500,
          showConfirmButton: false
        });
      }
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
    // Real-time refresh every 30 seconds
    const interval = setInterval(() => loadAnalytics(false), 30000);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadAnalytics(false);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadAnalytics]);

  // Format number with k suffix
  const formatNumber = (num: number): string => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  // Loading state
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-20 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="panel h-24 animate-pulse bg-gray-200 dark:bg-gray-700"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="panel h-80 animate-pulse bg-gray-200 dark:bg-gray-700"></div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="panel text-center py-16">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
          <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Unable to Load Analytics</h2>
        <p className="mb-6 text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          We encountered a problem loading analytics data. Please try again.
        </p>
        <button onClick={() => loadAnalytics()} className="btn btn-primary">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Try Again
        </button>
      </div>
    );
  }

  // Chart configurations with real data
  const submissionsSeries = [{
    name: t('innovation.analytics.series.submissions', { defaultValue: 'Submissions' }),
    data: data.submissionsByMonth
  }];
  const submissionsOptions: ApexCharts.ApexOptions = {
    chart: { id: 'submissions', toolbar: { show: false } },
    xaxis: { categories: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] },
    stroke: { curve: 'smooth', width: 3 },
    colors: ['#3b82f6'],
  };

  // Extract category data
  const categoryLabels = Object.keys(data.ideasByCategory);
  const categorySeries = Object.values(data.ideasByCategory);
  const categoryOptions: ApexCharts.ApexOptions = {
    labels: categoryLabels.map(cat => {
      const labelMap: Record<string, string> = {
        'TECHNOLOGY': t('innovation.categories.TECHNOLOGY', { defaultValue: 'Technology' }),
        'SUSTAINABILITY': t('innovation.categories.SUSTAINABILITY', { defaultValue: 'Sustainability' }),
        'CUSTOMER_SERVICE': t('innovation.categories.CUSTOMER_SERVICE', { defaultValue: 'Customer Service' }),
        'PROCESS_IMPROVEMENT': t('innovation.categories.PROCESS_IMPROVEMENT', { defaultValue: 'Process Improvement' }),
        'COST_REDUCTION': t('innovation.categories.COST_REDUCTION', { defaultValue: 'Cost Reduction' }),
        'PRODUCT_INNOVATION': t('innovation.categories.PRODUCT_INNOVATION', { defaultValue: 'Product Innovation' }),
        'OTHER': t('innovation.categories.OTHER', { defaultValue: 'Other' }),
      };
      return labelMap[cat] || cat.replace(/_/g, ' ');
    }),
    legend: { position: 'bottom' },
    colors: ['#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899']
  };

  const statusOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', stacked: false, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
    xaxis: { categories: ['Submitted','Under Review','Approved','Rejected', 'Promoted'] },
    colors: ['#60a5fa','#fbbf24','#34d399','#f87171', '#8b5cf6']
  };
  const statusSeries = [{
    name: 'Count',
    data: [
      data.statusPipeline.submitted,
      data.statusPipeline.underReview,
      data.statusPipeline.approved,
      data.statusPipeline.rejected,
      data.statusPipeline.promoted
    ]
  }];

  const topContributorsOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
    xaxis: { categories: data.topContributors.map(c => c.name) },
    colors: ['#22c55e']
  };
  const topContributorsSeries = [{
    name: t('innovation.analytics.series.ideas', { defaultValue: 'Ideas' }),
    data: data.topContributors.map(c => c.ideas)
  }];

  const engagementOptions: ApexCharts.ApexOptions = {
    chart: { type: 'line', toolbar: { show: false } },
    stroke: { curve: 'smooth', width: 3 },
    xaxis: { categories: ['W1','W2','W3','W4','W5','W6','W7','W8'] },
    colors: ['#f97316', '#06b6d4']
  };
  const engagementSeries = [
    { name: t('innovation.view.engagement.views', { defaultValue: 'Views' }), data: data.weeklyEngagement.views },
    { name: t('innovation.vote.title', { defaultValue: 'Votes' }), data: data.weeklyEngagement.votes },
  ];

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
          label: t('innovation.analytics.kpis.totalIdeas', { defaultValue: 'Total Ideas' }),
          value: data.kpis.totalIdeas,
          icon: '💡'
        },{
          label: t('innovation.analytics.kpis.underReview', { defaultValue: 'Under Review' }),
          value: data.kpis.underReview,
          icon: '🕵️'
        },{
          label: t('innovation.analytics.kpis.approved', { defaultValue: 'Approved' }),
          value: data.kpis.approved,
          icon: '✅'
        },{
          label: t('innovation.analytics.kpis.engagement', { defaultValue: 'Total Engagement' }),
          value: formatNumber(data.kpis.totalEngagement),
          icon: '🔥'
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

        <div className="panel xl:col-span-2">
          <h3 className="text-lg font-semibold mb-4">{t('innovation.analytics.cards.engagement', { defaultValue: 'Engagement Over Time' })}</h3>
          <ReactApexChart options={engagementOptions} series={engagementSeries} type="line" height={340} />
        </div>
      </div>
    </div>
  );
};

export default Analytics;
