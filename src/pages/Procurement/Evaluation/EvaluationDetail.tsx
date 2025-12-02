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
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [sectionData, setSectionData] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [canEditSections, setCanEditSections] = useState<string[]>([]);

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

    // Load editable sections for current user (assigned sections)
    useEffect(() => {
        const loadAssignments = async () => {
            try {
                const assignments = await evaluationService.getMyAssignments();
                const forThisEval = assignments.filter((a: any) => String(a.evaluationId) === String(id));
                const sections = new Set<string>();
                forThisEval.forEach((a: any) => {
                    (a.sections || []).forEach((s: string) => sections.add(String(s).toUpperCase()));
                });
                setCanEditSections(Array.from(sections));
            } catch {
                setCanEditSections([]);
            }
        };
        if (id) loadAssignments();
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
        <div className="space-y-6">
            {/* Header */}
            <div className="panel">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <Link to="/procurement/evaluation" className="btn btn-outline-primary">
                            <IconArrowLeft className="h-4 w-4" />
                        </Link>
                        <div>
                            <h5 className="text-xl font-bold">{evaluation.evalNumber}</h5>
                            <p className="text-sm text-white-dark mt-1">{evaluation.rfqTitle}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`badge ${evaluation.status === 'COMPLETED' ? 'bg-success' : evaluation.status === 'IN_PROGRESS' ? 'bg-warning' : 'bg-info'} text-base px-4 py-2`}>
                            {evaluation.status === 'COMPLETED' ? '✓ Completed' : evaluation.status}
                        </span>
                        {isProcurement && evaluation.status === 'IN_PROGRESS' && (
                            <Link to={`/procurement/evaluation/${evaluation.id}/edit`} className="btn btn-warning">
                                <IconEdit className="h-4 w-4 mr-2" />
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

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-sm text-white-dark">RFQ Number</p>
                        <p className="font-semibold text-info">{evaluation.rfqNumber}</p>
                    </div>
                    <div>
                        <p className="text-sm text-white-dark">Created By</p>
                        <p className="font-semibold">{evaluation.creator.name || evaluation.creator.email}</p>
                    </div>
                    <div>
                        <p className="text-sm text-white-dark">Evaluator</p>
                        <p className="font-semibold">{evaluation.evaluator || '-'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-white-dark">Due Date</p>
                        <p className="font-semibold">{evaluation.dueDate ? new Date(evaluation.dueDate).toLocaleDateString() : '-'}</p>
                    </div>
                </div>
            </div>

            {/* Section Status Overview */}
            <div className="panel">
                <h5 className="text-lg font-semibold mb-4">Section Verification Status</h5>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {(['A', 'B', 'C', 'D', 'E'] as const).map((section) => {
                        const status = evaluation[`section${section}Status` as keyof Evaluation] as SectionVerificationStatus;
                        const verifier = evaluation[`section${section}Verifier` as keyof Evaluation] as { name: string | null } | undefined;
                        const verifiedAt = evaluation[`section${section}VerifiedAt` as keyof Evaluation] as string | undefined;

                        return (
                            <div key={section} className="border rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-primary mb-2">Section {section}</div>
                                <span className={getStatusBadge(status)}>{getStatusText(status)}</span>
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

            {/* Section A: Procurement Details */}
            {sectionA && (
                <FieldGroup title="Section A: Procurement Details" color="primary">
                    <Field label="RFQ Number" value={evaluation.rfqNumber} />
                    <Field label="RFQ Title" value={evaluation.rfqTitle} fullWidth />
                    <Field label="Comparable Estimate" value={`$${sectionA.comparableEstimate?.toLocaleString()}`} />
                    <Field label="Funded By" value={sectionA.fundedBy} />
                    <Field label="Tender Closing Date" value={sectionA.tenderClosingDate} />
                    <Field label="Tender Opening Date" value={sectionA.tenderOpeningDate} />
                    <Field label="Procurement Method" value={sectionA.procurementMethod?.replace(/_/g, ' ')} />
                    <Field label="Contract Type" value={sectionA.contractType?.replace(/_/g, ' ')} />
                    <Field label="Bid Security Required" value={sectionA.bidSecurity} />
                    <Field label="Bids Requested" value={sectionA.numberOfBidsRequested} />
                    <Field label="Bids Received" value={sectionA.numberOfBidsReceived} />
                    <Field label="Award Criteria" value={sectionA.awardCriteria?.replace(/_/g, ' ')} />
                </FieldGroup>
            )}

            {/* Section B: Bidders (Editable for assigned users) */}
            {sectionB && (
                <FieldGroup title="Section B: Bidders & Compliance" color="info">
                    {/* Edit controls for assigned users */}
                    {canEditSections.includes('B') && (
                        <div className="md:col-span-2 flex justify-end mb-3">
                            {editingSection === 'B' ? (
                                <div className="flex gap-2">
                                    <button
                                        className="btn btn-success btn-sm"
                                        disabled={saving}
                                        onClick={async () => {
                                            if (!evaluation) return;
                                            try {
                                                setSaving(true);
                                                const updated = await evaluationService.updateSection(evaluation.id, 'B', sectionData ?? sectionB);
                                                setEvaluation(updated);
                                                setEditingSection(null);
                                            } catch (e) {
                                                console.error('Save Section B failed:', e);
                                            } finally {
                                                setSaving(false);
                                            }
                                        }}
                                    >
                                        Save Section B
                                    </button>
                                    <button className="btn btn-outline-secondary btn-sm" onClick={() => setEditingSection(null)}>
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    className="btn btn-primary btn-sm flex items-center gap-2"
                                    onClick={() => {
                                        setEditingSection('B');
                                        setSectionData(sectionB);
                                    }}
                                >
                                    <IconEdit /> Edit Section B
                                </button>
                            )}
                        </div>
                    )}

                    <div className="md:col-span-2">
                        {(editingSection === 'B' ? (sectionData?.bidders || []) : (sectionB.bidders || [])).map((bidder: any, idx: number) => (
                            <div key={idx} className="mb-4 p-4 border rounded bg-white-light dark:bg-[#1b2e4b]">
                                <h6 className="font-semibold mb-2">Bidder {idx + 1}</h6>
                                {editingSection === 'B' ? (
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <label className="block text-xs mb-1">Bidder Name</label>
                                            <input
                                                type="text"
                                                className="form-input w-full"
                                                value={bidder.bidderName || ''}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setSectionData((prev: any) => {
                                                        const next = { ...(prev || {}), bidders: [...(prev?.bidders || [])] };
                                                        next.bidders[idx] = { ...(next.bidders[idx] || {}), bidderName: value };
                                                        return next;
                                                    });
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs mb-1">PPC Category</label>
                                            <input
                                                type="text"
                                                className="form-input w-full"
                                                value={bidder.ppcCategory || ''}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setSectionData((prev: any) => {
                                                        const next = { ...(prev || {}), bidders: [...(prev?.bidders || [])] };
                                                        next.bidders[idx] = { ...(next.bidders[idx] || {}), ppcCategory: value };
                                                        return next;
                                                    });
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs mb-1">TCI/TRN</label>
                                            <input
                                                type="text"
                                                className="form-input w-full"
                                                value={bidder.tciTrn || ''}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    setSectionData((prev: any) => {
                                                        const next = { ...(prev || {}), bidders: [...(prev?.bidders || [])] };
                                                        next.bidders[idx] = { ...(next.bidders[idx] || {}), tciTrn: value };
                                                        return next;
                                                    });
                                                }}
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-xs mb-1">Bid Amount (Inclusive of GCT)</label>
                                            <input
                                                type="number"
                                                className="form-input w-full"
                                                value={bidder.bidAmountInclusiveGCT || ''}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    const num = value === '' ? null : Number(value);
                                                    setSectionData((prev: any) => {
                                                        const next = { ...(prev || {}), bidders: [...(prev?.bidders || [])] };
                                                        next.bidders[idx] = { ...(next.bidders[idx] || {}), bidAmountInclusiveGCT: num };
                                                        return next;
                                                    });
                                                }}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <strong>Bidder Name:</strong> {bidder.bidderName}
                                        </div>
                                        <div>
                                            <strong>PPC Category:</strong> {bidder.ppcCategory}
                                        </div>
                                        <div>
                                            <strong>TCI/TRN:</strong> {bidder.tciTrn}
                                        </div>
                                        <div className="col-span-2">
                                            <strong>Bid Amount:</strong> ${bidder.bidAmountInclusiveGCT?.toLocaleString()}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </FieldGroup>
            )}

            {/* Section C: Evaluator Comments */}
            {sectionC && (
                <FieldGroup title="Section C: Evaluator Comments (Committee)" color="warning">
                    <TextAreaField label="Comments" value={sectionC.comments} />
                    <TextAreaField label="Critical Issues" value={sectionC.criticalIssues} />
                    <Field label="Action Taken" value={sectionC.actionTaken} />
                    <Field label="Recommended Supplier" value={sectionC.recommendedSupplier} />
                    <Field label="Recommended Amount" value={`$${sectionC.recommendedAmountInclusiveGCT?.toLocaleString()}`} />
                    <Field label="Evaluator Name" value={sectionC.evaluatorName} />
                    <Field label="Evaluation Date" value={sectionC.evaluationDate} />
                </FieldGroup>
            )}

            {/* Section D: Summary */}
            {sectionD && (
                <FieldGroup title="Section D: Summary" color="warning">
                    <TextAreaField label="Evaluation Summary" value={sectionD.summary} />
                </FieldGroup>
            )}

            {/* Section E: Final Recommendation */}
            {sectionE && (
                <FieldGroup title="Section E: Final Recommendation" color="success">
                    <TextAreaField label="Recommendation" value={sectionE.finalRecommendation} />
                    <Field label="% Difference" value={sectionE.percentageDifference ? `${sectionE.percentageDifference}%` : '-'} />
                    <Field label="Prepared By" value={sectionE.preparedBy} />
                </FieldGroup>
            )}
        </div>
    );
};

export default EvaluationDetail;
