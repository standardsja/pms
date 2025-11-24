import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';
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
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [verificationNotes, setVerificationNotes] = useState('');
    const [isCommittee, setIsCommittee] = useState(false);
    const [activeSection, setActiveSection] = useState<'A' | 'B' | 'C' | 'D' | 'E' | null>(null);

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

    const handleVerifySection = async (section: 'A' | 'B' | 'C' | 'D' | 'E') => {
        if (!evaluation || !isCommittee) return;

        try {
            setLoading(true);
            await evaluationService.verifySection(evaluation.id, section, verificationNotes);
            setAlertMessage(`Section ${section} verified successfully`);
            setShowSuccessAlert(true);
            setVerificationNotes('');
            setActiveSection(null);
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

    const handleReturnSection = async (section: 'A' | 'B' | 'C' | 'D' | 'E') => {
        if (!evaluation || !isCommittee) return;

        if (!verificationNotes || verificationNotes.trim() === '') {
            setAlertMessage('Please provide notes explaining why this section is being returned');
            setShowErrorAlert(true);
            setTimeout(() => setShowErrorAlert(false), 5000);
            return;
        }

        try {
            setLoading(true);
            await evaluationService.returnSection(evaluation.id, section, verificationNotes);
            setAlertMessage(`Section ${section} returned for changes`);
            setShowSuccessAlert(true);
            setVerificationNotes('');
            setActiveSection(null);
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
                return 'Awaiting Review';
            case 'IN_PROGRESS':
                return 'In Progress';
            case 'RETURNED':
                return 'Returned';
            case 'NOT_STARTED':
                return 'Not Started';
        }
    };

    const renderSectionContent = (section: 'A' | 'B' | 'C' | 'D' | 'E', title: string) => {
        const status = getSectionStatus(section);
        const sectionData = evaluation?.[`section${section}` as keyof Evaluation];
        const sectionNotes = evaluation?.[`section${section}Notes` as keyof Evaluation] as string | undefined;
        const sectionVerifier = evaluation?.[`section${section}Verifier` as keyof Evaluation] as { id: number; name: string | null; email: string } | undefined;

        const isReviewable = status === 'SUBMITTED';
        const isActive = activeSection === section;

        return (
            <div key={section} className="panel mb-5">
                <div className="mb-4 flex items-center justify-between">
                    <h5 className="text-lg font-semibold">{title}</h5>
                    <span className={getStatusBadge(status)}>{getStatusText(status)}</span>
                </div>

                {/* Status Messages */}
                {status === 'RETURNED' && sectionNotes && (
                    <div className="mb-4 rounded bg-danger-light p-4 dark:bg-danger/20">
                        <h6 className="font-semibold text-danger mb-2">⚠️ Section Returned for Changes</h6>
                        <p className="text-sm">{sectionNotes}</p>
                        {sectionVerifier && <p className="text-xs text-white-dark mt-2">Reviewed by: {sectionVerifier.name || sectionVerifier.email}</p>}
                    </div>
                )}

                {status === 'VERIFIED' && (
                    <div className="mb-4 rounded bg-success-light p-4 dark:bg-success/20">
                        <div className="flex items-center gap-2 mb-1">
                            <IconChecks className="h-5 w-5 text-success" />
                            <h6 className="font-semibold text-success">Section Verified</h6>
                        </div>
                        {sectionVerifier && <p className="text-sm text-white-dark">Verified by: {sectionVerifier.name || sectionVerifier.email}</p>}
                    </div>
                )}

                {/* Section Data Display */}
                <div className="rounded border border-white-light p-4 dark:border-dark bg-[#fafafa] dark:bg-[#0e1726]">
                    {sectionData ? (
                        <pre className="text-sm overflow-auto max-h-96 font-mono whitespace-pre-wrap break-words">{JSON.stringify(sectionData, null, 2)}</pre>
                    ) : (
                        <p className="text-white-dark text-sm italic">No data provided for this section</p>
                    )}
                </div>

                {/* Committee Review Actions */}
                {isCommittee && isReviewable && (
                    <div className="mt-4 rounded border-2 border-primary bg-primary-light p-4 dark:bg-primary/10">
                        <h6 className="font-semibold mb-3">Committee Review</h6>

                        {!isActive ? (
                            <button onClick={() => setActiveSection(section)} className="btn btn-primary btn-sm">
                                Review This Section
                            </button>
                        ) : (
                            <>
                                <div className="mb-4">
                                    <label htmlFor={`notes-${section}`} className="mb-2 block font-semibold">
                                        Review Notes <span className="text-danger">*</span>
                                    </label>
                                    <textarea
                                        id={`notes-${section}`}
                                        rows={4}
                                        className="form-textarea"
                                        placeholder="Required for returning section, optional for verification..."
                                        value={verificationNotes}
                                        onChange={(e) => setVerificationNotes(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => handleVerifySection(section)} className="btn btn-success gap-2" disabled={loading}>
                                        <IconChecks className="h-4 w-4" />
                                        Verify Section
                                    </button>
                                    <button onClick={() => handleReturnSection(section)} className="btn btn-danger gap-2" disabled={loading}>
                                        <IconX className="h-4 w-4" />
                                        Return Section
                                    </button>
                                    <button
                                        onClick={() => {
                                            setActiveSection(null);
                                            setVerificationNotes('');
                                        }}
                                        className="btn btn-outline-secondary"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        );
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
                    <Link to="/procurement/evaluation/committee/dashboard" className="btn btn-primary">
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

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
                        {evaluation.evalNumber} • {evaluation.rfqNumber} • {evaluation.rfqTitle}
                    </p>
                </div>
                <Link to="/procurement/evaluation/committee/dashboard" className="btn btn-outline-info gap-2">
                    <IconArrowLeft />
                    Dashboard
                </Link>
            </div>

            {/* All Sections in Single View */}
            <div className="max-w-5xl mx-auto">
                {renderSectionContent('A', 'Section A: Procurement Details')}
                {renderSectionContent('B', 'Section B: Eligibility & Compliance')}
                {renderSectionContent('C', 'Section C: Evaluator Comments & Recommendation')}
                {renderSectionContent('D', 'Section D: Summary')}
                {renderSectionContent('E', 'Section E: Procurement Officer Recommendation')}
            </div>
        </div>
    );
};

export default EvaluationCommittee;
