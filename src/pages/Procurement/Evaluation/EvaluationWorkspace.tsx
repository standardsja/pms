import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';
import IconSave from '../../../components/Icon/IconSave';
import IconSend from '../../../components/Icon/IconSend';
import IconX from '../../../components/Icon/IconX';
import { getUser } from '../../../utils/auth';
import { useTranslation } from 'react-i18next';
import { evaluationService, type Evaluation, type SectionVerificationStatus } from '../../../services/evaluationService';

const EvaluationWorkspace = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { id } = useParams();
    const { t } = useTranslation();

    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentSection, setCurrentSection] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('A');
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [sectionData, setSectionData] = useState<any>({});

    useEffect(() => {
        dispatch(setPageTitle('Evaluation Workspace'));
    }, [dispatch]);

    // Role guard - Procurement staff only
    useEffect(() => {
        const u = getUser();
        if (!u) {
            navigate('/procurement/evaluation');
            return;
        }
        const roles = (u?.roles || (u?.role ? [u.role] : [])).map((r) => r.toUpperCase());
        const hasAccess = roles.some((role) => role.includes('PROCUREMENT_OFFICER') || role.includes('PROCUREMENT_MANAGER') || role.includes('PROCUREMENT') || role.includes('ADMIN'));
        if (!hasAccess) {
            navigate('/procurement/evaluation');
        }
    }, [navigate]);

    useEffect(() => {
        loadEvaluation();
    }, [id]);

    const loadEvaluation = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await evaluationService.getEvaluationById(parseInt(id || '0'));
            setEvaluation(data);
            // Load existing section data
            if (data[`section${currentSection}` as keyof Evaluation]) {
                setSectionData(data[`section${currentSection}` as keyof Evaluation]);
            }
        } catch (err: any) {
            console.error('Failed to load evaluation:', err);
            setError(err.message || 'Failed to load evaluation');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitForReview = async () => {
        if (!evaluation) return;

        try {
            setLoading(true);
            await evaluationService.submitSection(evaluation.id, currentSection);
            setAlertMessage(`Section ${currentSection} submitted for committee review`);
            setShowSuccessAlert(true);
            await loadEvaluation();
            setTimeout(() => setShowSuccessAlert(false), 3000);
        } catch (err: any) {
            setAlertMessage(err.message || 'Failed to submit section');
            setShowErrorAlert(true);
            setTimeout(() => setShowErrorAlert(false), 5000);
        } finally {
            setLoading(false);
        }
    };

    const getSectionStatus = (section: 'A' | 'B' | 'C' | 'D' | 'E'): SectionVerificationStatus => {
        if (!evaluation) return 'NOT_STARTED';
        return evaluation[`section${section}Status` as keyof Evaluation] as SectionVerificationStatus;
    };

    const canEditSection = (section: 'A' | 'B' | 'C' | 'D' | 'E'): boolean => {
        const status = getSectionStatus(section);
        return status === 'NOT_STARTED' || status === 'IN_PROGRESS' || status === 'RETURNED';
    };

    const canSubmitSection = (section: 'A' | 'B' | 'C' | 'D' | 'E'): boolean => {
        const status = getSectionStatus(section);
        return status === 'IN_PROGRESS' || status === 'RETURNED';
    };

    const isPreviousSectionVerified = (section: 'A' | 'B' | 'C' | 'D' | 'E'): boolean => {
        if (section === 'A') return true;

        const sectionOrder = ['A', 'B', 'C', 'D', 'E'];
        const currentIndex = sectionOrder.indexOf(section);
        if (currentIndex === 0) return true;

        const previousSection = sectionOrder[currentIndex - 1] as 'A' | 'B' | 'C' | 'D' | 'E';
        const previousStatus = getSectionStatus(previousSection);
        return previousStatus === 'VERIFIED';
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
            case 'NOT_STARTED':
                return 'badge bg-secondary';
        }
    };

    const getStatusText = (status: SectionVerificationStatus) => {
        switch (status) {
            case 'VERIFIED':
                return '✓ Verified';
            case 'SUBMITTED':
                return '⏳ Under Review';
            case 'IN_PROGRESS':
                return '✏️ In Progress';
            case 'RETURNED':
                return '↩️ Needs Revision';
            case 'NOT_STARTED':
                return 'Not Started';
        }
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
                        Back to List
                    </Link>
                </div>
            </div>
        );
    }

    const sections = [
        {
            id: 'A' as const,
            title: 'Section A: Procurement Details',
            description: 'Procurement information and tender details',
            status: getSectionStatus('A'),
        },
        {
            id: 'B' as const,
            title: 'Section B: Eligibility & Compliance',
            description: 'Bidder eligibility and compliance evaluation',
            status: getSectionStatus('B'),
        },
        {
            id: 'C' as const,
            title: 'Section C: Evaluator Comments',
            description: 'Technical evaluation and recommendations',
            status: getSectionStatus('C'),
        },
        {
            id: 'D' as const,
            title: 'Section D: Summary',
            description: 'Evaluation summary and findings',
            status: getSectionStatus('D'),
        },
        {
            id: 'E' as const,
            title: 'Section E: Officer Recommendation',
            description: 'Final procurement officer recommendation',
            status: getSectionStatus('E'),
        },
    ];

    const handleStartSection = (sectionId: 'A' | 'B' | 'C' | 'D' | 'E') => {
        if (!isPreviousSectionVerified(sectionId)) {
            setAlertMessage('Previous section must be verified by committee before starting this section');
            setShowErrorAlert(true);
            setTimeout(() => setShowErrorAlert(false), 3000);
            return;
        }
        setCurrentSection(sectionId);
    };

    const currentSectionStatus = getSectionStatus(currentSection);
    const currentSectionNotes = evaluation?.[`section${currentSection}Notes` as keyof Evaluation] as string | undefined;
    const isEditable = canEditSection(currentSection);
    const isLocked = !isPreviousSectionVerified(currentSection);

    return (
        <div>
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

            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Evaluation Workspace</h2>
                    <p className="text-white-dark">
                        {evaluation.evalNumber} • {evaluation.rfqTitle}
                    </p>
                </div>
                <Link to="/procurement/evaluation" className="btn btn-outline-danger gap-2">
                    <IconArrowLeft />
                    Back to List
                </Link>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
                {/* Sidebar - Section Progress */}
                <div className="lg:col-span-4">
                    <div className="panel sticky top-6">
                        <h5 className="mb-5 text-lg font-semibold">Section Progress</h5>
                        <div className="space-y-3">
                            {sections.map((section) => {
                                const isLocked = !isPreviousSectionVerified(section.id);
                                const isCurrent = currentSection === section.id;
                                return (
                                    <div
                                        key={section.id}
                                        className={`rounded border-2 p-4 transition ${
                                            isLocked
                                                ? 'opacity-50 cursor-not-allowed border-white-light dark:border-dark'
                                                : 'cursor-pointer ' + (isCurrent ? 'border-primary bg-primary/10' : 'border-white-light dark:border-dark hover:border-primary hover:bg-primary/5')
                                        }`}
                                        onClick={() => !isLocked && handleStartSection(section.id)}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="font-semibold">
                                                {isLocked && '🔒 '}
                                                Section {section.id}
                                            </div>
                                            <span className={getStatusBadge(section.status)}>{getStatusText(section.status)}</span>
                                        </div>
                                        <div className="text-sm text-white-dark">{section.description}</div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Workflow Info */}
                        <div className="mt-5 p-4 bg-info/10 rounded border border-info">
                            <h6 className="font-semibold text-info mb-2">📋 Workflow</h6>
                            <ul className="text-xs text-white-dark space-y-1">
                                <li>• Complete each section in order</li>
                                <li>• Submit for committee review</li>
                                <li>• Wait for verification</li>
                                <li>• Next section unlocks after approval</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Main Content - Current Section Editor */}
                <div className="lg:col-span-8">
                    <div className="panel">
                        <div className="mb-5 flex items-center justify-between border-b pb-5">
                            <div>
                                <h3 className="text-xl font-bold">Section {currentSection}</h3>
                                <p className="text-white-dark">{sections.find((s) => s.id === currentSection)?.description}</p>
                            </div>
                            <span className={getStatusBadge(currentSectionStatus)}>{getStatusText(currentSectionStatus)}</span>
                        </div>

                        {/* Committee Return Notes */}
                        {currentSectionStatus === 'RETURNED' && currentSectionNotes && (
                            <div className="mb-5 p-4 bg-danger/10 border-2 border-danger rounded">
                                <h6 className="font-semibold text-danger mb-2">↩️ Committee Feedback</h6>
                                <p className="text-sm text-white-dark">{currentSectionNotes}</p>
                                <p className="text-xs text-danger mt-2">Please address the feedback above and resubmit this section.</p>
                            </div>
                        )}

                        {/* Submitted - Awaiting Review */}
                        {currentSectionStatus === 'SUBMITTED' && (
                            <div className="mb-5 p-4 bg-info/10 border-2 border-info rounded">
                                <h6 className="font-semibold text-info mb-2">⏳ Under Committee Review</h6>
                                <p className="text-sm text-white-dark">This section has been submitted and is awaiting verification by the evaluation committee.</p>
                            </div>
                        )}

                        {/* Verified - Completed */}
                        {currentSectionStatus === 'VERIFIED' && (
                            <div className="mb-5 p-4 bg-success/10 border-2 border-success rounded">
                                <h6 className="font-semibold text-success mb-2">✓ Verified by Committee</h6>
                                <p className="text-sm text-white-dark">This section has been approved. You can proceed to the next section.</p>
                            </div>
                        )}

                        {/* Section Locked */}
                        {isLocked && (
                            <div className="mb-5 p-4 bg-warning/10 border-2 border-warning rounded">
                                <h6 className="font-semibold text-warning mb-2">🔒 Section Locked</h6>
                                <p className="text-sm text-white-dark">Complete and get verification for the previous section before accessing this one.</p>
                            </div>
                        )}

                        {/* Section Content Editor */}
                        {!isLocked && (
                            <div className="mb-5">
                                <h6 className="font-semibold mb-3">Section Content</h6>
                                {isEditable ? (
                                    <textarea
                                        className="form-textarea min-h-[400px]"
                                        placeholder={`Enter Section ${currentSection} content here...`}
                                        value={typeof sectionData === 'string' ? sectionData : JSON.stringify(sectionData, null, 2)}
                                        onChange={(e) => setSectionData(e.target.value)}
                                        disabled={!isEditable}
                                    />
                                ) : (
                                    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded min-h-[400px]">
                                        <pre className="whitespace-pre-wrap text-sm">{typeof sectionData === 'string' ? sectionData : JSON.stringify(sectionData, null, 2)}</pre>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Action Buttons */}
                        {!isLocked && (
                            <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t pt-5">
                                {isEditable && (
                                    <>
                                        <button className="btn btn-outline-secondary gap-2">
                                            <IconSave />
                                            Save Draft
                                        </button>
                                        <button onClick={handleSubmitForReview} className="btn btn-primary gap-2" disabled={loading}>
                                            <IconSend />
                                            Submit for Review
                                        </button>
                                    </>
                                )}
                                {currentSectionStatus === 'SUBMITTED' && <p className="text-info text-sm">Awaiting committee verification...</p>}
                                {currentSectionStatus === 'VERIFIED' && (
                                    <button
                                        onClick={() => {
                                            const nextSection = String.fromCharCode(currentSection.charCodeAt(0) + 1);
                                            if (nextSection <= 'E') {
                                                handleStartSection(nextSection as 'A' | 'B' | 'C' | 'D' | 'E');
                                            }
                                        }}
                                        className="btn btn-success gap-2"
                                    >
                                        Next Section →
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EvaluationWorkspace;
