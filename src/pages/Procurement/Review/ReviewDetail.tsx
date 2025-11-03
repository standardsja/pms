import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';
import IconDownload from '../../../components/Icon/IconDownload';
import IconPrinter from '../../../components/Icon/IconPrinter';
import IconCircleCheck from '../../../components/Icon/IconCircleCheck';

const ReviewDetail = () => {
    const dispatch = useDispatch();
    const { id } = useParams();

    useEffect(() => {
        dispatch(setPageTitle('Review Details'));
    });

    // Mock data for demonstration; in a real app, fetch by id
    const reviewData = {
        1: {
            id: 1,
            reviewNumber: 'REV-2024-001',
            evalId: 2,
            evalNumber: 'EVAL-2024-002',
            rfqNumber: 'RFQ-2024-046',
            rfqTitle: 'IT Equipment Upgrade',
            description: 'IT Equipment Final Review',
            recommendedSupplier: 'Tech Solutions Inc',
            amount: 15200,
            reviewer: 'John Doe',
            reviewDate: '2024-10-24',
            status: 'Pending Approval',
            notes: 'Recommendation based on highest overall score and warranty coverage.',
            keyPoints: [
                'Top score in Quality & Specifications',
                'Competitive pricing within budget',
                'Strong after-sales service and 3-year warranty',
            ],
        },
        2: {
            id: 2,
            reviewNumber: 'REV-2024-002',
            evalId: 1,
            evalNumber: 'EVAL-2024-001',
            rfqNumber: 'RFQ-2024-045',
            rfqTitle: 'Office Supplies Procurement',
            description: 'Office Supplies Review',
            recommendedSupplier: 'ABC Corporation',
            amount: 12500,
            reviewer: 'Jane Smith',
            reviewDate: '2024-10-23',
            status: 'Approved',
            notes: 'All criteria satisfied. Price and delivery time were decisive.',
            keyPoints: [
                'Fastest delivery timeline',
                'Meets all technical specifications',
                'Lowest total cost of ownership',
            ],
        },
        3: {
            id: 3,
            reviewNumber: 'REV-2024-003',
            evalId: 3,
            evalNumber: 'EVAL-2024-003',
            rfqNumber: 'RFQ-2024-047',
            rfqTitle: 'Furniture Procurement',
            description: 'Furniture Procurement Review',
            recommendedSupplier: 'Office Pro Supply',
            amount: 22100,
            reviewer: 'Mike Johnson',
            reviewDate: '2024-10-22',
            status: 'In Review',
            notes: 'Awaiting final approval from finance department.',
            keyPoints: [
                'High quality materials with extended warranty',
                'Moderate price, best value score',
                'Delivery in phased schedule',
            ],
        },
        4: {
            id: 4,
            reviewNumber: 'REV-2024-004',
            evalId: 4,
            evalNumber: 'EVAL-2024-004',
            rfqNumber: 'RFQ-2024-048',
            rfqTitle: 'Cleaning Services Contract',
            description: 'Cleaning Services Contract Review',
            recommendedSupplier: 'Clean Corp Ltd',
            amount: 8900,
            reviewer: 'Sarah Williams',
            reviewDate: '2024-10-21',
            status: 'Rejected',
            notes: 'Recommendation rejected due to budget constraints and contract terms.',
            keyPoints: [
                'Strong service quality but higher recurring cost',
                'Contract termination clause unfavorable',
                'Negotiation recommended before resubmission',
            ],
        },
    } as const;

    const review = reviewData[parseInt(id || '1') as keyof typeof reviewData] || reviewData[1];

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'Approved':
                return 'badge bg-success';
            case 'Rejected':
                return 'badge bg-danger';
            case 'In Review':
                return 'badge bg-warning';
            case 'Pending Approval':
                return 'badge bg-info';
            default:
                return 'badge bg-secondary';
        }
    };

    const handleDownloadPDF = () => {
        console.log('Downloading Review Report PDF for:', review.reviewNumber);
        alert(`Downloading ${review.reviewNumber}_Report.pdf`);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">{review.reviewNumber}</h2>
                    <p className="text-white-dark">
                        {review.description} • Evaluation:{' '}
                        <Link to={`/procurement/evaluation/${review.evalId}`} className="text-info hover:underline">
                            {review.evalNumber}
                        </Link>{' '}
                        • RFQ:{' '}
                        <Link to={`/procurement/rfq/${review.rfqNumber}`} className="text-info hover:underline">
                            {review.rfqNumber}
                        </Link>
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
                    <Link to="/procurement/review" className="btn btn-outline-danger gap-2">
                        <IconArrowLeft />
                        Back to List
                    </Link>
                </div>
            </div>

            {/* Status and Key Info */}
            <div className="mb-6 grid gap-6 lg:grid-cols-4">
                <div className="panel">
                    <div className="mb-2 text-white-dark">Status</div>
                    <div className={getStatusBadgeClass(review.status)}>{review.status}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-white-dark">Recommended Supplier</div>
                    <div className="text-lg font-semibold">{review.recommendedSupplier}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-white-dark">Total Amount</div>
                    <div className="text-xl font-bold text-primary">${review.amount.toLocaleString()}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-white-dark">Reviewer / Date</div>
                    <div className="text-lg font-semibold">{review.reviewer}</div>
                    <div className="text-white-dark">{review.reviewDate}</div>
                </div>
            </div>

            {/* Review Information */}
            <div className="panel mb-6">
                <h5 className="mb-5 text-lg font-semibold">Review Information</h5>
                <div className="grid gap-5 md:grid-cols-2">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="font-semibold text-white-dark">Review #:</div>
                        <div className="col-span-2">{review.reviewNumber}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="font-semibold text-white-dark">Evaluation Reference:</div>
                        <div className="col-span-2">
                            <Link to={`/procurement/evaluation/${review.evalId}`} className="text-info hover:underline">
                                {review.evalNumber}
                            </Link>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="font-semibold text-white-dark">RFQ Reference:</div>
                        <div className="col-span-2">
                            <Link to={`/procurement/rfq/${review.rfqNumber}`} className="text-info hover:underline">
                                {review.rfqNumber}
                            </Link>
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <div className="font-semibold text-white-dark">Notes:</div>
                        <div className="mt-2 text-white-dark">{review.notes}</div>
                    </div>
                </div>
            </div>

            {/* Recommendation Summary */}
            <div className="panel mb-6 rounded-lg border-2 border-success bg-success-light dark:bg-success-dark-light">
                <div className="mb-3 flex items-center gap-2">
                    <IconCircleCheck className="h-6 w-6 text-success" />
                    <h5 className="text-lg font-semibold text-success">Recommendation Summary</h5>
                </div>
                <div className="grid gap-4 sm:grid-cols-4">
                    <div>
                        <div className="text-sm text-white-dark">Supplier</div>
                        <div className="font-bold">{review.recommendedSupplier}</div>
                    </div>
                    <div>
                        <div className="text-sm text-white-dark">Total Amount</div>
                        <div className="font-bold text-primary">${review.amount.toLocaleString()}</div>
                    </div>
                    <div>
                        <div className="text-sm text-white-dark">Evaluation Ref</div>
                        <div className="font-bold">
                            <Link to={`/procurement/evaluation/${review.evalId}`} className="text-info hover:underline">
                                {review.evalNumber}
                            </Link>
                        </div>
                    </div>
                    <div>
                        <div className="text-sm text-white-dark">RFQ Ref</div>
                        <div className="font-bold">
                            <Link to={`/procurement/rfq/${review.rfqNumber}`} className="text-info hover:underline">
                                {review.rfqNumber}
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="mt-4">
                    <div className="text-sm text-white-dark">Key Points</div>
                    <ul className="mt-2 list-inside list-disc text-white-dark">
                        {review.keyPoints.map((kp, idx) => (
                            <li key={idx}>{kp}</li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ReviewDetail;
