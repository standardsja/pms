import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';
import IconSave from '../../../components/Icon/IconSave';
import { getUser } from '../../../utils/auth';
import Swal from 'sweetalert2';
import { evaluationService, type Evaluation } from '../../../services/evaluationService';

interface SectionCEntry {
    userId: number;
    userName?: string | null;
    data: {
        criticalIssues?: string;
        actionTaken?: string;
        rejectionReason?: string;
        recommendedSupplier?: string;
        recommendedAmountInclusiveGCT?: number;
        evaluatorName?: string;
        evaluatorTitle?: string;
        evaluatorSignature?: string;
        evaluationDate?: string;
    };
}

const EvaluatorAssignmentDetail = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { id: evaluationId } = useParams();
    const authLoading = useSelector((state: any) => state.auth.isLoading);
    const authUser = useSelector((state: any) => state.auth.user);

    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [currentUserEntry, setCurrentUserEntry] = useState<SectionCEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        criticalIssues: '',
        actionTaken: '',
        rejectionReason: '',
        recommendedSupplier: '',
        recommendedAmountInclusiveGCT: '',
        evaluatorName: '',
        evaluatorTitle: '',
        evaluatorSignature: '',
        evaluationDate: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        dispatch(setPageTitle('Complete Section C Evaluation'));
    }, [dispatch]);

    // Auth check
    useEffect(() => {
        const u = getUser();
        if (!u) {
            navigate('/procurement/evaluation');
        }
    }, [navigate]);

    // Load evaluation and find current user's Section C entry
    useEffect(() => {
        if (!evaluationId || isNaN(parseInt(evaluationId))) {
            setError('Invalid evaluation ID');
            setLoading(false);
            return;
        }

        loadEvaluation();
    }, [evaluationId]);

    const loadEvaluation = async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await evaluationService.getEvaluationById(parseInt(evaluationId || '0'));
            setEvaluation(data);

            const u = getUser();
            const currentUserId = u?.id;

            console.log('=== EvaluatorAssignmentDetail Debug ===');
            console.log('Current User:', u);
            console.log('Current User ID:', currentUserId);
            console.log('Evaluation sectionC (raw):', data.sectionC);
            console.log('Is sectionC an array?', Array.isArray(data.sectionC));

            if (!currentUserId) {
                setError('Unable to determine current user');
                return;
            }

            // Find this user's Section C entry
            let userEntry: SectionCEntry | null = null;

            if (Array.isArray(data.sectionC)) {
                const allEntries = data.sectionC as any[];
                console.log('All Section C entries:', allEntries);

                userEntry =
                    allEntries.find((e: any) => {
                        console.log(`Comparing entry userId ${e?.userId} (${typeof e?.userId}) with current userId ${currentUserId} (${typeof currentUserId})`);
                        return Number(e?.userId) === Number(currentUserId);
                    }) || null;

                console.log('Found user entry:', userEntry);
            }

            // If no entry found, create a blank one for this user
            if (!userEntry) {
                console.log('No existing entry found, creating blank entry for user');
                userEntry = {
                    userId: Number(currentUserId),
                    userName: u?.name || null,
                    data: {},
                };
            }

            setCurrentUserEntry(userEntry);

            // Populate form with existing data (or defaults if blank)
            const entryData = userEntry.data || {};
            console.log('Populating form with data:', entryData);

            setFormData({
                criticalIssues: entryData.criticalIssues || '',
                actionTaken: entryData.actionTaken || '',
                rejectionReason: entryData.rejectionReason || '',
                recommendedSupplier: entryData.recommendedSupplier || '',
                recommendedAmountInclusiveGCT: entryData.recommendedAmountInclusiveGCT ? String(entryData.recommendedAmountInclusiveGCT) : '',
                evaluatorName: entryData.evaluatorName || u?.name || '',
                evaluatorTitle: entryData.evaluatorTitle || '',
                evaluatorSignature: entryData.evaluatorSignature || '',
                evaluationDate: entryData.evaluationDate || new Date().toISOString().split('T')[0],
            });

            console.log('=== End Debug ===');
        } catch (err: any) {
            console.error('Failed to load evaluation:', err);
            setError(err.message || 'Failed to load evaluation');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleActionToggle = (action: 'RECOMMENDED' | 'REJECTED' | 'DEFERRED') => {
        setFormData((prev) => ({
            ...prev,
            actionTaken: prev.actionTaken === action ? '' : action,
        }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            if (!evaluation) {
                throw new Error('Evaluation not found');
            }

            const u = getUser();
            console.log('=== Save Section C Debug ===');
            console.log('Current user:', u);
            console.log('Evaluation ID:', evaluation.id);
            console.log('Form data being saved:', formData);
            console.log('=== End Save Debug ===');

            // Use the committee endpoint which properly merges per-user Section C data
            await evaluationService.updateCommitteeSection(evaluation.id, 'C', formData);

            Swal.fire({
                toast: true,
                icon: 'success',
                title: 'Section C saved successfully',
                position: 'top-end',
                timer: 2500,
                showConfirmButton: false,
            });

            // Optionally navigate back
            setTimeout(() => {
                navigate('/procurement/evaluation');
            }, 1000);
        } catch (err: any) {
            console.error('Failed to save Section C:', err);
            Swal.fire({
                icon: 'error',
                title: 'Failed to save',
                text: err.message || 'An error occurred while saving',
            });
        } finally {
            setSaving(false);
        }
    };

    if (authLoading || !authUser) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error || !evaluation || !currentUserEntry) {
        return (
            <div className="panel">
                <div className="text-center py-8">
                    <div className="text-danger mb-4">⚠️ {error || 'Unable to load evaluation'}</div>
                    <button onClick={() => navigate('/procurement/evaluation')} className="btn btn-primary">
                        Back to Evaluations
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="panel bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/procurement/evaluation')} className="hover:bg-white/20 p-2 rounded-lg transition">
                        <IconArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold">Section C: Evaluator Assessment</h1>
                        <p className="text-sm text-white/90 mt-1">
                            Evaluation {evaluation.evalNumber} - {evaluation.rfqTitle}
                        </p>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="panel space-y-6">
                {/* Comments/Critical Issues Examined */}
                <div>
                    <label htmlFor="criticalIssues" className="mb-2 block font-semibold">
                        Comments/Critical Issues Examined: <span className="text-danger">*</span>
                    </label>
                    <textarea
                        id="criticalIssues"
                        name="criticalIssues"
                        rows={8}
                        className="form-textarea w-full"
                        placeholder="Enter detailed comments and critical issues examined..."
                        value={formData.criticalIssues}
                        onChange={handleInputChange}
                        required
                    />
                </div>

                {/* Action Taken */}
                <div>
                    <label className="mb-3 block font-semibold">
                        Action Taken: <span className="text-danger">*</span>
                    </label>
                    <div className="flex gap-6">
                        {[
                            { label: 'Recommended', value: 'RECOMMENDED' },
                            { label: 'Rejected', value: 'REJECTED' },
                            { label: 'Deferred', value: 'DEFERRED' },
                        ].map((action, idx) => (
                            <label key={action.value} className="flex items-center gap-2">
                                <input type="radio" className="form-radio" checked={formData.actionTaken === action.value} onChange={() => handleActionToggle(action.value as any)} />
                                <span>
                                    ({String.fromCharCode(97 + idx)}) {action.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* If rejected or deferred */}
                {formData.actionTaken === 'REJECTED' || formData.actionTaken === 'DEFERRED' ? (
                    <div>
                        <label htmlFor="rejectionReason" className="mb-2 block font-semibold">
                            If rejected or deferred, please give details below: <span className="text-danger">*</span>
                        </label>
                        <textarea
                            id="rejectionReason"
                            name="rejectionReason"
                            rows={4}
                            className="form-textarea w-full"
                            placeholder="Provide details if rejected or deferred..."
                            value={formData.rejectionReason}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                ) : null}

                {/* Recommended Contractor/Supplier */}
                <div>
                    <label htmlFor="recommendedSupplier" className="mb-2 block font-semibold">
                        Recommended Contractor/Supplier:
                    </label>
                    <input
                        id="recommendedSupplier"
                        name="recommendedSupplier"
                        type="text"
                        className="form-input w-full"
                        placeholder="Enter recommended contractor/supplier name"
                        value={formData.recommendedSupplier}
                        onChange={handleInputChange}
                    />
                </div>

                {/* Recommended Contract Amount */}
                <div>
                    <label htmlFor="recommendedAmountInclusiveGCT" className="mb-2 block font-semibold">
                        Recommended Contract Amount (inclusive of GCT):
                    </label>
                    <input
                        id="recommendedAmountInclusiveGCT"
                        name="recommendedAmountInclusiveGCT"
                        type="text"
                        className="form-input w-full"
                        placeholder="$0.00"
                        value={formData.recommendedAmountInclusiveGCT ? String(formData.recommendedAmountInclusiveGCT).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                        onChange={(e) => {
                            const value = e.target.value.replace(/,/g, '');
                            handleInputChange({ target: { name: 'recommendedAmountInclusiveGCT', value } } as any);
                        }}
                    />
                </div>

                {/* Evaluator's Information */}
                <div className="grid gap-5 md:grid-cols-2">
                    <div>
                        <label htmlFor="evaluatorName" className="mb-2 block font-semibold">
                            Evaluator's Name:
                        </label>
                        <input
                            id="evaluatorName"
                            name="evaluatorName"
                            type="text"
                            className="form-input w-full"
                            placeholder="Enter evaluator's name"
                            value={formData.evaluatorName}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div>
                        <label htmlFor="evaluatorTitle" className="mb-2 block font-semibold">
                            Job Title:
                        </label>
                        <input
                            id="evaluatorTitle"
                            name="evaluatorTitle"
                            type="text"
                            className="form-input w-full"
                            placeholder="Enter job title"
                            value={formData.evaluatorTitle}
                            onChange={handleInputChange}
                        />
                    </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                    <div>
                        <label htmlFor="evaluatorSignature" className="mb-2 block font-semibold">
                            Signature:
                        </label>
                        <input
                            id="evaluatorSignature"
                            name="evaluatorSignature"
                            type="text"
                            className="form-input w-full"
                            placeholder="Enter your signature or initials"
                            value={formData.evaluatorSignature}
                            onChange={handleInputChange}
                        />
                    </div>
                    <div>
                        <label htmlFor="evaluationDate" className="mb-2 block font-semibold">
                            Date:
                        </label>
                        <input id="evaluationDate" name="evaluationDate" type="date" className="form-input w-full" value={formData.evaluationDate} onChange={handleInputChange} />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-6 border-t">
                    <button onClick={() => navigate('/procurement/evaluation')} className="btn btn-outline-secondary">
                        <IconArrowLeft className="h-4 w-4 mr-2" />
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving} className={`btn btn-primary ml-auto ${saving ? 'opacity-60 cursor-not-allowed' : ''}`}>
                        <IconSave className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Section C'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EvaluatorAssignmentDetail;
