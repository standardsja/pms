import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../../store';
import { setPageTitle } from '../../store/themeConfigSlice';
import ReactApexChart from 'react-apexcharts';
import PerfectScrollbar from 'react-perfect-scrollbar';
import IconDollarSignCircle from '../../components/Icon/IconDollarSignCircle';
import IconInbox from '../../components/Icon/IconInbox';
import IconCreditCard from '../../components/Icon/IconCreditCard';
import IconClipboardText from '../../components/Icon/IconClipboardText';
import IconFolder from '../../components/Icon/IconFolder';
import IconUser from '../../components/Icon/IconUser';
import IconSettings from '../../components/Icon/IconSettings';
import IconChartSquare from '../../components/Icon/IconChartSquare';
import IconChecks from '../../components/Icon/IconChecks';
import IconBell from '../../components/Icon/IconBell';
import IconClock from '../../components/Icon/IconClock';
import { getUser } from '../../utils/auth';
import { getAuthHeaders } from '../../utils/api';
import { getApiUrl } from '../../config/api';
import { detectUserRoles } from '../../utils/roleDetection';
import Swal from 'sweetalert2';
import { statsService, type DashboardStats } from '../../services/statsService';

const ProcurementOfficerDashboard = () => {
    const dispatch = useDispatch();

    // Use centralized role detection so logic matches other guards
    const currentUser = getUser();
    const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);
    const detected = detectUserRoles(userRoles);

    // Redirect Finance Managers (as detected by centralized utility) to Finance Dashboard
    if (detected.isFinanceManager && !detected.isProcurementManager) {
        return <Navigate to="/finance" replace />;
    }

    const toast = (title: string, icon: 'success' | 'error' | 'info' | 'warning' = 'info') =>
        Swal.fire({
            toast: true,
            icon,
            title,
            position: 'top-end',
            timer: 2500,
            showConfirmButton: false,
        });

    useEffect(() => {
        dispatch(setPageTitle('Procurement Officer Dashboard'));
    }, [dispatch]);

    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl' ? true : false;

    const [liveStats, setLiveStats] = useState<DashboardStats | null>(null);
    const [statsLoading, setStatsLoading] = useState<boolean>(false);
    const [recentActivities, setRecentActivities] = useState<any[]>([]);
    const [activitiesLoading, setActivitiesLoading] = useState<boolean>(false);
    const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
    const [approvalsLoading, setApprovalsLoading] = useState<boolean>(false);
    const [spendChartData, setSpendChartData] = useState<any>(null);
    const [chartLoading, setChartLoading] = useState<boolean>(false);
    const [evaluationCount, setEvaluationCount] = useState<number>(0);
    const [evaluationsLoading, setEvaluationsLoading] = useState<boolean>(false);

    // Mock statistics
    const baseStats = useMemo(
        () => ({
            activeRFQs: 12,
            pendingQuotes: 8,
            procurementReviews: 7,
            catalogItems: 856,
            monthlyReports: 3,
            workflowTemplates: 12,
            requestsThisMonth: 0,
        }),
        []
    );

    const metrics = useMemo(
        () => ({
            ...baseStats,
            pendingEvaluations: evaluationCount || 0,
            catalogItems: liveStats?.catalogItems ?? baseStats.catalogItems,
            procurementReviews: liveStats?.procurementReviews ?? baseStats.procurementReviews,
            workflowTemplates: liveStats?.workflowTemplates ?? baseStats.workflowTemplates,
            monthlyReports: liveStats?.monthlyReports ?? baseStats.monthlyReports,
            requestsThisMonth: liveStats?.requestsThisMonth ?? baseStats.requestsThisMonth,
        }),
        [baseStats, liveStats, evaluationCount]
    );

    useEffect(() => {
        const loadStats = async () => {
            try {
                setStatsLoading(true);
                const data = await statsService.getDashboardStats();
                setLiveStats(data);
            } catch (error) {
                console.error('Failed to fetch dashboard stats:', error);
                toast('Unable to load live metrics', 'error');
            } finally {
                setStatsLoading(false);
            }
        };

        const loadActivities = async () => {
            try {
                setActivitiesLoading(true);
                const headers = await getAuthHeaders();
                const res = await fetch(getApiUrl('/api/requests?limit=10&sort=createdAt,desc'), {
                    headers,
                });
                if (!res.ok) throw new Error('Failed to fetch activities');
                const data = await res.json();

                // Transform request history into activities
                const activities = (data.data || []).slice(0, 5).map((request: any) => ({
                    id: request.id,
                    action: `Request ${request.status}`,
                    description: `${request.reference} - ${request.title}`,
                    time: new Date(request.createdAt).toLocaleString(),
                    status: request.status === 'SUBMITTED' ? 'info' : request.status === 'DEPARTMENT_APPROVED' ? 'success' : 'warning',
                }));
                setRecentActivities(activities);
            } catch (error) {
                console.error('Failed to fetch activities:', error);
                // Fallback to empty array instead of mock data
                setRecentActivities([]);
            } finally {
                setActivitiesLoading(false);
            }
        };

        const loadApprovals = async () => {
            try {
                setApprovalsLoading(true);
                const headers = await getAuthHeaders();
                const res = await fetch(getApiUrl('/api/requests?status=SUBMITTED&limit=10'), {
                    headers,
                });
                if (!res.ok) throw new Error('Failed to fetch approvals');
                const data = await res.json();

                // Transform requests into pending approvals
                const approvals = (data.data || []).slice(0, 5).map((request: any) => ({
                    id: request.id,
                    type: 'Request',
                    number: request.reference,
                    description: request.title,
                    amount: request.totalEstimated || 0,
                    dueDate: new Date(request.createdAt).toLocaleDateString(),
                }));
                setPendingApprovals(approvals);
            } catch (error) {
                console.error('Failed to fetch approvals:', error);
                // Fallback to empty array instead of mock data
                setPendingApprovals([]);
            } finally {
                setApprovalsLoading(false);
            }
        };

        const loadSpendChart = async () => {
            try {
                setChartLoading(true);
                const headers = await getAuthHeaders();
                const res = await fetch(getApiUrl('/api/requests'), {
                    headers,
                });
                if (!res.ok) throw new Error('Failed to fetch spend data');
                const data = await res.json();

                // Calculate monthly spend from requests
                const monthlySpend = new Array(12).fill(0);
                const monthlyBudget = new Array(12).fill(50000); // Default budget per month
                const annualBudget = 600000; // $600K annual budget
                let totalSpent = 0;
                const currentMonth = new Date().getMonth();

                (data.data || []).forEach((request: any) => {
                    const month = new Date(request.createdAt).getMonth();
                    const spend = request.totalEstimated || 0;
                    monthlySpend[month] += spend;
                    totalSpent += spend;
                });

                const currentMonthSpend = monthlySpend[currentMonth];
                const monthsWithData = monthlySpend.filter((spend) => spend > 0).length;
                const avgMonthlySpend = monthsWithData > 0 ? Math.round(totalSpent / monthsWithData) : 0;
                const remainingBudget = annualBudget - totalSpent;

                setSpendChartData({
                    series: [
                        {
                            name: 'Actual Spend',
                            data: monthlySpend,
                        },
                        {
                            name: 'Budget',
                            data: monthlyBudget,
                        },
                    ],
                    annualBudget,
                    totalSpent,
                    currentMonthSpend,
                    avgMonthlySpend,
                    remainingBudget,
                });
            } catch (error) {
                console.error('Failed to fetch spend chart data:', error);
                // Use default data as fallback
                setSpendChartData(null);
            } finally {
                setChartLoading(false);
            }
        };

        const loadEvaluations = async () => {
            try {
                setEvaluationsLoading(true);
                const headers = await getAuthHeaders();
                const res = await fetch(getApiUrl('/api/evaluations?status=PENDING,IN_PROGRESS'), {
                    headers,
                });
                if (!res.ok) throw new Error('Failed to fetch evaluations');
                const data = await res.json();
                setEvaluationCount((data.data || data || []).length);
            } catch (error) {
                console.error('Failed to fetch evaluations:', error);
                setEvaluationCount(0);
            } finally {
                setEvaluationsLoading(false);
            }
        };

        loadStats();
        loadActivities();
        loadApprovals();
        loadSpendChart();
        loadEvaluations();
    }, []);

    // Procurement spend chart - use real data if available, otherwise default
    const procurementSpendChart: any = {
        series: spendChartData?.series || [
            {
                name: 'Actual Spend',
                data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            },
            {
                name: 'Budget',
                data: [50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000],
            },
        ],
        options: {
            chart: {
                height: 300,
                type: 'area',
                fontFamily: 'Nunito, sans-serif',
                zoom: {
                    enabled: false,
                },
                toolbar: {
                    show: false,
                },
            },
            dataLabels: {
                enabled: false,
            },
            stroke: {
                show: true,
                curve: 'smooth',
                width: 2,
                lineCap: 'square',
            },
            colors: isDark ? ['#2196F3', '#00ab55'] : ['#1B55E2', '#00ab55'],
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            xaxis: {
                axisBorder: {
                    show: false,
                },
                axisTicks: {
                    show: false,
                },
            },
            yaxis: {
                tickAmount: 7,
                labels: {
                    formatter: (value: number) => {
                        return '$' + value / 1000 + 'K';
                    },
                    offsetX: isRtl ? -30 : -10,
                },
                opposite: isRtl ? true : false,
            },
            grid: {
                borderColor: isDark ? '#191E3A' : '#E0E6ED',
                strokeDashArray: 5,
            },
            legend: {
                position: 'top',
                horizontalAlign: 'right',
            },
            tooltip: {
                marker: {
                    show: true,
                },
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    inverseColors: false,
                    opacityFrom: isDark ? 0.19 : 0.28,
                    opacityTo: 0.05,
                    stops: isDark ? [100, 100] : [45, 100],
                },
            },
        },
    };

    // RFQ Pipeline removed as requested

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold">Procurement Officer Dashboard</h2>
                <p className="text-white-dark">Comprehensive procurement management overview</p>
                <p className="text-xs text-white-dark mt-1">
                    {statsLoading ? 'Loading live metrics…' : liveStats ? `Live metrics · updated ${new Date(liveStats.timestamp).toLocaleString()}` : 'Using default metrics'}
                </p>
            </div>

            {/* Key Metrics Grid */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Total Requests This Month */}
                <div className="panel">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <IconInbox className="h-5 w-5" />
                        </div>
                        <Link to="/procurement/requests" className="text-xs font-semibold text-primary hover:underline">
                            View All
                        </Link>
                    </div>
                    <div className="text-2xl font-bold text-primary">{metrics.requestsThisMonth || 0}</div>
                    <div className="text-sm font-semibold">Requests This Month</div>
                </div>

                {/* Pending Approvals Count */}
                <div className="panel">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-warning/10 text-warning">
                            <IconClock className="h-5 w-5" />
                        </div>
                        <Link to="/procurement/requests?status=SUBMITTED" className="text-xs font-semibold text-warning hover:underline">
                            View All
                        </Link>
                    </div>
                    <div className="text-2xl font-bold text-warning">{pendingApprovals.length}</div>
                    <div className="text-sm font-semibold">Pending Approvals</div>
                </div>

                {/* Evaluations */}
                <div className="panel">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-info/10 text-info">
                            <IconClipboardText className="h-5 w-5" />
                        </div>
                        <Link to="/procurement/evaluation" className="text-xs font-semibold text-info hover:underline">
                            View All
                        </Link>
                    </div>
                    <div className="text-2xl font-bold text-info">{metrics.pendingEvaluations}</div>
                    <div className="text-sm font-semibold">Pending Evaluations</div>
                </div>

                {/* Active Users */}
                <div className="panel">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-success/10 text-success">
                            <IconUser className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-success">{liveStats?.activeUsers || 0}</div>
                    <div className="text-sm font-semibold">Active Users Today</div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="mb-6 grid gap-6 lg:grid-cols-2">
                {/* Procurement Spend Chart */}
                <div className="panel h-full">
                    <div className="mb-5 flex items-center justify-between">
                        <h5 className="text-lg font-semibold dark:text-white-light">Procurement Spend vs Budget</h5>
                    </div>
                    <div className="rounded-lg bg-white dark:bg-black">
                        {chartLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <p className="text-white-dark">Loading chart data...</p>
                            </div>
                        ) : (
                            <ReactApexChart series={procurementSpendChart.series} options={procurementSpendChart.options} type="area" height={300} />
                        )}
                    </div>
                </div>

                {/* Budget Utilization Summary */}
                <div className="panel h-full">
                    <div className="mb-5 flex items-center justify-between">
                        <h5 className="text-lg font-semibold dark:text-white-light">Budget Utilization</h5>
                    </div>
                    {chartLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <p className="text-white-dark">Loading budget data...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Annual Summary */}
                            <div className="rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 p-4">
                                <div className="mb-1 text-xs font-semibold text-white-dark">Annual Budget (2024)</div>
                                <div className="mb-3 text-2xl font-bold text-primary">${spendChartData?.annualBudget?.toLocaleString() || '600,000'}</div>
                                <div className="mb-2 flex justify-between text-xs">
                                    <span className="text-white-dark">Total Spent</span>
                                    <span className="font-semibold">${spendChartData?.totalSpent?.toLocaleString() || '0'}</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-dark-light dark:bg-dark/40">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light transition-all duration-500"
                                        style={{
                                            width: `${Math.min(((spendChartData?.totalSpent || 0) / (spendChartData?.annualBudget || 600000)) * 100, 100)}%`,
                                        }}
                                    ></div>
                                </div>
                                <div className="mt-1 text-right text-xs font-semibold text-primary">
                                    {(((spendChartData?.totalSpent || 0) / (spendChartData?.annualBudget || 600000)) * 100).toFixed(1)}% Utilized
                                </div>
                            </div>

                            {/* Monthly Stats */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg border border-white-light p-3 dark:border-white/10">
                                    <div className="mb-1 flex items-center gap-2">
                                        <IconDollarSignCircle className="h-4 w-4 text-success" />
                                        <span className="text-xs font-semibold text-white-dark">This Month</span>
                                    </div>
                                    <div className="text-lg font-bold text-success">${spendChartData?.currentMonthSpend?.toLocaleString() || '0'}</div>
                                    <div className="mt-1 text-xs text-white-dark">of $50K budget</div>
                                </div>
                                <div className="rounded-lg border border-white-light p-3 dark:border-white/10">
                                    <div className="mb-1 flex items-center gap-2">
                                        <IconInbox className="h-4 w-4 text-info" />
                                        <span className="text-xs font-semibold text-white-dark">Avg/Month</span>
                                    </div>
                                    <div className="text-lg font-bold text-info">${spendChartData?.avgMonthlySpend?.toLocaleString() || '0'}</div>
                                    <div className="mt-1 text-xs text-white-dark">last 12 months</div>
                                </div>
                            </div>

                            {/* Remaining Budget */}
                            <div className="rounded-lg border border-white-light p-3 dark:border-white/10">
                                <div className="mb-1 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-white-dark">Remaining Budget</span>
                                    <span className={`text-xs font-semibold ${(spendChartData?.remainingBudget || 0) < 100000 ? 'text-danger' : 'text-success'}`}>
                                        {(spendChartData?.remainingBudget || 0) < 100000 ? 'Low' : 'Healthy'}
                                    </span>
                                </div>
                                <div className="text-xl font-bold">${spendChartData?.remainingBudget?.toLocaleString() || '600,000'}</div>
                                <div className="mt-1 text-xs text-white-dark">Available for procurement</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Activities */}
                <div className="panel h-full">
                    <div className="mb-5 flex items-center justify-between">
                        <h5 className="text-lg font-semibold dark:text-white-light">
                            <div className="flex items-center gap-2">
                                <IconBell className="h-5 w-5" />
                                Recent Activities
                            </div>
                        </h5>
                    </div>
                    <PerfectScrollbar className="relative h-[400px] pr-3 -mr-3">
                        <div className="space-y-4">
                            {activitiesLoading ? (
                                <div className="flex items-center justify-center h-full py-8">
                                    <p className="text-white-dark">Loading activities...</p>
                                </div>
                            ) : recentActivities.length === 0 ? (
                                <div className="flex items-center justify-center h-full py-8">
                                    <p className="text-white-dark">No recent activities</p>
                                </div>
                            ) : (
                                recentActivities.map((activity) => (
                                    <div key={activity.id} className="flex items-start gap-3 border-b border-white-light pb-4 dark:border-white/10">
                                        <div
                                            className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                                                activity.status === 'success' ? 'bg-success/10 text-success' : activity.status === 'info' ? 'bg-info/10 text-info' : 'bg-primary/10 text-primary'
                                            }`}
                                        >
                                            <IconClock className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1">
                                            <h6 className="font-semibold">{activity.action}</h6>
                                            <p className="text-sm text-white-dark">{activity.description}</p>
                                            <p className="mt-1 text-xs text-white-dark">{activity.time}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </PerfectScrollbar>
                </div>

                {/* Pending Approvals */}
                <div className="panel h-full">
                    <div className="mb-5 flex items-center justify-between">
                        <h5 className="text-lg font-semibold dark:text-white-light">
                            <div className="flex items-center gap-2">
                                <IconInbox className="h-5 w-5" />
                                Pending Approvals
                            </div>
                        </h5>
                        <Link to="/procurement/approvals" className="text-sm font-semibold text-primary hover:underline">
                            View All
                        </Link>
                    </div>
                    <div className="table-responsive">
                        {approvalsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <p className="text-white-dark">Loading approvals...</p>
                            </div>
                        ) : pendingApprovals.length === 0 ? (
                            <div className="flex items-center justify-center py-8">
                                <p className="text-white-dark">No pending approvals</p>
                            </div>
                        ) : (
                            <table className="table-hover">
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Number</th>
                                        <th>Description</th>
                                        <th>Amount</th>
                                        <th>Due Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingApprovals.map((item) => (
                                        <tr key={item.id}>
                                            <td>
                                                <span className={`badge ${item.type === 'Evaluation' ? 'bg-warning' : item.type === 'PO' ? 'bg-info' : 'bg-success'}`}>{item.type}</span>
                                            </td>
                                            <td>
                                                <Link to={`/procurement/requests/${item.id}`} className="text-primary hover:underline">
                                                    {item.number}
                                                </Link>
                                            </td>
                                            <td>{item.description}</td>
                                            <td className="font-semibold">${item.amount.toLocaleString()}</td>
                                            <td>{item.dueDate}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProcurementOfficerDashboard;
