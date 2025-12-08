import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';
import IconX from '../../../components/Icon/IconX';
import { getUser } from '../../../utils/auth';
import { evaluationService, type Evaluation } from '../../../services/evaluationService';

const EvaluationEdit = () => {
    const dispatch = useDispatch();
    const authLoading = useSelector((state: any) => state.auth.isLoading);
    const authUser = useSelector((state: any) => state.auth.user);
    const navigate = useNavigate();
    const { id } = useParams();

    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [currentSection, setCurrentSection] = useState<'A' | 'B' | 'C' | 'D' | 'E' | null>(null);

    // Section forms
    const [sectionAForm, setSectionAForm] = useState<any>(null);
    const [sectionBForm, setSectionBForm] = useState<any>(null);
    const [sectionDForm, setSectionDForm] = useState<any>(null);
    const [sectionEForm, setSectionEForm] = useState<any>(null);

    useEffect(() => {
        dispatch(setPageTitle('Edit Returned Evaluation'));
    }, [dispatch]);

    useEffect(() => {
        const u = getUser();
        if (!u) {
            navigate('/procurement/evaluation');
            return;
        }
        const roles = (u?.roles || (u?.role ? [u.role] : [])).map((r: any) => {
            const roleName = typeof r === 'string' ? r : r?.name || '';
            return roleName.toUpperCase();
        });
        const hasAccess = roles.some((role) => role.includes('PROCUREMENT_OFFICER') || role.includes('PROCUREMENT_MANAGER') || role.includes('PROCUREMENT'));
        if (!hasAccess) {
            navigate('/procurement/evaluation');
        }
    }, [navigate]);

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
            const data = await evaluationService.getEvaluationById(parseInt(id || '0'));
            setEvaluation(data);

            // Initialize forms with existing data
            if (data.sectionA) setSectionAForm(data.sectionA);
            if (data.sectionB) setSectionBForm(data.sectionB);
            if (data.sectionD) setSectionDForm(data.sectionD);
            if (data.sectionE) setSectionEForm(data.sectionE);

            // Auto-select first returned section
            if (data.sectionAStatus === 'RETURNED') setCurrentSection('A');
            else if (data.sectionBStatus === 'RETURNED') setCurrentSection('B');
            else if (data.sectionDStatus === 'RETURNED') setCurrentSection('D');
            else if (data.sectionEStatus === 'RETURNED') setCurrentSection('E');
        } catch (err: any) {
            console.error('Failed to load evaluation:', err);
            setError(err.message || 'Failed to load evaluation');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSection = async (section: 'A' | 'B' | 'C' | 'D' | 'E') => {
        if (!evaluation) return;

        try {
            setLoading(true);
            let sectionData;
            if (section === 'A') sectionData = sectionAForm;
            else if (section === 'B') sectionData = sectionBForm;
            else if (section === 'D') sectionData = sectionDForm;
            else if (section === 'E') sectionData = sectionEForm;

            if (!sectionData) {
                throw new Error('No data to update for this section');
            }

            await evaluationService.updateSection(evaluation.id, section, sectionData);
            setAlertMessage(`Section ${section} updated successfully`);
            setShowSuccessAlert(true);
            await loadEvaluation();
            setTimeout(() => setShowSuccessAlert(false), 3000);
        } catch (err: any) {
            setAlertMessage(err.message || `Failed to update Section ${section}`);
            setShowErrorAlert(true);
            setTimeout(() => setShowErrorAlert(false), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitSection = async (section: 'A' | 'B' | 'C' | 'D' | 'E') => {
        if (!evaluation) return;

        try {
            setLoading(true);
            await evaluationService.submitSection(evaluation.id, section);
            setAlertMessage(`Section ${section} resubmitted to committee for review`);
            setShowSuccessAlert(true);
            const updatedEval = await evaluationService.getEvaluationById(evaluation.id);
            setEvaluation(updatedEval);

            setTimeout(() => {
                setShowSuccessAlert(false);
                // Check updated evaluation for remaining returned sections
                const hasReturned =
                    updatedEval.sectionAStatus === 'RETURNED' || updatedEval.sectionBStatus === 'RETURNED' || updatedEval.sectionDStatus === 'RETURNED' || updatedEval.sectionEStatus === 'RETURNED';
                if (!hasReturned) {
                    navigate('/procurement/evaluation');
                } else {
                    setCurrentSection(null);
                }
            }, 2000);
        } catch (err: any) {
            setAlertMessage(err.message || `Failed to submit Section ${section}`);
            setShowErrorAlert(true);
            setTimeout(() => setShowErrorAlert(false), 5000);
        } finally {
            setLoading(false);
        }
    };

    const getReturnedSections = () => {
        if (!evaluation) return [];
        const sections: Array<{ id: 'A' | 'B' | 'D' | 'E'; title: string; notes: string }> = [];

        // Section C is committee-only and should not be editable by Procurement
        if (evaluation.sectionAStatus === 'RETURNED') {
            sections.push({ id: 'A', title: 'Section A: Procurement Details', notes: evaluation.sectionANotes || 'No notes provided' });
        }
        if (evaluation.sectionBStatus === 'RETURNED') {
            sections.push({ id: 'B', title: 'Section B: Bidders & Compliance', notes: evaluation.sectionBNotes || 'No notes provided' });
        }
        if (evaluation.sectionDStatus === 'RETURNED') {
            sections.push({ id: 'D', title: 'Section D: Summary', notes: evaluation.sectionDNotes || 'No notes provided' });
        }
        if (evaluation.sectionEStatus === 'RETURNED') {
            sections.push({ id: 'E', title: 'Section E: Procurement Officer Recommendation', notes: evaluation.sectionENotes || 'No notes provided' });
        }

        return sections;
    };

    if (loading && !evaluation) {
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

    const returnedSections = getReturnedSections();

    if (returnedSections.length === 0) {
        return (
            <div className="panel">
                <div className="text-center py-8">
                    <div className="text-info mb-4">ℹ️ No sections need editing</div>
                    <Link to="/procurement/evaluation" className="btn btn-primary">
                        Back to Evaluations
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Success Alert */}
            {showSuccessAlert && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60">
                    <div className="panel w-full max-w-lg overflow-hidden rounded-lg p-0">
                        <div className="flex items-center p-3.5 rounded-t text-success bg-success-light dark:bg-success-dark-light">
                            <span className="ltr:pr-2 rtl:pl-2 flex-1">
                                <strong className="ltr:mr-1 rtl:ml-1 text-lg">Success!</strong>
                                {alertMessage}
                            </span>
                            <button type="button" className="ltr:ml-auto rtl:mr-auto hover:opacity-80" onClick={() => setShowSuccessAlert(false)}>
                                <IconX className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Alert */}
            {showErrorAlert && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60">
                    <div className="panel w-full max-w-lg overflow-hidden rounded-lg p-0">
                        <div className="flex items-center p-3.5 rounded-t text-danger bg-danger-light dark:bg-danger-dark-light">
                            <span className="ltr:pr-2 rtl:pl-2 flex-1">
                                <strong className="ltr:mr-1 rtl:ml-1 text-lg">Error!</strong>
                                {alertMessage}
                            </span>
                            <button type="button" className="ltr:ml-auto rtl:mr-auto hover:opacity-80" onClick={() => setShowErrorAlert(false)}>
                                <IconX className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="panel">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link to="/procurement/evaluation" className="btn btn-outline-primary">
                            <IconArrowLeft className="h-4 w-4" />
                        </Link>
                        <div>
                            <h5 className="text-xl font-bold">Edit Returned Sections</h5>
                            <p className="text-sm text-white-dark mt-1">
                                {evaluation.evalNumber} - {evaluation.rfqTitle}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Returned Sections List */}
            <div className="panel">
                <h5 className="text-lg font-semibold mb-4">Sections Returned by Committee</h5>
                <div className="space-y-4">
                    {returnedSections.map((section) => (
                        <div key={section.id} className="border-2 border-warning rounded-lg p-4 bg-warning/10">
                            <div className="flex items-center justify-between mb-2">
                                <h6 className="font-semibold text-warning">{section.title}</h6>
                                <button onClick={() => setCurrentSection(section.id)} className="btn btn-sm btn-warning">
                                    Edit Section
                                </button>
                            </div>
                            <div className="text-sm">
                                <strong>Committee Notes:</strong>
                                <p className="mt-1 text-white-dark">{section.notes}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Section Editor */}
            {currentSection && (
                <div className="panel">
                    <h5 className="text-lg font-semibold mb-4">Editing: Section {currentSection}</h5>
                    <div className="mb-4 p-4 bg-info/10 border border-info rounded">
                        <p className="text-sm">
                            <strong>Note:</strong> Make your changes below, click "Save Changes", then click "Resubmit to Committee" when ready.
                        </p>
                    </div>

                    {/* Add section-specific form fields here based on currentSection */}
                    <div className="text-center text-white-dark">Section {currentSection} editor - Form fields to be implemented</div>

                    <div className="flex gap-3 mt-6">
                        <button onClick={() => handleUpdateSection(currentSection)} className="btn btn-primary" disabled={loading}>
                            Save Changes
                        </button>
                        <button onClick={() => handleSubmitSection(currentSection)} className="btn btn-success" disabled={loading}>
                            Save & Resubmit to Committee
                        </button>
                        <button onClick={() => setCurrentSection(null)} className="btn btn-outline-secondary">
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EvaluationEdit;
