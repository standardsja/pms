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

type SectionStatus = 'not-started' | 'in-progress' | 'completed';

interface EvaluationCommitteeData {
    evalId: string;
    evalNumber: string;
    rfqNumber: string;
    rfqTitle: string;
    sectionStatuses: {
        sectionA: SectionStatus;
        sectionB: SectionStatus;
        sectionC: SectionStatus;
        sectionD: SectionStatus;
        sectionE: SectionStatus;
    };
    currentSection: 'A' | 'B' | 'C' | 'D' | 'E';
}

const EvaluationCommittee = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { id } = useParams();
    const { t } = useTranslation();

    const [committeeData, setCommitteeData] = useState<EvaluationCommitteeData>({
        evalId: id || '1',
        evalNumber: 'PRO_70_F_14/00',
        rfqNumber: 'OFMB/AUG/2025/015',
        rfqTitle: 'Procurement of Chair',
        sectionStatuses: {
            sectionA: 'completed',
            sectionB: 'not-started',
            sectionC: 'not-started',
            sectionD: 'not-started',
            sectionE: 'not-started',
        },
        currentSection: 'A',
    });

    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');

    useEffect(() => {
        dispatch(setPageTitle(t('evaluation.committee.pageTitle', 'Evaluation Committee - BSJ Report')));
    }, [dispatch, t]);

    // Role guard (Committee members and procurement officers)
    useEffect(() => {
        const u = getUser();
        if (!u) {
            navigate('/procurement/evaluation');
            return;
        }
        const roles = (u?.roles || (u?.role ? [u.role] : [])).map((r) => r.toUpperCase());
        // Allow access for committee members, procurement officers, and procurement managers
        const hasAccess = roles.some(
            (role) =>
                role.includes('COMMITTEE') ||
                role.includes('EVALUATION_COMMITTEE') ||
                role.includes('INNOVATION_COMMITTEE') ||
                role.includes('PROCUREMENT_OFFICER') ||
                role.includes('PROCUREMENT_MANAGER') ||
                role.includes('PROCUREMENT')
        );
        if (!hasAccess) {
            navigate('/procurement/evaluation');
        }
    }, [navigate]);

    const sections = [
        {
            id: 'A' as const,
            title: 'Section A: Procurement Details',
            description: 'Review and verify procurement details',
            status: committeeData.sectionStatuses.sectionA,
        },
        {
            id: 'B' as const,
            title: 'Section B: Eligibility & Compliance',
            description: 'Evaluate eligibility requirements and compliance matrix for each bidder',
            status: committeeData.sectionStatuses.sectionB,
        },
        {
            id: 'C' as const,
            title: 'Section C: Evaluator Comments & Recommendation',
            description: 'Provide comments, critical issues, and recommendation',
            status: committeeData.sectionStatuses.sectionC,
        },
        {
            id: 'D' as const,
            title: 'Section D: Summary',
            description: 'Summarize evaluation findings',
            status: committeeData.sectionStatuses.sectionD,
        },
        {
            id: 'E' as const,
            title: 'Section E: Procurement Officer Recommendation',
            description: 'Final recommendation and approval',
            status: committeeData.sectionStatuses.sectionE,
        },
    ];

    const getStatusBadge = (status: SectionStatus) => {
        switch (status) {
            case 'completed':
                return 'badge bg-success';
            case 'in-progress':
                return 'badge bg-warning';
            case 'not-started':
                return 'badge bg-secondary';
        }
    };

    const getStatusText = (status: SectionStatus) => {
        switch (status) {
            case 'completed':
                return 'Completed';
            case 'in-progress':
                return 'In Progress';
            case 'not-started':
                return 'Not Started';
        }
    };

    const handleStartSection = (sectionId: 'A' | 'B' | 'C' | 'D' | 'E') => {
        setCommitteeData({
            ...committeeData,
            currentSection: sectionId,
        });
    };

    const handleSaveProgress = () => {
        setAlertMessage('Progress saved successfully!');
        setShowSuccessAlert(true);
        setTimeout(() => setShowSuccessAlert(false), 3000);
    };

    const handleCompleteSection = () => {
        const sectionKey = `section${committeeData.currentSection}` as keyof typeof committeeData.sectionStatuses;
        setCommitteeData({
            ...committeeData,
            sectionStatuses: {
                ...committeeData.sectionStatuses,
                [sectionKey]: 'completed',
            },
        });
        setAlertMessage(`Section ${committeeData.currentSection} completed successfully!`);
        setShowSuccessAlert(true);
        setTimeout(() => setShowSuccessAlert(false), 3000);
    };

    const renderSectionContent = () => {
        switch (committeeData.currentSection) {
            case 'A':
                return <SectionAContent />;
            case 'B':
                return <SectionBContent />;
            case 'C':
                return <SectionCContent onSave={handleSaveProgress} />;
            case 'D':
                return <SectionDContent onSave={handleSaveProgress} />;
            case 'E':
                return <SectionEContent onSave={handleSaveProgress} />;
            default:
                return null;
        }
    };

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

            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Evaluation Committee - BSJ Report</h2>
                    <p className="text-white-dark">
                        {committeeData.evalNumber} • {committeeData.rfqTitle}
                    </p>
                </div>
                <Link to="/procurement/evaluation" className="btn btn-outline-danger gap-2">
                    <IconArrowLeft />
                    {t('evaluation.detail.back', 'Back to List')}
                </Link>
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
                {/* Sidebar - Section Navigation */}
                <div className="lg:col-span-4">
                    <div className="panel sticky top-6">
                        <h5 className="mb-5 text-lg font-semibold">Evaluation Workflow</h5>
                        <div className="space-y-3">
                            {sections.map((section, index) => (
                                <div
                                    key={section.id}
                                    className={`rounded border-2 p-4 transition cursor-pointer ${
                                        committeeData.currentSection === section.id
                                            ? 'border-primary bg-primary-light dark:bg-primary/20'
                                            : 'border-white-light dark:border-dark hover:border-primary/50'
                                    }`}
                                    onClick={() => handleStartSection(section.id)}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 mt-1">
                                            {section.status === 'completed' ? (
                                                <IconCircleCheck className="h-6 w-6 text-success" />
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
                            ))}
                        </div>
                    </div>
                </div>

                {/* Main Content - Current Section */}
                <div className="lg:col-span-8">
                    <div className="panel">
                        <div className="mb-5 flex items-center justify-between border-b pb-5">
                            <h5 className="text-lg font-semibold">{sections.find((s) => s.id === committeeData.currentSection)?.title}</h5>
                            <span className={getStatusBadge(committeeData.sectionStatuses[`section${committeeData.currentSection}` as keyof typeof committeeData.sectionStatuses])}>
                                {getStatusText(committeeData.sectionStatuses[`section${committeeData.currentSection}` as keyof typeof committeeData.sectionStatuses])}
                            </span>
                        </div>

                        {renderSectionContent()}

                        {/* Action Buttons */}
                        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t pt-5">
                            <button onClick={handleSaveProgress} className="btn btn-outline-primary gap-2">
                                <IconSave className="h-4 w-4" />
                                Save Progress
                            </button>
                            <button onClick={handleCompleteSection} className="btn btn-success gap-2">
                                <IconChecks className="h-4 w-4" />
                                Complete Section
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Section A Component - Review Only
const SectionAContent = () => {
    return (
        <div className="space-y-4">
            <div className="rounded bg-info/5 p-4">
                <p className="text-sm text-white-dark">
                    <strong>Note:</strong> Section A contains procurement details that have been completed during report creation. Review the information below for accuracy.
                </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <div>
                    <label className="mb-2 block text-sm font-semibold">Comparable Estimate</label>
                    <div className="rounded bg-gray-100 p-3 dark:bg-gray-800">$49,680.00</div>
                </div>
                <div>
                    <label className="mb-2 block text-sm font-semibold">Funded By</label>
                    <div className="rounded bg-gray-100 p-3 dark:bg-gray-800">BSJ</div>
                </div>
                <div>
                    <label className="mb-2 block text-sm font-semibold">Tender Closing Date & Time</label>
                    <div className="rounded bg-gray-100 p-3 dark:bg-gray-800">2025-10-07 @ 14:30</div>
                </div>
                <div>
                    <label className="mb-2 block text-sm font-semibold">Procurement Method</label>
                    <div className="rounded bg-gray-100 p-3 dark:bg-gray-800">National Competitive Bidding</div>
                </div>
            </div>
        </div>
    );
};

// Section B Component - Eligibility & Compliance
const SectionBContent = () => {
    const [selectedBidder, setSelectedBidder] = useState('bidder1');
    const [complianceData, setComplianceData] = useState({
        ppcCategory: '',
        tciTrn: '',
        bidAmount: '',
        signedLetterOfQuotation: false,
        signedPriceSchedules: false,
        signedStatementOfCompliance: false,
        bidValidity30Days: false,
        quotationProvided: false,
        bidAmountMatches: false,
    });

    const bidders = [
        { id: 'bidder1', name: 'Stationery & Office Supplies', amount: 49680 },
        { id: 'bidder2', name: 'ABC Corporation', amount: 52000 },
    ];

    return (
        <div className="space-y-6">
            <div>
                <label className="mb-2 block font-semibold">Select Bidder to Evaluate</label>
                <select className="form-select" value={selectedBidder} onChange={(e) => setSelectedBidder(e.target.value)}>
                    {bidders.map((bidder) => (
                        <option key={bidder.id} value={bidder.id}>
                            {bidder.name} - ${bidder.amount.toLocaleString()}
                        </option>
                    ))}
                </select>
            </div>

            <div className="rounded border p-4">
                <h6 className="mb-4 font-semibold">Eligibility Requirements</h6>
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label htmlFor="ppcCategory" className="mb-2 block text-sm font-semibold">
                            PPC Registration Category
                        </label>
                        <input
                            id="ppcCategory"
                            type="text"
                            className="form-input"
                            placeholder="e.g., N/A"
                            value={complianceData.ppcCategory}
                            onChange={(e) => setComplianceData({ ...complianceData, ppcCategory: e.target.value })}
                        />
                    </div>
                    <div>
                        <label htmlFor="tciTrn" className="mb-2 block text-sm font-semibold">
                            TCI/TRN
                        </label>
                        <input
                            id="tciTrn"
                            type="text"
                            className="form-input"
                            placeholder="e.g., 000-002-852"
                            value={complianceData.tciTrn}
                            onChange={(e) => setComplianceData({ ...complianceData, tciTrn: e.target.value })}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="bidAmount" className="mb-2 block text-sm font-semibold">
                            Bid Amount (Inclusive GCT)
                        </label>
                        <input
                            id="bidAmount"
                            type="number"
                            step="0.01"
                            className="form-input"
                            placeholder="49680.00"
                            value={complianceData.bidAmount}
                            onChange={(e) => setComplianceData({ ...complianceData, bidAmount: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <div className="rounded border p-4">
                <h6 className="mb-4 font-semibold">Compliance Matrix (ITB Requirements)</h6>
                <div className="space-y-3">
                    {[
                        { key: 'signedLetterOfQuotation', label: 'Signed Letter of Quotation' },
                        { key: 'signedPriceSchedules', label: 'Signed Price Schedules' },
                        { key: 'signedStatementOfCompliance', label: 'Signed Statement of Compliance' },
                        { key: 'bidValidity30Days', label: 'Bid Validity (30 days minimum)' },
                        { key: 'quotationProvided', label: 'Quotation Provided' },
                        { key: 'bidAmountMatches', label: 'Bid Amount Matches Documentation' },
                    ].map((item) => (
                        <label key={item.key} className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                className="form-checkbox"
                                checked={complianceData[item.key as keyof typeof complianceData] as boolean}
                                onChange={(e) => setComplianceData({ ...complianceData, [item.key]: e.target.checked })}
                            />
                            <span className="font-semibold">{item.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            <div className="rounded border p-4">
                <h6 className="mb-4 font-semibold">Technical Evaluation</h6>
                <table className="w-full">
                    <thead>
                        <tr>
                            <th className="border-b p-2 text-left">Specifications</th>
                            <th className="border-b p-2 text-center">Quantity</th>
                            <th className="border-b p-2 text-right">Bid Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border-b p-2">
                                <input type="text" className="form-input" placeholder="Item specifications" />
                            </td>
                            <td className="border-b p-2">
                                <input type="number" className="form-input text-center" placeholder="1" />
                            </td>
                            <td className="border-b p-2">
                                <input type="number" step="0.01" className="form-input text-right" placeholder="0.00" />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Section C Component - Comments & Recommendation
const SectionCContent = ({ onSave }: { onSave: () => void }) => {
    const [formData, setFormData] = useState({
        comments: '',
        criticalIssues: '',
        actionTaken: 'Recommended' as 'Recommended' | 'Rejected' | 'Deferred',
        rejectionReason: '',
        recommendedSupplier: '',
        recommendedAmount: '',
        evaluatorName: '',
        evaluatorTitle: 'Procurement Officer',
    });

    return (
        <div className="space-y-6">
            <div>
                <label htmlFor="comments" className="mb-2 block font-semibold">
                    Comments <span className="text-danger">*</span>
                </label>
                <textarea
                    id="comments"
                    rows={4}
                    className="form-textarea"
                    placeholder="Provide detailed comments on the evaluation..."
                    value={formData.comments}
                    onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                />
            </div>

            <div>
                <label htmlFor="criticalIssues" className="mb-2 block font-semibold">
                    Critical Issues
                </label>
                <textarea
                    id="criticalIssues"
                    rows={3}
                    className="form-textarea"
                    placeholder="Identify any critical issues (if any)"
                    value={formData.criticalIssues}
                    onChange={(e) => setFormData({ ...formData, criticalIssues: e.target.value })}
                />
            </div>

            <div>
                <label className="mb-2 block font-semibold">
                    Action Taken <span className="text-danger">*</span>
                </label>
                <div className="flex gap-4">
                    {['Recommended', 'Rejected', 'Deferred'].map((action) => (
                        <label key={action} className="flex items-center gap-2">
                            <input
                                type="radio"
                                name="actionTaken"
                                value={action}
                                checked={formData.actionTaken === action}
                                onChange={(e) => setFormData({ ...formData, actionTaken: e.target.value as any })}
                            />
                            <span>{action}</span>
                        </label>
                    ))}
                </div>
            </div>

            {formData.actionTaken === 'Rejected' && (
                <div>
                    <label htmlFor="rejectionReason" className="mb-2 block font-semibold">
                        Rejection Reason <span className="text-danger">*</span>
                    </label>
                    <textarea
                        id="rejectionReason"
                        rows={3}
                        className="form-textarea"
                        placeholder="Explain the reason for rejection"
                        value={formData.rejectionReason}
                        onChange={(e) => setFormData({ ...formData, rejectionReason: e.target.value })}
                    />
                </div>
            )}

            {formData.actionTaken === 'Recommended' && (
                <div className="rounded border-2 border-success bg-success-light p-4 dark:bg-success-dark-light">
                    <h6 className="mb-4 font-semibold text-success">Recommended Contractor</h6>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label htmlFor="recommendedSupplier" className="mb-2 block text-sm font-semibold">
                                Supplier Name <span className="text-danger">*</span>
                            </label>
                            <input
                                id="recommendedSupplier"
                                type="text"
                                className="form-input"
                                placeholder="Stationery & Office Supplies"
                                value={formData.recommendedSupplier}
                                onChange={(e) => setFormData({ ...formData, recommendedSupplier: e.target.value })}
                            />
                        </div>
                        <div>
                            <label htmlFor="recommendedAmount" className="mb-2 block text-sm font-semibold">
                                Recommended Amount (Inclusive GCT) <span className="text-danger">*</span>
                            </label>
                            <input
                                id="recommendedAmount"
                                type="number"
                                step="0.01"
                                className="form-input"
                                placeholder="49680.00"
                                value={formData.recommendedAmount}
                                onChange={(e) => setFormData({ ...formData, recommendedAmount: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="rounded border p-4">
                <h6 className="mb-4 font-semibold">Evaluator Information</h6>
                <div className="grid gap-4 md:grid-cols-2">
                    <div>
                        <label htmlFor="evaluatorName" className="mb-2 block text-sm font-semibold">
                            Evaluator Name <span className="text-danger">*</span>
                        </label>
                        <input
                            id="evaluatorName"
                            type="text"
                            className="form-input"
                            placeholder="Enter name"
                            value={formData.evaluatorName}
                            onChange={(e) => setFormData({ ...formData, evaluatorName: e.target.value })}
                        />
                    </div>
                    <div>
                        <label htmlFor="evaluatorTitle" className="mb-2 block text-sm font-semibold">
                            Title
                        </label>
                        <input id="evaluatorTitle" type="text" className="form-input" value={formData.evaluatorTitle} onChange={(e) => setFormData({ ...formData, evaluatorTitle: e.target.value })} />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Section D Component - Summary
const SectionDContent = ({ onSave }: { onSave: () => void }) => {
    const [summary, setSummary] = useState('');

    return (
        <div className="space-y-4">
            <div className="rounded bg-primary/5 p-4">
                <p className="text-sm text-white-dark">
                    <strong>Note:</strong> Provide a comprehensive summary of the evaluation findings, including key observations, comparisons, and overall assessment.
                </p>
            </div>
            <div>
                <label htmlFor="summary" className="mb-2 block font-semibold">
                    Evaluation Summary <span className="text-danger">*</span>
                </label>
                <textarea id="summary" rows={8} className="form-textarea" placeholder="The technical team has met and concluded that..." value={summary} onChange={(e) => setSummary(e.target.value)} />
            </div>
        </div>
    );
};

// Section E Component - Procurement Officer Recommendation
const SectionEContent = ({ onSave }: { onSave: () => void }) => {
    const [formData, setFormData] = useState({
        recommendation: '',
        percentageDifference: '',
        preparedBy: '',
    });

    return (
        <div className="space-y-6">
            <div className="rounded bg-danger/5 p-4">
                <p className="text-sm text-white-dark">
                    <strong>Note:</strong> This is the final recommendation section to be completed by the Procurement Officer before submission for approval.
                </p>
            </div>
            <div>
                <label htmlFor="recommendation" className="mb-2 block font-semibold">
                    Final Recommendation <span className="text-danger">*</span>
                </label>
                <textarea
                    id="recommendation"
                    rows={6}
                    className="form-textarea"
                    placeholder="Based on the foregoing, a recommendation is being made for the award of contract to..."
                    value={formData.recommendation}
                    onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
                />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <div>
                    <label htmlFor="percentageDifference" className="mb-2 block font-semibold">
                        Percentage Difference from Estimate
                    </label>
                    <input
                        id="percentageDifference"
                        type="number"
                        step="0.01"
                        className="form-input"
                        placeholder="0.00"
                        value={formData.percentageDifference}
                        onChange={(e) => setFormData({ ...formData, percentageDifference: e.target.value })}
                    />
                </div>
                <div>
                    <label htmlFor="preparedBy" className="mb-2 block font-semibold">
                        Prepared By <span className="text-danger">*</span>
                    </label>
                    <input
                        id="preparedBy"
                        type="text"
                        className="form-input"
                        placeholder="Procurement Officer Name"
                        value={formData.preparedBy}
                        onChange={(e) => setFormData({ ...formData, preparedBy: e.target.value })}
                    />
                </div>
            </div>

            <div className="rounded border-2 border-primary bg-primary-light p-4 dark:bg-primary/20">
                <h6 className="mb-2 font-semibold text-primary">Ready for Submission</h6>
                <p className="text-sm text-white-dark">Once all sections are completed, this evaluation report will be submitted for Department Head review and approval.</p>
            </div>
        </div>
    );
};

export default EvaluationCommittee;
