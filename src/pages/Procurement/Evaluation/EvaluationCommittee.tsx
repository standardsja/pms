import { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';
import IconChecks from '../../../components/Icon/IconChecks';
import IconX from '../../../components/Icon/IconX';
import { getUser } from '../../../utils/auth';
import { useTranslation } from 'react-i18next';
import { evaluationService, type Evaluation, type SectionVerificationStatus, type SectionC as SectionCType } from '../../../services/evaluationService';

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
    const [bulkNotes, setBulkNotes] = useState('');
    const [sectionCForm, setSectionCForm] = useState<SectionCType | null>(null);

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

    const loadEvaluation = useCallback(
        async (preserveSectionC = false) => {
            try {
                setLoading(true);
                setError(null);
                const data = await evaluationService.getEvaluationById(parseInt(id || '0'));
                setEvaluation(data);
                if (!preserveSectionC) {
                    if (data?.sectionC) {
                        setSectionCForm(data.sectionC as SectionCType);
                    } else {
                        const today = new Date().toISOString().slice(0, 10);
                        const defaultForm: SectionCType = {
                            comments: '',
                            criticalIssues: '',
                            actionTaken: 'RECOMMENDED',
                            recommendedSupplier: '',
                            recommendedAmountInclusiveGCT: 0,
                            evaluatorName: '',
                            evaluatorTitle: '',
                            evaluationDate: today,
                        };
                        setSectionCForm(defaultForm);
                    }
                }
            } catch (err: any) {
                console.error('Failed to load evaluation:', err);
                setError(err.message || 'Failed to load evaluation');
            } finally {
                setLoading(false);
            }
        },
        [id]
    );

    // Load evaluation data
    useEffect(() => {
        loadEvaluation();
    }, [loadEvaluation]);

    const handleVerifySection = async (section: 'A' | 'B' | 'C' | 'D' | 'E') => {
        if (!evaluation || !isCommittee) return;

        const status = getSectionStatus(section);
        if (status !== 'SUBMITTED') {
            setAlertMessage(`Section ${section} must be submitted before verification`);
            setShowErrorAlert(true);
            setTimeout(() => setShowErrorAlert(false), 5000);
            return;
        }

        try {
            setLoading(true);
            const updatedEval = await evaluationService.verifySection(evaluation.id, section, verificationNotes);
            setEvaluation(updatedEval);
            setAlertMessage(`Section ${section} verified successfully`);
            setShowSuccessAlert(true);
            setVerificationNotes('');
            setActiveSection(null);
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
            const updatedEval = await evaluationService.returnSection(evaluation.id, section, verificationNotes);
            setEvaluation(updatedEval);
            setAlertMessage(`Section ${section} returned for changes`);
            setShowSuccessAlert(true);
            setVerificationNotes('');
            setActiveSection(null);
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

    const sectionIds: Array<'A' | 'B' | 'C' | 'D' | 'E'> = ['A', 'B', 'C', 'D', 'E'];
    const getSubmittedSections = (): Array<'A' | 'B' | 'C' | 'D' | 'E'> => sectionIds.filter((s) => getSectionStatus(s) === 'SUBMITTED');
    const getReturnableSections = (): Array<'A' | 'B' | 'C' | 'D' | 'E'> => sectionIds.filter((s) => getSectionStatus(s) !== 'VERIFIED' && getSectionStatus(s) !== 'NOT_STARTED');

    const handleVerifyAll = async () => {
        if (!evaluation || !isCommittee) return;
        const targets = getSubmittedSections();
        if (targets.length === 0) {
            setAlertMessage('No sections are awaiting review.');
            setShowErrorAlert(true);
            setTimeout(() => setShowErrorAlert(false), 3000);
            return;
        }

        try {
            setLoading(true);
            let updatedEval = evaluation;
            for (const s of targets) {
                updatedEval = await evaluationService.verifySection(evaluation.id, s, bulkNotes || undefined);
            }

            // Check if all sections are now verified
            const allVerified = sectionIds.every((s) => updatedEval[`section${s}Status` as keyof typeof updatedEval] === 'VERIFIED');

            setEvaluation(updatedEval);

            if (allVerified) {
                setAlertMessage(`All sections verified! Evaluation completed and procurement officer has been notified.`);
            } else {
                setAlertMessage(`Verified ${targets.length} section${targets.length > 1 ? 's' : ''}`);
            }

            setShowSuccessAlert(true);
            setBulkNotes('');
            setTimeout(() => setShowSuccessAlert(false), 3000);
        } catch (err: any) {
            setAlertMessage(err.message || 'Failed to verify all sections');
            setShowErrorAlert(true);
            setTimeout(() => setShowErrorAlert(false), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleReturnAll = async () => {
        if (!evaluation || !isCommittee) return;
        if (!bulkNotes || bulkNotes.trim() === '') {
            setAlertMessage('Please provide notes to return the evaluation.');
            setShowErrorAlert(true);
            setTimeout(() => setShowErrorAlert(false), 4000);
            return;
        }

        const targets = getReturnableSections();
        if (targets.length === 0) {
            setAlertMessage('No sections to return.');
            setShowErrorAlert(true);
            setTimeout(() => setShowErrorAlert(false), 3000);
            return;
        }

        try {
            setLoading(true);
            let updatedEval = evaluation;
            for (const s of targets) {
                updatedEval = await evaluationService.returnSection(evaluation.id, s, bulkNotes);
            }
            setEvaluation(updatedEval);
            setAlertMessage(`Returned ${targets.length} section${targets.length > 1 ? 's' : ''} for changes`);
            setShowSuccessAlert(true);
            setBulkNotes('');
            setTimeout(() => setShowSuccessAlert(false), 3000);
        } catch (err: any) {
            setAlertMessage(err.message || 'Failed to return sections');
            setShowErrorAlert(true);
            setTimeout(() => setShowErrorAlert(false), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAllAndComplete = async () => {
        if (!evaluation || !isCommittee) return;
        const targets = getSubmittedSections();
        const allWouldBeVerified = sectionIds.every((s) => {
            const st = getSectionStatus(s);
            return st === 'VERIFIED' || st === 'SUBMITTED';
        });
        try {
            setLoading(true);
            let updatedEval = evaluation;
            for (const s of targets) {
                updatedEval = await evaluationService.verifySection(evaluation.id, s, bulkNotes || undefined);
            }

            // The backend automatically updates status to COMPLETED and sends notification when all verified
            const allVerified = sectionIds.every((s) => updatedEval[`section${s}Status` as keyof typeof updatedEval] === 'VERIFIED');

            setEvaluation(updatedEval);

            if (allVerified) {
                setAlertMessage('All sections verified and evaluation completed! Procurement officer has been notified.');
            } else {
                setAlertMessage(`Verified ${targets.length} section${targets.length > 1 ? 's' : ''}`);
            }

            setShowSuccessAlert(true);
            setBulkNotes('');
            setTimeout(() => setShowSuccessAlert(false), 3000);
        } catch (err: any) {
            setAlertMessage(err.message || 'Failed to process bulk verification');
            setShowErrorAlert(true);
            setTimeout(() => setShowErrorAlert(false), 5000);
        } finally {
            setLoading(false);
        }
    };

    // Helpers to render section data in a structured report layout
    const titleCase = (str: string) =>
        str
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/_/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());

    // Reusable Field Components for consistent layout
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
            <div className="rounded border border-white-light dark:border-dark bg-white-light dark:bg-[#1b2e4b] px-4 py-3 text-sm">
                {value !== null && value !== undefined && value !== '' ? String(value) : '-'}
            </div>
        </div>
    );

    const TextAreaField = ({ label, value, fullWidth = true }: { label: string; value: any; fullWidth?: boolean }) => (
        <div className={fullWidth ? 'md:col-span-2' : ''}>
            <label className="mb-2 block text-sm font-semibold text-white-dark">{label}</label>
            <div className="rounded border border-white-light dark:border-dark bg-white-light dark:bg-[#1b2e4b] px-4 py-3 text-sm min-h-[80px] whitespace-pre-wrap">
                {value !== null && value !== undefined && value !== '' ? String(value) : '-'}
            </div>
        </div>
    );

    // Section renderers matching NewEvaluationComplete layout
    const renderSectionAFormStyle = (sectionA: any) => (
        <div className="space-y-6">
            <FieldGroup title="Basic Information" color="primary">
                <Field label="RFQ Number" value={evaluation?.rfqNumber} />
                <Field label="RFQ Title" value={evaluation?.rfqTitle} />
                <TextAreaField label="Description" value={evaluation?.description || ''} />
            </FieldGroup>
            <FieldGroup title="Financial Information" color="success">
                <Field label="Comparable Estimate (JMD)" value={sectionA?.comparableEstimate} />
                <Field label="Funded By" value={sectionA?.fundedBy} />
            </FieldGroup>
            <FieldGroup title="Tender Schedule" color="info">
                <Field label="Tender Closing Date" value={sectionA?.tenderClosingDate} />
                <Field label="Tender Closing Time" value={sectionA?.tenderClosingTime} />
                <Field label="Tender Opening Date" value={sectionA?.tenderOpeningDate} />
                <Field label="Tender Opening Time" value={sectionA?.tenderOpeningTime} />
                <Field label="Actual Opening Date" value={sectionA?.actualOpeningDate} />
                <Field label="Actual Opening Time" value={sectionA?.actualOpeningTime} />
            </FieldGroup>
            <FieldGroup title="Procurement Method & Type" color="warning">
                <Field label="Procurement Method" value={titleCase(String(sectionA?.procurementMethod || ''))} />
                <Field label="Contract Type" value={titleCase(String(sectionA?.contractType || ''))} />
                <Field label="Bid Security Required" value={sectionA?.bidSecurity} />
                <Field label="Award Criteria" value={titleCase(String(sectionA?.awardCriteria || ''))} />
                <Field label="Bid Validity (Days)" value={sectionA?.bidValidityDays} />
                <Field label="Number of Bids Requested" value={sectionA?.numberOfBidsRequested} />
                <Field label="Arithmetic Error Identified" value={sectionA?.arithmeticErrorIdentified ? 'Yes' : 'No'} />
                <Field label="Retender" value={sectionA?.retender ? 'Yes' : 'No'} />
            </FieldGroup>
        </div>
    );

    const renderSectionBFormStyle = (sectionB: any) => {
        const bidders = sectionB?.bidders || [];
        return (
            <div className="space-y-6">
                <FieldGroup title="Eligibility Requirements & Compliance Matrix" color="primary">
                    <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-semibold text-white-dark">Total Bidders</label>
                        <div className="rounded border border-white-light dark:border-dark bg-white-light dark:bg-[#1b2e4b] px-4 py-3 text-sm font-bold">{bidders.length}</div>
                    </div>
                </FieldGroup>
                {bidders.map((bidder: any, index: number) => (
                    <FieldGroup key={index} title={`Bidder ${index + 1}: ${bidder.name || 'Unnamed'}`} color="info">
                        <Field label="Bidder Name" value={bidder.name} />
                        <Field label="Bid Amount (JMD)" value={bidder.bidAmount} />
                        <Field label="Eligibility Met" value={bidder.eligibilityMet ? 'Yes' : 'No'} />
                        <Field label="Technical Score" value={bidder.technicalScore} />
                        <TextAreaField label="Compliance Notes" value={bidder.complianceNotes} />
                        <TextAreaField label="Specifications" value={bidder.specifications} />
                    </FieldGroup>
                ))}
            </div>
        );
    };

    const renderSectionDFormStyle = (sectionD: any) => (
        <FieldGroup title="Summary" color="warning">
            <TextAreaField label="Evaluation Summary" value={sectionD?.summary} />
        </FieldGroup>
    );

    const renderSectionEFormStyle = (sectionE: any) => (
        <FieldGroup title="Final Recommendation" color="success">
            <TextAreaField label="Recommendation" value={sectionE?.finalRecommendation} />
            <Field label="% Difference" value={sectionE?.percentageDifference} />
            <Field label="Prepared By" value={sectionE?.preparedBy} />
        </FieldGroup>
    );

    const renderSectionContent = useCallback(
        (section: 'A' | 'B' | 'C' | 'D' | 'E', title: string) => {
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

                    {/* Section Data Display (report style) */}
                    <div className="animate-[fadeIn_0.3s_ease-in-out]">
                        {section === 'A' && renderSectionAFormStyle(sectionData)}
                        {section === 'B' && renderSectionBFormStyle(sectionData)}
                        {section === 'C' && (
                            <div className="space-y-6">
                                {!isCommittee ? (
                                    <>
                                        <FieldGroup title="Evaluator Comments" color="warning">
                                            <TextAreaField label="Comments" value={(sectionData as SectionCType)?.comments} />
                                            <TextAreaField label="Critical Issues" value={(sectionData as SectionCType)?.criticalIssues} />
                                            <Field label="Action Taken" value={titleCase(String((sectionData as SectionCType)?.actionTaken || ''))} />
                                            <Field label="Recommended Supplier" value={(sectionData as SectionCType)?.recommendedSupplier} />
                                            <Field label="Recommended Amount (Incl. GCT)" value={(sectionData as SectionCType)?.recommendedAmountInclusiveGCT} />
                                        </FieldGroup>
                                        <FieldGroup title="Evaluator Details" color="info">
                                            <Field label="Evaluator Name" value={(sectionData as SectionCType)?.evaluatorName} />
                                            <Field label="Evaluator Title" value={(sectionData as SectionCType)?.evaluatorTitle} />
                                            <Field label="Evaluation Date" value={(sectionData as SectionCType)?.evaluationDate} />
                                        </FieldGroup>
                                    </>
                                ) : (
                                    <>
                                        <div className="panel border-l-4 border-warning">
                                            <div className="mb-5">
                                                <h5 className="text-lg font-bold text-warning">Evaluator Comments</h5>
                                            </div>
                                            <div className="grid gap-5 md:grid-cols-2">
                                                <div className="md:col-span-2">
                                                    <label className="mb-2 block font-semibold">Comments</label>
                                                    <textarea
                                                        className="form-textarea"
                                                        rows={3}
                                                        value={sectionCForm?.comments || ''}
                                                        onChange={(e) => setSectionCForm((prev) => (prev ? { ...prev, comments: e.target.value } : null))}
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="mb-2 block font-semibold">Critical Issues</label>
                                                    <textarea
                                                        className="form-textarea"
                                                        rows={3}
                                                        value={sectionCForm?.criticalIssues || ''}
                                                        onChange={(e) => setSectionCForm((prev) => (prev ? { ...prev, criticalIssues: e.target.value } : null))}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-2 block font-semibold">Action Taken</label>
                                                    <select
                                                        className="form-select"
                                                        value={sectionCForm?.actionTaken || 'RECOMMENDED'}
                                                        onChange={(e) => setSectionCForm((prev) => (prev ? { ...prev, actionTaken: e.target.value as SectionCType['actionTaken'] } : null))}
                                                    >
                                                        <option value="RECOMMENDED">Recommended</option>
                                                        <option value="REJECTED">Rejected</option>
                                                        <option value="DEFERRED">Deferred</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="mb-2 block font-semibold">Recommended Supplier</label>
                                                    <input
                                                        className="form-input"
                                                        value={sectionCForm?.recommendedSupplier || ''}
                                                        onChange={(e) => setSectionCForm((prev) => (prev ? { ...prev, recommendedSupplier: e.target.value } : null))}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-2 block font-semibold">Recommended Amount (Incl. GCT)</label>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        value={sectionCForm?.recommendedAmountInclusiveGCT ?? 0}
                                                        onChange={(e) => setSectionCForm((prev) => (prev ? { ...prev, recommendedAmountInclusiveGCT: Number(e.target.value) } : null))}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="panel border-l-4 border-info">
                                            <div className="mb-5">
                                                <h5 className="text-lg font-bold text-info">Evaluator Details</h5>
                                            </div>
                                            <div className="grid gap-5 md:grid-cols-2">
                                                <div>
                                                    <label className="mb-2 block font-semibold">Evaluator Name</label>
                                                    <input
                                                        className="form-input"
                                                        value={sectionCForm?.evaluatorName || ''}
                                                        onChange={(e) => setSectionCForm((prev) => (prev ? { ...prev, evaluatorName: e.target.value } : null))}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-2 block font-semibold">Evaluator Title</label>
                                                    <input
                                                        className="form-input"
                                                        value={sectionCForm?.evaluatorTitle || ''}
                                                        onChange={(e) => setSectionCForm((prev) => (prev ? { ...prev, evaluatorTitle: e.target.value } : null))}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-2 block font-semibold">Evaluation Date</label>
                                                    <input
                                                        type="date"
                                                        className="form-input"
                                                        value={sectionCForm?.evaluationDate || ''}
                                                        onChange={(e) => setSectionCForm((prev) => (prev ? { ...prev, evaluationDate: e.target.value } : null))}
                                                    />
                                                </div>
                                                <div className="md:col-span-2 flex justify-end">
                                                    <button
                                                        className="btn btn-primary"
                                                        onClick={async () => {
                                                            if (!evaluation || !sectionCForm) return;
                                                            try {
                                                                setLoading(true);
                                                                await evaluationService.updateCommitteeSection(evaluation.id, 'C', sectionCForm);
                                                                setAlertMessage('Section C saved');
                                                                setShowSuccessAlert(true);
                                                                await loadEvaluation(true);
                                                                setTimeout(() => setShowSuccessAlert(false), 2000);
                                                            } catch (err: any) {
                                                                setAlertMessage(err.message || 'Failed to save Section C');
                                                                setShowErrorAlert(true);
                                                                setTimeout(() => setShowErrorAlert(false), 4000);
                                                            } finally {
                                                                setLoading(false);
                                                            }
                                                        }}
                                                    >
                                                        Save Section C
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        {section === 'D' && renderSectionDFormStyle(sectionData)}
                        {section === 'E' && renderSectionEFormStyle(sectionData)}
                        {!sectionData && <p className="text-white-dark text-sm italic">No data provided for this section</p>}
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
        },
        [evaluation, activeSection, isCommittee, verificationNotes, loading, sectionCForm]
    );

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
                {isCommittee && (
                    <div className="sticky bottom-0 mt-6 bg-[#0e1726]/60 dark:bg-[#0e1726]/60 backdrop-blur supports-[backdrop-filter]:bg-white/70 rounded border-2 border-primary p-4">
                        <div className="mb-3 text-sm text-white-dark">Bulk action applies to all relevant sections (Submitted for Verify; all non‑verified for Return).</div>
                        <div className="mb-3">
                            <label className="mb-1 block font-semibold">Notes</label>
                            <textarea className="form-textarea" rows={3} placeholder="Notes (required for Return All)" value={bulkNotes} onChange={(e) => setBulkNotes(e.target.value)} />
                        </div>
                        <div className="flex flex-wrap gap-3">
                            <button onClick={handleVerifyAll} className="btn btn-success" disabled={loading || getSubmittedSections().length === 0}>
                                Verify All ({getSubmittedSections().length})
                            </button>
                            <button
                                onClick={handleVerifyAllAndComplete}
                                className="btn btn-primary"
                                disabled={loading || (getSubmittedSections().length === 0 && !sectionIds.every((s) => getSectionStatus(s) === 'VERIFIED'))}
                            >
                                Verify All & Complete
                            </button>
                            <button onClick={handleReturnAll} className="btn btn-danger" disabled={loading || getReturnableSections().length === 0}>
                                Return All ({getReturnableSections().length})
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EvaluationCommittee;
