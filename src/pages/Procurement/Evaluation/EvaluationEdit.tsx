import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';
import { getUser } from '../../../utils/auth';
import Swal from 'sweetalert2';
import { evaluationService, type Evaluation, type SectionA, type SectionB, type SectionD, type SectionE } from '../../../services/evaluationService';

const EvaluationEdit = () => {
    const dispatch = useDispatch();
    const authLoading = useSelector((state: any) => state.auth.isLoading);
    const authUser = useSelector((state: any) => state.auth.user);
    const navigate = useNavigate();
    const { id } = useParams();

    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentSection, setCurrentSection] = useState<'A' | 'B' | 'C' | 'D' | 'E' | null>(null);

    // Section forms
    const [sectionAForm, setSectionAForm] = useState<SectionA | null>(null);
    const [sectionBForm, setSectionBForm] = useState<SectionB | null>(null);
    const [sectionDForm, setSectionDForm] = useState<SectionD | null>(null);
    const [sectionEForm, setSectionEForm] = useState<SectionE | null>(null);

    const toast = (title: string, icon: 'success' | 'error' | 'info' | 'warning' = 'info') =>
        Swal.fire({
            toast: true,
            icon,
            title,
            position: 'top-end',
            timer: 2500,
            showConfirmButton: false,
        });

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

    const updateSectionAField = <K extends keyof SectionA>(key: K, value: SectionA[K]) => {
        setSectionAForm((prev) => ({ ...(prev ?? {}), [key]: value } as SectionA));
    };

    const updateSectionDField = <K extends keyof SectionD>(key: K, value: SectionD[K]) => {
        setSectionDForm((prev) => ({ ...(prev ?? {}), [key]: value } as SectionD));
    };

    const updateSectionEField = <K extends keyof SectionE>(key: K, value: SectionE[K]) => {
        setSectionEForm((prev) => ({ ...(prev ?? {}), [key]: value } as SectionE));
    };

    const updateSectionBBidderField = (bidderIndex: number, field: 'bidderName', value: string) => {
        setSectionBForm((prev) => {
            if (!prev) return prev;
            const bidders = prev.bidders.map((bidder, idx) => (idx === bidderIndex ? { ...bidder, [field]: value } : bidder));
            return { ...prev, bidders };
        });
    };

    const updateSectionBTableCell = (bidderIndex: number, table: 'eligibilityRequirements' | 'complianceMatrix' | 'technicalEvaluation', rowId: string, columnId: string, value: string) => {
        setSectionBForm((prev) => {
            if (!prev) return prev;
            const bidders = prev.bidders.map((bidder, idx) => {
                if (idx !== bidderIndex) return bidder;
                const targetTable = bidder[table];
                if (!targetTable) return bidder;
                const rows = targetTable.rows.map((row) => (row.id === rowId ? { ...row, data: { ...row.data, [columnId]: value } } : row));
                return { ...bidder, [table]: { ...targetTable, rows } };
            });
            return { ...prev, bidders };
        });
    };

    const loadEvaluation = async () => {
        if (!id) return;
        try {
            setLoading(true);
            setError(null);
            const data = await evaluationService.getEvaluationById(parseInt(id || '0'));
            setEvaluation(data);

            // Initialize forms with existing data
            setSectionAForm(data.sectionA ?? null);
            setSectionBForm(data.sectionB ?? null);
            setSectionDForm(data.sectionD ?? null);
            setSectionEForm(data.sectionE ?? null);

            // Auto-select first returned section
            if (data.sectionAStatus === 'RETURNED') setCurrentSection('A');
            else if (data.sectionBStatus === 'RETURNED') setCurrentSection('B');
            else if (data.sectionDStatus === 'RETURNED') setCurrentSection('D');
            else if (data.sectionEStatus === 'RETURNED') setCurrentSection('E');
        } catch (err: any) {
            console.error('Failed to load evaluation:', err);
            const message = err.message || 'Failed to load evaluation';
            setError(message);
            toast(message, 'error');
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
            toast(`Section ${section} updated successfully`, 'success');
            await loadEvaluation();
        } catch (err: any) {
            toast(err.message || `Failed to update Section ${section}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitSection = async (section: 'A' | 'B' | 'C' | 'D' | 'E') => {
        if (!evaluation) return;

        try {
            setLoading(true);
            await evaluationService.submitSection(evaluation.id, section);
            toast(`Section ${section} resubmitted to committee for review`, 'success');
            const updatedEval = await evaluationService.getEvaluationById(evaluation.id);
            setEvaluation(updatedEval);
            setTimeout(() => {
                const hasReturned =
                    updatedEval.sectionAStatus === 'RETURNED' || updatedEval.sectionBStatus === 'RETURNED' || updatedEval.sectionDStatus === 'RETURNED' || updatedEval.sectionEStatus === 'RETURNED';
                if (!hasReturned) {
                    navigate('/procurement/evaluation');
                } else {
                    setCurrentSection(null);
                }
            }, 2000);
        } catch (err: any) {
            toast(err.message || `Failed to submit Section ${section}`, 'error');
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
                            <strong>Note:</strong> Update the returned fields below, then Save and Resubmit to send back to the committee.
                        </p>
                    </div>

                    {/* Section-specific forms */}
                    {currentSection === 'A' && (
                        <div className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-semibold">Comparable Estimate</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={sectionAForm?.comparableEstimate ?? ''}
                                        onChange={(e) => {
                                            const parsed = Number(e.target.value);
                                            updateSectionAField('comparableEstimate', Number.isFinite(parsed) ? parsed : 0);
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold">Funded By</label>
                                    <input className="form-input" value={sectionAForm?.fundedBy ?? ''} onChange={(e) => updateSectionAField('fundedBy', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold">Tender Closing Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={sectionAForm?.tenderClosingDate ?? ''}
                                        onChange={(e) => updateSectionAField('tenderClosingDate', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold">Tender Opening Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={sectionAForm?.tenderOpeningDate ?? ''}
                                        onChange={(e) => updateSectionAField('tenderOpeningDate', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold">Number of Bids Requested</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={sectionAForm?.numberOfBidsRequested ?? ''}
                                        onChange={(e) => {
                                            const parsed = Number(e.target.value);
                                            updateSectionAField('numberOfBidsRequested', Number.isFinite(parsed) ? parsed : 0);
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold">Number of Bids Received</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={sectionAForm?.numberOfBidsReceived ?? ''}
                                        onChange={(e) => {
                                            const parsed = Number(e.target.value);
                                            updateSectionAField('numberOfBidsReceived', Number.isFinite(parsed) ? parsed : 0);
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label className="block text-sm font-semibold">Bid Validity Days</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={sectionAForm?.bidValidityDays ?? ''}
                                        onChange={(e) => {
                                            const parsed = Number(e.target.value);
                                            updateSectionAField('bidValidityDays', Number.isFinite(parsed) ? parsed : 0);
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold">Bid Validity Expiration</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={sectionAForm?.bidValidityExpiration ?? ''}
                                        onChange={(e) => updateSectionAField('bidValidityExpiration', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {currentSection === 'B' && sectionBForm && (
                        <div className="space-y-6">
                            {(sectionBForm.bidders ?? []).map((bidder, idx) => (
                                <div key={idx} className="space-y-4 border rounded p-4">
                                    <div>
                                        <label className="block text-sm font-semibold">Bidder Name</label>
                                        <input className="form-input" value={bidder.bidderName} onChange={(e) => updateSectionBBidderField(idx, 'bidderName', e.target.value)} />
                                    </div>

                                    {bidder.eligibilityRequirements && (
                                        <div className="space-y-2">
                                            <h6 className="text-sm font-semibold">Eligibility Requirements</h6>
                                            {bidder.eligibilityRequirements.rows.map((row) => (
                                                <div key={row.id} className="grid md:grid-cols-2 gap-2">
                                                    {bidder.eligibilityRequirements?.columns.map((col) => (
                                                        <div key={col.id}>
                                                            <label className="block text-[11px] font-semibold text-white-dark">{col.name}</label>
                                                            <input
                                                                className="form-input text-sm"
                                                                value={row.data[col.id] ?? ''}
                                                                onChange={(e) => updateSectionBTableCell(idx, 'eligibilityRequirements', row.id, col.id, e.target.value)}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {bidder.complianceMatrix && (
                                        <div className="space-y-2">
                                            <h6 className="text-sm font-semibold">Compliance Matrix</h6>
                                            {bidder.complianceMatrix.rows.map((row) => (
                                                <div key={row.id} className="grid md:grid-cols-2 gap-2">
                                                    {bidder.complianceMatrix?.columns.map((col) => (
                                                        <div key={col.id}>
                                                            <label className="block text-[11px] font-semibold text-white-dark">{col.name}</label>
                                                            <input
                                                                className="form-input text-sm"
                                                                value={row.data[col.id] ?? ''}
                                                                onChange={(e) => updateSectionBTableCell(idx, 'complianceMatrix', row.id, col.id, e.target.value)}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {bidder.technicalEvaluation && (
                                        <div className="space-y-2">
                                            <h6 className="text-sm font-semibold">Technical Evaluation</h6>
                                            {bidder.technicalEvaluation.rows.map((row) => (
                                                <div key={row.id} className="grid md:grid-cols-2 gap-2">
                                                    {bidder.technicalEvaluation?.columns.map((col) => (
                                                        <div key={col.id}>
                                                            <label className="block text-[11px] font-semibold text-white-dark">{col.name}</label>
                                                            <input
                                                                className="form-input text-sm"
                                                                value={row.data[col.id] ?? ''}
                                                                onChange={(e) => updateSectionBTableCell(idx, 'technicalEvaluation', row.id, col.id, e.target.value)}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {currentSection === 'D' && (
                        <div className="space-y-3">
                            <label className="block text-sm font-semibold">Summary</label>
                            <textarea className="form-textarea" rows={6} value={sectionDForm?.summary ?? ''} onChange={(e) => updateSectionDField('summary', e.target.value)} />
                        </div>
                    )}

                    {currentSection === 'E' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold">Final Recommendation</label>
                                <textarea
                                    className="form-textarea"
                                    rows={5}
                                    value={sectionEForm?.finalRecommendation ?? ''}
                                    onChange={(e) => updateSectionEField('finalRecommendation', e.target.value)}
                                />
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold">Prepared By</label>
                                    <input className="form-input" value={sectionEForm?.preparedBy ?? ''} onChange={(e) => updateSectionEField('preparedBy', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold">Approval Date</label>
                                    <input type="date" className="form-input" value={sectionEForm?.approvalDate ?? ''} onChange={(e) => updateSectionEField('approvalDate', e.target.value)} />
                                </div>
                            </div>
                            <label className="flex items-center gap-2 text-sm font-semibold">
                                <input type="checkbox" className="form-checkbox" checked={sectionEForm?.approved ?? false} onChange={(e) => updateSectionEField('approved', e.target.checked)} />
                                Recommendation Approved
                            </label>
                        </div>
                    )}

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
