import React, { useMemo, useState } from 'react';
import type { Evaluation, SectionA, SectionB, SectionC, SectionD, SectionE } from '../services/evaluationService';

type Props = {
    mode: 'create' | 'edit';
    evaluation?: Evaluation | null;
    canEditSections?: Array<'A' | 'B' | 'C' | 'D' | 'E'>;
    onSaveSection?: (section: 'Background' | 'A' | 'B' | 'C' | 'D' | 'E', data: any) => Promise<void> | void;
    onSubmitSection?: (section: 'A' | 'B' | 'C' | 'D' | 'E') => Promise<void> | void;
    onVerifySection?: (section: 'A' | 'B' | 'C' | 'D' | 'E', notes?: string) => Promise<void> | void;
    onReturnSection?: (section: 'A' | 'B' | 'C' | 'D' | 'E', notes: string) => Promise<void> | void;
    structureEditableSections?: Array<'A' | 'B' | 'C' | 'D' | 'E'>;
    onSectionChange?: (section: 'A' | 'B' | 'C' | 'D' | 'E', data: any) => void;
};

// Full evaluation form matching NewEvaluation structure with conditional editability
export const EvaluationForm: React.FC<Props> = ({
    mode,
    evaluation,
    canEditSections = [],
    onSaveSection,
    onSubmitSection,
    onVerifySection,
    onReturnSection,
    structureEditableSections = [],
    onSectionChange,
}) => {
    const [sectionA, setSectionA] = useState<SectionA | undefined>(evaluation?.sectionA);
    const [sectionB, setSectionB] = useState<SectionB | undefined>(evaluation?.sectionB);
    const [sectionC, setSectionC] = useState<SectionC | undefined>(evaluation?.sectionC);
    const [sectionD, setSectionD] = useState<SectionD | undefined>(evaluation?.sectionD);
    const [sectionE, setSectionE] = useState<SectionE | undefined>(evaluation?.sectionE);
    const [saving, setSaving] = useState(false);

    const canEdit = (sec: 'A' | 'B' | 'C' | 'D' | 'E') => canEditSections.includes(sec);
    const canEditStructure = (sec: 'A' | 'B' | 'C' | 'D' | 'E') => structureEditableSections.includes(sec);

    // Debug logging
    console.log('EvaluationForm - evaluation:', evaluation);
    console.log('EvaluationForm - sectionB:', sectionB);
    console.log('EvaluationForm - sectionB.bidders:', sectionB?.bidders);
    console.log('EvaluationForm - sectionC:', sectionC);
    console.log('EvaluationForm - canEditSections:', canEditSections);
    console.log('EvaluationForm - canEdit(C):', canEdit('C'));

    // Keep local section state in sync when evaluation prop updates
    React.useEffect(() => {
        setSectionA(evaluation?.sectionA);
        setSectionB(evaluation?.sectionB);
        setSectionC(evaluation?.sectionC);
        setSectionD(evaluation?.sectionD);
        setSectionE(evaluation?.sectionE);
    }, [evaluation?.sectionA, evaluation?.sectionB, evaluation?.sectionC, evaluation?.sectionD, evaluation?.sectionE]);

    // Notify parent when Section B changes (for procurement structure edits)
    React.useEffect(() => {
        if (sectionB && onSectionChange) {
            onSectionChange('B', sectionB);
        }
    }, [sectionB, onSectionChange]);

    const saveSec = async (sec: 'A' | 'B' | 'C' | 'D' | 'E') => {
        if (!onSaveSection) return;
        setSaving(true);
        try {
            const data = sec === 'A' ? sectionA : sec === 'B' ? sectionB : sec === 'C' ? sectionC : sec === 'D' ? sectionD : sectionE;
            await onSaveSection(sec, data);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Background Section */}
            {evaluation && (
                <div className="panel">
                    <div className="mb-5 -m-5 p-5 bg-gray-100 dark:bg-gray-800 border-l-4 border-gray-500">
                        <h5 className="text-lg font-bold">Background Information</h5>
                        <p className="text-sm mt-1">Bureau of Standards Jamaica - Official Evaluation Report Form (PRO_70_F_14/00)</p>
                    </div>
                    <div className="p-5 space-y-4">
                        {evaluation.description && (
                            <div>
                                <label className="block mb-2 text-sm font-semibold text-lg">BACKGROUND:</label>
                                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded border">
                                    <p className="whitespace-pre-wrap">{evaluation.description}</p>
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block mb-1 text-sm font-semibold">DATE SUBMISSION WAS CONSIDERED:</label>
                                <input
                                    type="date"
                                    className="form-input w-full"
                                    value={evaluation.dateSubmissionConsidered ? new Date(evaluation.dateSubmissionConsidered).toISOString().split('T')[0] : ''}
                                    onChange={(e) => {
                                        const updated = { ...evaluation, dateSubmissionConsidered: e.target.value ? new Date(e.target.value).toISOString() : null };
                                        onSaveSection?.('Background', updated);
                                    }}
                                />
                            </div>
                            <div>
                                <label className="block mb-1 text-sm font-semibold">REPORT COMPLETION DATE:</label>
                                <input
                                    type="date"
                                    className="form-input w-full"
                                    value={evaluation.reportCompletionDate ? new Date(evaluation.reportCompletionDate).toISOString().split('T')[0] : ''}
                                    onChange={(e) => {
                                        const updated = { ...evaluation, reportCompletionDate: e.target.value ? new Date(e.target.value).toISOString() : null };
                                        onSaveSection?.('Background', updated);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Section A: Procurement Details */}
            <div className="panel">
                <div className="mb-5 -m-5 p-5 bg-primary/10 border-l-4 border-primary">
                    <h5 className="text-lg font-bold text-primary">Section A</h5>
                    <p className="text-sm mt-1">Procurement Details</p>
                </div>
                <div className="p-5 space-y-4">
                    {/* Basic Info - Always Read-Only */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1 text-sm font-semibold">Reference Number</label>
                            <input className="form-input w-full bg-gray-100 dark:bg-gray-700" disabled value={evaluation?.rfqNumber || ''} />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-semibold">Title</label>
                            <input className="form-input w-full bg-gray-100 dark:bg-gray-700" disabled value={evaluation?.rfqTitle || ''} />
                        </div>
                    </div>

                    {/* Editable Fields if Section A is assigned */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1 text-sm font-semibold">Comparable Estimate</label>
                            <input
                                type="number"
                                className="form-input w-full"
                                disabled={!canEdit('A')}
                                value={sectionA?.comparableEstimate ?? ''}
                                onChange={(e) => setSectionA({ ...(sectionA as any), comparableEstimate: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-semibold">Funded By</label>
                            <input
                                className="form-input w-full"
                                disabled={!canEdit('A')}
                                value={sectionA?.fundedBy || ''}
                                onChange={(e) => setSectionA({ ...(sectionA as any), fundedBy: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-semibold">Tender Closing Date</label>
                            <input
                                type="date"
                                className="form-input w-full"
                                disabled={!canEdit('A')}
                                value={sectionA?.tenderClosingDate || ''}
                                onChange={(e) => setSectionA({ ...(sectionA as any), tenderClosingDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-semibold">Tender Opening Date</label>
                            <input
                                type="date"
                                className="form-input w-full"
                                disabled={!canEdit('A')}
                                value={sectionA?.tenderOpeningDate || ''}
                                onChange={(e) => setSectionA({ ...(sectionA as any), tenderOpeningDate: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
                {canEdit('A') && (
                    <div className="p-5 flex justify-end border-t">
                        <button className="btn btn-primary" disabled={saving} onClick={() => saveSec('A')}>
                            {saving ? 'Saving…' : 'Save Section A'}
                        </button>
                    </div>
                )}
            </div>

            {/* Section B: Eligibility & Compliance */}
            <div className="panel">
                <div className="mb-5 -m-5 p-5 bg-info/10 border-l-4 border-info">
                    <h5 className="text-lg font-bold text-info">Section B</h5>
                    <p className="text-sm mt-1">Eligibility & Compliance, Technical Evaluation</p>
                    {canEditStructure('B') && (
                        <div className="mt-2 flex gap-2">
                            <button
                                type="button"
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => {
                                    const copy = { ...(sectionB as any) };
                                    const cols = copy.bidders[0].eligibilityRequirements.columns;
                                    const newRow = {
                                        id: `row-${Date.now()}`,
                                        data: Object.fromEntries(cols.map((c: any) => [c.id, ''])),
                                    };
                                    copy.bidders[0].eligibilityRequirements.rows = [...copy.bidders[0].eligibilityRequirements.rows, newRow];
                                    setSectionB(copy);
                                }}
                            >
                                Add Row
                            </button>
                            <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => {
                                    const copy = { ...(sectionB as any) };
                                    copy.bidders[0].eligibilityRequirements.rows = copy.bidders[0].eligibilityRequirements.rows.slice(0, -1);
                                    setSectionB(copy);
                                }}
                            >
                                Remove Last Row
                            </button>
                        </div>
                    )}
                </div>
                <div className="p-5 space-y-6">
                    {/* Show message if no tables exist */}
                    {!sectionB?.bidders?.[0] && (
                        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                <strong>No tables created yet.</strong> The procurement officer needs to create the eligibility, compliance, and technical tables first.
                            </p>
                        </div>
                    )}

                    {/* Eligibility Table */}
                    {sectionB?.bidders?.[0]?.eligibilityRequirements && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h6 className="font-semibold">Eligibility Table</h6>
                                {canEditStructure('B') && (
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-outline-info btn-sm"
                                            onClick={() => {
                                                const copy = { ...(sectionB as any) };
                                                const colId = `col-${Date.now()}`;
                                                const newCol = { id: colId, name: 'New Column', cellType: 'text' };
                                                copy.bidders[0].eligibilityRequirements.columns = [...copy.bidders[0].eligibilityRequirements.columns, newCol];
                                                copy.bidders[0].eligibilityRequirements.rows = copy.bidders[0].eligibilityRequirements.rows.map((r: any) => ({
                                                    ...r,
                                                    data: { ...r.data, [colId]: '' },
                                                }));
                                                setSectionB(copy);
                                            }}
                                        >
                                            + Add Column
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => {
                                                const copy = { ...(sectionB as any) };
                                                const cols = copy.bidders[0].eligibilityRequirements.columns;
                                                const newRow = {
                                                    id: `row-${Date.now()}`,
                                                    data: Object.fromEntries(cols.map((c: any) => [c.id, ''])),
                                                };
                                                copy.bidders[0].eligibilityRequirements.rows = [...copy.bidders[0].eligibilityRequirements.rows, newRow];
                                                setSectionB(copy);
                                            }}
                                        >
                                            + Add Row
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="table-auto w-full border-collapse border border-gray-300 dark:border-gray-600">
                                    <thead>
                                        <tr className="bg-gray-100 dark:bg-gray-800">
                                            {sectionB.bidders[0].eligibilityRequirements.columns.map((col: any) => (
                                                <th key={col.id} className="border border-gray-300 dark:border-gray-600 px-2 py-2">
                                                    {canEditStructure('B') ? (
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    className="form-input text-sm font-semibold bg-transparent border-0 p-1 flex-1"
                                                                    value={col.name}
                                                                    onChange={(e) => {
                                                                        const copy = { ...(sectionB as any) };
                                                                        copy.bidders[0].eligibilityRequirements.columns = copy.bidders[0].eligibilityRequirements.columns.map((c: any) =>
                                                                            c.id === col.id ? { ...c, name: e.target.value } : c
                                                                        );
                                                                        setSectionB(copy);
                                                                    }}
                                                                    placeholder="Column name"
                                                                />
                                                                {(sectionB.bidders[0]?.eligibilityRequirements?.columns?.length ?? 0) > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const copy = { ...(sectionB as any) };
                                                                            copy.bidders[0].eligibilityRequirements.columns = copy.bidders[0].eligibilityRequirements.columns.filter(
                                                                                (c: any) => c.id !== col.id
                                                                            );
                                                                            copy.bidders[0].eligibilityRequirements.rows = copy.bidders[0].eligibilityRequirements.rows.map((r: any) => {
                                                                                const newData = { ...r.data };
                                                                                delete newData[col.id];
                                                                                return { ...r, data: newData };
                                                                            });
                                                                            setSectionB(copy);
                                                                        }}
                                                                        className="text-danger hover:bg-danger hover:text-white p-1 rounded transition-colors"
                                                                        title="Remove column"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                        </svg>
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <select
                                                                className="form-select text-xs py-1 px-2"
                                                                value={col.cellType || 'text'}
                                                                onChange={(e) => {
                                                                    const copy = { ...(sectionB as any) };
                                                                    copy.bidders[0].eligibilityRequirements.columns = copy.bidders[0].eligibilityRequirements.columns.map((c: any) =>
                                                                        c.id === col.id ? { ...c, cellType: e.target.value } : c
                                                                    );
                                                                    if (e.target.value === 'radio') {
                                                                        copy.bidders[0].eligibilityRequirements.rows = copy.bidders[0].eligibilityRequirements.rows.map((r: any) => {
                                                                            const val = r.data[col.id]?.toLowerCase();
                                                                            const newVal = val === 'yes' || val === 'no' ? val.charAt(0).toUpperCase() + val.slice(1) : '';
                                                                            return { ...r, data: { ...r.data, [col.id]: newVal } };
                                                                        });
                                                                    }
                                                                    setSectionB(copy);
                                                                }}
                                                            >
                                                                <option value="text">Text</option>
                                                                <option value="radio">Yes/No</option>
                                                            </select>
                                                        </div>
                                                    ) : (
                                                        col.name
                                                    )}
                                                </th>
                                            ))}
                                            {canEditStructure('B') && <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 w-24">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sectionB.bidders[0].eligibilityRequirements.rows.map((row: any) => (
                                            <tr key={row.id}>
                                                {sectionB.bidders[0].eligibilityRequirements!.columns.map((col: any) => (
                                                    <td key={col.id} className="border px-2 py-2">
                                                        {col.cellType === 'radio' && canEdit('B') ? (
                                                            <div className="flex items-center gap-4 justify-center">
                                                                <label className="flex items-center gap-1 cursor-pointer">
                                                                    <input
                                                                        type="radio"
                                                                        name={`${row.id}-${col.id}`}
                                                                        className="form-radio"
                                                                        checked={row.data[col.id] === 'Yes'}
                                                                        onChange={() => {
                                                                            const copy = { ...(sectionB as any) };
                                                                            copy.bidders[0].eligibilityRequirements.rows = copy.bidders[0].eligibilityRequirements.rows.map((r: any) =>
                                                                                r.id === row.id ? { ...r, data: { ...r.data, [col.id]: 'Yes' } } : r
                                                                            );
                                                                            setSectionB(copy);
                                                                        }}
                                                                    />
                                                                    <span className="text-sm">Yes</span>
                                                                </label>
                                                                <label className="flex items-center gap-1 cursor-pointer">
                                                                    <input
                                                                        type="radio"
                                                                        name={`${row.id}-${col.id}`}
                                                                        className="form-radio"
                                                                        checked={row.data[col.id] === 'No'}
                                                                        onChange={() => {
                                                                            const copy = { ...(sectionB as any) };
                                                                            copy.bidders[0].eligibilityRequirements.rows = copy.bidders[0].eligibilityRequirements.rows.map((r: any) =>
                                                                                r.id === row.id ? { ...r, data: { ...r.data, [col.id]: 'No' } } : r
                                                                            );
                                                                            setSectionB(copy);
                                                                        }}
                                                                    />
                                                                    <span className="text-sm">No</span>
                                                                </label>
                                                            </div>
                                                        ) : canEdit('B') ? (
                                                            <input
                                                                className="form-input w-full"
                                                                value={row.data[col.id] || ''}
                                                                onChange={(e) => {
                                                                    const copy = { ...(sectionB as any) };
                                                                    const table = copy.bidders[0].eligibilityRequirements;
                                                                    table.rows = table.rows.map((r: any) => (r.id === row.id ? { ...r, data: { ...r.data, [col.id]: e.target.value } } : r));
                                                                    setSectionB(copy);
                                                                }}
                                                            />
                                                        ) : (
                                                            <span>{row.data[col.id] || '-'}</span>
                                                        )}
                                                    </td>
                                                ))}
                                                {canEditStructure('B') && (
                                                    <td className="border px-2 py-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const copy = { ...(sectionB as any) };
                                                                copy.bidders[0].eligibilityRequirements.rows = copy.bidders[0].eligibilityRequirements.rows.filter((r: any) => r.id !== row.id);
                                                                setSectionB(copy);
                                                            }}
                                                            className="text-danger hover:bg-danger hover:text-white p-1 rounded transition-colors"
                                                            title="Remove row"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                />
                                                            </svg>
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Compliance Table */}
                    {sectionB?.bidders?.[0]?.complianceMatrix && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h6 className="font-semibold">Compliance Table</h6>
                                {canEditStructure('B') && (
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-outline-info btn-sm"
                                            onClick={() => {
                                                const copy = { ...(sectionB as any) };
                                                const colId = `col-${Date.now()}`;
                                                copy.bidders[0].complianceMatrix.columns = [...copy.bidders[0].complianceMatrix.columns, { id: colId, name: 'New Column', cellType: 'text' }];
                                                copy.bidders[0].complianceMatrix.rows = copy.bidders[0].complianceMatrix.rows.map((r: any) => ({ ...r, data: { ...r.data, [colId]: '' } }));
                                                setSectionB(copy);
                                            }}
                                        >
                                            + Add Column
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => {
                                                const copy = { ...(sectionB as any) };
                                                const newRow = { id: `row-${Date.now()}`, data: Object.fromEntries(copy.bidders[0].complianceMatrix.columns.map((c: any) => [c.id, ''])) };
                                                copy.bidders[0].complianceMatrix.rows = [...copy.bidders[0].complianceMatrix.rows, newRow];
                                                setSectionB(copy);
                                            }}
                                        >
                                            + Add Row
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="table-auto w-full border-collapse border border-gray-300 dark:border-gray-600">
                                    <thead>
                                        <tr className="bg-gray-100 dark:bg-gray-800">
                                            {sectionB.bidders[0].complianceMatrix.columns.map((col: any) => (
                                                <th key={col.id} className="border border-gray-300 dark:border-gray-600 px-2 py-2">
                                                    {canEditStructure('B') ? (
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    className="form-input text-sm font-semibold bg-transparent border-0 p-1 flex-1"
                                                                    value={col.name}
                                                                    onChange={(e) => {
                                                                        const copy = { ...(sectionB as any) };
                                                                        copy.bidders[0].complianceMatrix.columns = copy.bidders[0].complianceMatrix.columns.map((c: any) =>
                                                                            c.id === col.id ? { ...c, name: e.target.value } : c
                                                                        );
                                                                        setSectionB(copy);
                                                                    }}
                                                                    placeholder="Column name"
                                                                />
                                                                {(sectionB.bidders[0]?.complianceMatrix?.columns?.length ?? 0) > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const copy = { ...(sectionB as any) };
                                                                            copy.bidders[0].complianceMatrix.columns = copy.bidders[0].complianceMatrix.columns.filter((c: any) => c.id !== col.id);
                                                                            copy.bidders[0].complianceMatrix.rows = copy.bidders[0].complianceMatrix.rows.map((r: any) => {
                                                                                const newData = { ...r.data };
                                                                                delete newData[col.id];
                                                                                return { ...r, data: newData };
                                                                            });
                                                                            setSectionB(copy);
                                                                        }}
                                                                        className="text-danger hover:bg-danger hover:text-white p-1 rounded transition-colors"
                                                                        title="Remove column"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                        </svg>
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <select
                                                                className="form-select text-xs py-1 px-2"
                                                                value={col.cellType || 'text'}
                                                                onChange={(e) => {
                                                                    const copy = { ...(sectionB as any) };
                                                                    copy.bidders[0].complianceMatrix.columns = copy.bidders[0].complianceMatrix.columns.map((c: any) =>
                                                                        c.id === col.id ? { ...c, cellType: e.target.value } : c
                                                                    );
                                                                    if (e.target.value === 'radio') {
                                                                        copy.bidders[0].complianceMatrix.rows = copy.bidders[0].complianceMatrix.rows.map((r: any) => {
                                                                            const val = r.data[col.id]?.toLowerCase();
                                                                            const newVal = val === 'yes' || val === 'no' ? val.charAt(0).toUpperCase() + val.slice(1) : '';
                                                                            return { ...r, data: { ...r.data, [col.id]: newVal } };
                                                                        });
                                                                    }
                                                                    setSectionB(copy);
                                                                }}
                                                            >
                                                                <option value="text">Text</option>
                                                                <option value="radio">Yes/No</option>
                                                            </select>
                                                        </div>
                                                    ) : (
                                                        col.name
                                                    )}
                                                </th>
                                            ))}
                                            {canEditStructure('B') && <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 w-24">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(sectionB.bidders[0]?.complianceMatrix?.rows ?? []).map((row: any) => (
                                            <tr key={row.id}>
                                                {sectionB.bidders[0].complianceMatrix.columns.map((col: any) => (
                                                    <td key={col.id} className="border px-2 py-2">
                                                        {col.cellType === 'radio' && canEdit('B') ? (
                                                            <div className="flex items-center gap-4 justify-center">
                                                                <label className="flex items-center gap-1 cursor-pointer">
                                                                    <input
                                                                        type="radio"
                                                                        name={`${row.id}-${col.id}`}
                                                                        className="form-radio"
                                                                        checked={row.data[col.id] === 'Yes'}
                                                                        onChange={() => {
                                                                            const copy = { ...(sectionB as any) };
                                                                            copy.bidders[0].complianceMatrix.rows = copy.bidders[0].complianceMatrix.rows.map((r: any) =>
                                                                                r.id === row.id ? { ...r, data: { ...r.data, [col.id]: 'Yes' } } : r
                                                                            );
                                                                            setSectionB(copy);
                                                                        }}
                                                                    />
                                                                    <span className="text-sm">Yes</span>
                                                                </label>
                                                                <label className="flex items-center gap-1 cursor-pointer">
                                                                    <input
                                                                        type="radio"
                                                                        name={`${row.id}-${col.id}`}
                                                                        className="form-radio"
                                                                        checked={row.data[col.id] === 'No'}
                                                                        onChange={() => {
                                                                            const copy = { ...(sectionB as any) };
                                                                            copy.bidders[0].complianceMatrix.rows = copy.bidders[0].complianceMatrix.rows.map((r: any) =>
                                                                                r.id === row.id ? { ...r, data: { ...r.data, [col.id]: 'No' } } : r
                                                                            );
                                                                            setSectionB(copy);
                                                                        }}
                                                                    />
                                                                    <span className="text-sm">No</span>
                                                                </label>
                                                            </div>
                                                        ) : canEdit('B') ? (
                                                            <input
                                                                className="form-input w-full"
                                                                value={row.data[col.id] || ''}
                                                                onChange={(e) => {
                                                                    const copy = { ...(sectionB as any) };
                                                                    copy.bidders[0].complianceMatrix.rows = copy.bidders[0].complianceMatrix.rows.map((r: any) =>
                                                                        r.id === row.id ? { ...r, data: { ...r.data, [col.id]: e.target.value } } : r
                                                                    );
                                                                    setSectionB(copy);
                                                                }}
                                                            />
                                                        ) : (
                                                            <span>{row.data[col.id] || '-'}</span>
                                                        )}
                                                    </td>
                                                ))}
                                                {canEditStructure('B') && (
                                                    <td className="border px-2 py-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const copy = { ...(sectionB as any) };
                                                                copy.bidders[0].complianceMatrix.rows = copy.bidders[0].complianceMatrix.rows.filter((r: any) => r.id !== row.id);
                                                                setSectionB(copy);
                                                            }}
                                                            className="text-danger hover:bg-danger hover:text-white p-1 rounded transition-colors"
                                                            title="Remove row"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                />
                                                            </svg>
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Technical Table */}
                    {sectionB?.bidders?.[0]?.technicalEvaluation && (
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <h6 className="font-semibold">Technical Evaluation Table</h6>
                                {canEditStructure('B') && (
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-outline-info btn-sm"
                                            onClick={() => {
                                                const copy = { ...(sectionB as any) };
                                                const colId = `col-${Date.now()}`;
                                                copy.bidders[0].technicalEvaluation.columns = [...copy.bidders[0].technicalEvaluation.columns, { id: colId, name: 'New Column', cellType: 'text' }];
                                                copy.bidders[0].technicalEvaluation.rows = copy.bidders[0].technicalEvaluation.rows.map((r: any) => ({ ...r, data: { ...r.data, [colId]: '' } }));
                                                setSectionB(copy);
                                            }}
                                        >
                                            + Add Column
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-outline-primary btn-sm"
                                            onClick={() => {
                                                const copy = { ...(sectionB as any) };
                                                const newRow = { id: `row-${Date.now()}`, data: Object.fromEntries(copy.bidders[0].technicalEvaluation.columns.map((c: any) => [c.id, ''])) };
                                                copy.bidders[0].technicalEvaluation.rows = [...copy.bidders[0].technicalEvaluation.rows, newRow];
                                                setSectionB(copy);
                                            }}
                                        >
                                            + Add Row
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="overflow-x-auto">
                                <table className="table-auto w-full border-collapse border border-gray-300 dark:border-gray-600">
                                    <thead>
                                        <tr className="bg-gray-100 dark:bg-gray-800">
                                            {sectionB.bidders[0].technicalEvaluation.columns.map((col: any) => (
                                                <th key={col.id} className="border border-gray-300 dark:border-gray-600 px-2 py-2">
                                                    {canEditStructure('B') ? (
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    className="form-input text-sm font-semibold bg-transparent border-0 p-1 flex-1"
                                                                    value={col.name}
                                                                    onChange={(e) => {
                                                                        const copy = { ...(sectionB as any) };
                                                                        copy.bidders[0].technicalEvaluation.columns = copy.bidders[0].technicalEvaluation.columns.map((c: any) =>
                                                                            c.id === col.id ? { ...c, name: e.target.value } : c
                                                                        );
                                                                        setSectionB(copy);
                                                                    }}
                                                                    placeholder="Column name"
                                                                />
                                                                {(sectionB.bidders[0]?.technicalEvaluation?.columns?.length ?? 0) > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const copy = { ...(sectionB as any) };
                                                                            copy.bidders[0].technicalEvaluation.columns = copy.bidders[0].technicalEvaluation.columns.filter(
                                                                                (c: any) => c.id !== col.id
                                                                            );
                                                                            copy.bidders[0].technicalEvaluation.rows = copy.bidders[0].technicalEvaluation.rows.map((r: any) => {
                                                                                const newData = { ...r.data };
                                                                                delete newData[col.id];
                                                                                return { ...r, data: newData };
                                                                            });
                                                                            setSectionB(copy);
                                                                        }}
                                                                        className="text-danger hover:bg-danger hover:text-white p-1 rounded transition-colors"
                                                                        title="Remove column"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                        </svg>
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <select
                                                                className="form-select text-xs py-1 px-2"
                                                                value={col.cellType || 'text'}
                                                                onChange={(e) => {
                                                                    const copy = { ...(sectionB as any) };
                                                                    copy.bidders[0].technicalEvaluation.columns = copy.bidders[0].technicalEvaluation.columns.map((c: any) =>
                                                                        c.id === col.id ? { ...c, cellType: e.target.value } : c
                                                                    );
                                                                    if (e.target.value === 'radio') {
                                                                        copy.bidders[0].technicalEvaluation.rows = copy.bidders[0].technicalEvaluation.rows.map((r: any) => {
                                                                            const val = r.data[col.id]?.toLowerCase();
                                                                            const newVal = val === 'yes' || val === 'no' ? val.charAt(0).toUpperCase() + val.slice(1) : '';
                                                                            return { ...r, data: { ...r.data, [col.id]: newVal } };
                                                                        });
                                                                    }
                                                                    setSectionB(copy);
                                                                }}
                                                            >
                                                                <option value="text">Text</option>
                                                                <option value="radio">Yes/No</option>
                                                            </select>
                                                        </div>
                                                    ) : (
                                                        col.name
                                                    )}
                                                </th>
                                            ))}
                                            {canEditStructure('B') && <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 w-24">Actions</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(sectionB.bidders[0]?.technicalEvaluation?.rows ?? []).map((row: any) => (
                                            <tr key={row.id}>
                                                {sectionB.bidders[0].technicalEvaluation.columns.map((col: any) => (
                                                    <td key={col.id} className="border px-2 py-2">
                                                        {col.cellType === 'radio' && canEdit('B') ? (
                                                            <div className="flex items-center gap-4 justify-center">
                                                                <label className="flex items-center gap-1 cursor-pointer">
                                                                    <input
                                                                        type="radio"
                                                                        name={`${row.id}-${col.id}`}
                                                                        className="form-radio"
                                                                        checked={row.data[col.id] === 'Yes'}
                                                                        onChange={() => {
                                                                            const copy = { ...(sectionB as any) };
                                                                            copy.bidders[0].technicalEvaluation.rows = copy.bidders[0].technicalEvaluation.rows.map((r: any) =>
                                                                                r.id === row.id ? { ...r, data: { ...r.data, [col.id]: 'Yes' } } : r
                                                                            );
                                                                            setSectionB(copy);
                                                                        }}
                                                                    />
                                                                    <span className="text-sm">Yes</span>
                                                                </label>
                                                                <label className="flex items-center gap-1 cursor-pointer">
                                                                    <input
                                                                        type="radio"
                                                                        name={`${row.id}-${col.id}`}
                                                                        className="form-radio"
                                                                        checked={row.data[col.id] === 'No'}
                                                                        onChange={() => {
                                                                            const copy = { ...(sectionB as any) };
                                                                            copy.bidders[0].technicalEvaluation.rows = copy.bidders[0].technicalEvaluation.rows.map((r: any) =>
                                                                                r.id === row.id ? { ...r, data: { ...r.data, [col.id]: 'No' } } : r
                                                                            );
                                                                            setSectionB(copy);
                                                                        }}
                                                                    />
                                                                    <span className="text-sm">No</span>
                                                                </label>
                                                            </div>
                                                        ) : canEdit('B') ? (
                                                            <input
                                                                className="form-input w-full"
                                                                value={row.data[col.id] || ''}
                                                                onChange={(e) => {
                                                                    const copy = { ...(sectionB as any) };
                                                                    copy.bidders[0].technicalEvaluation.rows = copy.bidders[0].technicalEvaluation.rows.map((r: any) =>
                                                                        r.id === row.id ? { ...r, data: { ...r.data, [col.id]: e.target.value } } : r
                                                                    );
                                                                    setSectionB(copy);
                                                                }}
                                                            />
                                                        ) : (
                                                            <span>{row.data[col.id] || '-'}</span>
                                                        )}
                                                    </td>
                                                ))}
                                                {canEditStructure('B') && (
                                                    <td className="border px-2 py-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const copy = { ...(sectionB as any) };
                                                                copy.bidders[0].technicalEvaluation.rows = copy.bidders[0].technicalEvaluation.rows.filter((r: any) => r.id !== row.id);
                                                                setSectionB(copy);
                                                            }}
                                                            className="text-danger hover:bg-danger hover:text-white p-1 rounded transition-colors"
                                                            title="Remove row"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                />
                                                            </svg>
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
                {canEdit('B') && (
                    <div className="p-5 flex justify-end border-t">
                        <button className="btn btn-primary" disabled={saving} onClick={() => saveSec('B')}>
                            {saving ? 'Saving…' : 'Save Section B'}
                        </button>
                    </div>
                )}
            </div>

            {/* Section C: Evaluator Assessment */}
            <div className="panel">
                <div className="mb-5 -m-5 p-5 bg-warning/10 border-l-4 border-warning">
                    <h5 className="text-lg font-bold text-warning">Section C</h5>
                    <p className="text-sm mt-1">to be completed by the Evaluator</p>
                </div>
                <div className="p-5 space-y-6">
                    <div>
                        <label className="block mb-1 text-sm font-semibold">Comments/Critical Issues Examined</label>
                        <textarea
                            className="form-textarea w-full"
                            rows={5}
                            disabled={!canEdit('C')}
                            value={sectionC?.criticalIssues || ''}
                            onChange={(e) => setSectionC({ ...(sectionC as any), criticalIssues: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block mb-1 text-sm font-semibold">Action Taken</label>
                        <div className="flex flex-wrap gap-4">
                            {[
                                { label: '(a) Recommended', value: 'RECOMMENDED' },
                                { label: '(b) Rejected', value: 'REJECTED' },
                                { label: '(c) Deferred', value: 'DEFERRED' },
                            ].map((opt) => (
                                <label key={opt.value} className="flex items-center gap-2 text-sm">
                                    <input
                                        type="radio"
                                        className="form-radio"
                                        disabled={!canEdit('C')}
                                        checked={sectionC?.actionTaken === opt.value}
                                        onChange={() => setSectionC({ ...(sectionC as any), actionTaken: opt.value })}
                                    />
                                    <span>{opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {(sectionC?.actionTaken === 'REJECTED' || sectionC?.actionTaken === 'DEFERRED') && (
                        <div>
                            <label className="block mb-1 text-sm font-semibold">If rejected or deferred, please give details below</label>
                            <textarea
                                className="form-textarea w-full"
                                rows={3}
                                disabled={!canEdit('C')}
                                value={sectionC?.rejectionReason || ''}
                                onChange={(e) => setSectionC({ ...(sectionC as any), rejectionReason: e.target.value })}
                            />
                        </div>
                    )}

                    <div>
                        <label className="block mb-1 text-sm font-semibold">Recommended Contractor/Supplier</label>
                        <input
                            className="form-input w-full"
                            disabled={!canEdit('C')}
                            value={sectionC?.recommendedSupplier || ''}
                            onChange={(e) => setSectionC({ ...(sectionC as any), recommendedSupplier: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block mb-1 text-sm font-semibold">Recommended Contract Amount (inclusive of GCT)</label>
                        <input
                            type="number"
                            className="form-input w-full"
                            disabled={!canEdit('C')}
                            value={sectionC?.recommendedAmountInclusiveGCT ?? ''}
                            onChange={(e) => setSectionC({ ...(sectionC as any), recommendedAmountInclusiveGCT: Number(e.target.value) || 0 })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1 text-sm font-semibold">Evaluator's Name</label>
                            <input
                                className="form-input w-full"
                                disabled={!canEdit('C')}
                                value={sectionC?.evaluatorName || ''}
                                onChange={(e) => setSectionC({ ...(sectionC as any), evaluatorName: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-semibold">Job Title</label>
                            <input
                                className="form-input w-full"
                                disabled={!canEdit('C')}
                                value={sectionC?.evaluatorTitle || ''}
                                onChange={(e) => setSectionC({ ...(sectionC as any), evaluatorTitle: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-1 text-sm font-semibold">Signature</label>
                            <input
                                className="form-input w-full"
                                disabled={!canEdit('C')}
                                value={sectionC?.evaluatorSignature || ''}
                                onChange={(e) => setSectionC({ ...(sectionC as any), evaluatorSignature: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-semibold">Date</label>
                            <input
                                type="date"
                                className="form-input w-full"
                                disabled={!canEdit('C')}
                                value={sectionC?.evaluationDate ? sectionC.evaluationDate : ''}
                                onChange={(e) => setSectionC({ ...(sectionC as any), evaluationDate: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
                {canEdit('C') && (
                    <div className="p-5 flex justify-end border-t">
                        <button className="btn btn-primary" disabled={saving} onClick={() => saveSec('C')}>
                            {saving ? 'Saving…' : 'Save Section C'}
                        </button>
                    </div>
                )}
            </div>

            {/* Section D: Summary */}
            <div className="panel">
                <div className="mb-5 -m-5 p-5 bg-warning/10 border-l-4 border-warning">
                    <h5 className="text-lg font-bold text-warning">Section D</h5>
                    <p className="text-sm mt-1">Summary</p>
                </div>
                <div className="p-5">
                    <label className="block mb-1 text-sm font-semibold">Evaluation Summary</label>
                    <textarea
                        className="form-textarea w-full"
                        rows={4}
                        disabled={!canEdit('D')}
                        value={sectionD?.summary || ''}
                        onChange={(e) => setSectionD({ ...(sectionD as any), summary: e.target.value })}
                    />
                </div>
                {canEdit('D') && (
                    <div className="p-5 flex justify-end border-t">
                        <button className="btn btn-primary" disabled={saving} onClick={() => saveSec('D')}>
                            {saving ? 'Saving…' : 'Save Section D'}
                        </button>
                    </div>
                )}
            </div>

            {/* Section E: Final Recommendation */}
            <div className="panel">
                <div className="mb-5 -m-5 p-5 bg-success/10 border-l-4 border-success">
                    <h5 className="text-lg font-bold text-success">Section E</h5>
                    <p className="text-sm mt-1">Final Recommendation</p>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block mb-1 text-sm font-semibold">Recommendation</label>
                        <textarea
                            className="form-textarea w-full"
                            rows={4}
                            disabled={!canEdit('E')}
                            value={sectionE?.finalRecommendation || ''}
                            onChange={(e) => setSectionE({ ...(sectionE as any), finalRecommendation: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-semibold">Prepared By</label>
                        <input
                            className="form-input w-full"
                            disabled={!canEdit('E')}
                            value={sectionE?.preparedBy || ''}
                            onChange={(e) => setSectionE({ ...(sectionE as any), preparedBy: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-semibold">Date</label>
                        <input
                            type="date"
                            className="form-input w-full"
                            disabled={!canEdit('E')}
                            value={sectionE?.approvalDate ? sectionE.approvalDate.split('T')[0] : ''}
                            onChange={(e) => setSectionE({ ...(sectionE as any), approvalDate: e.target.value })}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            id="sectionE-approved"
                            type="checkbox"
                            disabled={!canEdit('E')}
                            checked={Boolean(sectionE?.approved)}
                            onChange={(e) => setSectionE({ ...(sectionE as any), approved: e.target.checked })}
                            className="form-checkbox"
                        />
                        <label htmlFor="sectionE-approved" className="text-sm">
                            Approved by person completing form
                        </label>
                    </div>
                </div>
                {canEdit('E') && (
                    <div className="p-5 flex justify-end border-t">
                        <button className="btn btn-primary" disabled={saving} onClick={() => saveSec('E')}>
                            {saving ? 'Saving…' : 'Save Section E'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EvaluationForm;
