import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';
import IconX from '../../../components/Icon/IconX';
import { getUser } from '../../../utils/auth';
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
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [currentSection, setCurrentSection] = useState<'A' | 'B' | 'C' | 'D' | 'E' | null>(null);
    const [assignments, setAssignments] = useState<Array<{ id: number; evaluationId: number; userId: number; user?: { id: number; name: string | null; email: string }; sections: string[]; status: string }>>([]);
    const [selectedReturnUserIds, setSelectedReturnUserIds] = useState<number[]>([]);
    const [returnNotes, setReturnNotes] = useState('');

    // Section forms
    const [sectionAForm, setSectionAForm] = useState<SectionA | null>(null);
    const [sectionBForm, setSectionBForm] = useState<SectionB | null>(null);
    const [sectionDForm, setSectionDForm] = useState<SectionD | null>(null);
    const [sectionEForm, setSectionEForm] = useState<SectionE | null>(null);

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

            // Load assignments for evaluator selection
            try {
                const list = await evaluationService.getAllAssignments(parseInt(id || '0'));
                setAssignments(list);
            } catch (e) {
                console.warn('Failed to load assignments:', e);
            }
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

    const handleReturnToEvaluators = async () => {
        if (!evaluation) return;
        if (selectedReturnUserIds.length === 0) {
            setAlertMessage('Select at least one evaluator');
            setShowErrorAlert(true);
            setTimeout(() => setShowErrorAlert(false), 2500);
            return;
        }
        try {
            setLoading(true);
            await evaluationService.returnAssignments(evaluation.id, { userIds: selectedReturnUserIds, sections: ['C'], notes: returnNotes });
            setAlertMessage('Returned Section C to selected evaluators');
            setShowSuccessAlert(true);
            setSelectedReturnUserIds([]);
            setReturnNotes('');
            await loadEvaluation();
            setTimeout(() => setShowSuccessAlert(false), 2500);
        } catch (err: any) {
            setAlertMessage(err.message || 'Failed to return assignments');
            setShowErrorAlert(true);
            setTimeout(() => setShowErrorAlert(false), 3500);
        } finally {
            setLoading(false);
        }
    };

    const renderSectionAEditor = () => {
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold mb-1">Comparable Estimate</label>
                        <input
                            type="number"
                            className="form-input"
                            value={sectionAForm?.comparableEstimate ?? ''}
                            onChange={(e) => {
                                const value = Number(e.target.value);
                                setSectionAForm((prev) => ({ ...(prev ?? ({} as SectionA)), comparableEstimate: Number.isFinite(value) ? value : 0 }));
                            }}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Funded By</label>
                        <input
                            type="text"
                            className="form-input"
                            value={sectionAForm?.fundedBy ?? ''}
                            onChange={(e) => setSectionAForm((prev) => ({ ...(prev ?? ({} as SectionA)), fundedBy: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Procurement Method</label>
                        <input
                            type="text"
                            className="form-input"
                            value={sectionAForm?.procurementMethod ?? ''}
                            onChange={(e) => setSectionAForm((prev) => ({ ...(prev ?? ({} as SectionA)), procurementMethod: e.target.value as SectionA['procurementMethod'] }))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Contract Type</label>
                        <input
                            type="text"
                            className="form-input"
                            value={sectionAForm?.contractType ?? ''}
                            onChange={(e) => setSectionAForm((prev) => ({ ...(prev ?? ({} as SectionA)), contractType: e.target.value as SectionA['contractType'] }))}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-semibold mb-1">Tender Closing Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={sectionAForm?.tenderClosingDate ?? ''}
                            onChange={(e) => setSectionAForm((prev) => ({ ...(prev ?? ({} as SectionA)), tenderClosingDate: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Tender Opening Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={sectionAForm?.tenderOpeningDate ?? ''}
                            onChange={(e) => setSectionAForm((prev) => ({ ...(prev ?? ({} as SectionA)), tenderOpeningDate: e.target.value }))}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Bid Validity Days</label>
                        <input
                            type="number"
                            className="form-input"
                            value={sectionAForm?.bidValidityDays ?? ''}
                            onChange={(e) => {
                                const value = Number(e.target.value);
                                setSectionAForm((prev) => ({ ...(prev ?? ({} as SectionA)), bidValidityDays: Number.isFinite(value) ? value : 0 }));
                            }}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold mb-1">Number of Bids Requested</label>
                        <input
                            type="number"
                            className="form-input"
                            value={sectionAForm?.numberOfBidsRequested ?? ''}
                            onChange={(e) => {
                                const value = Number(e.target.value);
                                setSectionAForm((prev) => ({ ...(prev ?? ({} as SectionA)), numberOfBidsRequested: Number.isFinite(value) ? value : 0 }));
                            }}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Number of Bids Received</label>
                        <input
                            type="number"
                            className="form-input"
                            value={sectionAForm?.numberOfBidsReceived ?? ''}
                            onChange={(e) => {
                                const value = Number(e.target.value);
                                setSectionAForm((prev) => ({ ...(prev ?? ({} as SectionA)), numberOfBidsReceived: Number.isFinite(value) ? value : 0 }));
                            }}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold mb-1">Bid Security</label>
                        <select
                            className="form-select"
                            value={sectionAForm?.bidSecurity ?? ''}
                            onChange={(e) => setSectionAForm((prev) => ({ ...(prev ?? ({} as SectionA)), bidSecurity: e.target.value as SectionA['bidSecurity'] }))}
                        >
                            <option value="">Select</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                            <option value="N/A">N/A</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-1">Award Criteria</label>
                        <select
                            className="form-select"
                            value={sectionAForm?.awardCriteria ?? ''}
                            onChange={(e) => setSectionAForm((prev) => ({ ...(prev ?? ({} as SectionA)), awardCriteria: e.target.value as SectionA['awardCriteria'] }))}
                        >
                            <option value="">Select</option>
                            <option value="LOWEST_COST">Lowest Cost</option>
                            <option value="MOST_ADVANTAGEOUS_BID">Most Advantageous Bid</option>
                        </select>
                    </div>
                </div>
            </div>
        );
    };

    const renderSectionDEditor = () => {
        return (
            <div className="space-y-3">
                <label className="block text-sm font-semibold">Summary</label>
                <textarea
                    className="form-textarea"
                    rows={6}
                    value={sectionDForm?.summary ?? ''}
                    onChange={(e) => setSectionDForm((prev) => ({ ...(prev ?? ({} as SectionD)), summary: e.target.value }))}
                    placeholder="Enter summary of findings"
                />
            </div>
        );
    };

    const renderSectionEEditor = () => {
        return (
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold mb-1">Final Recommendation</label>
                    <textarea
                        className="form-textarea"
                        rows={5}
                        value={sectionEForm?.finalRecommendation ?? ''}
                        onChange={(e) => setSectionEForm((prev) => ({ ...(prev ?? ({} as SectionE)), finalRecommendation: e.target.value }))}
                        placeholder="Enter the procurement officer's recommendation"
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold mb-1">Approval Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={sectionEForm?.approvalDate ?? ''}
                            onChange={(e) => setSectionEForm((prev) => ({ ...(prev ?? ({} as SectionE)), approvalDate: e.target.value }))}
                        />
                    </div>
                    <div className="flex items-center gap-2 mt-6">
                        <input
                            id="approved"
                            type="checkbox"
                            className="form-checkbox"
                            checked={sectionEForm?.approved ?? false}
                            onChange={(e) => setSectionEForm((prev) => ({ ...(prev ?? ({} as SectionE)), approved: e.target.checked }))}
                        />
                        <label htmlFor="approved" className="text-sm">
                            Approved
                        </label>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-semibold mb-1">Prepared By</label>
                    <input
                        type="text"
                        className="form-input"
                        value={sectionEForm?.preparedBy ?? ''}
                        onChange={(e) => setSectionEForm((prev) => ({ ...(prev ?? ({} as SectionE)), preparedBy: e.target.value }))}
                        placeholder="Name of preparer"
                    />
                </div>
            </div>
        );
    };

    type TableKey = 'eligibilityRequirements' | 'complianceMatrix' | 'technicalEvaluation';
    type TableShape = { columns: Array<{ id: string; name: string; cellType?: 'text' | 'radio' }>; rows: Array<{ id: string; data: Record<string, string> }> };

    const withSectionBTable = (key: TableKey, updater: (table: TableShape) => TableShape) => {
        setSectionBForm((prev) => {
            if (!prev || !prev.bidders || prev.bidders.length === 0) return prev;
            const bidder = { ...prev.bidders[0] };
            const table: TableShape = bidder[key] ?? { columns: [], rows: [] };
            const updated = updater(table);
            const nextBidder = { ...bidder, [key]: updated };
            const nextBidders = [nextBidder, ...prev.bidders.slice(1)];
            return { ...prev, bidders: nextBidders };
        });
    };

    const updateSectionBCell = (key: TableKey, rowId: string, colId: string, value: string) => {
        withSectionBTable(key, (table) => {
            const rows = table.rows.map((row) => (row.id === rowId ? { ...row, data: { ...row.data, [colId]: value } } : row));
            return { ...table, rows };
        });
    };

    const updateSectionBColumnName = (key: TableKey, colId: string, value: string) => {
        withSectionBTable(key, (table) => {
            const columns = table.columns.map((col) => (col.id === colId ? { ...col, name: value } : col));
            return { ...table, columns };
        });
    };

    const addSectionBColumn = (key: TableKey) => {
        withSectionBTable(key, (table) => {
            const colId = `col-${Date.now()}`;
            const newCol = { id: colId, name: 'New Column', cellType: key === 'technicalEvaluation' ? 'text' : undefined };
            const rows = table.rows.map((row) => ({ ...row, data: { ...row.data, [colId]: '' } }));
            return { ...table, columns: [...table.columns, newCol], rows };
        });
    };

    const addSectionBRow = (key: TableKey) => {
        withSectionBTable(key, (table) => {
            const newRow = {
                id: `row-${Date.now()}`,
                data: table.columns.reduce<Record<string, string>>((acc, col) => {
                    acc[col.id] = '';
                    return acc;
                }, {}),
            };
            return { ...table, rows: [...table.rows, newRow] };
        });
    };

    const removeSectionBRow = (key: TableKey, rowId: string) => {
        withSectionBTable(key, (table) => ({ ...table, rows: table.rows.filter((row) => row.id !== rowId) }));
    };

    const renderSectionBTable = (key: TableKey, title: string, helper: string) => {
        const bidder = sectionBForm?.bidders?.[0];
        const table = bidder?.[key] ?? { columns: [], rows: [] };

        if (!sectionBForm || !sectionBForm.bidders || sectionBForm.bidders.length === 0) {
            return (
                <div className="p-4 bg-warning/10 border border-warning rounded">
                    <p className="text-sm text-warning">No bidder data found for Section B.</p>
                </div>
            );
        }

        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <div>
                        <p className="text-sm font-semibold">{title}</p>
                        <p className="text-xs text-white-dark">{helper}</p>
                    </div>
                    <div className="flex gap-2">
                        <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => addSectionBColumn(key)}>
                            + Column
                        </button>
                        <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => addSectionBRow(key)}>
                            + Row
                        </button>
                    </div>
                </div>

                {table.columns.length === 0 ? (
                    <div className="p-3 bg-info/10 border border-info rounded text-sm text-info">No columns defined yet. Add a column to begin.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table-auto w-full border-collapse border border-gray-200 dark:border-gray-700 text-sm">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800/50">
                                    {table.columns.map((col) => (
                                        <th key={col.id} className="border border-gray-200 dark:border-gray-700 px-2 py-2 align-middle">
                                            <input
                                                type="text"
                                                className="form-input text-xs font-semibold bg-transparent border-0 p-1 w-full"
                                                value={col.name}
                                                onChange={(e) => updateSectionBColumnName(key, col.id, e.target.value)}
                                                placeholder="Column name"
                                            />
                                        </th>
                                    ))}
                                    <th className="w-16 border border-gray-200 dark:border-gray-700 px-2 py-2 text-center text-xs">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {table.rows.map((row) => (
                                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                        {table.columns.map((col) => (
                                            <td key={col.id} className="border border-gray-200 dark:border-gray-700 px-2 py-1">
                                                <input
                                                    type="text"
                                                    className="form-input text-xs"
                                                    value={row.data[col.id] || ''}
                                                    onChange={(e) => updateSectionBCell(key, row.id, col.id, e.target.value)}
                                                    placeholder="Enter value"
                                                />
                                            </td>
                                        ))}
                                        <td className="border border-gray-200 dark:border-gray-700 px-2 py-1 text-center">
                                            <button type="button" className="btn btn-outline-danger btn-xs" onClick={() => removeSectionBRow(key, row.id)} title="Remove row">
                                                Remove
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {table.rows.length === 0 && (
                                    <tr>
                                        <td className="text-center text-xs text-white-dark py-3" colSpan={table.columns.length + 1}>
                                            No rows yet. Add a row to start entering data.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
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

                    {/* Return Section C to selected evaluators */}
                    <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                        <div className="flex items-center justify-between mb-2">
                            <h6 className="font-semibold text-primary">Return Section C to Evaluators</h6>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold mb-1">Evaluators (assigned to Section C)</label>
                                <div className="max-h-40 overflow-auto space-y-2 p-2 border rounded">
                                    {assignments
                                        .filter((a) => Array.isArray(a.sections) && a.sections.map((s) => s.toUpperCase()).includes('C'))
                                        .map((a) => (
                                            <label key={a.id} className="flex items-center gap-2 text-sm">
                                                <input
                                                    type="checkbox"
                                                    className="form-checkbox"
                                                    checked={selectedReturnUserIds.includes(a.userId)}
                                                    onChange={(e) => {
                                                        const uid = a.userId;
                                                        setSelectedReturnUserIds((prev) =>
                                                            e.target.checked ? Array.from(new Set([...prev, uid])) : prev.filter((id) => id !== uid)
                                                        );
                                                    }}
                                                />
                                                <span>{a.user?.name || a.user?.email || `User #${a.userId}`}</span>
                                                <span className="text-xs text-white-dark">({a.status})</span>
                                            </label>
                                        ))}
                                    {assignments.filter((a) => Array.isArray(a.sections) && a.sections.map((s) => s.toUpperCase()).includes('C')).length === 0 && (
                                        <div className="text-xs text-white-dark">No evaluators assigned to Section C.</div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold mb-1">Notes to Evaluators (optional)</label>
                                <textarea className="form-textarea w-full" rows={3} value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} placeholder="Provide guidance for Section C" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <button onClick={handleReturnToEvaluators} className="btn btn-primary btn-sm" disabled={selectedReturnUserIds.length === 0}>
                                Return Section C to Selected Evaluators
                            </button>
                        </div>
                    </div>
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

                    {currentSection === 'A' ? (
                        <div className="space-y-6">
                            <div className="rounded border border-info p-3 bg-info/5">
                                <p className="text-sm font-semibold text-info">Section A: Procurement Details</p>
                                <p className="text-xs text-white-dark mt-1">Update core procurement details before saving and resubmitting.</p>
                            </div>
                            {renderSectionAEditor()}
                        </div>
                    ) : currentSection === 'B' ? (
                        <div className="space-y-6">
                            <div className="rounded border border-info p-3 bg-info/5">
                                <p className="text-sm font-semibold text-info">Section B: Bidders & Compliance</p>
                                <p className="text-xs text-white-dark mt-1">Edit table values below, then save and resubmit to the committee.</p>
                            </div>
                            {renderSectionBTable('eligibilityRequirements', 'Eligibility Requirements', 'Capture bidder eligibility details and compliance evidence')}
                            {renderSectionBTable('complianceMatrix', 'Compliance Matrix', 'Record compliance checklist outcomes for each bidder')}
                            {renderSectionBTable('technicalEvaluation', 'Technical Evaluation', 'Enter technical scores/notes for bidders')}
                        </div>
                    ) : currentSection === 'D' ? (
                        <div className="space-y-6">
                            <div className="rounded border border-info p-3 bg-info/5">
                                <p className="text-sm font-semibold text-info">Section D: Summary</p>
                                <p className="text-xs text-white-dark mt-1">Summarize findings and key observations.</p>
                            </div>
                            {renderSectionDEditor()}
                        </div>
                    ) : currentSection === 'E' ? (
                        <div className="space-y-6">
                            <div className="rounded border border-info p-3 bg-info/5">
                                <p className="text-sm font-semibold text-info">Section E: Procurement Officer Recommendation</p>
                                <p className="text-xs text-white-dark mt-1">Record the final recommendation and approval details.</p>
                            </div>
                            {renderSectionEEditor()}
                        </div>
                    ) : (
                        <div className="text-center text-white-dark">Section {currentSection} editor - Form fields to be implemented</div>
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
