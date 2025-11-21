import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';
import IconDownload from '../../../components/Icon/IconDownload';
import IconPrinter from '../../../components/Icon/IconPrinter';
import IconCircleCheck from '../../../components/Icon/IconCircleCheck';
import IconFile from '../../../components/Icon/IconFile';
import IconX from '../../../components/Icon/IconX';
import IconUsers from '../../../components/Icon/IconUsers';
import ProgressBar from '../../../components/ProgressBar';
import { useTranslation } from 'react-i18next';

type EvaluationDetailStatus = 'Pending' | 'In Progress' | 'Completed' | 'Validated';
type ValidationStatus = 'Pending Validation' | 'Validated' | 'Changes Requested';
type ProcurementMethod = 'International Competitive Bidding' | 'National Competitive Bidding' | 'Restricted Bidding' | 'Single Source' | 'Emergency Single Source';
type ContractType = 'Goods' | 'Consulting Services' | 'Non-Consulting Services' | 'Works';
type AwardCriteria = 'Lowest Cost' | 'Most Advantageous Bid';
type EvaluatorAction = 'Recommended' | 'Rejected' | 'Deferred';

interface SectionA {
    comparableEstimate: number; // 1
    fundedBy: string; // 2
    tenderClosingDate: string; // 3
    tenderClosingTime?: string;
    tenderOpeningDate: string; // 4
    tenderOpeningTime?: string;
    actualOpeningDate: string; // 4a
    actualOpeningTime?: string;
    procurementMethod: ProcurementMethod; // 5
    advertisementMethods: string[]; // 6
    contractType: ContractType; // 7
    bidSecurity: 'Yes' | 'No' | 'N/A'; // 8
    tenderPeriodStartDate?: string; // 9
    tenderPeriodEndDate?: string; // 9
    tenderPeriodDays: number; // 9a
    bidValidityDays: number; // 10
    bidValidityExpiration: string; // 10a
    numberOfBidsRequested: number; // 11
    numberOfBidsReceived: number; // 11a
    arithmeticErrorIdentified: boolean; // 12
    retender: boolean; // 13
    retenderReasons?: string[]; // 14 (a-k codes)
    retenderOtherReason?: string; // details when 'k' selected
    awardCriteria: AwardCriteria; // 15
}

interface SectionB {
    eligibility: {
        ppcCategory: string;
        tciTrn: string;
        bidAmountInclusiveGCT: number;
    };
    complianceMatrix: {
        signedLetterOfQuotation: boolean;
        signedPriceSchedules: boolean;
        signedStatementOfCompliance: boolean;
        bidValidity30Days: boolean;
        quotationProvided: boolean;
        bidAmountMatches: boolean;
    };
}

interface TechnicalEvaluation {
    specifications: string;
    quantity: number;
    bidAmount: number;
}

interface SectionC {
    comments: string;
    criticalIssues: string;
    actionTaken: EvaluatorAction;
    rejectionReason?: string;
    recommendedSupplier: string;
    recommendedAmountInclusiveGCT: number;
    evaluatorName: string;
    evaluatorTitle: string;
    evaluatorSignature?: string;
    evaluationDate: string;
}

interface QuoteScore {
    price: number;
    quality: number;
    delivery: number;
    service: number;
}

interface QuoteRow {
    id: number;
    quoteNumber: string;
    supplier: string;
    amount: number;
    scores: QuoteScore;
    totalScore: number;
    rank: number;
    status: string;
    sectionB?: SectionB;
    technicalEval?: TechnicalEvaluation[];
}

interface EvaluationData {
    id: number;
    evalNumber: string;
    rfqNumber: string;
    rfqTitle: string;
    description: string;
    status: EvaluationDetailStatus;
    validationStatus: ValidationStatus;
    background: string;
    reportCompletionDate?: string;
    sectionA: SectionA;
    evaluator: string;
    notes: string;
    quotes: QuoteRow[];
    sectionC: SectionC;
    sectionD?: string;
    sectionE?: string;
    preparedBy?: string;
    percentageDifference?: number;
}

const EvaluationDetail = () => {
    const dispatch = useDispatch();
    const { id } = useParams();
    const { t } = useTranslation();

    // Helper function to get color based on score
    const getScoreColor = (score: number): 'success' | 'warning' | 'danger' => {
        if (score >= 80) return 'success';
        if (score >= 60) return 'warning';
        return 'danger';
    };

    useEffect(() => {
        dispatch(setPageTitle(t('evaluation.detail.pageTitle', 'Evaluation Details')));
    }, [dispatch, t]);

    // Mock data matching BSJ format - in real app, fetch based on id
    const evaluationData: Record<number, EvaluationData> = {
        1: {
            id: 1,
            evalNumber: 'PRO_70_F_14/00',
            rfqNumber: 'OFMB/AUG/2025/015',
            rfqTitle: 'Procurement of Chair',
            description: 'Procurement of ergonomic chair for Chemistry Branch - Mr. Javaughn Anderson',
            status: 'Completed',
            validationStatus: 'Validated',
            background:
                'To arrange for the procurement and provision of a chair for Mr. Javaughn Anderson from the Chemistry Branch. This chair should be ergonomic to ensure comfort during working hours.',
            reportCompletionDate: '2025-10-16',
            sectionA: {
                comparableEstimate: 49680.0,
                fundedBy: 'BSJ',
                tenderClosingDate: '2025-10-07',
                tenderClosingTime: '14:30',
                tenderOpeningDate: '2025-10-07',
                tenderOpeningTime: '14:45',
                actualOpeningDate: '2025-10-07',
                actualOpeningTime: '14:45',
                procurementMethod: 'National Competitive Bidding',
                advertisementMethods: ['Email', 'GOJEP'],
                contractType: 'Goods',
                bidSecurity: 'No',
                tenderPeriodStartDate: '2025-10-06',
                tenderPeriodEndDate: '2025-10-07',
                tenderPeriodDays: 1,
                bidValidityDays: 30,
                bidValidityExpiration: '2025-11-05',
                numberOfBidsRequested: 1,
                numberOfBidsReceived: 1,
                arithmeticErrorIdentified: false,
                retender: false,
                retenderReasons: [],
                awardCriteria: 'Most Advantageous Bid',
            },
            evaluator: 'Kristina Brown',
            notes: 'The technical team has met and concluded that Stationery & Office Supplies is the most advantageous bidder.',
            quotes: [
                {
                    id: 1,
                    quoteNumber: 'BID-001',
                    supplier: 'Stationery & Office Supplies',
                    amount: 49680.0,
                    scores: { price: 100, quality: 95, delivery: 100, service: 90 },
                    totalScore: 96,
                    rank: 1,
                    status: 'Recommended',
                    sectionB: {
                        eligibility: {
                            ppcCategory: 'N/A',
                            tciTrn: '000-002-852',
                            bidAmountInclusiveGCT: 49680.0,
                        },
                        complianceMatrix: {
                            signedLetterOfQuotation: false,
                            signedPriceSchedules: false,
                            signedStatementOfCompliance: false,
                            bidValidity30Days: true,
                            quotationProvided: true,
                            bidAmountMatches: true,
                        },
                    },
                    technicalEval: [
                        {
                            specifications: 'AA-5328K Image 3 Lever H/Duty Task Chair w/Arms - Black',
                            quantity: 1,
                            bidAmount: 49680.0,
                        },
                    ],
                },
            ],
            sectionC: {
                comments:
                    'The technical team has met and concluded that Stationery & Office Supplies for the supply of Stationery Items as they are the most advantageous bidder and they have met the requirements.',
                criticalIssues: '',
                actionTaken: 'Recommended',
                recommendedSupplier: 'Stationery & Office Supplies',
                recommendedAmountInclusiveGCT: 49680.0,
                evaluatorName: 'Kristina Brown',
                evaluatorTitle: 'Procurement Officer',
                evaluationDate: '2025-10-16',
            },
            sectionD:
                'The technical team has met and concluded that Stationery & Office Supplies for the supply of Stationery Items as they are the most advantageous bidder and they have met the requirements.',
            sectionE: 'Based on the foregoing, a recommendation is being made for the award of contract to Stationery & Office Supplies in the amount of $49,680.00.',
            preparedBy: 'Kristina Brown',
            percentageDifference: 0,
        },
    };

    const evaluation = evaluationData[parseInt(id || '1', 10)] || evaluationData[1];
    const readyForDeptHead = evaluation.status === 'Completed' && evaluation.validationStatus === 'Validated';

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
        // In production, this would generate and download the actual PDF report
        alert(`Downloading ${evaluation.evalNumber}_Report.pdf`);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">BSJ EVALUATION REPORT</h2>
                    <p className="text-white-dark">
                        {evaluation.evalNumber} • {evaluation.rfqTitle}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handlePrint} className="btn btn-outline-secondary gap-2">
                        <IconPrinter className="h-4 w-4" />
                        {t('common.print', 'Print')}
                    </button>
                    <button onClick={handleDownloadPDF} className="btn btn-info gap-2">
                        <IconDownload className="h-4 w-4" />
                        {t('evaluation.detail.downloadReport', 'Download Report')}
                    </button>
                    {(evaluation.status === 'Pending' || evaluation.status === 'In Progress') && (
                        <Link to={`/procurement/evaluation/${id}/committee`} className="btn btn-primary gap-2">
                            <IconUsers className="h-4 w-4" />
                            {t('evaluation.detail.committeeReview', 'Committee Review')}
                        </Link>
                    )}
                    <Link to="/procurement/evaluation" className="btn btn-outline-danger gap-2">
                        <IconArrowLeft />
                        {t('evaluation.detail.back', 'Back to List')}
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
                    <div className="mb-2 text-white-dark">Validation</div>
                    <div className={`badge ${evaluation.validationStatus === 'Validated' ? 'bg-primary' : evaluation.validationStatus === 'Changes Requested' ? 'bg-danger' : 'bg-warning'}`}>
                        {evaluation.validationStatus}
                    </div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-white-dark">Bids Received</div>
                    <div className="text-xl font-bold text-primary">{evaluation.sectionA.numberOfBidsReceived}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-white-dark">Report Completion Date</div>
                    <div className="text-lg font-semibold">{evaluation.reportCompletionDate || 'N/A'}</div>
                </div>
            </div>

            {/* Background */}
            <div className="panel mb-6">
                <h5 className="mb-4 text-lg font-semibold">Background</h5>
                <p className="text-white-dark">{evaluation.background}</p>
            </div>

            {/* Section A - Procurement Details */}
            <div className="panel mb-6">
                <h5 className="mb-5 text-lg font-semibold bg-primary/10 -m-5 p-5">SECTION A: PROCUREMENT DETAILS</h5>
                <ol className="mt-5 space-y-3 list-decimal ml-6">
                    <li>
                        <span className="font-semibold">COMPARABLE ESTIMATE:</span> <span className="text-success font-semibold">${evaluation.sectionA.comparableEstimate.toLocaleString()}</span>
                    </li>
                    <li>
                        <span className="font-semibold">FUNDED BY:</span> {evaluation.sectionA.fundedBy}
                    </li>
                    <li>
                        <span className="font-semibold">TENDER CLOSING DATE & TIME:</span> {evaluation.sectionA.tenderClosingDate}{' '}
                        {evaluation.sectionA.tenderClosingTime && `@ ${evaluation.sectionA.tenderClosingTime}`}
                    </li>
                    <li>
                        <span className="font-semibold">TENDER OPENING DATE & TIME:</span> {evaluation.sectionA.tenderOpeningDate}{' '}
                        {evaluation.sectionA.tenderOpeningTime && `@ ${evaluation.sectionA.tenderOpeningTime}`}
                        <div className="ml-6 mt-1">
                            <span className="font-semibold">a. ACTUAL OPENING DATE & TIME:</span> {evaluation.sectionA.actualOpeningDate}{' '}
                            {evaluation.sectionA.actualOpeningTime && `@ ${evaluation.sectionA.actualOpeningTime}`}
                        </div>
                    </li>
                    <li>
                        <span className="font-semibold">Procurement Method:</span> {evaluation.sectionA.procurementMethod}
                    </li>
                    <li>
                        <span className="font-semibold">Method of Advertisement:</span> {evaluation.sectionA.advertisementMethods.join(', ') || 'N/A'}
                    </li>
                    <li>
                        <span className="font-semibold">Contract Type:</span> {evaluation.sectionA.contractType}
                    </li>
                    <li>
                        <span className="font-semibold">Bid Security:</span> {evaluation.sectionA.bidSecurity}
                    </li>
                    <li>
                        <span className="font-semibold">Tender Period:</span> {evaluation.sectionA.tenderPeriodStartDate} to {evaluation.sectionA.tenderPeriodEndDate}
                        <div className="ml-6 mt-1">
                            <span className="font-semibold">a. Number of Days:</span> {evaluation.sectionA.tenderPeriodDays}
                        </div>
                    </li>
                    <li>
                        <span className="font-semibold">Bid Validity Period:</span> {evaluation.sectionA.bidValidityDays} Days
                        <div className="ml-6 mt-1">
                            <span className="font-semibold">a. Bid Validity Expiration Date:</span> {evaluation.sectionA.bidValidityExpiration}
                        </div>
                    </li>
                    <li>
                        <span className="font-semibold">Number of Bids Requested:</span> {evaluation.sectionA.numberOfBidsRequested}
                        <div className="ml-6 mt-1">
                            <span className="font-semibold">a. Number of Bids Received:</span> {evaluation.sectionA.numberOfBidsReceived}
                        </div>
                    </li>
                    <li>
                        <span className="font-semibold">Arithmetic Error Identified:</span>{' '}
                        <span className={`badge ${evaluation.sectionA.arithmeticErrorIdentified ? 'bg-danger' : 'bg-success'}`}>{evaluation.sectionA.arithmeticErrorIdentified ? 'Yes' : 'No'}</span>
                    </li>
                    <li>
                        <span className="font-semibold">Re-tendered:</span>{' '}
                        <span className={`badge ${evaluation.sectionA.retender ? 'bg-warning' : 'bg-success'}`}>{evaluation.sectionA.retender ? 'Yes' : 'No'}</span>
                    </li>
                    <li>
                        <span className="font-semibold">Reason for re-tender:</span> {!evaluation.sectionA.retender && <span className="italic text-white-dark">N/A</span>}
                        {evaluation.sectionA.retender && (
                            <ol className="ml-6 mt-2 list-[lower-alpha] space-y-1 text-sm">
                                {(evaluation.sectionA.retenderReasons || []).map((code) => {
                                    const labels: Record<string, string> = {
                                        a: 'All bids non-responsive',
                                        b: 'Awarded supplier refused to enter into contract',
                                        c: 'Bid price exceeding comparable estimate',
                                        d: 'Cancelled due to procedural irregularity',
                                        e: 'Change in bill of quantities',
                                        f: 'Incorrect specification',
                                        g: 'Material irregularities in tender documents issued by Procuring Entity',
                                        h: 'No bid received',
                                        i: 'Re-scoping of requirements',
                                        j: 'VFM cannot be achieved',
                                        k: 'Other',
                                    };
                                    return (
                                        <li key={code} className="flex">
                                            <span className="mr-2 font-semibold">{code}.</span>
                                            <span>
                                                {labels[code]}
                                                {code === 'k' && evaluation.sectionA.retenderOtherReason && <span className="ml-2 text-white-dark">- {evaluation.sectionA.retenderOtherReason}</span>}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ol>
                        )}
                    </li>
                    <li>
                        <span className="font-semibold">Contract Award Criteria:</span> {evaluation.sectionA.awardCriteria}
                    </li>
                </ol>
            </div>

            {/* Section B - Eligibility & Compliance for Each Quote */}
            {evaluation.quotes.map((quote) => (
                <div key={quote.id} className="panel mb-6">
                    <h5 className="mb-5 text-lg font-semibold bg-info/10 -m-5 p-5">SECTION B: {quote.supplier.toUpperCase()} - ELIGIBILITY & COMPLIANCE</h5>
                    <div className="mt-5">
                        <h6 className="mb-4 font-semibold">Eligibility Requirements</h6>
                        <div className="grid gap-4 md:grid-cols-3 mb-6">
                            <div>
                                <div className="text-sm text-white-dark">PPC Registration Category</div>
                                <div className="font-semibold">{quote.sectionB?.eligibility.ppcCategory || 'N/A'}</div>
                            </div>
                            <div>
                                <div className="text-sm text-white-dark">TCI/TRN</div>
                                <div className="font-semibold">{quote.sectionB?.eligibility.tciTrn || 'N/A'}</div>
                            </div>
                            <div>
                                <div className="text-sm text-white-dark">Bid Amount (Inclusive GCT)</div>
                                <div className="font-semibold text-primary">${quote.sectionB?.eligibility.bidAmountInclusiveGCT.toLocaleString() || quote.amount.toLocaleString()}</div>
                            </div>
                        </div>

                        <h6 className="mb-4 font-semibold">Compliance Matrix (ITB Requirements)</h6>
                        <div className="table-responsive">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Requirement</th>
                                        <th className="text-center">Compliance Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>Signed Letter of Quotation</td>
                                        <td className="text-center">
                                            {quote.sectionB?.complianceMatrix.signedLetterOfQuotation ? (
                                                <IconCircleCheck className="inline text-success h-6 w-6" />
                                            ) : (
                                                <IconX className="inline text-danger h-6 w-6" />
                                            )}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Signed Price Schedules</td>
                                        <td className="text-center">
                                            {quote.sectionB?.complianceMatrix.signedPriceSchedules ? (
                                                <IconCircleCheck className="inline text-success h-6 w-6" />
                                            ) : (
                                                <IconX className="inline text-danger h-6 w-6" />
                                            )}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Signed Statement of Compliance</td>
                                        <td className="text-center">
                                            {quote.sectionB?.complianceMatrix.signedStatementOfCompliance ? (
                                                <IconCircleCheck className="inline text-success h-6 w-6" />
                                            ) : (
                                                <IconX className="inline text-danger h-6 w-6" />
                                            )}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Bid Validity (30 days minimum)</td>
                                        <td className="text-center">
                                            {quote.sectionB?.complianceMatrix.bidValidity30Days ? (
                                                <IconCircleCheck className="inline text-success h-6 w-6" />
                                            ) : (
                                                <IconX className="inline text-danger h-6 w-6" />
                                            )}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Quotation Provided</td>
                                        <td className="text-center">
                                            {quote.sectionB?.complianceMatrix.quotationProvided ? (
                                                <IconCircleCheck className="inline text-success h-6 w-6" />
                                            ) : (
                                                <IconX className="inline text-danger h-6 w-6" />
                                            )}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Bid Amount Matches Documentation</td>
                                        <td className="text-center">
                                            {quote.sectionB?.complianceMatrix.bidAmountMatches ? (
                                                <IconCircleCheck className="inline text-success h-6 w-6" />
                                            ) : (
                                                <IconX className="inline text-danger h-6 w-6" />
                                            )}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Technical Evaluation */}
                        {quote.technicalEval && quote.technicalEval.length > 0 && (
                            <div className="mt-6">
                                <h6 className="mb-4 font-semibold">Technical Evaluation</h6>
                                <div className="table-responsive">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Specifications</th>
                                                <th className="text-center">Quantity</th>
                                                <th className="text-right">Bid Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {quote.technicalEval.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td>{item.specifications}</td>
                                                    <td className="text-center">{item.quantity}</td>
                                                    <td className="text-right font-semibold">${item.bidAmount.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {/* Section C - Evaluator Comments & Recommendation */}
            <div className="panel mb-6">
                <h5 className="mb-5 text-lg font-semibold bg-success/10 -m-5 p-5">SECTION C: EVALUATOR COMMENTS & RECOMMENDATION</h5>
                <div className="mt-5 space-y-5">
                    <div>
                        <h6 className="mb-3 font-semibold">Comments</h6>
                        <p className="text-white-dark whitespace-pre-wrap">{evaluation.sectionC.comments}</p>
                    </div>

                    {evaluation.sectionC.criticalIssues && (
                        <div>
                            <h6 className="mb-3 font-semibold text-danger">Critical Issues</h6>
                            <p className="text-white-dark whitespace-pre-wrap">{evaluation.sectionC.criticalIssues}</p>
                        </div>
                    )}

                    <div className="grid gap-5 md:grid-cols-2">
                        <div>
                            <div className="text-sm text-white-dark mb-2">Action Taken</div>
                            <div
                                className={`badge text-lg ${
                                    evaluation.sectionC.actionTaken === 'Recommended' ? 'bg-success' : evaluation.sectionC.actionTaken === 'Rejected' ? 'bg-danger' : 'bg-warning'
                                }`}
                            >
                                {evaluation.sectionC.actionTaken}
                            </div>
                        </div>
                        {evaluation.sectionC.rejectionReason && (
                            <div>
                                <div className="text-sm text-white-dark mb-2">Rejection Reason</div>
                                <div className="font-semibold text-danger">{evaluation.sectionC.rejectionReason}</div>
                            </div>
                        )}
                    </div>

                    {evaluation.sectionC.actionTaken === 'Recommended' && (
                        <div className="rounded-lg border-2 border-success bg-success-light dark:bg-success-dark-light p-5">
                            <h6 className="mb-4 font-semibold text-success flex items-center gap-2">
                                <IconCircleCheck className="h-6 w-6" />
                                Recommended Contractor
                            </h6>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <div className="text-sm text-white-dark">Supplier Name</div>
                                    <div className="text-xl font-bold">{evaluation.sectionC.recommendedSupplier}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-white-dark">Recommended Amount (Inclusive GCT)</div>
                                    <div className="text-xl font-bold text-success">${evaluation.sectionC.recommendedAmountInclusiveGCT.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="border-t pt-5">
                        <div className="grid gap-5 md:grid-cols-3">
                            <div>
                                <div className="text-sm text-white-dark">Evaluator Name</div>
                                <div className="font-semibold">{evaluation.sectionC.evaluatorName}</div>
                            </div>
                            <div>
                                <div className="text-sm text-white-dark">Title</div>
                                <div className="font-semibold">{evaluation.sectionC.evaluatorTitle}</div>
                            </div>
                            <div>
                                <div className="text-sm text-white-dark">Evaluation Date</div>
                                <div className="font-semibold">{evaluation.sectionC.evaluationDate}</div>
                            </div>
                        </div>
                        {evaluation.sectionC.evaluatorSignature && (
                            <div className="mt-4">
                                <div className="text-sm text-white-dark mb-2">Signature</div>
                                <div className="border-t-2 border-black dark:border-white w-64 pt-2">{evaluation.sectionC.evaluatorSignature}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Section D - Summary */}
            {evaluation.sectionD && (
                <div className="panel mb-6">
                    <h5 className="mb-5 text-lg font-semibold bg-warning/10 -m-5 p-5">SECTION D: SUMMARY</h5>
                    <p className="mt-5 text-white-dark whitespace-pre-wrap">{evaluation.sectionD}</p>
                </div>
            )}

            {/* Section E - Recommendation */}
            {evaluation.sectionE && (
                <div className="panel mb-6">
                    <h5 className="mb-5 text-lg font-semibold bg-danger/10 -m-5 p-5">SECTION E: RECOMMENDATION BY PROCUREMENT OFFICER</h5>
                    <div className="mt-5 space-y-4">
                        <p className="text-white-dark whitespace-pre-wrap">{evaluation.sectionE}</p>
                        {evaluation.percentageDifference !== undefined && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-white-dark">Percentage Difference from Estimate:</span>
                                <span className={`font-bold ${evaluation.percentageDifference > 0 ? 'text-danger' : 'text-success'}`}>{evaluation.percentageDifference}%</span>
                            </div>
                        )}
                        {evaluation.preparedBy && (
                            <div className="border-t pt-4 mt-4">
                                <div className="text-sm text-white-dark">Prepared By</div>
                                <div className="font-semibold">{evaluation.preparedBy}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {readyForDeptHead && (
                <div className="panel border-2 border-primary bg-primary/5">
                    <div className="mb-2 font-semibold text-primary flex items-center gap-2">
                        <IconFile className="h-5 w-5" />
                        {t('evaluation.detail.readyDeptHead', 'Ready for Department Head Review')}
                    </div>
                    <p className="text-sm text-white-dark">
                        {t('evaluation.detail.readyDeptHeadDesc', 'This evaluation has been completed and validated. It can now be queued for Department Head review.')}
                    </p>
                </div>
            )}
        </div>
    );
};

export default EvaluationDetail;
