import React, { useMemo, useState } from 'react';
import type { Evaluation, SectionA, SectionB, SectionC, SectionD, SectionE } from '../services/evaluationService';

type Props = {
    mode: 'create' | 'edit';
    evaluation?: Evaluation | null;
    canEditSections?: Array<'A' | 'B' | 'C' | 'D' | 'E'>;
    onSaveSection?: (section: 'A' | 'B' | 'C' | 'D' | 'E', data: any) => Promise<void> | void;
    onSubmitSection?: (section: 'A' | 'B' | 'C' | 'D' | 'E') => Promise<void> | void;
    onVerifySection?: (section: 'A' | 'B' | 'C' | 'D' | 'E', notes?: string) => Promise<void> | void;
    onReturnSection?: (section: 'A' | 'B' | 'C' | 'D' | 'E', notes: string) => Promise<void> | void;
    structureEditableSections?: Array<'A' | 'B' | 'C' | 'D' | 'E'>;
};

// Full evaluation form matching NewEvaluation structure with conditional editability
export const EvaluationForm: React.FC<Props> = ({ mode, evaluation, canEditSections = [], onSaveSection, onSubmitSection, onVerifySection, onReturnSection }) => {
    const [sectionA, setSectionA] = useState<SectionA | undefined>(evaluation?.sectionA);
    const [sectionB, setSectionB] = useState<SectionB | undefined>(evaluation?.sectionB);
    const [sectionC, setSectionC] = useState<SectionC | undefined>(evaluation?.sectionC);
    const [sectionD, setSectionD] = useState<SectionD | undefined>(evaluation?.sectionD);
    const [sectionE, setSectionE] = useState<SectionE | undefined>(evaluation?.sectionE);
    const [saving, setSaving] = useState(false);

    // Debug logging
    console.log('EvaluationForm - evaluation:', evaluation);
    console.log('EvaluationForm - sectionB:', sectionB);
    console.log('EvaluationForm - sectionB.bidders:', sectionB?.bidders);
    console.log('EvaluationForm - canEditSections:', canEditSections);

    const canEdit = (sec: 'A' | 'B' | 'C' | 'D' | 'E') => canEditSections.includes(sec);
    const canEditStructure = (sec: 'A' | 'B' | 'C' | 'D' | 'E') => structureEditableSections.includes(sec);

    // Keep local section state in sync when evaluation prop updates
    React.useEffect(() => {
        setSectionA(evaluation?.sectionA);
        setSectionB(evaluation?.sectionB);
        setSectionC(evaluation?.sectionC);
        setSectionD(evaluation?.sectionD);
        setSectionE(evaluation?.sectionE);
    }, [evaluation?.sectionA, evaluation?.sectionB, evaluation?.sectionC, evaluation?.sectionD, evaluation?.sectionE]);

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
                            <label className="block mb-1 text-sm font-semibold">RFQ Number</label>
                            <input className="form-input w-full bg-gray-100 dark:bg-gray-700" disabled value={evaluation?.rfqNumber || ''} />
                        </div>
                        <div>
                            <label className="block mb-1 text-sm font-semibold">RFQ Title</label>
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
                            <h6 className="font-semibold mb-2">Eligibility Table</h6>
                            <div className="overflow-x-auto">
                                <table className="min-w-full border">
                                    <thead>
                                        <tr>
                                            {sectionB.bidders[0].eligibilityRequirements.columns.map((col) => (
                                                <th key={col.id} className="border px-2 py-1 bg-gray-50 dark:bg-gray-800">
                                                    {col.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sectionB.bidders[0].eligibilityRequirements.rows.map((row) => (
                                            <tr key={row.id}>
                                                {sectionB.bidders[0].eligibilityRequirements!.columns.map((col) => (
                                                    <td key={col.id} className="border px-2 py-1">
                                                        {canEdit('B') ? (
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
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
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
                    )}

                    {/* Compliance Table */}
                    {sectionB?.bidders?.[0]?.complianceMatrix && (
                        <div>
                            <h6 className="font-semibold mb-2">Compliance Table</h6>
                            <div className="overflow-x-auto">
                                <table className="min-w-full border">
                                    <thead>
                                        <tr>
                                            {sectionB.bidders[0].complianceMatrix.columns.map((col) => (
                                                <th key={col.id} className="border px-2 py-1 bg-gray-50 dark:bg-gray-800">
                                                    {col.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sectionB.bidders[0].complianceMatrix.rows.map((row) => (
                                            <tr key={row.id}>
                                                {sectionB.bidders[0].complianceMatrix!.columns.map((col) => (
                                                    <td key={col.id} className="border px-2 py-1">
                                                        {canEdit('B') ? (
                                                            <input
                                                                className="form-input w-full"
                                                                value={row.data[col.id] || ''}
                                                                onChange={(e) => {
                                                                    const copy = { ...(sectionB as any) };
                                                                    const table = copy.bidders[0].complianceMatrix;
                                                                    table.rows = table.rows.map((r: any) => (r.id === row.id ? { ...r, data: { ...r.data, [col.id]: e.target.value } } : r));
                                                                    setSectionB(copy);
                                                                }}
                                                            />
                                                        ) : (
                                                            <span>{row.data[col.id] || '-'}</span>
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {canEditStructure('B') && (
                                <div className="mt-2 flex gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={() => {
                                            const copy = { ...(sectionB as any) };
                                            const cols = copy.bidders[0].complianceMatrix.columns;
                                            const newRow = {
                                                id: `row-${Date.now()}`,
                                                data: Object.fromEntries(cols.map((c: any) => [c.id, ''])),
                                            };
                                            copy.bidders[0].complianceMatrix.rows = [...copy.bidders[0].complianceMatrix.rows, newRow];
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
                                            copy.bidders[0].complianceMatrix.rows = copy.bidders[0].complianceMatrix.rows.slice(0, -1);
                                            setSectionB(copy);
                                        }}
                                    >
                                        Remove Last Row
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Technical Table */}
                    {sectionB?.bidders?.[0]?.technicalEvaluation && (
                        <div>
                            <h6 className="font-semibold mb-2">Technical Evaluation Table</h6>
                            <div className="overflow-x-auto">
                                <table className="min-w-full border">
                                    <thead>
                                        <tr>
                                            {sectionB.bidders[0].technicalEvaluation.columns.map((col) => (
                                                <th key={col.id} className="border px-2 py-1 bg-gray-50 dark:bg-gray-800">
                                                    {col.name}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sectionB.bidders[0].technicalEvaluation.rows.map((row) => (
                                            <tr key={row.id}>
                                                {sectionB.bidders[0].technicalEvaluation!.columns.map((col) => (
                                                    <td key={col.id} className="border px-2 py-1">
                                                        {canEdit('B') ? (
                                                            <input
                                                                className="form-input w-full"
                                                                value={row.data[col.id] || ''}
                                                                onChange={(e) => {
                                                                    const copy = { ...(sectionB as any) };
                                                                    const table = copy.bidders[0].technicalEvaluation;
                                                                    table.rows = table.rows.map((r: any) => (r.id === row.id ? { ...r, data: { ...r.data, [col.id]: e.target.value } } : r));
                                                                    setSectionB(copy);
                                                                }}
                                                            />
                                                        ) : (
                                                            <span>{row.data[col.id] || '-'}</span>
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {canEditStructure('B') && (
                                <div className="mt-2 flex gap-2">
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary btn-sm"
                                        onClick={() => {
                                            const copy = { ...(sectionB as any) };
                                            const cols = copy.bidders[0].technicalEvaluation.columns;
                                            const newRow = {
                                                id: `row-${Date.now()}`,
                                                data: Object.fromEntries(cols.map((c: any) => [c.id, ''])),
                                            };
                                            copy.bidders[0].technicalEvaluation.rows = [...copy.bidders[0].technicalEvaluation.rows, newRow];
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
                                            copy.bidders[0].technicalEvaluation.rows = copy.bidders[0].technicalEvaluation.rows.slice(0, -1);
                                            setSectionB(copy);
                                        }}
                                    >
                                        Remove Last Row
                                    </button>
                                </div>
                            )}
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

            {/* Section C: Evaluator Comments */}
            <div className="panel">
                <div className="mb-5 -m-5 p-5 bg-warning/10 border-l-4 border-warning">
                    <h5 className="text-lg font-bold text-warning">Section C</h5>
                    <p className="text-sm mt-1">Evaluator Comments</p>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block mb-1 text-sm font-semibold">Comments</label>
                        <textarea
                            className="form-textarea w-full"
                            rows={4}
                            disabled={!canEdit('C')}
                            value={sectionC?.comments || ''}
                            onChange={(e) => setSectionC({ ...(sectionC as any), comments: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block mb-1 text-sm font-semibold">Recommended Supplier</label>
                        <input
                            className="form-input w-full"
                            disabled={!canEdit('C')}
                            value={sectionC?.recommendedSupplier || ''}
                            onChange={(e) => setSectionC({ ...(sectionC as any), recommendedSupplier: e.target.value })}
                        />
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
                        <label className="block mb-1 text-sm font-semibold">% Difference</label>
                        <input
                            type="number"
                            className="form-input w-full"
                            disabled={!canEdit('E')}
                            value={sectionE?.percentageDifference ?? ''}
                            onChange={(e) => setSectionE({ ...(sectionE as any), percentageDifference: Number(e.target.value) })}
                        />
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
