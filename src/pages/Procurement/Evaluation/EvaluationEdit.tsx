import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';
import IconX from '../../../components/Icon/IconX';
import { getUser } from '../../../utils/auth';
import { evaluationService, type Evaluation } from '../../../services/evaluationService';

const EvaluationEdit = () => {
    const dispatch = useDispatch();
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
        const roles = (u?.roles || (u?.role ? [u.role] : [])).map((r) => r.toUpperCase());
        const hasAccess = roles.some((role) => role.includes('PROCUREMENT_OFFICER') || role.includes('PROCUREMENT_MANAGER') || role.includes('PROCUREMENT'));
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
            await loadEvaluation();
            setTimeout(() => {
                setShowSuccessAlert(false);
                // If no more returned sections, go back to list
                const hasReturned = 
                    evaluation.sectionAStatus === 'RETURNED' || 
                    evaluation.sectionBStatus === 'RETURNED' || 
                    evaluation.sectionDStatus === 'RETURNED' || 
                    evaluation.sectionEStatus === 'RETURNED';
                if (!hasReturned) {
                    navigate('/procurement/evaluation');
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
        
        if (evaluation.sectionAStatus === 'RETURNED') {
            sections.push({ id: 'A', title: 'Section A: Procurement Details', notes: evaluation.sectionANotes || '' });
        }
        if (evaluation.sectionBStatus === 'RETURNED') {
            sections.push({ id: 'B', title: 'Section B: Bidders & Compliance', notes: evaluation.sectionBNotes || '' });
        }
        if (evaluation.sectionDStatus === 'RETURNED') {
            sections.push({ id: 'D', title: 'Section D: Summary', notes: evaluation.sectionDNotes || '' });
        }
        if (evaluation.sectionEStatus === 'RETURNED') {
            sections.push({ id: 'E', title: 'Section E: Procurement Officer Recommendation', notes: evaluation.sectionENotes || '' });
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
                            <p className="text-sm text-white-dark mt-1">{evaluation.evalNumber} - {evaluation.rfqTitle}</p>
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
                                <button
                                    onClick={() => setCurrentSection(section.id)}
                                    className="btn btn-sm btn-warning"
                                >
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
                    <h5 className="text-lg font-semibold mb-4">
                        Editing: Section {currentSection}
                    </h5>
                    <div className="mb-4 p-4 bg-info/10 border border-info rounded">
                        <p className="text-sm">
                            <strong>Note:</strong> Make your changes below, click "Save Changes", then click "Resubmit to Committee" when ready.
                        </p>
                    </div>

                    {/* Section A Form */}
                    {currentSection === 'A' && sectionAForm && (
                        <div className="space-y-6">
                            <div className="panel border-l-4 border-primary">
                                <h6 className="text-md font-bold text-primary mb-4">Basic Information</h6>
                                <div className="grid gap-5 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block font-semibold">Comparable Estimate (JMD)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={sectionAForm.comparableEstimate || ''}
                                            onChange={(e) => setSectionAForm({ ...sectionAForm, comparableEstimate: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block font-semibold">Funded By</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={sectionAForm.fundedBy || ''}
                                            onChange={(e) => setSectionAForm({ ...sectionAForm, fundedBy: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block font-semibold">Tender Closing Date</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={sectionAForm.tenderClosingDate || ''}
                                            onChange={(e) => setSectionAForm({ ...sectionAForm, tenderClosingDate: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block font-semibold">Tender Opening Date</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={sectionAForm.tenderOpeningDate || ''}
                                            onChange={(e) => setSectionAForm({ ...sectionAForm, tenderOpeningDate: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block font-semibold">Bid Validity (Days)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={sectionAForm.bidValidityDays || ''}
                                            onChange={(e) => setSectionAForm({ ...sectionAForm, bidValidityDays: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block font-semibold">Procurement Method</label>
                                        <select
                                            className="form-select"
                                            value={sectionAForm.procurementMethod || ''}
                                            onChange={(e) => setSectionAForm({ ...sectionAForm, procurementMethod: e.target.value })}
                                        >
                                            <option value="NATIONAL_COMPETITIVE_BIDDING">National Competitive Bidding</option>
                                            <option value="INTERNATIONAL_COMPETITIVE_BIDDING">International Competitive Bidding</option>
                                            <option value="RESTRICTED_BIDDING">Restricted Bidding</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Section B Form */}
                    {currentSection === 'B' && sectionBForm && (
                        <div className="space-y-6">
                            <div className="panel border-l-4 border-primary">
                                <h6 className="text-md font-bold text-primary mb-4">Bidders Information</h6>
                                {sectionBForm.bidders?.map((bidder: any, index: number) => (
                                    <div key={index} className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded">
                                        <h6 className="font-semibold mb-3">Bidder {index + 1}</h6>
                                        <div className="grid gap-5 md:grid-cols-2">
                                            <div>
                                                <label className="mb-2 block font-semibold">Bidder Name</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={bidder.bidderName || bidder.name || ''}
                                                    onChange={(e) => {
                                                        const updated = [...sectionBForm.bidders];
                                                        updated[index] = { ...bidder, bidderName: e.target.value, name: e.target.value };
                                                        setSectionBForm({ ...sectionBForm, bidders: updated });
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-2 block font-semibold">Bid Amount (JMD)</label>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    value={bidder.bidAmountInclusiveGCT || bidder.bidAmount || ''}
                                                    onChange={(e) => {
                                                        const updated = [...sectionBForm.bidders];
                                                        updated[index] = { ...bidder, bidAmountInclusiveGCT: parseFloat(e.target.value), bidAmount: parseFloat(e.target.value) };
                                                        setSectionBForm({ ...sectionBForm, bidders: updated });
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-2 block font-semibold">PPC Category</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={bidder.ppcCategory || ''}
                                                    onChange={(e) => {
                                                        const updated = [...sectionBForm.bidders];
                                                        updated[index] = { ...bidder, ppcCategory: e.target.value };
                                                        setSectionBForm({ ...sectionBForm, bidders: updated });
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="mb-2 block font-semibold">TCI/TRN</label>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    value={bidder.tciTrn || ''}
                                                    onChange={(e) => {
                                                        const updated = [...sectionBForm.bidders];
                                                        updated[index] = { ...bidder, tciTrn: e.target.value };
                                                        setSectionBForm({ ...sectionBForm, bidders: updated });
                                                    }}
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="mb-2 block font-semibold">Compliance Notes</label>
                                                <textarea
                                                    className="form-textarea"
                                                    rows={2}
                                                    value={bidder.complianceNotes || ''}
                                                    onChange={(e) => {
                                                        const updated = [...sectionBForm.bidders];
                                                        updated[index] = { ...bidder, complianceNotes: e.target.value };
                                                        setSectionBForm({ ...sectionBForm, bidders: updated });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Section D Form */}
                    {currentSection === 'D' && sectionDForm && (
                        <div className="space-y-6">
                            <div className="panel border-l-4 border-warning">
                                <h6 className="text-md font-bold text-warning mb-4">Summary</h6>
                                <div className="grid gap-5 md:grid-cols-2">
                                    <div className="md:col-span-2">
                                        <label className="mb-2 block font-semibold">Evaluation Summary</label>
                                        <textarea
                                            className="form-textarea"
                                            rows={4}
                                            value={sectionDForm.evaluationSummary || sectionDForm.summary || ''}
                                            onChange={(e) => setSectionDForm({ ...sectionDForm, evaluationSummary: e.target.value, summary: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block font-semibold">Total Bids Received</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={sectionDForm.totalBidsReceived || ''}
                                            onChange={(e) => setSectionDForm({ ...sectionDForm, totalBidsReceived: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block font-semibold">Responsive Bids</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={sectionDForm.responsiveBids || ''}
                                            onChange={(e) => setSectionDForm({ ...sectionDForm, responsiveBids: parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block font-semibold">Lowest Bidder</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={sectionDForm.lowestBidder || ''}
                                            onChange={(e) => setSectionDForm({ ...sectionDForm, lowestBidder: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block font-semibold">Lowest Bid Amount (JMD)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            value={sectionDForm.lowestBidAmount || ''}
                                            onChange={(e) => setSectionDForm({ ...sectionDForm, lowestBidAmount: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="mb-2 block font-semibold">Key Findings</label>
                                        <textarea
                                            className="form-textarea"
                                            rows={3}
                                            value={sectionDForm.keyFindings || ''}
                                            onChange={(e) => setSectionDForm({ ...sectionDForm, keyFindings: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Section E Form */}
                    {currentSection === 'E' && sectionEForm && (
                        <div className="space-y-6">
                            <div className="panel border-l-4 border-success">
                                <h6 className="text-md font-bold text-success mb-4">Procurement Officer Recommendation</h6>
                                <div className="grid gap-5 md:grid-cols-2">
                                    <div className="md:col-span-2">
                                        <label className="mb-2 block font-semibold">Recommendation</label>
                                        <textarea
                                            className="form-textarea"
                                            rows={4}
                                            value={sectionEForm.recommendation || sectionEForm.finalRecommendation || ''}
                                            onChange={(e) => setSectionEForm({ ...sectionEForm, recommendation: e.target.value, finalRecommendation: e.target.value })}
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="mb-2 block font-semibold">Justification</label>
                                        <textarea
                                            className="form-textarea"
                                            rows={3}
                                            value={sectionEForm.justification || ''}
                                            onChange={(e) => setSectionEForm({ ...sectionEForm, justification: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block font-semibold">Budget Availability</label>
                                        <select
                                            className="form-select"
                                            value={sectionEForm.budgetAvailability ? 'Yes' : 'No'}
                                            onChange={(e) => setSectionEForm({ ...sectionEForm, budgetAvailability: e.target.value === 'Yes' })}
                                        >
                                            <option value="Yes">Yes</option>
                                            <option value="No">No</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-2 block font-semibold">Budget Source</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={sectionEForm.budgetSource || ''}
                                            onChange={(e) => setSectionEForm({ ...sectionEForm, budgetSource: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block font-semibold">Procurement Officer Name</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={sectionEForm.procurementOfficerName || ''}
                                            onChange={(e) => setSectionEForm({ ...sectionEForm, procurementOfficerName: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block font-semibold">Date</label>
                                        <input
                                            type="date"
                                            className="form-input"
                                            value={sectionEForm.procurementOfficerDate || ''}
                                            onChange={(e) => setSectionEForm({ ...sectionEForm, procurementOfficerDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3 mt-6">
                        <button
                            onClick={() => handleUpdateSection(currentSection)}
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            Save Changes
                        </button>
                        <button
                            onClick={() => handleSubmitSection(currentSection)}
                            className="btn btn-success"
                            disabled={loading}
                        >
                            Save & Resubmit to Committee
                        </button>
                        <button
                            onClick={() => setCurrentSection(null)}
                            className="btn btn-outline-secondary"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EvaluationEdit;
