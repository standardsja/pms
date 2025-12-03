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
    const [structureEditEnabled, setStructureEditEnabled] = useState<boolean>(false);
    const [returnNotes, setReturnNotes] = useState<string>('');
    const [pendingSectionB, setPendingSectionB] = useState<any>(null);

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

    return (
        <div>
            {/* Procurement actions */}
            {isProcurement && (
                <div className="panel mb-4 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2">
                            <input type="checkbox" className="form-checkbox" checked={structureEditEnabled} onChange={() => setStructureEditEnabled((v) => !v)} />
                            <span className="text-sm">Enable structure editing for Section B</span>
                        </label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="text" className="form-input w-64" placeholder="Return notes for evaluators" value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} />
                        <button
                            className="btn btn-outline-danger"
                            onClick={async () => {
                                if (!evaluation) return;
                                // First, save any pending Section B structural changes
                                if (pendingSectionB) {
                                    await evaluationService.updateSection(evaluation.id, 'B', pendingSectionB);
                                }
                                // Then return the section with notes
                                const updated = await evaluationService.returnSection(evaluation.id, 'B', returnNotes || 'Table structure has been updated. Please review the changes.');
                                setEvaluation(updated);
                                setReturnNotes('');
                                setStructureEditEnabled(false);
                                setPendingSectionB(null);
                            }}
                        >
                            Return Section B
                        </button>
                    </div>
                </div>
            )}
            {/* Full Form UI with gated editability */}
            <EvaluationForm
                mode="edit"
                evaluation={evaluation}
                canEditSections={canEditSections as Array<'A' | 'B' | 'C' | 'D' | 'E'>}
                structureEditableSections={structureEditEnabled ? (['B'] as Array<'A' | 'B' | 'C' | 'D' | 'E'>) : ([] as Array<'A' | 'B' | 'C' | 'D' | 'E'>)}
                onSectionChange={(sec, data) => {
                    if (sec === 'B') {
                        setPendingSectionB(data);
                    }
                }}
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
        </div>
    );
};

export default EvaluationDetail;
