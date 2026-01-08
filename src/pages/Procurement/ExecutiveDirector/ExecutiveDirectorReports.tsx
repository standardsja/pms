import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { getApiUrl, getToken } from '../../../utils/auth';
import Swal from 'sweetalert2';
import IconBarChart from '../../../components/Icon/IconBarChart';
import IconEye from '../../../components/Icon/IconEye';
import IconChecks from '../../../components/Icon/IconChecks';
import IconX from '../../../components/Icon/IconX';
import IconDownload from '../../../components/Icon/IconDownload';
import IconUser from '../../../components/Icon/IconUser';
import IconClock from '../../../components/Icon/IconClock';
import IconDollarSignCircle from '../../../components/Icon/IconDollarSignCircle';
import IconCircleCheck from '../../../components/Icon/IconCircleCheck';
import IconThumbUp from '../../../components/Icon/IconThumbUp';
import IconStar from '../../../components/Icon/IconStar';
import IconTrendingUp from '../../../components/Icon/IconTrendingUp';

const ExecutiveDirectorReports = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Executive Director - Strategic Reports'));
    });

    const [filter, setFilter] = useState('pending');
    const [reviewModal, setReviewModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState<any>(null);
    const [executiveComments, setExecutiveComments] = useState('');
    const [reportViewModal, setReportViewModal] = useState(false);
    const [executiveReports, setExecutiveReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const apiUrl = getApiUrl();
            const token = getToken();
            
            const response = await fetch(`${apiUrl}/requests`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch reports');

            const data = await response.json();
            
            // For reports, we'll fetch all requests to generate analytics
            setExecutiveReports(data);
        } catch (error) {
            console.error('Error fetching reports:', error);
            Swal.fire('Error', 'Failed to load reports', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Filter reports based on status
    const filteredReports = executiveReports.filter((report: any) => {
        if (filter === 'all') return true;
        if (filter === 'pending') return report.status === 'EXECUTIVE_REVIEW';
        if (filter === 'approved') return report.status === 'FINANCE_APPROVED';
        if (filter === 'rejected') return report.status === 'REJECTED';
        return true;
    });


    // Statistics - calculated from actual database data
    const stats = {
        total: executiveReports.length,
        pending: executiveReports.filter((r: any) => r.status === 'EXECUTIVE_REVIEW').length,
        approved: executiveReports.filter((r: any) => r.status === 'FINANCE_APPROVED').length,
        rejected: executiveReports.filter((r: any) => r.status === 'REJECTED').length,
        totalValue: executiveReports.reduce((sum: number, r: any) => sum + (r.estimatedValue || 0), 0),
        totalSavings: 0, // This would need to come from a different endpoint or calculation
    };

    const handleReviewReport = (report: any) => {
        setSelectedReport(report);
            strategicSuppliers: 8,
            status: 'Pending Executive Review',
            priority: 'High',
            confidentialityLevel: 'Executive Only',
            keyMetrics: {
                savingsPercentage: 10.0,
                contractComplianceRate: 98.2,
                supplierPerformanceScore: 91.5,
                processEfficiencyGain: 12.3
            },
            strategicInsights: [
                'Compliance framework achieving 98%+ adherence across all categories',
                'Risk mitigation strategies reduced supply chain disruptions by 45%',
                'Enhanced due diligence processes improved supplier quality by 28%',
                'Cybersecurity protocols strengthened for digital procurement platforms'
            ],
            executiveSummary: 'Risk management framework is effectively protecting organizational interests while enabling strategic procurement objectives. Compliance metrics exceed industry benchmarks.',
            recommendations: [
                'Implement blockchain-based contract management for enhanced transparency',
                'Expand supplier audit program to include ESG compliance verification',
                'Develop crisis management protocols for supply chain disruptions',
                'Establish real-time risk monitoring dashboard for executive visibility'
            ],
            riskAssessment: 'Well-managed risk profile with robust controls and monitoring systems. Recommend continued focus on emerging cyber threats and geopolitical risks.',
            attachments: ['Risk_Matrix.pdf', 'Compliance_Dashboard.xlsx', 'Audit_Results.pdf', 'Mitigation_Strategies.pptx']
        },
        {
            id: 3,
            reportNumber: 'EXEC-RPT-2024-003',
            reportType: 'Strategic Supplier Review',
            title: 'Tier 1 Supplier Partnership Performance Analysis',
            description: 'Executive review of strategic supplier relationships and partnership value delivery',
            department: 'Supplier Relations',
            preparedBy: 'VP Supplier Management',
            submittedDate: '2024-10-30',
            reviewDeadline: '2024-11-12',
            totalProcurementValue: 3200000,
            costSavingsAchieved: 480000,
            numberOfContracts: 18,
            strategicSuppliers: 15,
            status: 'Approved by Executive',
            priority: 'High',
            confidentialityLevel: 'Executive Only',
            approvedDate: '2024-10-31',
            approvedBy: 'Executive Director',
            keyMetrics: {
                savingsPercentage: 15.0,
                contractComplianceRate: 94.8,
                supplierPerformanceScore: 92.7,
                processEfficiencyGain: 18.5
            },
            strategicInsights: [
                'Top-tier suppliers delivering 15% cost savings while improving quality metrics',
                'Innovation partnerships generated 3 new product development opportunities',
                'Supplier consolidation strategy reduced administrative overhead by 30%',
                'Long-term agreements secured price stability for critical materials'
            ],
            executiveSummary: 'Strategic supplier partnerships are delivering exceptional value across cost, innovation, and operational efficiency dimensions. Partnership model should be expanded to additional categories.',
            recommendations: [
                'Extend partnership model to secondary supplier tiers',
                'Implement joint innovation labs with key strategic suppliers',
                'Develop supplier performance incentive programs',
                'Establish quarterly strategic supplier executive reviews'
            ],
            riskAssessment: 'Low risk with diversified supplier base and strong partnership agreements. Monitor for over-dependence on individual suppliers.',
            attachments: ['Partnership_Analysis.pdf', 'Performance_Metrics.xlsx', 'Innovation_Pipeline.pdf', 'Contract_Summary.pptx']
        },
        {
            id: 4,
            reportNumber: 'EXEC-RPT-2024-004',
            reportType: 'Digital Transformation Report',
            title: 'Procurement Technology ROI and Strategic Impact',
            description: 'Assessment of digital procurement initiatives and technology investment returns',
            department: 'Digital Strategy',
            preparedBy: 'Chief Digital Officer',
            submittedDate: '2024-10-31',
            reviewDeadline: '2024-11-15',
            totalProcurementValue: 1500000,
            costSavingsAchieved: 225000,
            numberOfContracts: 28,
            strategicSuppliers: 10,
            status: 'Pending Executive Review',
            priority: 'Critical',
            confidentialityLevel: 'Executive Only',
            keyMetrics: {
                savingsPercentage: 15.0,
                contractComplianceRate: 97.3,
                supplierPerformanceScore: 89.8,
                processEfficiencyGain: 25.2
            },
            strategicInsights: [
                'AI-powered procurement analytics delivering 25% efficiency improvements',
                'Automated contract management reducing processing time by 60%',
                'Predictive analytics enabling proactive supplier risk management',
                'Digital supplier onboarding accelerated by 75% through automation'
            ],

    // Filter reports based on status
    const filteredReports = executiveReports.filter((report: any) => {
        if (filter === 'all') return true;
        if (filter === 'pending') return report.status === 'EXECUTIVE_REVIEW';
        if (filter === 'approved') return report.status === 'FINANCE_APPROVED';
        if (filter === 'rejected') return report.status === 'REJECTED';
        return true;
    });


    // Statistics - calculated from actual database data
    const stats = {
        total: executiveReports.length,
        pending: executiveReports.filter((r: any) => r.status === 'EXECUTIVE_REVIEW').length,
        approved: executiveReports.filter((r: any) => r.status === 'FINANCE_APPROVED').length,
        rejected: executiveReports.filter((r: any) => r.status === 'REJECTED').length,
        totalValue: executiveReports.reduce((sum: number, r: any) => sum + (r.estimatedValue || 0), 0),
        totalSavings: 0, // This would need to come from a different endpoint or calculation
    };

    const handleReviewReport = (report: any) => {
        setSelectedReport(report);
        setReviewModal(true);
        setExecutiveComments('');
    };

    const handleViewReport = (report: any) => {
        setSelectedReport(report);
        setReportViewModal(true);
    };

    const submitExecutiveReview = async (decision: 'approve' | 'reject' | 'request_revision') => {
        if (!executiveComments.trim()) {
            Swal.fire('Error', 'Please provide executive comments', 'error');
            return;
        }

        try {
            const apiUrl = getApiUrl();
            const token = getToken();
            
            const response = await fetch(`${apiUrl}/requests/${selectedReport?.id}/action`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: decision === 'approve' ? 'APPROVE' : 'REJECT',
                    comments: executiveComments
                })
            });

            if (!response.ok) throw new Error('Failed to process review');

            await Swal.fire('Success', `Report ${decision}d successfully`, 'success');
            setReviewModal(false);
            setSelectedReport(null);
            setExecutiveComments('');
            
            // Refresh reports list
            fetchReports();
        } catch (error) {
            console.error('Error processing review:', error);
            Swal.fire('Error', 'Failed to process review', 'error');
        }
                message = 'Strategic report approved by Executive Director for implementation';
                break;
            case 'reject':
            console.error('Error processing review:', error);
            Swal.fire('Error', 'Failed to process review', 'error');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'EXECUTIVE_REVIEW':
            case 'Pending Executive Review':
                return 'badge-outline-warning';
            case 'FINANCE_APPROVED':
            case 'Approved by Executive':
                return 'badge-outline-success';
            case 'REJECTED':
            case 'Rejected by Executive':
                return 'badge-outline-danger';
            default:
                return 'badge-outline-primary';
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'Critical':
                return 'badge-outline-danger';
            case 'High':
                return 'badge-outline-warning';
            case 'Medium':
                return 'badge-outline-info';
            case 'Low':
                return 'badge-outline-success';
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
                    <span>Executive Director - Strategic Reports</span>
                </li>
            </ul>

            <div className="pt-5">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">Executive Strategic Reports</h2>
                        <p className="text-white-dark">Review high-level strategic reports on procurement performance, compliance, and organizational impact</p>
                    </div>
                    <div className="flex gap-2">
                        <Link to="/procurement/executive-director-dashboard" className="btn btn-outline-primary">
                            <IconUser className="mr-2" />
                            Dashboard
                        </Link>
                    </div>
                </div>

                {/* Statistics */}
                <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                    <div className="panel">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-lg font-semibold">Total Reports</div>
                            <IconBarChart className="h-6 w-6 text-primary" />
                        </div>
                        <div className="text-3xl font-bold text-primary">{stats.total}</div>
                    </div>
                    <div className="panel">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-lg font-semibold">Pending</div>
                            <IconClock className="h-6 w-6 text-warning" />
                        </div>
                        <div className="text-3xl font-bold text-warning">{stats.pending}</div>
                    </div>
                    <div className="panel">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-lg font-semibold">Approved</div>
                            <IconChecks className="h-6 w-6 text-success" />
                        </div>
                        <div className="text-3xl font-bold text-success">{stats.approved}</div>
                    </div>
                    <div className="panel">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-lg font-semibold">Rejected</div>
                            <IconX className="h-6 w-6 text-danger" />
                        </div>
                        <div className="text-3xl font-bold text-danger">{stats.rejected}</div>
                    </div>
                    <div className="panel">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-lg font-semibold">Total Value</div>
                            <IconDollarSignCircle className="h-6 w-6 text-info" />
                        </div>
                        <div className="text-3xl font-bold text-info">${(stats.totalValue / 1000000).toFixed(1)}M</div>
                    </div>
                    <div className="panel">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-lg font-semibold">Savings</div>
                            <IconTrendingUp className="h-6 w-6 text-success" />
                        </div>
                        <div className="text-3xl font-bold text-success">${(stats.totalSavings / 1000).toFixed(0)}K</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="mb-6 flex gap-2">
                    <button
                        onClick={() => setFilter('pending')}
                        className={`btn btn-sm ${filter === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
                    >
                        Pending Reviews
                    </button>
                    <button
                        onClick={() => setFilter('approved')}
                        className={`btn btn-sm ${filter === 'approved' ? 'btn-success' : 'btn-outline-success'}`}
                    >
                        Approved
                    </button>
                    <button
                        onClick={() => setFilter('rejected')}
                        className={`btn btn-sm ${filter === 'rejected' ? 'btn-danger' : 'btn-outline-danger'}`}
                    >
                        Rejected
                    </button>
                    <button
                        onClick={() => setFilter('all')}
                        className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                    >
                        All Reports
                    </button>
                </div>

                {/* Executive Reports List */}
                <div className="space-y-4">
                    {filteredReports.map((report) => (
                        <div key={report.id} className="panel">
                            <div className="mb-4 flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="mb-2 flex items-center gap-2">
                                        <h5 className="text-lg font-semibold">{report.reportNumber}</h5>
                                        <span className={`badge ${getPriorityBadge(report.priority)}`}>
                                            {report.priority}
                                        </span>
                                        <span className={`badge ${getStatusBadge(report.status)}`}>
                                            {report.status}
                                        </span>
                                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded dark:bg-red-900 dark:text-red-200">
                                            🔒 {report.confidentialityLevel}
                                        </span>
                                    </div>
                                    <p className="mb-2 text-lg font-medium">{report.title}</p>
                                    <p className="mb-3 text-sm text-white-dark">
                                        {report.reportType} | {report.department} | Prepared by: {report.preparedBy}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="text-right">
                                        <div className="text-sm text-white-dark">Procurement Value</div>
                                        <div className="text-xl font-bold text-primary">${(report.totalProcurementValue / 1000000).toFixed(1)}M</div>
                                        <div className="text-sm font-medium text-success">
                                            Savings: ${(report.costSavingsAchieved / 1000).toFixed(0)}K ({report.keyMetrics.savingsPercentage}%)
                                        </div>
                                        <div className="text-sm text-white-dark">Due: {report.reviewDeadline}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleViewReport(report)}
                                            className="btn btn-outline-info btn-sm"
                                            title="View Full Report"
                                        >
                                            <IconEye className="h-4 w-4" />
                                        </button>
                                        {report.status === 'Pending Executive Review' && (
                                            <button
                                                onClick={() => handleReviewReport(report)}
                                                className="btn btn-success btn-sm"
                                                title="Executive Review"
                                            >
                                                <IconBarChart className="h-4 w-4 mr-1" />
                                                Review
                                            </button>
                                        )}
                                        {report.status === 'Approved by Executive' && (
                                            <div className="flex items-center gap-1 text-success text-sm">
                                                <IconCircleCheck className="h-4 w-4" />
                                                Approved {report.approvedDate}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mb-4 grid grid-cols-1 gap-4 border-t border-[#e0e6ed] pt-4 dark:border-[#253b5c] lg:grid-cols-2">
                                <div>
                                    <h6 className="mb-2 font-semibold">Executive Summary</h6>
                                    <p className="text-sm text-white-dark">{report.executiveSummary}</p>
                                </div>
                                <div>
                                    <h6 className="mb-2 font-semibold">Key Performance Metrics</h6>
                                    <div className="text-sm space-y-1">
                                        <div><strong>Contract Compliance:</strong> {report.keyMetrics.contractComplianceRate}%</div>
                                        <div><strong>Supplier Performance:</strong> {report.keyMetrics.supplierPerformanceScore}/100</div>
                                        <div><strong>Process Efficiency:</strong> +{report.keyMetrics.processEfficiencyGain}%</div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 border-t border-[#e0e6ed] pt-4 dark:border-[#253b5c] lg:grid-cols-4">
                                <div>
                                    <span className="text-sm font-medium text-white-dark">Contracts</span>
                                    <div className="text-lg font-bold text-info">{report.numberOfContracts}</div>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-white-dark">Strategic Suppliers</span>
                                    <div className="text-lg font-bold text-warning">{report.strategicSuppliers}</div>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-white-dark">Savings Rate</span>
                                    <div className="text-lg font-bold text-success">{report.keyMetrics.savingsPercentage}%</div>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-white-dark">Efficiency Gain</span>
                                    <div className="text-lg font-bold text-primary">+{report.keyMetrics.processEfficiencyGain}%</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredReports.length === 0 && (
                    <div className="panel">
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <IconBarChart className="mb-4 h-16 w-16 text-white-dark" />
                            <h3 className="mb-2 text-lg font-semibold">No reports found</h3>
                            <p className="text-white-dark">No strategic reports match the current filter</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Executive Review Modal */}
            {reviewModal && selectedReport && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-75">
                    <div className="w-full max-w-5xl rounded-lg bg-white p-6 dark:bg-[#1b2e4b] max-h-[90vh] overflow-y-auto">
                        <div className="mb-4 flex items-center justify-between">
                            <h4 className="text-lg font-semibold flex items-center gap-2">
                                <IconBarChart />
                                Executive Review - {selectedReport.reportNumber}
                            </h4>
                            <button 
                                onClick={() => setReviewModal(false)} 
                                className="text-white-dark hover:text-danger"
                                title="Close Modal"
                            >
                                <IconX />
                            </button>
                        </div>
                        
                        <div className="mb-6 space-y-4">
                            {/* Strategic Overview */}
                            <div className="rounded-lg border border-primary bg-primary-light p-4 dark:bg-primary-dark-light">
                                <h6 className="mb-3 font-semibold text-primary">Strategic Report Overview</h6>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="font-medium text-white-dark">Report Type:</span>
                                        <p className="font-semibold">{selectedReport.reportType}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-white-dark">Prepared By:</span>
                                        <p className="font-semibold">{selectedReport.preparedBy}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-white-dark">Total Value:</span>
                                        <p className="text-lg font-bold text-primary">${(selectedReport.totalProcurementValue / 1000000).toFixed(1)}M</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-white-dark">Savings Achieved:</span>
                                        <p className="text-lg font-bold text-success">${(selectedReport.costSavingsAchieved / 1000).toFixed(0)}K</p>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <span className="font-medium text-white-dark">Executive Summary:</span>
                                    <p className="mt-1 font-medium">{selectedReport.executiveSummary}</p>
                                </div>
                            </div>

                            {/* Strategic Insights */}
                            <div className="rounded-lg border border-success bg-success-light p-4 dark:bg-success-dark-light">
                                <h6 className="mb-3 font-semibold text-success">Strategic Insights</h6>
                                <ul className="space-y-2">
                                    {selectedReport.strategicInsights.map((insight: string, index: number) => (
                                        <li key={index} className="flex items-start gap-2">
                                            <IconStar className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                                            <span className="text-sm">{insight}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Recommendations & Risk Assessment */}
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <div className="rounded-lg border border-[#e0e6ed] p-4 dark:border-[#253b5c]">
                                    <h6 className="mb-3 font-semibold">Strategic Recommendations</h6>
                                    <ul className="space-y-2">
                                        {selectedReport.recommendations.map((rec: string, index: number) => (
                                            <li key={index} className="flex items-start gap-2">
                                                <IconThumbUp className="h-4 w-4 text-info mt-0.5 flex-shrink-0" />
                                                <span className="text-sm text-white-dark">{rec}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="rounded-lg border border-[#e0e6ed] p-4 dark:border-[#253b5c]">
                                    <h6 className="mb-3 font-semibold">Risk Assessment</h6>
                                    <p className="text-sm text-white-dark">{selectedReport.riskAssessment}</p>
                                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                        <div><strong>Compliance Rate:</strong> {selectedReport.keyMetrics.contractComplianceRate}%</div>
                                        <div><strong>Supplier Score:</strong> {selectedReport.keyMetrics.supplierPerformanceScore}/100</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mb-6">
                            <label className="mb-2 block text-sm font-medium">Executive Director Strategic Comments</label>
                            <textarea
                                value={executiveComments}
                                onChange={(e) => setExecutiveComments(e.target.value)}
                                className="form-textarea resize-none"
                                rows={4}
                                placeholder="Provide executive-level strategic guidance, approval rationale, or strategic direction for implementation..."
                            />
                        </div>
                        
                        <div className="flex items-center justify-end gap-2 border-t border-[#e0e6ed] pt-4 dark:border-[#253b5c]">
                            <button
                                onClick={() => submitExecutiveReview('approve')}
                                className="btn btn-success"
                                disabled={!executiveComments.trim()}
                            >
                                <IconThumbUp className="mr-2" />
                                Approve for Implementation
                            </button>
                            <button
                                onClick={() => submitExecutiveReview('request_revision')}
                                className="btn btn-warning"
                                disabled={!executiveComments.trim()}
                            >
                                <IconClock className="mr-2" />
                                Request Strategic Revision
                            </button>
                            <button
                                onClick={() => submitExecutiveReview('reject')}
                                className="btn btn-danger"
                                disabled={!executiveComments.trim()}
                            >
                                <IconX className="mr-2" />
                                Reject Strategy
                            </button>
                            <button
                                onClick={() => setReviewModal(false)}
                                className="btn btn-outline-secondary"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Report Viewer Modal */}
            {reportViewModal && selectedReport && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-75">
                    <div className="w-full max-w-6xl rounded-lg bg-white p-6 dark:bg-[#1b2e4b] max-h-[90vh] overflow-y-auto">
                        <div className="mb-4 flex items-center justify-between">
                            <h4 className="text-lg font-semibold flex items-center gap-2">
                                📊 Strategic Report - {selectedReport.reportNumber}
                            </h4>
                            <button 
                                onClick={() => setReportViewModal(false)} 
                                className="text-white-dark hover:text-danger"
                                title="Close Modal"
                            >
                                <IconX />
                            </button>
                        </div>
                        
                        <div className="space-y-6">
                            {/* Executive Header */}
                            <div className="rounded-lg border border-primary bg-primary-light p-6 dark:bg-primary-dark-light">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="text-2xl font-bold text-primary mb-2">{selectedReport.title}</h3>
                                        <p className="text-sm mb-3">{selectedReport.description}</p>
                                    </div>
                                    <span className="bg-red-100 text-red-800 px-3 py-1 rounded text-xs font-medium dark:bg-red-900 dark:text-red-200">
                                        🔒 {selectedReport.confidentialityLevel}
                                    </span>
                                </div>
                                <div className="grid grid-cols-4 gap-4 text-sm">
                                    <div><strong>Report Type:</strong> {selectedReport.reportType}</div>
                                    <div><strong>Department:</strong> {selectedReport.department}</div>
                                    <div><strong>Prepared By:</strong> {selectedReport.preparedBy}</div>
                                    <div><strong>Submitted:</strong> {selectedReport.submittedDate}</div>
                                </div>
                            </div>

                            {/* Key Metrics Dashboard */}
                            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                                <div className="rounded-lg border border-[#e0e6ed] p-4 dark:border-[#253b5c] text-center">
                                    <div className="text-2xl font-bold text-primary">${(selectedReport.totalProcurementValue / 1000000).toFixed(1)}M</div>
                                    <div className="text-sm text-white-dark">Total Value</div>
                                </div>
                                <div className="rounded-lg border border-[#e0e6ed] p-4 dark:border-[#253b5c] text-center">
                                    <div className="text-2xl font-bold text-success">${(selectedReport.costSavingsAchieved / 1000).toFixed(0)}K</div>
                                    <div className="text-sm text-white-dark">Cost Savings</div>
                                </div>
                                <div className="rounded-lg border border-[#e0e6ed] p-4 dark:border-[#253b5c] text-center">
                                    <div className="text-2xl font-bold text-info">{selectedReport.keyMetrics.contractComplianceRate}%</div>
                                    <div className="text-sm text-white-dark">Compliance Rate</div>
                                </div>
                                <div className="rounded-lg border border-[#e0e6ed] p-4 dark:border-[#253b5c] text-center">
                                    <div className="text-2xl font-bold text-warning">+{selectedReport.keyMetrics.processEfficiencyGain}%</div>
                                    <div className="text-sm text-white-dark">Efficiency Gain</div>
                                </div>
                            </div>

                            {/* Strategic Content */}
                            <div className="space-y-4">
                                <div className="rounded-lg border border-success bg-success-light p-4 dark:bg-success-dark-light">
                                    <h6 className="mb-3 font-semibold text-success">Strategic Insights</h6>
                                    <ul className="space-y-2">
                                        {selectedReport.strategicInsights.map((insight: string, index: number) => (
                                            <li key={index} className="text-sm">• {insight}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="rounded-lg border border-[#e0e6ed] p-4 dark:border-[#253b5c]">
                                    <h6 className="mb-3 font-semibold">Strategic Recommendations</h6>
                                    <ul className="space-y-2">
                                        {selectedReport.recommendations.map((rec: string, index: number) => (
                                            <li key={index} className="text-sm">• {rec}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Attachments */}
                            <div className="rounded-lg border border-[#e0e6ed] p-4 dark:border-[#253b5c]">
                                <h6 className="mb-3 font-semibold">Executive Attachments</h6>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    {selectedReport.attachments.map((attachment: string, index: number) => (
                                        <div key={index} className="flex items-center gap-2 rounded border p-2">
                                            <span className="text-lg">📊</span>
                                            <span className="flex-1 text-sm">{attachment}</span>
                                            <button className="btn btn-outline-primary btn-sm" title="Download">
                                                <IconDownload className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setReportViewModal(false)}
                                className="btn btn-outline-secondary"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExecutiveDirectorReports;