import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import ReactApexChart from 'react-apexcharts';
import { setPageTitle } from '../../../store/themeConfigSlice';

const Analytics = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();

  useEffect(() => {
    dispatch(setPageTitle(t('innovation.analytics.title', { defaultValue: 'Innovation Analytics' })));
  }, [dispatch, t]);

  // Mock datasets (replace with API data later)
  const submissionsSeries = [{
    name: t('innovation.analytics.series.submissions', { defaultValue: 'Submissions' }),
    data: [3, 5, 7, 6, 9, 12, 8, 10, 14, 12, 9, 11]
  }];
  const submissionsOptions: ApexCharts.ApexOptions = {
    chart: { id: 'submissions', toolbar: { show: false } },
    xaxis: { categories: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] },
    stroke: { curve: 'smooth', width: 3 },
    colors: ['#3b82f6'],
  };

  const categorySeries = [44, 55, 13, 43, 22, 17];
  const categoryOptions: ApexCharts.ApexOptions = {
    labels: [
      t('innovation.categories.technology', { defaultValue: 'Technology' }),
      t('innovation.categories.sustainability', { defaultValue: 'Sustainability' }),
      t('innovation.categories.customer', { defaultValue: 'Customer Service' }),
      t('innovation.categories.process', { defaultValue: 'Process Improvement' }),
      t('innovation.categories.cost', { defaultValue: 'Cost Reduction' }),
      t('innovation.categories.other', { defaultValue: 'Other' }),
    ],
    legend: { position: 'bottom' },
    colors: ['#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#6366f1']
  };

  const statusOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', stacked: true, toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
    xaxis: { categories: ['Submitted','Under Review','Approved','Rejected'] },
    colors: ['#60a5fa','#fbbf24','#34d399','#f87171']
  };
  const statusSeries = [
    { name: t('innovation.analytics.status.user', { defaultValue: 'User' }), data: [20, 8, 6, 3] },
    { name: t('innovation.analytics.status.committee', { defaultValue: 'Committee' }), data: [0, 12, 9, 4] },
  ];

  const topContributorsOptions: ApexCharts.ApexOptions = {
    chart: { type: 'bar', toolbar: { show: false } },
    plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
    xaxis: { categories: ['Jane S.', 'John D.', 'A. Brown', 'M. Chen', 'S. Lee'] },
    colors: ['#22c55e']
  };
  const topContributorsSeries = [{ name: t('innovation.analytics.series.ideas', { defaultValue: 'Ideas' }), data: [12, 10, 9, 8, 7] }];

  const engagementOptions: ApexCharts.ApexOptions = {
    chart: { type: 'line', toolbar: { show: false } },
    stroke: { curve: 'smooth', width: 3 },
    xaxis: { categories: ['W1','W2','W3','W4','W5','W6','W7','W8'] },
    colors: ['#f97316', '#06b6d4']
  };
  const engagementSeries = [
    { name: t('innovation.view.engagement.views', { defaultValue: 'Views' }), data: [120, 180, 150, 210, 260, 230, 280, 300] },
    { name: t('innovation.vote.title', { defaultValue: 'Votes' }), data: [30, 45, 40, 55, 65, 60, 72, 80] },
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
          label: t('innovation.analytics.kpis.totalIdeas', { defaultValue: 'Total Ideas' }), value: 148, icon: '💡'
        },{
          label: t('innovation.analytics.kpis.underReview', { defaultValue: 'Under Review' }), value: 32, icon: '🕵️'
        },{
          label: t('innovation.analytics.kpis.approved', { defaultValue: 'Approved' }), value: 58, icon: '✅'
        },{
          label: t('innovation.analytics.kpis.engagement', { defaultValue: 'Total Engagement' }), value: '4.3k', icon: '🔥'
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
