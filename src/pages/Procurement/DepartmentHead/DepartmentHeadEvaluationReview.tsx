import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconClipboardText from '../../../components/Icon/IconClipboardText';
import IconEye from '../../../components/Icon/IconEye';
import IconChecks from '../../../components/Icon/IconChecks';
import IconX from '../../../components/Icon/IconX';
import IconDownload from '../../../components/Icon/IconDownload';
import IconStar from '../../../components/Icon/IconStar';
import IconClock from '../../../components/Icon/IconClock';
import IconUser from '../../../components/Icon/IconUser';
import IconCircleCheck from '../../../components/Icon/IconCircleCheck';
import IconThumbUp from '../../../components/Icon/IconThumbUp';

const DepartmentHeadEvaluationReview = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Department Head - Supplier Approvals'));
    });

    const [filter, setFilter] = useState('pending');
    const [reviewModal, setReviewModal] = useState(false);
    const [selectedEvaluation, setSelectedEvaluation] = useState<any>(null);
    const [reviewDecision, setReviewDecision] = useState('');
    const [reviewComments, setReviewComments] = useState('');

    // Evaluations requiring Department Head review and approval
    const evaluationReviews = [
        {
            id: 1,
            evalNumber: 'EVAL-2024-001',
            rfqNumber: 'RFQ-2024-045',
            description: 'Office Supplies Evaluation',
            department: 'Administration',
            evaluator: 'John Doe',
            submittedDate: '2024-10-25',
            dueDate: '2024-10-30',
            totalQuotes: 5,
            recommendedSupplier: 'ABC Office Solutions',
            recommendedAmount: 12500,
            evaluationScore: 88,
            status: 'Pending Department Head Review',
            priority: 'High',
            evaluationCriteria: {
                price: 85,
                quality: 90,
                delivery: 88,
                service: 87,
            },
            supplierComparison: [
                { supplier: 'ABC Office Solutions', score: 88, amount: 12500, rank: 1 },
                { supplier: 'Office Depot', score: 82, amount: 13200, rank: 2 },
                { supplier: 'Staples Inc', score: 78, amount: 11800, rank: 3 },
                { supplier: 'Business Supply Co', score: 75, amount: 14000, rank: 4 },
                { supplier: 'Quick Office', score: 70, amount: 12800, rank: 5 }
            ],
            justification: 'ABC Office Solutions provides the best balance of quality, price, and service. Strong delivery track record and excellent customer support.',
            riskAssessment: 'Low risk - established supplier with good payment terms and reliable delivery history.',
        },
        {
            id: 2,
            evalNumber: 'EVAL-2024-002',
            rfqNumber: 'RFQ-2024-046',
            description: 'IT Equipment Purchase Evaluation',
            department: 'Information Technology',
            evaluator: 'Jane Smith',
            submittedDate: '2024-10-24',
            dueDate: '2024-10-29',
            totalQuotes: 3,
            recommendedSupplier: 'Tech Solutions Ltd',
            recommendedAmount: 35000,
            evaluationScore: 92,
            status: 'Pending Department Head Review',
            priority: 'Medium',
            evaluationCriteria: {
                price: 80,
                quality: 95,
                delivery: 90,
                service: 92,
            },
            supplierComparison: [
                { supplier: 'Tech Solutions Ltd', score: 92, amount: 35000, rank: 1 },
                { supplier: 'Computer World', score: 85, amount: 32000, rank: 2 },
                { supplier: 'IT Pro Services', score: 78, amount: 38000, rank: 3 }
            ],
            justification: 'Tech Solutions Ltd offers premium quality equipment with excellent technical support and warranty terms. Price is competitive for the quality level.',
            riskAssessment: 'Low risk - certified partner with proven track record in enterprise IT solutions.',
        },
        {
            id: 3,
            evalNumber: 'EVAL-2024-003',
            rfqNumber: 'RFQ-2024-047',
            description: 'Cleaning Services Contract Evaluation',
            department: 'Facilities Management',
            evaluator: 'Mike Johnson',
            submittedDate: '2024-10-26',
            dueDate: '2024-10-31',
            totalQuotes: 4,
            recommendedSupplier: 'CleanPro Services',
            recommendedAmount: 18000,
            evaluationScore: 85,
            status: 'Pending Department Head Review',
            priority: 'Low',
            evaluationCriteria: {
                price: 88,
                quality: 85,
                delivery: 82,
                service: 85,
            },
            supplierComparison: [
                { supplier: 'CleanPro Services', score: 85, amount: 18000, rank: 1 },
                { supplier: 'Sparkle Clean', score: 80, amount: 16500, rank: 2 },
                { supplier: 'Elite Cleaning', score: 78, amount: 19500, rank: 3 },
                { supplier: 'Quick Clean Co', score: 72, amount: 17000, rank: 4 }
            ],
            justification: 'CleanPro Services demonstrates strong quality standards and reliability. Competitive pricing with comprehensive service coverage.',
            riskAssessment: 'Medium risk - newer company but with strong references and insurance coverage.',
        },
        {
            id: 4,
            evalNumber: 'EVAL-2024-004',
            rfqNumber: 'RFQ-2024-048',
            description: 'Marketing Services Evaluation',
            department: 'Marketing',
            evaluator: 'Sarah Williams',
            submittedDate: '2024-10-27',
            dueDate: '2024-11-02',
            totalQuotes: 6,
            recommendedSupplier: 'Creative Marketing Hub',
            recommendedAmount: 45000,
            evaluationScore: 90,
            status: 'Approved by Department Head',
            priority: 'High',
            approvedDate: '2024-10-28',
            approvedBy: 'Department Head',
            evaluationCriteria: {
                price: 85,
                quality: 95,
                delivery: 88,
                service: 92,
            },
            supplierComparison: [
                { supplier: 'Creative Marketing Hub', score: 90, amount: 45000, rank: 1 },
                { supplier: 'Brand Solutions', score: 87, amount: 42000, rank: 2 },
                { supplier: 'Marketing Pro', score: 83, amount: 48000, rank: 3 },
                { supplier: 'Ad Agency Plus', score: 80, amount: 40000, rank: 4 },
                { supplier: 'Digital Boost', score: 78, amount: 46000, rank: 5 },
                { supplier: 'Market Leaders', score: 75, amount: 50000, rank: 6 }
            ],
            justification: 'Creative Marketing Hub offers innovative solutions with proven ROI. Strong portfolio and dedicated account management.',
            riskAssessment: 'Low risk - established agency with strong client testimonials and performance guarantees.',
        },
    ];

    // Filter evaluations based on status
    const filteredEvaluations = evaluationReviews.filter(evaluation => {
        if (filter === 'all') return true;
        if (filter === 'pending') return evaluation.status === 'Pending Department Head Review';
        if (filter === 'approved') return evaluation.status === 'Approved by Department Head';
        if (filter === 'rejected') return evaluation.status === 'Rejected by Department Head';
        return true;
    });

    // Statistics
    const stats = {
        total: evaluationReviews.length,
        pending: evaluationReviews.filter(e => e.status === 'Pending Department Head Review').length,
        approved: evaluationReviews.filter(e => e.status === 'Approved by Department Head').length,
        rejected: evaluationReviews.filter(e => e.status === 'Rejected by Department Head').length,
        totalValue: evaluationReviews.reduce((sum, e) => sum + e.recommendedAmount, 0),
    };

    const handleReviewEvaluation = (evaluation: any) => {
        setSelectedEvaluation(evaluation);
        setReviewModal(true);
        setReviewDecision('');
        setReviewComments('');
    };

    const submitReview = (decision: 'approve' | 'reject' | 'request_revision') => {
        if (!reviewComments.trim()) {
            alert('Please provide review comments');
            return;
        }

        console.log(`Department Head ${decision}:`, selectedEvaluation, 'Comments:', reviewComments);
        
        let message = '';
        switch (decision) {
            case 'approve':
                message = 'Recommended supplier approved by Department Head and forwarded for executive approval';
                break;
            case 'reject':
                message = 'Supplier recommendation rejected - returned for re-evaluation and new supplier selection';
                break;
            case 'request_revision':
                message = 'Request for better supplier justification - evaluation returned with feedback for improvement';
                break;
        }
        
        alert(message);
        setReviewModal(false);
        setSelectedEvaluation(null);
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
                    <span>Department Head - Supplier Approvals</span>
                </li>
            </ul>

            <div className="pt-5">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">Supplier Recommendation Reviews</h2>
                        <p className="text-white-dark">Review and approve recommended suppliers to ensure procurement selections are justified and aligned with departmental needs</p>
                    </div>
                    <div className="flex gap-2">
                        <Link to="/procurement/department-head-dashboard" className="btn btn-outline-primary">
                            <IconUser className="mr-2" />
                            Dashboard
                        </Link>
                    </div>
                </div>

                {/* Statistics */}
                <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="panel">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-lg font-semibold">Total Reviews</div>
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
                            <IconStar className="h-6 w-6 text-info" />
                        </div>
                        <div className="text-3xl font-bold text-info">${(stats.totalValue / 1000).toFixed(0)}K</div>
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
                        All Reviews
                    </button>
                </div>

                {/* Evaluation Reviews List */}
                <div className="space-y-4">
                    {filteredEvaluations.map((evaluation) => (
                        <div key={evaluation.id} className="panel">
                            <div className="mb-4 flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="mb-2 flex items-center gap-2">
                                        <h5 className="text-lg font-semibold">{evaluation.evalNumber}</h5>
                                        <span className={`badge ${getPriorityBadge(evaluation.priority)}`}>
                                            {evaluation.priority}
                                        </span>
                                        <span className={`badge ${getStatusBadge(evaluation.status)}`}>
                                            {evaluation.status}
                                        </span>
                                    </div>
                                    <p className="mb-2 text-lg font-medium">{evaluation.description}</p>
                                    <p className="mb-3 text-sm text-white-dark">Department: {evaluation.department} | Evaluator: {evaluation.evaluator}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="text-right">
                                        <div className="text-sm text-white-dark">Recommended Supplier</div>
                                        <div className="font-semibold text-success">{evaluation.recommendedSupplier}</div>
                                        <div className="text-xl font-bold text-primary">${evaluation.recommendedAmount.toLocaleString()}</div>
                                    </div>
                                    {evaluation.status === 'Pending Department Head Review' && (
                                        <button
                                            onClick={() => handleReviewEvaluation(evaluation)}
                                            className="btn btn-primary btn-sm"
                                            title="Review Evaluation"
                                        >
                                            <IconEye className="h-4 w-4 mr-1" />
                                            Review
                                        </button>
                                    )}
                                    {evaluation.status === 'Approved by Department Head' && (
                                        <div className="flex items-center gap-1 text-success text-sm">
                                            <IconCircleCheck className="h-4 w-4" />
                                            Approved on {evaluation.approvedDate}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="mb-4 grid grid-cols-1 gap-4 border-t border-[#e0e6ed] pt-4 dark:border-[#253b5c] lg:grid-cols-2">
                                <div>
                                    <h6 className="mb-2 font-semibold">Recommended Supplier Analysis</h6>
                                    <div className="mb-2 text-sm">
                                        <strong>Score:</strong> {evaluation.evaluationScore}/100
                                        <span className="ml-2 text-success">★ Rank #1 of {evaluation.totalQuotes}</span>
                                    </div>
                                    <p className="text-sm text-white-dark">{evaluation.justification}</p>
                                </div>
                                <div>
                                    <h6 className="mb-2 font-semibold">Risk Assessment</h6>
                                    <p className="text-sm text-white-dark">{evaluation.riskAssessment}</p>
                                    <div className="mt-2 text-sm">
                                        <strong>Due Date:</strong> {evaluation.dueDate}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-[#e0e6ed] pt-4 dark:border-[#253b5c] lg:grid-cols-4">
                                <div>
                                    <span className="text-sm font-medium text-white-dark">Price Score</span>
                                    <div className="flex items-center gap-2">
                                        <div className="text-lg font-bold">{evaluation.evaluationCriteria.price}</div>
                                        <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                            <div className="h-full bg-primary" style={{ width: `${evaluation.evaluationCriteria.price}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-white-dark">Quality Score</span>
                                    <div className="flex items-center gap-2">
                                        <div className="text-lg font-bold">{evaluation.evaluationCriteria.quality}</div>
                                        <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                            <div className="h-full bg-success" style={{ width: `${evaluation.evaluationCriteria.quality}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-white-dark">Delivery Score</span>
                                    <div className="flex items-center gap-2">
                                        <div className="text-lg font-bold">{evaluation.evaluationCriteria.delivery}</div>
                                        <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                            <div className="h-full bg-warning" style={{ width: `${evaluation.evaluationCriteria.delivery}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-white-dark">Service Score</span>
                                    <div className="flex items-center gap-2">
                                        <div className="text-lg font-bold">{evaluation.evaluationCriteria.service}</div>
                                        <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                            <div className="h-full bg-info" style={{ width: `${evaluation.evaluationCriteria.service}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredEvaluations.length === 0 && (
                    <div className="panel">
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <IconClipboardText className="mb-4 h-16 w-16 text-white-dark" />
                            <h3 className="mb-2 text-lg font-semibold">No evaluations found</h3>
                            <p className="text-white-dark">No evaluations match the current filter</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Review Modal */}
            {reviewModal && selectedEvaluation && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-75">
                    <div className="w-full max-w-4xl rounded-lg bg-white p-6 dark:bg-[#1b2e4b] max-h-[90vh] overflow-y-auto">
                        <div className="mb-4 flex items-center justify-between">
                            <h4 className="text-lg font-semibold flex items-center gap-2">
                                <IconClipboardText />
                                Department Head Review - {selectedEvaluation.evalNumber}
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
                            {/* Evaluation Summary */}
                            <div className="rounded-lg border border-[#e0e6ed] p-4 dark:border-[#253b5c]">
                                <h6 className="mb-3 font-semibold">Evaluation Summary</h6>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="font-medium text-white-dark">RFQ Number:</span>
                                        <p className="font-semibold">{selectedEvaluation.rfqNumber}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-white-dark">Description:</span>
                                        <p className="font-semibold">{selectedEvaluation.description}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-white-dark">Evaluator:</span>
                                        <p className="font-semibold">{selectedEvaluation.evaluator}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-white-dark">Quotes Evaluated:</span>
                                        <p className="font-semibold">{selectedEvaluation.totalQuotes}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Recommended Supplier */}
                            <div className="rounded-lg border border-success bg-success-light p-4 dark:bg-success-dark-light">
                                <h6 className="mb-3 font-semibold text-success">Supplier Recommendation for Department Head Approval</h6>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <span className="text-sm font-medium text-white-dark">Supplier:</span>
                                        <p className="text-lg font-semibold">{selectedEvaluation.recommendedSupplier}</p>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-white-dark">Amount:</span>
                                        <p className="text-lg font-bold text-success">${selectedEvaluation.recommendedAmount.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-white-dark">Overall Score:</span>
                                        <p className="text-lg font-bold text-success">{selectedEvaluation.evaluationScore}/100</p>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <span className="text-sm font-medium text-white-dark">Justification:</span>
                                    <p className="mt-1">{selectedEvaluation.justification}</p>
                                </div>
                            </div>

                            {/* Supplier Comparison */}
                            <div className="rounded-lg border border-[#e0e6ed] p-4 dark:border-[#253b5c]">
                                <h6 className="mb-3 font-semibold">All Suppliers Comparison</h6>
                                <div className="overflow-x-auto">
                                    <table className="w-full table-auto">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-gray-800">
                                                <th className="p-2 text-left">Rank</th>
                                                <th className="p-2 text-left">Supplier</th>
                                                <th className="p-2 text-right">Amount</th>
                                                <th className="p-2 text-right">Score</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedEvaluation.supplierComparison.map((supplier: any) => (
                                                <tr key={supplier.supplier} className={supplier.rank === 1 ? 'bg-success-light dark:bg-success-dark-light' : ''}>
                                                    <td className="p-2">
                                                        <span className={`flex items-center gap-1 ${supplier.rank === 1 ? 'text-success font-bold' : ''}`}>
                                                            {supplier.rank === 1 && <IconStar className="h-4 w-4" />}
                                                            #{supplier.rank}
                                                        </span>
                                                    </td>
                                                    <td className="p-2 font-medium">{supplier.supplier}</td>
                                                    <td className="p-2 text-right font-semibold">${supplier.amount.toLocaleString()}</td>
                                                    <td className="p-2 text-right font-semibold">{supplier.score}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Risk Assessment */}
                            <div className="rounded-lg border border-[#e0e6ed] p-4 dark:border-[#253b5c]">
                                <h6 className="mb-3 font-semibold">Risk Assessment</h6>
                                <p>{selectedEvaluation.riskAssessment}</p>
                            </div>
                        </div>
                        
                        <div className="mb-6">
                            <label className="mb-2 block text-sm font-medium">Department Head Supplier Approval Justification</label>
                            <textarea
                                value={reviewComments}
                                onChange={(e) => setReviewComments(e.target.value)}
                                className="form-textarea resize-none"
                                rows={4}
                                placeholder="Justify your supplier approval decision. Confirm the recommended supplier meets departmental requirements, budget constraints, and strategic objectives..."
                            />
                        </div>
                        
                        <div className="flex items-center justify-end gap-2 border-t border-[#e0e6ed] pt-4 dark:border-[#253b5c]">
                            <button
                                onClick={() => submitReview('approve')}
                                className="btn btn-success"
                                disabled={!reviewComments.trim()}
                            >
                                <IconThumbUp className="mr-2" />
                                Approve Recommended Supplier
                            </button>
                            <button
                                onClick={() => submitReview('request_revision')}
                                className="btn btn-warning"
                                disabled={!reviewComments.trim()}
                            >
                                <IconClock className="mr-2" />
                                Request Better Justification
                            </button>
                            <button
                                onClick={() => submitReview('reject')}
                                className="btn btn-danger"
                                disabled={!reviewComments.trim()}
                            >
                                <IconX className="mr-2" />
                                Reject Supplier Selection
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
        </div>
    );
};

export default DepartmentHeadEvaluationReview;