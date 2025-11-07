import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../../store';
import { setPageTitle } from '../../store/themeConfigSlice';
import ReactApexChart from 'react-apexcharts';
import PerfectScrollbar from 'react-perfect-scrollbar';
import IconClipboardText from '../../components/Icon/IconClipboardText';
import IconChecks from '../../components/Icon/IconChecks';
import IconClock from '../../components/Icon/IconClock';
import IconEye from '../../components/Icon/IconEye';
import IconUser from '../../components/Icon/IconUser';
import IconDollarSignCircle from '../../components/Icon/IconDollarSignCircle';
import IconTrendingUp from '../../components/Icon/IconTrendingUp';
import IconChartSquare from '../../components/Icon/IconChartSquare';
import IconThumbUp from '../../components/Icon/IconThumbUp';
import IconX from '../../components/Icon/IconX';
import IconDownload from '../../components/Icon/IconDownload';
import IconStar from '../../components/Icon/IconStar';

const DepartmentHeadDashboard = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Department Head Dashboard'));
    });

    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl' ? true : false;

    const [approvalModal, setApprovalModal] = useState(false);
    const [selectedEvaluation, setSelectedEvaluation] = useState<any>(null);

    // Statistics for Department Head
    const stats = {
        pendingEvaluations: 8,
        completedReviews: 25,
        approvedSuppliers: 142,
        thisMonthApprovals: 12,
        totalBudgetApproved: 285000,
        avgApprovalTime: 2.5,
    };

    // Pending evaluation reports for review
    const pendingEvaluations = [
        {
            id: 1,
            evalNumber: 'EVAL-2024-001',
            rfqNumber: 'RFQ-2024-045',
            description: 'Office Supplies Evaluation',
            department: 'Administration',
            evaluator: 'John Doe',
            submittedDate: '2024-10-25',
            totalQuotes: 5,
            recommendedSupplier: 'ABC Office Solutions',
            recommendedAmount: 12500,
            status: 'Pending Review',
            priority: 'High',
            score: 88,
        },
        {
            id: 2,
            evalNumber: 'EVAL-2024-002',
            rfqNumber: 'RFQ-2024-046',
            description: 'IT Equipment Purchase',
            department: 'Information Technology',
            evaluator: 'Jane Smith',
            submittedDate: '2024-10-24',
            totalQuotes: 3,
            recommendedSupplier: 'Tech Solutions Ltd',
            recommendedAmount: 35000,
            status: 'Pending Review',
            priority: 'Medium',
            score: 92,
        },
        {
            id: 3,
            evalNumber: 'EVAL-2024-003',
            rfqNumber: 'RFQ-2024-047',
            description: 'Cleaning Services Contract',
            department: 'Facilities',
            evaluator: 'Mike Johnson',
            submittedDate: '2024-10-26',
            totalQuotes: 4,
            recommendedSupplier: 'CleanPro Services',
            recommendedAmount: 18000,
            status: 'Pending Review',
            priority: 'Low',
            score: 85,
        },
    ];

    // Recent approval activities
    const recentActivities = [
        {
            id: 1,
            action: 'Approved',
            description: 'Furniture Purchase Evaluation',
            supplier: 'Office Depot Inc',
            amount: 22000,
            time: '2 hours ago',
            evaluator: 'Sarah Williams',
        },
        {
            id: 2,
            action: 'Rejected',
            description: 'Security System Upgrade',
            supplier: 'SecureTech Solutions',
            amount: 45000,
            time: '1 day ago',
            evaluator: 'Robert Brown',
            reason: 'Insufficient documentation',
        },
        {
            id: 3,
            action: 'Approved',
            description: 'Software License Renewal',
            supplier: 'Microsoft Corporation',
            amount: 8500,
            time: '2 days ago',
            evaluator: 'Lisa Davis',
        },
    ];

    // Monthly approval statistics chart
    const approvalChart = {
        series: [
            {
                name: 'Approved',
                data: [12, 15, 18, 22, 16, 19, 25, 21, 18, 24, 20, 12],
            },
            {
                name: 'Rejected',
                data: [2, 3, 1, 4, 2, 1, 3, 2, 1, 2, 3, 1],
            },
        ],
        options: {
            chart: {
                height: 300,
                type: 'area' as const,
                fontFamily: 'Nunito, sans-serif',
                zoom: {
                    enabled: false,
                },
                toolbar: {
                    show: false,
                },
            },
            colors: ['#1b55e2', '#e7515a'],
            dataLabels: {
                enabled: false,
            },
            stroke: {
                show: true,
                curve: 'smooth' as const,
                width: 2,
                lineCap: 'square' as const,
            },
            dropShadow: {
                enabled: true,
                opacity: 0.2,
                blur: 10,
                left: -7,
                top: 22,
            },
            markers: {
                discrete: [
                    {
                        seriesIndex: 0,
                        dataPointIndex: 6,
                        fillColor: '#1b55e2',
                        strokeColor: 'transparent',
                        size: 7,
                    },
                    {
                        seriesIndex: 1,
                        dataPointIndex: 5,
                        fillColor: '#e7515a',
                        strokeColor: 'transparent',
                        size: 7,
                    },
                ],
            },
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            xaxis: {
                axisBorder: {
                    show: false,
                },
                axisTicks: {
                    show: false,
                },
                crosshairs: {
                    show: true,
                },
                labels: {
                    offsetX: isRtl ? 2 : 0,
                    offsetY: 5,
                    style: {
                        fontSize: '12px',
                        cssClass: 'apexcharts-xaxis-title',
                    },
                },
            },
            yaxis: {
                tickAmount: 7,
                labels: {
                    formatter: (value: number) => {
                        return value.toString();
                    },
                    offsetX: isRtl ? -30 : -10,
                    offsetY: 0,
                    style: {
                        fontSize: '12px',
                        cssClass: 'apexcharts-yaxis-title',
                    },
                },
                opposite: isRtl ? true : false,
            },
            grid: {
                borderColor: isDark ? '#191E3A' : '#E0E6ED',
                strokeDashArray: 5,
                xaxis: {
                    lines: {
                        show: true,
                    },
                },
                yaxis: {
                    lines: {
                        show: false,
                    },
                },
                padding: {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                },
            },
            legend: {
                position: 'top' as const,
                horizontalAlign: 'right' as const,
                fontSize: '16px',
                markers: {
                    width: 10,
                    height: 10,
                    offsetX: -2,
                },
                itemMargin: {
                    horizontal: 10,
                    vertical: 5,
                },
            },
            tooltip: {
                marker: {
                    show: true,
                },
                x: {
                    show: false,
                },
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    inverseColors: !1,
                    opacityFrom: isDark ? 0.19 : 0.28,
                    opacityTo: 0.05,
                    stops: isDark ? [100, 100] : [45, 100],
                },
            },
        },
    };

    const handleViewEvaluation = (evaluation: any) => {
        setSelectedEvaluation(evaluation);
        setApprovalModal(true);
    };

    const handleApproval = (action: 'approve' | 'reject') => {
        // Evaluation action logic would be implemented here
        // Implement approval logic
        setApprovalModal(false);
        setSelectedEvaluation(null);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Pending Review':
                return 'badge-outline-warning';
            case 'Approved':
                return 'badge-outline-success';
            case 'Rejected':
                return 'badge-outline-danger';
            default:
                return 'badge-outline-primary';
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'High':
                return 'badge-outline-danger';
            case 'Medium':
                return 'badge-outline-warning';
            case 'Low':
                return 'badge-outline-info';
            default:
                return 'badge-outline-primary';
        }
    };

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link to="#" className="text-primary hover:underline">
                        Procurement
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Department Head Dashboard</span>
                </li>
            </ul>

            <div className="pt-5">
                <div className="mb-6 grid gap-6 xl:grid-cols-3">
                    <div className="panel h-full xl:col-span-2">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">Approval Statistics</h5>
                        </div>
                        <ReactApexChart options={approvalChart.options} series={approvalChart.series} type="area" height={300} />
                    </div>

                    <div className="panel h-full">
                        <div className="mb-5 flex items-center">
                            <h5 className="text-lg font-semibold dark:text-white-light">Quick Stats</h5>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg bg-primary-light p-4 dark:bg-primary-dark-light">
                                <div>
                                    <h4 className="text-2xl font-bold text-primary">{stats.pendingEvaluations}</h4>
                                    <p className="text-primary">Pending Evaluations</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white">
                                    <IconClipboardText />
                                </div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-success-light p-4 dark:bg-success-dark-light">
                                <div>
                                    <h4 className="text-2xl font-bold text-success">{stats.completedReviews}</h4>
                                    <p className="text-success">Completed Reviews</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success text-white">
                                    <IconChecks />
                                </div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-info-light p-4 dark:bg-info-dark-light">
                                <div>
                                    <h4 className="text-2xl font-bold text-info">${stats.totalBudgetApproved.toLocaleString()}</h4>
                                    <p className="text-info">Total Budget Approved</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-info text-white">
                                    <IconDollarSignCircle />
                                </div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-warning-light p-4 dark:bg-warning-dark-light">
                                <div>
                                    <h4 className="text-2xl font-bold text-warning">{stats.avgApprovalTime} days</h4>
                                    <p className="text-warning">Avg. Approval Time</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning text-white">
                                    <IconClock />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-6 grid gap-6 xl:grid-cols-2">
                    {/* Pending Evaluations */}
                    <div className="panel">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">Pending Evaluation Reviews</h5>
                            <Link to="/procurement/evaluations" className="font-semibold text-primary hover:underline">
                                View All
                            </Link>
                        </div>
                        <div className="space-y-4">
                            {pendingEvaluations.map((evaluation) => (
                                <div key={evaluation.id} className="flex items-center justify-between rounded-lg border border-[#e0e6ed] p-4 dark:border-[#253b5c]">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h6 className="font-semibold">{evaluation.evalNumber}</h6>
                                            <span className={`badge ${getPriorityBadge(evaluation.priority)}`}>
                                                {evaluation.priority}
                                            </span>
                                        </div>
                                        <p className="text-sm text-white-dark">{evaluation.description}</p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-white-dark">
                                            <span>Dept: {evaluation.department}</span>
                                            <span>Evaluator: {evaluation.evaluator}</span>
                                            <span>Score: {evaluation.score}/100</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-sm font-medium text-success">Recommended: {evaluation.recommendedSupplier}</span>
                                            <span className="text-sm text-primary">${evaluation.recommendedAmount.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleViewEvaluation(evaluation)}
                                            className="btn btn-outline-primary btn-sm"
                                            title="View Evaluation Details"
                                        >
                                            <IconEye className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Activities */}
                    <div className="panel">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">Recent Approval Activities</h5>
                        </div>
                        <PerfectScrollbar className="relative h-[400px] pr-3 -mr-3">
                            <div className="space-y-4">
                                {recentActivities.map((activity) => (
                                    <div key={activity.id} className="flex items-start gap-3">
                                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                            activity.action === 'Approved' ? 'bg-success-light text-success' : 'bg-danger-light text-danger'
                                        }`}>
                                            {activity.action === 'Approved' ? <IconThumbUp className="h-4 w-4" /> : <IconX className="h-4 w-4" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-semibold ${
                                                    activity.action === 'Approved' ? 'text-success' : 'text-danger'
                                                }`}>
                                                    {activity.action}
                                                </span>
                                                <span className="text-xs text-white-dark">{activity.time}</span>
                                            </div>
                                            <p className="text-sm font-medium">{activity.description}</p>
                                            <div className="flex items-center gap-2 text-xs text-white-dark">
                                                <span>Supplier: {activity.supplier}</span>
                                                <span>Amount: ${activity.amount.toLocaleString()}</span>
                                            </div>
                                            <span className="text-xs text-white-dark">Evaluator: {activity.evaluator}</span>
                                            {activity.reason && (
                                                <p className="text-xs text-danger mt-1">Reason: {activity.reason}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </PerfectScrollbar>
                    </div>
                </div>
            </div>

            {/* Evaluation Review Modal */}
            {approvalModal && selectedEvaluation && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-full max-w-2xl rounded-lg bg-white p-6 dark:bg-[#1b2e4b]">
                        <div className="mb-4 flex items-center justify-between">
                            <h4 className="text-lg font-semibold">Evaluation Review</h4>
                            <button 
                                onClick={() => setApprovalModal(false)} 
                                className="text-white-dark hover:text-danger"
                                title="Close Modal"
                            >
                                <IconX />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-white-dark">Evaluation Number</label>
                                    <p className="font-semibold">{selectedEvaluation.evalNumber}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-white-dark">RFQ Number</label>
                                    <p className="font-semibold">{selectedEvaluation.rfqNumber}</p>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-sm font-medium text-white-dark">Description</label>
                                <p className="font-semibold">{selectedEvaluation.description}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-white-dark">Department</label>
                                    <p>{selectedEvaluation.department}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-white-dark">Evaluator</label>
                                    <p>{selectedEvaluation.evaluator}</p>
                                </div>
                            </div>
                            
                            <div className="rounded-lg bg-success-light p-4 dark:bg-success-dark-light">
                                <h6 className="mb-2 font-semibold text-success">Recommended Supplier</h6>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold">{selectedEvaluation.recommendedSupplier}</p>
                                        <div className="flex items-center gap-4 text-sm text-white-dark">
                                            <span>Score: {selectedEvaluation.score}/100</span>
                                            <span>Quotes Compared: {selectedEvaluation.totalQuotes}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-success">${selectedEvaluation.recommendedAmount.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleApproval('approve')}
                                    className="btn btn-success"
                                >
                                    <IconChecks className="mr-2" />
                                    Approve Recommendation
                                </button>
                                <button
                                    onClick={() => handleApproval('reject')}
                                    className="btn btn-danger"
                                >
                                    <IconX className="mr-2" />
                                    Reject & Request Revision
                                </button>
                                <Link
                                    to={`/procurement/evaluations/${selectedEvaluation.id}`}
                                    className="btn btn-outline-primary"
                                >
                                    <IconDownload className="mr-2" />
                                    Download Report
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartmentHeadDashboard;