import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconClipboardText from '../../../components/Icon/IconClipboardText';
import IconPlus from '../../../components/Icon/IconPlus';
import IconEye from '../../../components/Icon/IconEye';
import IconDownload from '../../../components/Icon/IconDownload';
import IconPrinter from '../../../components/Icon/IconPrinter';
import IconFile from '../../../components/Icon/IconFile';
import IconCircleCheck from '../../../components/Icon/IconCircleCheck';

const EvaluationList = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Quote Evaluations'));
    });

    const [showReportModal, setShowReportModal] = useState(false);
    const [selectedEvaluation, setSelectedEvaluation] = useState<any>(null);

    const [evaluations] = useState([
        {
            id: 1,
            evalNumber: 'EVAL-2024-001',
            rfqNumber: 'RFQ-2024-045',
            description: 'Office Supplies Evaluation',
            quotesCount: 5,
            status: 'In Progress',
            dueDate: '2024-10-28',
            evaluator: 'John Doe',
            criteria: {
                price: 40,
                quality: 30,
                delivery: 20,
                service: 10,
            },
            topQuote: { supplier: 'ABC Corp', score: 85, amount: 12500 },
        },
        {
            id: 2,
            evalNumber: 'EVAL-2024-002',
            rfqNumber: 'RFQ-2024-046',
            description: 'IT Equipment Comparison',
            quotesCount: 3,
            status: 'Completed',
            dueDate: '2024-10-26',
            evaluator: 'Jane Smith',
            criteria: {
                price: 35,
                quality: 35,
                delivery: 15,
                service: 15,
            },
            topQuote: { supplier: 'Tech Solutions', score: 92, amount: 15200 },
        },
        {
            id: 3,
            evalNumber: 'EVAL-2024-003',
            rfqNumber: 'RFQ-2024-047',
            description: 'Furniture Bid Analysis',
            quotesCount: 4,
            status: 'Pending',
            dueDate: '2024-10-30',
            evaluator: 'Mike Johnson',
            criteria: {
                price: 45,
                quality: 25,
                delivery: 20,
                service: 10,
            },
            topQuote: null,
        },
        {
            id: 4,
            evalNumber: 'EVAL-2024-004',
            rfqNumber: 'RFQ-2024-048',
            description: 'Cleaning Services Review',
            quotesCount: 6,
            status: 'In Progress',
            dueDate: '2024-10-29',
            evaluator: 'Sarah Williams',
            criteria: {
                price: 30,
                quality: 40,
                delivery: 10,
                service: 20,
            },
            topQuote: { supplier: 'XYZ Suppliers', score: 78, amount: 8900 },
        },
    ]);

    const handleGenerateReport = (evaluation: any) => {
        setSelectedEvaluation(evaluation);
        setShowReportModal(true);
    };

    const downloadReport = (format: string) => {
        console.log(`Downloading ${format} report for ${selectedEvaluation?.evalNumber}`);
        // Implement download logic
        setShowReportModal(false);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Completed':
                return 'bg-success';
            case 'In Progress':
                return 'bg-warning';
            case 'Pending':
                return 'bg-info';
            default:
                return 'bg-secondary';
        }
    };

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Quote Evaluations</h2>
                    <p className="text-white-dark">Evaluate quotes and generate comparison reports automatically</p>
                </div>
                <Link to="/procurement/evaluation/new" className="btn btn-primary gap-2">
                    <IconPlus />
                    New Evaluation
                </Link>
            </div>

            {/* Stats */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Total Evaluations</div>
                        <IconClipboardText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl font-bold text-primary">32</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">In Progress</div>
                        <IconClipboardText className="h-6 w-6 text-warning" />
                    </div>
                    <div className="text-3xl font-bold text-warning">5</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Completed</div>
                        <IconClipboardText className="h-6 w-6 text-success" />
                    </div>
                    <div className="text-3xl font-bold text-success">22</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Pending</div>
                        <IconClipboardText className="h-6 w-6 text-info" />
                    </div>
                    <div className="text-3xl font-bold text-info">5</div>
                </div>
            </div>

            {/* Evaluations Table */}
            <div className="panel">
                <div className="mb-5 flex items-center justify-between">
                    <h5 className="text-lg font-semibold">All Evaluations</h5>
                    <input type="text" placeholder="Search evaluations..." className="form-input w-auto" />
                </div>
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>Evaluation #</th>
                                <th>RFQ #</th>
                                <th>Description</th>
                                <th>Quotes</th>
                                <th>Evaluator</th>
                                <th>Due Date</th>
                                <th>Status</th>
                                <th>Top Quote</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {evaluations.map((evaluation) => (
                                <tr key={evaluation.id}>
                                    <td>
                                        <Link to={`/procurement/evaluation/${evaluation.id}`} className="font-semibold text-primary hover:underline">
                                            {evaluation.evalNumber}
                                        </Link>
                                    </td>
                                    <td>
                                        <Link to={`/procurement/rfq/${evaluation.rfqNumber}`} className="text-info hover:underline">
                                            {evaluation.rfqNumber}
                                        </Link>
                                    </td>
                                    <td>{evaluation.description}</td>
                                    <td>
                                        <span className="badge bg-secondary">{evaluation.quotesCount} quotes</span>
                                    </td>
                                    <td>{evaluation.evaluator}</td>
                                    <td>{evaluation.dueDate}</td>
                                    <td>
                                        <span className={`badge ${getStatusBadge(evaluation.status)}`}>{evaluation.status}</span>
                                    </td>
                                    <td>
                                        {evaluation.topQuote ? (
                                            <div>
                                                <div className="font-semibold">{evaluation.topQuote.supplier}</div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="text-primary">${evaluation.topQuote.amount.toLocaleString()}</span>
                                                    <span className="text-success">★ {evaluation.topQuote.score}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-white-dark">-</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <Link to={`/procurement/evaluation/${evaluation.id}`} className="btn btn-sm btn-outline-primary" title="View Details">
                                                <IconEye className="h-4 w-4" />
                                            </Link>
                                            {evaluation.status !== 'Pending' && (
                                                <button onClick={() => handleGenerateReport(evaluation)} className="btn btn-sm btn-success" title="Generate Report">
                                                    <IconFile className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Generate Report Modal */}
            {showReportModal && selectedEvaluation && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60">
                    <div className="panel w-full max-w-4xl overflow-hidden rounded-lg">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-xl font-semibold">Generate Evaluation Report</h5>
                            <button onClick={() => setShowReportModal(false)} className="text-white-dark hover:text-dark">
                                ×
                            </button>
                        </div>

                        <div className="mb-5">
                            <div className="mb-4 rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
                                <h6 className="mb-2 text-lg font-semibold">{selectedEvaluation.evalNumber} - {selectedEvaluation.description}</h6>
                                <div className="grid gap-3 sm:grid-cols-3">
                                    <div>
                                        <span className="text-sm text-white-dark">RFQ Number</span>
                                        <div className="font-semibold">{selectedEvaluation.rfqNumber}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-white-dark">Total Quotes</span>
                                        <div className="font-semibold">{selectedEvaluation.quotesCount}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-white-dark">Evaluator</span>
                                        <div className="font-semibold">{selectedEvaluation.evaluator}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-4">
                                <h6 className="mb-3 font-semibold">Evaluation Criteria (Weightage)</h6>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span>Price</span>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-48 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                                <div className="h-full bg-primary" style={{ width: `${selectedEvaluation.criteria.price}%` }}></div>
                                            </div>
                                            <span className="font-semibold">{selectedEvaluation.criteria.price}%</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Quality</span>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-48 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                                <div className="h-full bg-success" style={{ width: `${selectedEvaluation.criteria.quality}%` }}></div>
                                            </div>
                                            <span className="font-semibold">{selectedEvaluation.criteria.quality}%</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>Delivery Time</span>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-48 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                                <div className="h-full bg-warning" style={{ width: `${selectedEvaluation.criteria.delivery}%` }}></div>
                                            </div>
                                            <span className="font-semibold">{selectedEvaluation.criteria.delivery}%</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span>After-Sales Service</span>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-48 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                                <div className="h-full bg-info" style={{ width: `${selectedEvaluation.criteria.service}%` }}></div>
                                            </div>
                                            <span className="font-semibold">{selectedEvaluation.criteria.service}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {selectedEvaluation.topQuote && (
                                <div className="rounded-lg border border-success bg-success-light p-4">
                                    <div className="mb-2 flex items-center gap-2 text-success">
                                        <IconCircleCheck className="h-5 w-5" />
                                        <span className="font-semibold">Recommended Winner</span>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-3">
                                        <div>
                                            <span className="text-sm text-white-dark">Supplier</span>
                                            <div className="font-bold">{selectedEvaluation.topQuote.supplier}</div>
                                        </div>
                                        <div>
                                            <span className="text-sm text-white-dark">Total Amount</span>
                                            <div className="font-bold text-primary">${selectedEvaluation.topQuote.amount.toLocaleString()}</div>
                                        </div>
                                        <div>
                                            <span className="text-sm text-white-dark">Overall Score</span>
                                            <div className="font-bold text-success">{selectedEvaluation.topQuote.score}/100</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-4">
                                <label className="mb-2 block font-semibold">Report Format</label>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-4 text-center hover:border-primary dark:border-gray-700">
                                        <IconFile className="mx-auto mb-2 h-10 w-10 text-danger" />
                                        <div className="font-semibold">PDF Report</div>
                                        <div className="text-xs text-white-dark">Detailed evaluation with charts</div>
                                    </div>
                                    <div className="cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-4 text-center hover:border-primary dark:border-gray-700">
                                        <IconFile className="mx-auto mb-2 h-10 w-10 text-success" />
                                        <div className="font-semibold">Excel Report</div>
                                        <div className="text-xs text-white-dark">Comparison matrix and scores</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3">
                            <button onClick={() => setShowReportModal(false)} className="btn btn-outline-danger">
                                Cancel
                            </button>
                            <button onClick={() => downloadReport('excel')} className="btn btn-success gap-2">
                                <IconDownload />
                                Download Excel
                            </button>
                            <button onClick={() => downloadReport('pdf')} className="btn btn-danger gap-2">
                                <IconDownload />
                                Download PDF
                            </button>
                            <button className="btn btn-info gap-2">
                                <IconPrinter />
                                Print Report
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EvaluationList;
