import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';
import IconDownload from '../../../components/Icon/IconDownload';
import IconPrinter from '../../../components/Icon/IconPrinter';
import IconCircleCheck from '../../../components/Icon/IconCircleCheck';
import IconFile from '../../../components/Icon/IconFile';

const EvaluationDetail = () => {
    const dispatch = useDispatch();
    const { id } = useParams();

    useEffect(() => {
        dispatch(setPageTitle('Evaluation Details'));
    });

    // Mock data - in real app, fetch based on id
    const evaluationData = {
        1: {
            id: 1,
            evalNumber: 'EVAL-2024-001',
            rfqNumber: 'RFQ-2024-045',
            rfqTitle: 'Office Supplies Procurement',
            description: 'Office Supplies Evaluation',
            status: 'In Progress',
            dueDate: '2024-10-28',
            createdDate: '2024-10-20',
            evaluator: 'John Doe',
            notes: 'Focus on quality and delivery time. Price is important but not the only factor.',
            criteria: [
                { id: 1, name: 'Price Competitiveness', weight: 40, description: 'Overall cost and value for money' },
                { id: 2, name: 'Quality & Specifications', weight: 30, description: 'Product quality and meeting requirements' },
                { id: 3, name: 'Delivery Time', weight: 20, description: 'Speed and reliability of delivery' },
                { id: 4, name: 'After-Sales Service', weight: 10, description: 'Support and warranty quality' },
            ],
            quotes: [
                {
                    id: 1,
                    quoteNumber: 'Q-2024-001',
                    supplier: 'ABC Corporation',
                    amount: 12500,
                    scores: { price: 85, quality: 90, delivery: 80, service: 87 },
                    totalScore: 85,
                    rank: 1,
                    status: 'Recommended',
                },
                {
                    id: 2,
                    quoteNumber: 'Q-2024-002',
                    supplier: 'XYZ Suppliers Ltd',
                    amount: 8900,
                    scores: { price: 92, quality: 75, delivery: 70, service: 80 },
                    totalScore: 82,
                    rank: 2,
                    status: 'Under Review',
                },
                {
                    id: 3,
                    quoteNumber: 'Q-2024-003',
                    supplier: 'Tech Solutions Inc',
                    amount: 15200,
                    scores: { price: 75, quality: 95, delivery: 90, service: 85 },
                    totalScore: 84,
                    rank: 3,
                    status: 'Under Review',
                },
                {
                    id: 4,
                    quoteNumber: 'Q-2024-004',
                    supplier: 'Office Pro Supply',
                    amount: 6500,
                    scores: { price: 95, quality: 65, delivery: 60, service: 70 },
                    totalScore: 77,
                    rank: 4,
                    status: 'Not Recommended',
                },
            ],
        },
        2: {
            id: 2,
            evalNumber: 'EVAL-2024-002',
            rfqNumber: 'RFQ-2024-046',
            rfqTitle: 'IT Equipment Upgrade',
            description: 'IT Equipment Comparison',
            status: 'Completed',
            dueDate: '2024-10-26',
            createdDate: '2024-10-18',
            evaluator: 'Jane Smith',
            notes: 'All quotes meet technical requirements. Decision based on price and warranty.',
            criteria: [
                { id: 1, name: 'Price Competitiveness', weight: 35, description: 'Total cost including installation' },
                { id: 2, name: 'Quality & Specifications', weight: 35, description: 'Meeting technical specifications' },
                { id: 3, name: 'Delivery Time', weight: 15, description: 'Installation timeline' },
                { id: 4, name: 'After-Sales Service', weight: 15, description: 'Warranty and support' },
            ],
            quotes: [
                {
                    id: 1,
                    quoteNumber: 'Q-2024-005',
                    supplier: 'Tech Solutions Inc',
                    amount: 15200,
                    scores: { price: 88, quality: 95, delivery: 92, service: 90 },
                    totalScore: 92,
                    rank: 1,
                    status: 'Winner',
                },
                {
                    id: 2,
                    quoteNumber: 'Q-2024-006',
                    supplier: 'IT World',
                    amount: 14800,
                    scores: { price: 90, quality: 85, delivery: 88, service: 85 },
                    totalScore: 87,
                    rank: 2,
                    status: 'Runner-up',
                },
            ],
        },
    };

    const evaluation = evaluationData[parseInt(id || '1') as keyof typeof evaluationData] || evaluationData[1];

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'Completed':
                return 'badge bg-success';
            case 'In Progress':
                return 'badge bg-warning';
            case 'Pending':
                return 'badge bg-info';
            default:
                return 'badge bg-secondary';
        }
    };

    const getQuoteStatusBadge = (status: string) => {
        switch (status) {
            case 'Winner':
            case 'Recommended':
                return 'badge bg-success';
            case 'Runner-up':
            case 'Under Review':
                return 'badge bg-warning';
            case 'Not Recommended':
                return 'badge bg-danger';
            default:
                return 'badge bg-secondary';
        }
    };

    const handleDownloadPDF = () => {
        console.log('Downloading Evaluation Report PDF for:', evaluation.evalNumber);
        alert(`Downloading ${evaluation.evalNumber}_Report.pdf`);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">{evaluation.evalNumber}</h2>
                    <p className="text-white-dark">
                        {evaluation.description} • RFQ: <Link to={`/procurement/rfq/${evaluation.rfqNumber}`} className="text-info hover:underline">{evaluation.rfqNumber}</Link>
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handlePrint} className="btn btn-outline-secondary gap-2">
                        <IconPrinter className="h-4 w-4" />
                        Print
                    </button>
                    <button onClick={handleDownloadPDF} className="btn btn-info gap-2">
                        <IconDownload className="h-4 w-4" />
                        Download Report
                    </button>
                    <Link to="/procurement/evaluation" className="btn btn-outline-danger gap-2">
                        <IconArrowLeft />
                        Back to List
                    </Link>
                </div>
            </div>

            {/* Status and Key Info */}
            <div className="mb-6 grid gap-6 lg:grid-cols-4">
                <div className="panel">
                    <div className="mb-2 text-white-dark">Status</div>
                    <div className={getStatusBadgeClass(evaluation.status)}>{evaluation.status}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-white-dark">Total Quotes</div>
                    <div className="text-xl font-bold text-primary">{evaluation.quotes.length}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-white-dark">Evaluator</div>
                    <div className="text-lg font-semibold">{evaluation.evaluator}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-white-dark">Due Date</div>
                    <div className="text-lg font-semibold text-danger">{evaluation.dueDate}</div>
                </div>
            </div>

            {/* Basic Information */}
            <div className="panel mb-6">
                <h5 className="mb-5 text-lg font-semibold">Evaluation Information</h5>
                <div className="grid gap-5 md:grid-cols-2">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="font-semibold text-white-dark">Evaluation #:</div>
                        <div className="col-span-2">{evaluation.evalNumber}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="font-semibold text-white-dark">RFQ Reference:</div>
                        <div className="col-span-2">
                            <Link to={`/procurement/rfq/${evaluation.rfqNumber}`} className="text-info hover:underline">{evaluation.rfqNumber}</Link>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="font-semibold text-white-dark">Created Date:</div>
                        <div className="col-span-2">{evaluation.createdDate}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="font-semibold text-white-dark">Due Date:</div>
                        <div className="col-span-2 font-semibold text-danger">{evaluation.dueDate}</div>
                    </div>
                    {evaluation.notes && (
                        <div className="md:col-span-2">
                            <div className="font-semibold text-white-dark">Notes:</div>
                            <div className="mt-2 text-white-dark">{evaluation.notes}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Evaluation Criteria */}
            <div className="panel mb-6">
                <h5 className="mb-5 text-lg font-semibold">Evaluation Criteria & Weightage</h5>
                <div className="space-y-4">
                    {evaluation.criteria.map((criterion) => (
                        <div key={criterion.id} className="rounded border border-white-light p-4 dark:border-dark">
                            <div className="mb-3 flex items-start justify-between">
                                <div>
                                    <div className="font-semibold">{criterion.name}</div>
                                    <div className="text-sm text-white-dark">{criterion.description}</div>
                                </div>
                                <span className="badge bg-primary">{criterion.weight}%</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                    <div className="h-full bg-primary" style={{ width: `${criterion.weight}%` }}></div>
                                </div>
                                <span className="text-sm font-semibold">{criterion.weight}%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quotes Comparison */}
            <div className="panel mb-6">
                <h5 className="mb-5 text-lg font-semibold">Quotes Comparison & Scoring</h5>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Quote #</th>
                                <th>Supplier</th>
                                <th>Amount</th>
                                {evaluation.criteria.map((c) => (
                                    <th key={c.id}>{c.name}</th>
                                ))}
                                <th>Total Score</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {evaluation.quotes.map((quote) => (
                                <tr key={quote.id}>
                                    <td>
                                        <span className={`font-bold ${quote.rank === 1 ? 'text-success text-xl' : ''}`}>#{quote.rank}</span>
                                    </td>
                                    <td>
                                        <Link to={`/procurement/quotes/${quote.id}`} className="font-semibold text-primary hover:underline">
                                            {quote.quoteNumber}
                                        </Link>
                                    </td>
                                    <td className="font-semibold">{quote.supplier}</td>
                                    <td className="font-semibold">${quote.amount.toLocaleString()}</td>
                                    <td className="text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <span className="font-semibold">{quote.scores.price}</span>
                                            <div className="h-1 w-8 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                                <div
                                                    className={`h-full ${quote.scores.price >= 80 ? 'bg-success' : quote.scores.price >= 60 ? 'bg-warning' : 'bg-danger'}`}
                                                    style={{ width: `${quote.scores.price}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <span className="font-semibold">{quote.scores.quality}</span>
                                            <div className="h-1 w-8 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                                <div
                                                    className={`h-full ${quote.scores.quality >= 80 ? 'bg-success' : quote.scores.quality >= 60 ? 'bg-warning' : 'bg-danger'}`}
                                                    style={{ width: `${quote.scores.quality}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <span className="font-semibold">{quote.scores.delivery}</span>
                                            <div className="h-1 w-8 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                                <div
                                                    className={`h-full ${quote.scores.delivery >= 80 ? 'bg-success' : quote.scores.delivery >= 60 ? 'bg-warning' : 'bg-danger'}`}
                                                    style={{ width: `${quote.scores.delivery}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <span className="font-semibold">{quote.scores.service}</span>
                                            <div className="h-1 w-8 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                                <div
                                                    className={`h-full ${quote.scores.service >= 80 ? 'bg-success' : quote.scores.service >= 60 ? 'bg-warning' : 'bg-danger'}`}
                                                    style={{ width: `${quote.scores.service}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="text-center">
                                        <span className={`text-xl font-bold ${quote.rank === 1 ? 'text-success' : ''}`}>{quote.totalScore}</span>
                                    </td>
                                    <td>
                                        <span className={getQuoteStatusBadge(quote.status)}>{quote.status}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recommendation */}
            {evaluation.quotes.length > 0 && evaluation.quotes[0] && (
                <div className="panel rounded-lg border-2 border-success bg-success-light dark:bg-success-dark-light">
                    <div className="mb-3 flex items-center gap-2">
                        <IconCircleCheck className="h-6 w-6 text-success" />
                        <h5 className="text-lg font-semibold text-success">
                            {evaluation.status === 'Completed' ? 'Winner' : 'Recommended Quote'}
                        </h5>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-4">
                        <div>
                            <div className="text-sm text-white-dark">Quote Number</div>
                            <div className="font-bold">{evaluation.quotes[0].quoteNumber}</div>
                        </div>
                        <div>
                            <div className="text-sm text-white-dark">Supplier</div>
                            <div className="font-bold">{evaluation.quotes[0].supplier}</div>
                        </div>
                        <div>
                            <div className="text-sm text-white-dark">Total Amount</div>
                            <div className="font-bold text-primary">${evaluation.quotes[0].amount.toLocaleString()}</div>
                        </div>
                        <div>
                            <div className="text-sm text-white-dark">Overall Score</div>
                            <div className="text-2xl font-bold text-success">{evaluation.quotes[0].totalScore}/100</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EvaluationDetail;
