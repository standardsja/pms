import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';
import IconCircleCheck from '../../../components/Icon/IconCircleCheck';
import IconSave from '../../../components/Icon/IconSave';
import IconChecks from '../../../components/Icon/IconChecks';
import IconX from '../../../components/Icon/IconX';
import { getUser } from '../../../utils/auth';
import { useTranslation } from 'react-i18next';
import { evaluationService, type Evaluation, type SectionVerificationStatus } from '../../../services/evaluationService';

const EvaluationCommittee = () => {
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
    const [verificationNotes, setVerificationNotes] = useState('');
    const [isCommittee, setIsCommittee] = useState(false);

    useEffect(() => {
        dispatch(setPageTitle('Committee Verification'));
    }, [dispatch]);

    // Role guard - Committee members only
    useEffect(() => {
        const u = getUser();
        if (!u) {
            navigate('/evaluation/committee/dashboard');
            return;
        }
        const roles = (u?.roles || (u?.role ? [u.role] : [])).map((r) => r.toUpperCase());
        const isCommitteeMember = roles.some((role) => role.includes('COMMITTEE') || role.includes('EVALUATION_COMMITTEE'));

        if (!isCommitteeMember) {
            navigate('/procurement/evaluation/committee/dashboard');
            return;
        }

        setIsCommittee(true);
    }, [navigate]);

    // Load evaluation data
    useEffect(() => {
        loadEvaluation();
    }, [id]);

    const loadEvaluation = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await evaluationService.getEvaluationById(parseInt(id || '0'));
            setEvaluation(data);
        } catch (err: any) {
            console.error('Failed to load evaluation:', err);
            setError(err.message || 'Failed to load evaluation');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitSection = async () => {
        // Committee members cannot submit - only procurement staff can
        setAlertMessage('Only procurement officers can submit sections');
        setShowErrorAlert(true);
        setTimeout(() => setShowErrorAlert(false), 3000);
    };

    const handleVerifySection = async () => {
        if (!evaluation || !isCommittee) return;

        try {
            setLoading(true);
            await evaluationService.verifySection(evaluation.id, currentSection, verificationNotes);
            setAlertMessage(`Section ${currentSection} verified successfully`);
            setShowSuccessAlert(true);
            setVerificationNotes('');
            await loadEvaluation();
            setTimeout(() => setShowSuccessAlert(false), 3000);
        } catch (err: any) {
            setAlertMessage(err.message || 'Failed to verify section');
            setShowErrorAlert(true);
            setTimeout(() => setShowErrorAlert(false), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleReturnSection = async () => {
        if (!evaluation || !isCommittee) return;

        if (!verificationNotes || verificationNotes.trim() === '') {
            setAlertMessage('Please provide notes explaining why this section is being returned');
            setShowErrorAlert(true);
            setTimeout(() => setShowErrorAlert(false), 5000);
            return;
        }

        try {
            setLoading(true);
            await evaluationService.returnSection(evaluation.id, currentSection, verificationNotes);
            setAlertMessage(`Section ${currentSection} returned for changes`);
            setShowSuccessAlert(true);
            setVerificationNotes('');
            await loadEvaluation();
            setTimeout(() => setShowSuccessAlert(false), 3000);
        } catch (err: any) {
            setAlertMessage(err.message || 'Failed to return section');
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
        const hasData = evaluation?.[`section${section}` as keyof Evaluation];
        return (status === 'IN_PROGRESS' || status === 'RETURNED') && !!hasData;
    };

    const canVerifySection = (section: 'A' | 'B' | 'C' | 'D' | 'E'): boolean => {
        const status = getSectionStatus(section);
        return isCommittee && status === 'SUBMITTED';
    };

    const isPreviousSectionVerified = (section: 'A' | 'B' | 'C' | 'D' | 'E'): boolean => {
        if (section === 'A') return true; // First section is always unlocked

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
                return 'Verified';
            case 'SUBMITTED':
                return 'Submitted';
            case 'IN_PROGRESS':
                return 'In Progress';
            case 'RETURNED':
                return 'Returned';
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
            description: 'Review and verify procurement details',
            status: getSectionStatus('A'),
        },
        {
            id: 'B' as const,
            title: 'Section B: Eligibility & Compliance',
            description: 'Evaluate eligibility requirements and compliance matrix for each bidder',
            status: getSectionStatus('B'),
        },
        {
            id: 'C' as const,
            title: 'Section C: Evaluator Comments & Recommendation',
            description: 'Provide comments, critical issues, and recommendation',
            status: getSectionStatus('C'),
        },
        {
            id: 'D' as const,
            title: 'Section D: Summary',
            description: 'Summarize evaluation findings',
            status: getSectionStatus('D'),
        },
        {
            id: 'E' as const,
            title: 'Section E: Procurement Officer Recommendation',
            description: 'Final recommendation and approval',
            status: getSectionStatus('E'),
        },
    ];

    const handleStartSection = (sectionId: 'A' | 'B' | 'C' | 'D' | 'E') => {
        if (!isPreviousSectionVerified(sectionId)) {
            setAlertMessage('Previous section must be verified before starting this section');
            setShowErrorAlert(true);
            setTimeout(() => setShowErrorAlert(false), 3000);
            return;
        }
        setCurrentSection(sectionId);
    };

    const currentSectionStatus = getSectionStatus(currentSection);
    const currentSectionNotes = evaluation?.[`section${currentSection}Notes` as keyof Evaluation] as string | undefined;
    const currentSectionVerifier = evaluation?.[`section${currentSection}Verifier` as keyof Evaluation] as { id: number; name: string | null; email: string } | undefined;

    return (
        <div>
            {/* Success Alert Modal */}
            {showSuccessAlert && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60">
                    <div className="panel w-full max-w-lg overflow-hidden rounded-lg p-0">
                        <div className="flex items-center p-3.5 rounded-t text-success bg-success-light dark:bg-success-dark-light">
                            <span className="ltr:pr-2 rtl:pl-2 flex-1">
                                <strong className="ltr:mr-1 rtl:ml-1 text-lg">{t('common.success', 'Success!')}</strong>
                                {alertMessage}
                            </span>
                            <button type="button" className="ltr:ml-auto rtl:mr-auto hover:opacity-80" onClick={() => setShowSuccessAlert(false)}>
                                <IconX className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Alert Modal */}
            {showErrorAlert && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60">
                    <div className="panel w-full max-w-lg overflow-hidden rounded-lg p-0">
                        <div className="flex items-center p-3.5 rounded-t text-danger bg-danger-light dark:bg-danger-dark-light">
                            <span className="ltr:pr-2 rtl:pl-2 flex-1">
                                <strong className="ltr:mr-1 rtl:ml-1 text-lg">{t('common.error', 'Error!')}</strong>
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
                    <h2 className="text-2xl font-bold">Committee Verification</h2>
                    <p className="text-white-dark">
                        {evaluation.evalNumber} • {evaluation.rfqTitle}
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link to="/evaluation/committee/dashboard" className="btn btn-outline-info gap-2">
                        <IconArrowLeft />
                        Dashboard
                    </Link>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
                {/* Sidebar - Section Navigation */}
                <div className="lg:col-span-4">
                    <div className="panel sticky top-6">
                        <h5 className="mb-5 text-lg font-semibold">Evaluation Workflow</h5>
                        <div className="space-y-3">
                            {sections.map((section, index) => {
                                const isLocked = !isPreviousSectionVerified(section.id);
                                return (
                                    <div
                                        key={section.id}
                                        className={`rounded border-2 p-4 transition ${
                                            isLocked
                                                ? 'opacity-50 cursor-not-allowed border-white-light dark:border-dark'
                                                : 'cursor-pointer ' +
                                                  (currentSection === section.id ? 'border-primary bg-primary-light dark:bg-primary/20' : 'border-white-light dark:border-dark hover:border-primary/50')
                                        }`}
                                        onClick={() => !isLocked && handleStartSection(section.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex-shrink-0 mt-1">
                                                {section.status === 'VERIFIED' ? (
                                                    <IconCircleCheck className="h-6 w-6 text-success" />
                                                ) : isLocked ? (
                                                    <div className="flex h-6 w-6 items-center justify-center text-xl">🔒</div>
                                                ) : (
                                                    <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-primary text-xs font-bold text-primary">{index + 1}</div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h6 className="font-semibold">{section.title}</h6>
                                                <p className="mt-1 text-xs text-white-dark">{section.description}</p>
                                                <div className="mt-2">
                                                    <span className={getStatusBadge(section.status)}>{getStatusText(section.status)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Main Content - Current Section */}
                <div className="lg:col-span-8">
                    <div className="panel">
                        <div className="mb-5 flex items-center justify-between border-b pb-5">
                            <h5 className="text-lg font-semibold">{sections.find((s) => s.id === currentSection)?.title}</h5>
                            <span className={getStatusBadge(currentSectionStatus)}>{getStatusText(currentSectionStatus)}</span>
                        </div>

                        {/* Section Status Information */}
                        {currentSectionStatus === 'RETURNED' && currentSectionNotes && (
                            <div className="mb-5 rounded bg-danger-light p-4 dark:bg-danger/20">
                                <h6 className="font-semibold text-danger mb-2">⚠️ Section Returned for Changes</h6>
                                <p className="text-sm text-white-dark">{currentSectionNotes}</p>
                                {currentSectionVerifier && <p className="text-xs text-white-dark mt-2">Reviewed by: {currentSectionVerifier.name || currentSectionVerifier.email}</p>}
                            </div>
                        )}

                        {currentSectionStatus === 'VERIFIED' && (
                            <div className="mb-5 rounded bg-success-light p-4 dark:bg-success/20">
                                <h6 className="font-semibold text-success mb-2">✓ Section Verified</h6>
                                {currentSectionNotes && <p className="text-sm text-white-dark">{currentSectionNotes}</p>}
                                {currentSectionVerifier && <p className="text-xs text-white-dark mt-2">Verified by: {currentSectionVerifier.name || currentSectionVerifier.email}</p>}
                            </div>
                        )}

                        {currentSectionStatus === 'SUBMITTED' && (
                            <div className="mb-5 rounded bg-info-light p-4 dark:bg-info/20">
                                <h6 className="font-semibold text-info mb-2">📋 Submitted for Committee Review</h6>
                                <p className="text-sm text-white-dark">This section is awaiting committee verification.</p>
                            </div>
                        )}

                        {/* Section Content Placeholder */}
                        <div className="mb-5">
                            <p className="text-white-dark text-sm">Section content editing interface would go here. For now, use the actions below to manage the section workflow.</p>
                        </div>

                        {/* Committee Verification Area */}
                        {isCommittee && currentSectionStatus === 'SUBMITTED' && (
                            <div className="mb-5 rounded border-2 border-primary p-4">
                                <h6 className="font-semibold mb-3">Committee Verification</h6>
                                <div className="mb-4">
                                    <label htmlFor="verificationNotes" className="mb-2 block font-semibold">
                                        Verification Notes (Optional for Approve, Required for Return)
                                    </label>
                                    <textarea
                                        id="verificationNotes"
                                        rows={4}
                                        className="form-textarea"
                                        placeholder="Add any comments or feedback..."
                                        value={verificationNotes}
                                        onChange={(e) => setVerificationNotes(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={handleVerifySection} className="btn btn-success gap-2" disabled={loading}>
                                        <IconChecks className="h-4 w-4" />
                                        Verify Section
                                    </button>
                                    <button onClick={handleReturnSection} className="btn btn-danger gap-2" disabled={loading}>
                                        <IconX className="h-4 w-4" />
                                        Return for Changes
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t pt-5">
                            {canSubmitSection(currentSection) && (
                                <button onClick={handleSubmitSection} className="btn btn-primary gap-2" disabled={loading}>
                                    <IconSave className="h-4 w-4" />
                                    Submit for Review
                                </button>
                            )}
                            {currentSectionStatus === 'VERIFIED' && <div className="text-success text-sm font-semibold">✓ Section verified - proceed to next section</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EvaluationCommittee;
