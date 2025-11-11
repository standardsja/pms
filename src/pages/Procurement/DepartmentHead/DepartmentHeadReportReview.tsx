import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconClipboardText from '../../../components/Icon/IconClipboardText';
import IconEye from '../../../components/Icon/IconEye';
import IconChecks from '../../../components/Icon/IconChecks';
import IconX from '../../../components/Icon/IconX';
import IconDownload from '../../../components/Icon/IconDownload';
import IconUser from '../../../components/Icon/IconUser';
import IconClock from '../../../components/Icon/IconClock';
import IconBarChart from '../../../components/Icon/IconBarChart';
import IconCircleCheck from '../../../components/Icon/IconCircleCheck';
import IconThumbUp from '../../../components/Icon/IconThumbUp';

const DepartmentHeadReportReview = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Department Head - Evaluation Report Reviews'));
    });

    const [filter, setFilter] = useState('pending');
    const [reviewModal, setReviewModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState<any>(null);
    const [reviewComments, setReviewComments] = useState('');
    const [reportViewModal, setReportViewModal] = useState(false);

    // Evaluation reports requiring Department Head review
    const evaluationReports = [
        {
            id: 1,
            reportNumber: 'RPT-EVAL-2024-001',
            rfqNumber: 'RFQ-2024-045',
            title: 'Office Supplies Procurement Evaluation Report',
            description: 'Comprehensive evaluation of 5 suppliers for annual office supplies contract',
            department: 'Administration',
            evaluationOfficer: 'John Doe',
            submittedDate: '2024-10-25',
            reviewDeadline: '2024-11-02',
            totalSuppliers: 5,
            totalValue: 125000,
            recommendedSupplier: 'ABC Office Solutions',
            recommendedValue: 118500,
            savingsAchieved: 6500,
            status: 'Pending Department Head Review',
            priority: 'High',
            evaluationPeriod: '2024-10-15 to 2024-10-24',
            keyFindings: 'ABC Office Solutions offers best value proposition with 5.2% savings while maintaining quality standards',
            riskLevel: 'Low',
            complianceStatus: 'Fully Compliant',
            reportSections: {
                executiveSummary: 'Completed evaluation of 5 qualified suppliers with comprehensive scoring methodology',
                methodology: 'Weighted scoring: Price (40%), Quality (30%), Delivery (20%), Service (10%)',
                supplierAnalysis: 'Detailed analysis of each supplier capabilities and offerings',
                riskAssessment: 'Low risk profile with established supplier relationships',
                recommendations: 'Recommend ABC Office Solutions based on cost-effectiveness and reliability',
                conclusions: 'Evaluation process successfully identified optimal supplier solution'
            },
            attachments: ['Evaluation_Matrix.xlsx', 'Supplier_Comparison.pdf', 'Cost_Analysis.xlsx', 'Quality_Assessment.pdf']
        },
        {
            id: 2,
            reportNumber: 'RPT-EVAL-2024-002',
            rfqNumber: 'RFQ-2024-046',
            title: 'IT Equipment Procurement Evaluation Report',
            description: 'Technical and commercial evaluation of enterprise hardware suppliers',
            department: 'Information Technology',
            evaluationOfficer: 'Jane Smith',
            submittedDate: '2024-10-26',
            reviewDeadline: '2024-11-05',
            totalSuppliers: 3,
            totalValue: 350000,
            recommendedSupplier: 'Tech Solutions Ltd',
            recommendedValue: 335000,
            savingsAchieved: 15000,
            status: 'Pending Department Head Review',
            priority: 'Critical',
            evaluationPeriod: '2024-10-18 to 2024-10-25',
            keyFindings: 'Tech Solutions Ltd provides superior technical specifications with competitive pricing',
            riskLevel: 'Medium',
            complianceStatus: 'Compliant with Conditions',
            reportSections: {
                executiveSummary: 'Evaluation of enterprise-grade IT equipment from 3 certified vendors',
                methodology: 'Technical compliance (50%), Price (30%), Support (20%)',
                supplierAnalysis: 'Comprehensive technical and commercial assessment',
                riskAssessment: 'Medium risk due to implementation complexity',
                recommendations: 'Tech Solutions Ltd recommended with enhanced support package',
                conclusions: 'Technical requirements met with acceptable risk mitigation'
            },
            attachments: ['Technical_Specs.pdf', 'Price_Comparison.xlsx', 'Support_Matrix.pdf', 'Risk_Mitigation.pdf']
        },
        {
            id: 3,
            reportNumber: 'RPT-EVAL-2024-003',
            rfqNumber: 'RFQ-2024-047',
            title: 'Facilities Maintenance Services Evaluation',
            description: 'Annual facilities maintenance contract evaluation and supplier selection',
            department: 'Facilities Management',
            evaluationOfficer: 'Mike Johnson',
            submittedDate: '2024-10-28',
            reviewDeadline: '2024-11-08',
            totalSuppliers: 4,
            totalValue: 180000,
            recommendedSupplier: 'FacilityCare Pro',
            recommendedValue: 172000,
            savingsAchieved: 8000,
            status: 'Approved by Department Head',
            priority: 'Medium',
            evaluationPeriod: '2024-10-20 to 2024-10-27',
            keyFindings: 'FacilityCare Pro offers comprehensive services with proven track record',
            riskLevel: 'Low',
            complianceStatus: 'Fully Compliant',
            approvedDate: '2024-10-29',
            approvedBy: 'Department Head',
            reportSections: {
                executiveSummary: 'Evaluation of 4 facilities maintenance service providers',
                methodology: 'Service capability (40%), Price (35%), Experience (25%)',
                supplierAnalysis: 'Assessment of service delivery capabilities and track record',
                riskAssessment: 'Low risk with established service providers',
                recommendations: 'FacilityCare Pro recommended for comprehensive service offering',
                conclusions: 'Optimal balance of cost, quality, and service reliability achieved'
            },
            attachments: ['Service_Comparison.pdf', 'Cost_Breakdown.xlsx', 'References.pdf', 'SLA_Terms.pdf']
        },
        {
            id: 4,
            reportNumber: 'RPT-EVAL-2024-004',
            rfqNumber: 'RFQ-2024-048',
            title: 'Professional Services Procurement Evaluation',
            description: 'Legal and consulting services evaluation for strategic initiatives',
            department: 'Legal & Strategy',
            evaluationOfficer: 'Sarah Williams',
            submittedDate: '2024-10-30',
            reviewDeadline: '2024-11-12',
            totalSuppliers: 6,
            totalValue: 450000,
            recommendedSupplier: 'Strategic Advisors Group',
            recommendedValue: 425000,
            savingsAchieved: 25000,
            status: 'Pending Department Head Review',
            priority: 'High',
            evaluationPeriod: '2024-10-22 to 2024-10-29',
            keyFindings: 'Strategic Advisors Group demonstrates exceptional expertise and competitive pricing',
            riskLevel: 'Low',
            complianceStatus: 'Fully Compliant',
            reportSections: {
                executiveSummary: 'Comprehensive evaluation of professional services providers',
                methodology: 'Expertise (45%), Price (30%), Track Record (25%)',
                supplierAnalysis: 'Detailed assessment of professional capabilities and experience',
                riskAssessment: 'Low risk with established professional firms',
                recommendations: 'Strategic Advisors Group recommended for comprehensive expertise',
                conclusions: 'Optimal combination of expertise, experience, and value achieved'
            },
            attachments: ['Expertise_Matrix.pdf', 'Fee_Analysis.xlsx', 'Case_Studies.pdf', 'Team_Profiles.pdf']
        },
    ];

    // Filter reports based on status
    const filteredReports = evaluationReports.filter(report => {
        if (filter === 'all') return true;
        if (filter === 'pending') return report.status === 'Pending Department Head Review';
        if (filter === 'approved') return report.status === 'Approved by Department Head';
        if (filter === 'rejected') return report.status === 'Rejected by Department Head';
        return true;
    });

    // Statistics
    const stats = {
        total: evaluationReports.length,
        pending: evaluationReports.filter(r => r.status === 'Pending Department Head Review').length,
        approved: evaluationReports.filter(r => r.status === 'Approved by Department Head').length,
        rejected: evaluationReports.filter(r => r.status === 'Rejected by Department Head').length,
        totalValue: evaluationReports.reduce((sum, r) => sum + r.totalValue, 0),
        totalSavings: evaluationReports.reduce((sum, r) => sum + r.savingsAchieved, 0),
    };

    const handleReviewReport = (report: any) => {
        setSelectedReport(report);
        setReviewModal(true);
        setReviewComments('');
    };

    const handleViewReport = (report: any) => {
        setSelectedReport(report);
        setReportViewModal(true);
    };

    const submitReview = (decision: 'approve' | 'reject' | 'request_revision') => {
        if (!reviewComments.trim()) {
            alert('Please provide review comments');
            return;
        }

        // Process the review decision
        let message = '';
        switch (decision) {
            case 'approve':
                message = 'Evaluation report approved by Department Head and forwarded for final processing';
                break;
            case 'reject':
                message = 'Evaluation report rejected - returned for revision and re-evaluation';
                break;
            case 'request_revision':
                message = 'Report revision requested - evaluation officer notified for improvements';
                break;
        }
        
        // Show success message (in production, this would be a toast notification)
        alert(message);
        setReviewModal(false);
        setSelectedReport(null);
        setReviewComments('');
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Pending Department Head Review':
                return 'badge-outline-warning';
            case 'Approved by Department Head':
                return 'badge-outline-success';
            case 'Rejected by Department Head':
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

    const getRiskBadge = (risk: string) => {
        switch (risk) {
            case 'High':
                return 'text-danger';
            case 'Medium':
                return 'text-warning';
            case 'Low':
                return 'text-success';
            default:
                return 'text-primary';
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
                    <span>Department Head - Evaluation Report Reviews</span>
                </li>
            </ul>

            <div className="pt-5">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">Evaluation Report Reviews</h2>
                        <p className="text-white-dark">Review and approve comprehensive evaluation reports to ensure procurement decisions are well-documented and justified</p>
                    </div>
                    <div className="flex gap-2">
                        <Link to="/procurement/department-head-dashboard" className="btn btn-outline-primary">
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
                            <IconClipboardText className="h-6 w-6 text-primary" />
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
                            <IconBarChart className="h-6 w-6 text-info" />
                        </div>
                        <div className="text-3xl font-bold text-info">${(stats.totalValue / 1000).toFixed(0)}K</div>
                    </div>
                    <div className="panel">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-lg font-semibold">Savings</div>
                            <IconThumbUp className="h-6 w-6 text-success" />
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

                {/* Evaluation Reports List */}
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
                                        <span className={`text-sm font-medium ${getRiskBadge(report.riskLevel)}`}>
                                            🛡️ {report.riskLevel} Risk
                                        </span>
                                    </div>
                                    <p className="mb-2 text-lg font-medium">{report.title}</p>
                                    <p className="mb-3 text-sm text-white-dark">
                                        {report.department} | Evaluator: {report.evaluationOfficer} | Due: {report.reviewDeadline}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="text-right">
                                        <div className="text-sm text-white-dark">Recommended Supplier</div>
                                        <div className="font-semibold text-success">{report.recommendedSupplier}</div>
                                        <div className="text-xl font-bold text-primary">${report.recommendedValue.toLocaleString()}</div>
                                        <div className="text-sm font-medium text-success">Savings: ${report.savingsAchieved.toLocaleString()}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleViewReport(report)}
                                            className="btn btn-outline-info btn-sm"
                                            title="View Full Report"
                                        >
                                            <IconEye className="h-4 w-4" />
                                        </button>
                                        {report.status === 'Pending Department Head Review' && (
                                            <button
                                                onClick={() => handleReviewReport(report)}
                                                className="btn btn-success btn-sm"
                                                title="Review Report"
                                            >
                                                <IconClipboardText className="h-4 w-4 mr-1" />
                                                Review
                                            </button>
                                        )}
                                        {report.status === 'Approved by Department Head' && (
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
                                    <h6 className="mb-2 font-semibold">Key Findings</h6>
                                    <p className="text-sm text-white-dark">{report.keyFindings}</p>
                                </div>
                                <div>
                                    <h6 className="mb-2 font-semibold">Evaluation Summary</h6>
                                    <div className="text-sm">
                                        <div><strong>Period:</strong> {report.evaluationPeriod}</div>
                                        <div><strong>Suppliers:</strong> {report.totalSuppliers} evaluated</div>
                                        <div><strong>Compliance:</strong> {report.complianceStatus}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 border-t border-[#e0e6ed] pt-4 dark:border-[#253b5c] lg:grid-cols-4">
                                <div>
                                    <span className="text-sm font-medium text-white-dark">Total Value</span>
                                    <div className="text-lg font-bold text-primary">${report.totalValue.toLocaleString()}</div>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-white-dark">Recommended Value</span>
                                    <div className="text-lg font-bold text-success">${report.recommendedValue.toLocaleString()}</div>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-white-dark">Savings Achieved</span>
                                    <div className="text-lg font-bold text-info">${report.savingsAchieved.toLocaleString()}</div>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-white-dark">Savings %</span>
                                    <div className="text-lg font-bold text-warning">{((report.savingsAchieved / report.totalValue) * 100).toFixed(1)}%</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredReports.length === 0 && (
                    <div className="panel">
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <IconClipboardText className="mb-4 h-16 w-16 text-white-dark" />
                            <h3 className="mb-2 text-lg font-semibold">No reports found</h3>
                            <p className="text-white-dark">No evaluation reports match the current filter</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Review Modal */}
            {reviewModal && selectedReport && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-75">
                    <div className="w-full max-w-4xl rounded-lg bg-white p-6 dark:bg-[#1b2e4b] max-h-[90vh] overflow-y-auto">
                        <div className="mb-4 flex items-center justify-between">
                            <h4 className="text-lg font-semibold flex items-center gap-2">
                                <IconClipboardText />
                                Department Head Review - {selectedReport.reportNumber}
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
                            {/* Report Summary */}
                            <div className="rounded-lg border border-[#e0e6ed] p-4 dark:border-[#253b5c]">
                                <h6 className="mb-3 font-semibold">Report Summary</h6>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="font-medium text-white-dark">RFQ Number:</span>
                                        <p className="font-semibold">{selectedReport.rfqNumber}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-white-dark">Report Title:</span>
                                        <p className="font-semibold">{selectedReport.title}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-white-dark">Evaluation Officer:</span>
                                        <p className="font-semibold">{selectedReport.evaluationOfficer}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-white-dark">Evaluation Period:</span>
                                        <p className="font-semibold">{selectedReport.evaluationPeriod}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Recommendation Details */}
                            <div className="rounded-lg border border-success bg-success-light p-4 dark:bg-success-dark-light">
                                <h6 className="mb-3 font-semibold text-success">Evaluation Recommendation</h6>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <span className="text-sm font-medium text-white-dark">Recommended Supplier:</span>
                                        <p className="text-lg font-semibold">{selectedReport.recommendedSupplier}</p>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-white-dark">Recommended Value:</span>
                                        <p className="text-lg font-bold text-success">${selectedReport.recommendedValue.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-white-dark">Savings Achieved:</span>
                                        <p className="text-lg font-bold text-success">${selectedReport.savingsAchieved.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <span className="text-sm font-medium text-white-dark">Key Findings:</span>
                                    <p className="mt-1">{selectedReport.keyFindings}</p>
                                </div>
                            </div>

                            {/* Report Analysis */}
                            <div className="rounded-lg border border-[#e0e6ed] p-4 dark:border-[#253b5c]">
                                <h6 className="mb-3 font-semibold">Report Analysis Overview</h6>
                                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                    <div>
                                        <h6 className="font-semibold text-sm">Executive Summary</h6>
                                        <p className="text-sm text-white-dark">{selectedReport.reportSections.executiveSummary}</p>
                                    </div>
                                    <div>
                                        <h6 className="font-semibold text-sm">Evaluation Methodology</h6>
                                        <p className="text-sm text-white-dark">{selectedReport.reportSections.methodology}</p>
                                    </div>
                                    <div>
                                        <h6 className="font-semibold text-sm">Risk Assessment</h6>
                                        <p className="text-sm text-white-dark">{selectedReport.reportSections.riskAssessment}</p>
                                    </div>
                                    <div>
                                        <h6 className="font-semibold text-sm">Final Recommendations</h6>
                                        <p className="text-sm text-white-dark">{selectedReport.reportSections.recommendations}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mb-6">
                            <label className="mb-2 block text-sm font-medium">Department Head Review Comments</label>
                            <textarea
                                value={reviewComments}
                                onChange={(e) => setReviewComments(e.target.value)}
                                className="form-textarea resize-none"
                                rows={4}
                                placeholder="Provide your review of the evaluation report, methodology validation, recommendation assessment, and approval/rejection rationale..."
                            />
                        </div>
                        
                        <div className="flex items-center justify-end gap-2 border-t border-[#e0e6ed] pt-4 dark:border-[#253b5c]">
                            <button
                                onClick={() => submitReview('approve')}
                                className="btn btn-success"
                                disabled={!reviewComments.trim()}
                            >
                                <IconThumbUp className="mr-2" />
                                Approve Report
                            </button>
                            <button
                                onClick={() => submitReview('request_revision')}
                                className="btn btn-warning"
                                disabled={!reviewComments.trim()}
                            >
                                <IconClock className="mr-2" />
                                Request Revision
                            </button>
                            <button
                                onClick={() => submitReview('reject')}
                                className="btn btn-danger"
                                disabled={!reviewComments.trim()}
                            >
                                <IconX className="mr-2" />
                                Reject Report
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
                                📄 Full Evaluation Report - {selectedReport.reportNumber}
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
                            {/* Report Header */}
                            <div className="rounded-lg border border-primary bg-primary-light p-4 dark:bg-primary-dark-light">
                                <h3 className="text-xl font-bold text-primary mb-2">{selectedReport.title}</h3>
                                <p className="text-sm">{selectedReport.description}</p>
                                <div className="mt-3 grid grid-cols-4 gap-4 text-sm">
                                    <div><strong>RFQ:</strong> {selectedReport.rfqNumber}</div>
                                    <div><strong>Department:</strong> {selectedReport.department}</div>
                                    <div><strong>Officer:</strong> {selectedReport.evaluationOfficer}</div>
                                    <div><strong>Period:</strong> {selectedReport.evaluationPeriod}</div>
                                </div>
                            </div>

                            {/* Report Sections */}
                            <div className="grid gap-4">
                                {Object.entries(selectedReport.reportSections).map(([section, content]) => (
                                    <div key={section} className="rounded-lg border border-[#e0e6ed] p-4 dark:border-[#253b5c]">
                                        <h6 className="mb-2 font-semibold capitalize">{section.replace(/([A-Z])/g, ' $1').trim()}</h6>
                                        <p className="text-sm text-white-dark">{String(content)}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Attachments */}
                            <div className="rounded-lg border border-[#e0e6ed] p-4 dark:border-[#253b5c]">
                                <h6 className="mb-3 font-semibold">Report Attachments</h6>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    {selectedReport.attachments.map((attachment: string, index: number) => (
                                        <div key={index} className="flex items-center gap-2 rounded border p-2">
                                            <span className="text-lg">📎</span>
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

export default DepartmentHeadReportReview;