import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';
import IconChecks from '../../../components/Icon/IconChecks';
import IconEdit from '../../../components/Icon/IconEdit';
import { getUser } from '../../../utils/auth';
import { evaluationService, type Evaluation, type SectionVerificationStatus } from '../../../services/evaluationService';
import EvaluationForm from '../../../components/EvaluationForm';

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
            {/* Full Form UI with gated editability */}
            <EvaluationForm
                mode="edit"
                evaluation={evaluation}
                canEditSections={canEditSections as Array<'A' | 'B' | 'C' | 'D' | 'E'>}
                onSaveSection={async (sec, data) => {
                    if (!evaluation) return;
                    const updated = await evaluationService.updateSection(evaluation.id, sec, data);
                    setEvaluation(updated);
                }}
                onSubmitSection={async (sec) => {
                    if (!evaluation) return;
                    const updated = await evaluationService.submitSection(evaluation.id, sec);
                    setEvaluation(updated);
                }}
                onVerifySection={async (sec, notes) => {
                    if (!evaluation) return;
                    const updated = await evaluationService.verifySection(evaluation.id, sec, notes);
                    setEvaluation(updated);
                }}
                onReturnSection={async (sec, notes) => {
                    if (!evaluation) return;
                    const updated = await evaluationService.returnSection(evaluation.id, sec, notes);
                    setEvaluation(updated);
                }}
            />
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
