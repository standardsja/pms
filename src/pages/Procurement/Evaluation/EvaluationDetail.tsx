import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';
import IconChecks from '../../../components/Icon/IconChecks';
import IconEdit from '../../../components/Icon/IconEdit';
import { getUser } from '../../../utils/auth';
import { evaluationService, type Evaluation, type SectionVerificationStatus } from '../../../services/evaluationService';

const EvaluationDetail = () => {
    const dispatch = useDispatch();
    const authLoading = useSelector((state: any) => state.auth.isLoading);
    const authUser = useSelector((state: any) => state.auth.user);
    const navigate = useNavigate();
    const { id } = useParams();

    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isProcurement, setIsProcurement] = useState(false);
    const [isCommittee, setIsCommittee] = useState(false);

    useEffect(() => {
        dispatch(setPageTitle('Evaluation Details'));
    }, [dispatch]);

    useEffect(() => {
        const u = getUser();
        if (u) {
            const roles = (u?.roles || (u?.role ? [u.role] : [])).map((r) => r.toUpperCase());
            setIsProcurement(roles.some((role) => role.includes('PROCUREMENT_OFFICER') || role.includes('PROCUREMENT_MANAGER') || role.includes('PROCUREMENT')));
            setIsCommittee(roles.some((role) => role.includes('COMMITTEE') || role.includes('EVALUATION_COMMITTEE')));
        }
    }, []);

    useEffect(() => {
        if (!id || isNaN(parseInt(id))) {
            setError('Invalid evaluation ID');
            setLoading(false);
            return;
        }
        loadEvaluation();
    }, [id]);

    if (authLoading || !authUser) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const loadEvaluation = async () => {
        if (!id) return;
        try {
            setLoading(true);
            setError(null);
            const data = await evaluationService.getEvaluationById(parseInt(id));
            setEvaluation(data);
        } catch (err: any) {
            console.error('Failed to load evaluation:', err);
            setError(err.message || 'Failed to load evaluation');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: SectionVerificationStatus) => {
        switch (status) {
            case 'VERIFIED':
                return 'badge bg-success';
            case 'SUBMITTED':
                return 'badge bg-info';
            case 'IN_PROGRESS':
                return 'badge bg-warning';
            case 'RETURNED':
                return 'badge bg-danger';
            default:
                return 'badge bg-secondary';
        }
    };

    const getStatusText = (status: SectionVerificationStatus) => {
        switch (status) {
            case 'VERIFIED':
                return 'Verified';
            case 'SUBMITTED':
                return 'Awaiting Review';
            case 'IN_PROGRESS':
                return 'In Progress';
            case 'RETURNED':
                return 'Returned';
            default:
                return 'Not Started';
        }
    };

    // Reusable Field Components
    const FieldGroup = ({ title, color = 'primary', children }: { title: string; color?: string; children: React.ReactNode }) => (
        <div className={`panel border-l-4 border-${color}`}>
            <div className="mb-5">
                <h5 className={`text-lg font-bold text-${color}`}>{title}</h5>
            </div>
            <div className="grid gap-5 md:grid-cols-2">{children}</div>
        </div>
    );

    const Field = ({ label, value, fullWidth = false }: { label: string; value: any; fullWidth?: boolean }) => (
        <div className={fullWidth ? 'md:col-span-2' : ''}>
            <label className="mb-2 block text-sm font-semibold text-white-dark">{label}</label>
            <div className="rounded border border-white-light dark:border-dark bg-white-light dark:bg-[#1b2e4b] px-4 py-3 text-sm">{value ?? '-'}</div>
        </div>
    );

    const TextAreaField = ({ label, value, fullWidth = true }: { label: string; value: any; fullWidth?: boolean }) => (
        <div className={fullWidth ? 'md:col-span-2' : ''}>
            <label className="mb-2 block text-sm font-semibold text-white-dark">{label}</label>
            <div className="rounded border border-white-light dark:border-dark bg-white-light dark:bg-[#1b2e4b] px-4 py-3 text-sm min-h-[100px]">{value ?? '-'}</div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading evaluation...</div>
            </div>
        );
    }

    if (error || !evaluation) {
        return (
            <div className="panel">
                <div className="text-center py-8">
                    <div className="text-danger mb-4">⚠️ {error || 'Evaluation not found'}</div>
                    <Link to="/procurement/evaluation" className="btn btn-primary">
                        Back to Evaluations
                    </Link>
                </div>
            </div>
        );
    }

    const sectionA = evaluation.sectionA;
    const sectionB = evaluation.sectionB;
    const sectionC = evaluation.sectionC;
    const sectionD = evaluation.sectionD;
    const sectionE = evaluation.sectionE;

    return (
        <div>
            {/* Header */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">{evaluation.evalNumber}</h2>
                    <p className="text-white-dark">Bureau of Standards Jamaica - Official Evaluation Report Form (PRO_70_F_14/00)</p>
                </div>
                <div className="flex gap-3">
                    <Link to="/procurement/evaluation" className="btn btn-outline-danger gap-2">
                        <IconArrowLeft />
                        Back to List
                    </Link>
                    {isProcurement && evaluation.status === 'IN_PROGRESS' && (
                        <Link to={`/procurement/evaluation/${evaluation.id}/edit`} className="btn btn-warning gap-2">
                            <IconEdit />
                            Edit
                        </Link>
                    )}
                    {isCommittee && (
                        <Link to={`/evaluation/${evaluation.id}/committee`} className="btn btn-info">
                            Committee Review
                        </Link>
                    )}
                </div>
            </div>

            {/* Status Badge */}
            <div className="panel mb-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className={`badge text-base px-4 py-2 ${evaluation.status === 'COMPLETED' ? 'bg-success' : evaluation.status === 'IN_PROGRESS' ? 'bg-warning' : 'bg-info'}`}>
                            {evaluation.status === 'COMPLETED' ? '✓ Completed' : evaluation.status}
                        </span>
                    </div>
                    <div className="flex gap-4">
                        <div>
                            <p className="text-sm text-white-dark">Created By</p>
                            <p className="font-semibold">{evaluation.creator.name || evaluation.creator.email}</p>
                        </div>
                        {evaluation.evaluator && (
                            <div>
                                <p className="text-sm text-white-dark">Evaluator</p>
                                <p className="font-semibold">{evaluation.evaluator}</p>
                            </div>
                        )}
                        {evaluation.dueDate && (
                            <div>
                                <p className="text-sm text-white-dark">Due Date</p>
                                <p className="font-semibold">{new Date(evaluation.dueDate).toLocaleDateString()}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Section Verification Status */}
            <div className="panel mb-5">
                <h5 className="text-lg font-semibold mb-4">Section Verification Status</h5>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {(['A', 'B', 'C', 'D', 'E'] as const).map((section) => {
                        const status = evaluation[`section${section}Status` as keyof Evaluation] as SectionVerificationStatus;
                        const verifier = evaluation[`section${section}Verifier` as keyof Evaluation] as { name: string | null } | undefined;
                        const verifiedAt = evaluation[`section${section}VerifiedAt` as keyof Evaluation] as string | undefined;

                        return (
                            <div key={section} className="border rounded-lg p-4 text-center">
                                <div className="text-lg font-bold mb-2">Section {section}</div>
                                <span
                                    className={`badge ${
                                        status === 'NOT_STARTED'
                                            ? 'bg-secondary'
                                            : status === 'VERIFIED'
                                            ? 'bg-success'
                                            : status === 'SUBMITTED'
                                            ? 'bg-info'
                                            : status === 'IN_PROGRESS'
                                            ? 'bg-warning'
                                            : 'bg-danger'
                                    }`}
                                >
                                    {getStatusText(status)}
                                </span>
                                {status === 'VERIFIED' && verifier && (
                                    <div className="mt-2 text-xs text-white-dark">
                                        <IconChecks className="inline h-3 w-3 text-success mr-1" />
                                        {verifier.name}
                                        {verifiedAt && <div>{new Date(verifiedAt).toLocaleDateString()}</div>}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="space-y-6">
                {/* BACKGROUND Section */}
                <div className="panel">
                    <div className="space-y-5">
                        <div>
                            <label className="mb-2 block font-semibold text-lg">BACKGROUND:</label>
                            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">{evaluation.description || '-'}</div>
                        </div>
                        <div className="grid gap-5 md:grid-cols-2">
                            <Field label="DATE SUBMISSION WAS CONSIDERED" value={evaluation.dateSubmissionConsidered || '-'} />
                            <Field label="REPORT COMPLETION DATE" value={evaluation.reportCompletionDate || '-'} />
                        </div>
                    </div>
                </div>

                {/* Section A - Procurement Details */}
                {sectionA && (
                    <div className="panel">
                        <div className="mb-5 -m-5 p-5 bg-primary/10 border-l-4 border-primary">
                            <h5 className="text-lg font-bold text-primary">Section A</h5>
                            <p className="text-sm mt-1">Procurement Details</p>
                        </div>

                        <div className="space-y-4 p-5">
                            <div className="grid gap-5 md:grid-cols-2">
                                <Field label="1. COMPARABLE ESTIMATE" value={`$${sectionA.comparableEstimate?.toLocaleString()}`} />
                                <Field label="2. FUNDED BY" value={sectionA.fundedBy} />
                            </div>

                            <div className="grid gap-5 md:grid-cols-2">
                                <Field label="3. TENDER CLOSING DATE & TIME" value={`${sectionA.tenderClosingDate} ${sectionA.tenderClosingTime || ''}`} />
                                <Field label="4. TENDER OPENING DATE & TIME" value={`${sectionA.tenderOpeningDate} ${sectionA.tenderOpeningTime || ''}`} />
                            </div>

                            {sectionA.actualOpeningDate && (
                                <div className="ml-8">
                                    <Field label="4a. ACTUAL OPENING DATE & TIME" value={`${sectionA.actualOpeningDate} ${sectionA.actualOpeningTime || ''}`} />
                                </div>
                            )}

                            <Field label="5. Procurement Method" value={sectionA.procurementMethod?.replace(/_/g, ' ')} fullWidth />
                            <Field label="7. Contract Type" value={sectionA.contractType?.replace(/_/g, ' ')} fullWidth />
                            <Field label="8. Bid Security" value={sectionA.bidSecurity} fullWidth />

                            <div className="grid gap-5 md:grid-cols-2">
                                <Field label="11. Number of Bids Requested" value={sectionA.numberOfBidsRequested} />
                                <Field label="11a. Number of Bids Received" value={sectionA.numberOfBidsReceived} />
                            </div>

                            <Field label="12. Arithmetic Error Identified" value={sectionA.arithmeticErrorIdentified ? 'Yes' : 'No'} fullWidth />
                            <Field label="13. Re-tendered" value={sectionA.retender ? 'Yes' : 'No'} fullWidth />
                            <Field label="15. Contract Award Criteria" value={sectionA.awardCriteria?.replace(/_/g, ' ')} fullWidth />
                        </div>
                    </div>
                )}

                {/* Section B - Bidders & Compliance */}
                {sectionB && sectionB.bidders && sectionB.bidders.length > 0 && (
                    <div className="panel">
                        <div className="mb-5 -m-5 p-5 bg-info/10 border-l-4 border-info">
                            <h5 className="text-lg font-bold text-info">Section B</h5>
                            <p className="text-sm mt-1">Bidders & Compliance Matrix</p>
                        </div>

                        <div className="space-y-6 p-5">
                            {sectionB.bidders.map((bidder: any, idx: number) => (
                                <div key={idx}>
                                    <h6 className="text-md font-bold mb-4">
                                        Bidder {idx + 1}: {bidder.bidderName}
                                    </h6>

                                    {/* A. Eligibility Requirements */}
                                    <div className="mb-4">
                                        <p className="font-semibold mb-2">A. Eligibility Requirements</p>
                                        <div className="overflow-x-auto">
                                            <table className="table-auto w-full border-collapse border border-gray-300 dark:border-gray-600">
                                                <thead>
                                                    <tr className="bg-gray-100 dark:bg-gray-800">
                                                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">ELIGIBILITY REQUIREMENT</th>
                                                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">{bidder.bidderName}</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr>
                                                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">PPC Reg in the category of:</td>
                                                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">{bidder.ppcCategory || '-'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">TCI/TRN</td>
                                                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">{bidder.tciTrn || '-'}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">Bid Amount (Inclusive of GCT)</td>
                                                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">${bidder.bidAmountInclusiveGCT?.toLocaleString() || '0'}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Technical Evaluation */}
                                    {bidder.technicalEvaluation && bidder.technicalEvaluation.length > 0 && (
                                        <div>
                                            <p className="font-semibold mb-2">Technical Evaluation</p>
                                            <div className="overflow-x-auto">
                                                <table className="table-auto w-full border-collapse border border-gray-300 dark:border-gray-600">
                                                    <thead>
                                                        <tr className="bg-gray-100 dark:bg-gray-800">
                                                            <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">SPECIFICATIONS</th>
                                                            <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">QUANTITY</th>
                                                            <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left">BID AMOUNT</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {bidder.technicalEvaluation.map((item: any, techIdx: number) => (
                                                            <tr key={techIdx}>
                                                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">{item.specifications}</td>
                                                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">{item.quantity}</td>
                                                                <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">${item.bidAmount?.toLocaleString()}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Section C - Evaluator Comments */}
                <div className="panel">
                    <div className="mb-5 -m-5 p-5 bg-warning/10 border-l-4 border-warning">
                        <h5 className="text-lg font-bold text-warning">Section C</h5>
                        <p className="text-sm mt-1">Evaluator Assessment</p>
                    </div>

                    <div className="space-y-5 p-5">
                        <TextAreaField label="Comments/Critical Issues Examined" value={sectionC?.comments || sectionC?.criticalIssues} />
                        <Field label="Action Taken" value={sectionC?.actionTaken} fullWidth />
                        <Field label="Recommended Contractor/Supplier" value={sectionC?.recommendedSupplier} fullWidth />
                        <Field label="Recommended Contract Amount" value={sectionC?.recommendedAmountInclusiveGCT ? `$${sectionC.recommendedAmountInclusiveGCT.toLocaleString()}` : '-'} fullWidth />
                        <div className="grid gap-5 md:grid-cols-2">
                            <Field label="Evaluator's Name" value={sectionC?.evaluatorName} />
                            <Field label="Date" value={sectionC?.evaluationDate} />
                        </div>
                    </div>
                </div>

                {/* Section D - Summary */}
                <div className="panel">
                    <div className="mb-5 -m-5 p-5 bg-success/10 border-l-4 border-success">
                        <h5 className="text-lg font-bold text-success">Section D</h5>
                        <p className="text-sm mt-1">to be completed by the Assigned Procurement Officer</p>
                    </div>

                    <div className="space-y-5 p-5">
                        <TextAreaField label="Summary of Evaluation" value={sectionD?.summary} />
                    </div>
                </div>

                {/* Section E - Final Recommendation */}
                <div className="panel">
                    <div className="mb-5 -m-5 p-5 bg-primary/10 border-l-4 border-primary">
                        <h5 className="text-lg font-bold text-primary">Section E</h5>
                        <p className="text-sm mt-1">to be completed by the Assigned Procurement Officer</p>
                    </div>

                    <div className="space-y-5 p-5">
                        <TextAreaField label="Recommendation" value={sectionE?.finalRecommendation} />
                        <div className="grid gap-5 md:grid-cols-2">
                            <Field label="Prepared By" value={sectionE?.preparedBy} />
                            <Field label="Signature" value={sectionE?.signature} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EvaluationDetail;
