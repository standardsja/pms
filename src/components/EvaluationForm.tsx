import React, { useMemo, useState } from 'react';
import type { Evaluation, SectionA, SectionB, SectionC, SectionD, SectionE } from '../services/evaluationService';

// TableEditor for Section B tables
type TableEditorProps = {
  columns: Array<{ id: string; name: string; width?: string; cellType?: string }>;
  rows: Array<{ id: string; data: Record<string, string> }>;
  editable: boolean;
  structureEditable: boolean;
  onCellChange: (rowId: string, colId: string, value: string) => void;
  onAddRow?: () => void;
  onRemoveRow?: (rowId: string) => void;
  onAddColumn?: () => void;
  onRemoveColumn?: (colId: string) => void;
  onColumnNameChange?: (colId: string, newName: string) => void;
  title: string;
};

const TableEditor: React.FC<TableEditorProps> = ({ columns, rows, editable, structureEditable, onCellChange, onAddRow, onRemoveRow, onAddColumn, onRemoveColumn, onColumnNameChange, title }) => (
  <div className="mb-6">
    <h6 className="font-semibold mb-2">{title}</h6>
    <div className="overflow-x-auto">
      <table className="min-w-full border">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.id} className="border px-2 py-1">
                {structureEditable && onColumnNameChange ? (
                  <input className="form-input w-32" value={col.name} onChange={e => onColumnNameChange(col.id, e.target.value)} />
                ) : (
                  col.name
                )}
                {structureEditable && onRemoveColumn && (
                  <button type="button" className="ml-2 text-red-500" onClick={() => onRemoveColumn(col.id)} title="Remove column">×</button>
                )}
              </th>
            ))}
            {structureEditable && onAddColumn && (
              <th><button type="button" className="btn btn-xs" onClick={onAddColumn}>+ Col</button></th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((col) => (
                <td key={col.id} className="border px-2 py-1">
                  {editable ? (
                    <input
                      className="form-input w-full"
                      value={row.data[col.id] || ''}
                      onChange={e => onCellChange(row.id, col.id, e.target.value)}
                      disabled={!editable}
                    />
                  ) : (
                    row.data[col.id] || ''
                  )}
                </td>
              ))}
              {structureEditable && onRemoveRow && (
                <td><button type="button" className="btn btn-xs text-red-500" onClick={() => onRemoveRow(row.id)}>× Row</button></td>
              )}
            </tr>
          ))}
          {structureEditable && onAddRow && (
            <tr><td colSpan={columns.length + 1}><button type="button" className="btn btn-xs" onClick={onAddRow}>+ Row</button></td></tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

type Props = {
  mode: 'create' | 'edit';
  evaluation?: Evaluation | null;
  canEditSections?: Array<'A' | 'B' | 'C' | 'D' | 'E'>;
  onSaveSection?: (section: 'A' | 'B' | 'C' | 'D' | 'E', data: any) => Promise<void> | void;
  onSubmitSection?: (section: 'A' | 'B' | 'C' | 'D' | 'E') => Promise<void> | void;
  onVerifySection?: (section: 'A' | 'B' | 'C' | 'D' | 'E', notes?: string) => Promise<void> | void;
  onReturnSection?: (section: 'A' | 'B' | 'C' | 'D' | 'E', notes: string) => Promise<void> | void;
};

// Minimal shared form that mirrors the section layout and gates editability.
// For Section B/C dynamic tables, this component expects the caller to pass existing data
// and focuses on editable text fields for now (we can expand to full dynamic tables subsequently).
export const EvaluationForm: React.FC<Props> = ({
  mode,
  evaluation,
  canEditSections = [],
  onSaveSection,
  onSubmitSection,
  onVerifySection,
  onReturnSection,
}) => {
  const [sectionA, setSectionA] = useState<SectionA | undefined>(evaluation?.sectionA);
  const [sectionB, setSectionB] = useState<SectionB | undefined>(evaluation?.sectionB);
  const [sectionC, setSectionC] = useState<SectionC | undefined>(evaluation?.sectionC);
  const [sectionD, setSectionD] = useState<SectionD | undefined>(evaluation?.sectionD);
  const [sectionE, setSectionE] = useState<SectionE | undefined>(evaluation?.sectionE);
  const [saving, setSaving] = useState(false);

  const canEdit = (sec: 'A' | 'B' | 'C' | 'D' | 'E') => canEditSections.includes(sec) && mode === 'edit';

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
      {/* Section A */}
      <div className="panel">
        <div className="mb-5 -m-5 p-5 bg-primary/10 border-l-4 border-primary">
          <h5 className="text-lg font-bold text-primary">Section A</h5>
          <p className="text-sm mt-1">Procurement Details</p>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-sm font-semibold">RFQ Number</label>
            <input className="form-input w-full" disabled value={evaluation?.rfqNumber || ''} />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold">RFQ Title</label>
            <input className="form-input w-full" disabled value={evaluation?.rfqTitle || ''} />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold">Comparable Estimate</label>
            <input
              className="form-input w-full"
              disabled={!canEdit('A')}
              value={sectionA?.comparableEstimate ?? ''}
              onChange={(e) => setSectionA({ ...(sectionA as any), comparableEstimate: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold">Funded By</label>
            <input className="form-input w-full" disabled={!canEdit('A')} value={sectionA?.fundedBy || ''} onChange={(e) => setSectionA({ ...(sectionA as any), fundedBy: e.target.value })} />
          </div>
        </div>
        {canEdit('A') && (
          <div className="p-5 flex justify-end">
            <button className="btn btn-primary" disabled={saving} onClick={() => saveSec('A')}>
              {saving ? 'Saving…' : 'Save Section A'}
            </button>
          </div>
        )}
      </div>

      {/* Section B */}
      <div className="panel">
        <div className="mb-5 -m-5 p-5 bg-info/10 border-l-4 border-info">
          <h5 className="text-lg font-bold text-info">Section B</h5>
          <p className="text-sm mt-1">Eligibility & Compliance, Technical Evaluation</p>
        </div>
        <div className="p-5">
          {/* Eligibility Table */}
          <TableEditor
            columns={sectionB?.bidders?.[0]?.eligibilityRequirements?.columns || []}
            rows={sectionB?.bidders?.[0]?.eligibilityRequirements?.rows || []}
            editable={canEdit('B')}
            structureEditable={canEditSections.includes('B') && mode === 'create'}
            onCellChange={(rowId, colId, value) => {
              const copy = { ...(sectionB as any) };
              const table = copy.bidders[0].eligibilityRequirements;
              table.rows = table.rows.map((r: any) => r.id === rowId ? { ...r, data: { ...r.data, [colId]: value } } : r);
              setSectionB(copy);
            }}
            onAddRow={canEditSections.includes('B') && mode === 'create' ? () => {/* implement add row logic */} : undefined}
            onRemoveRow={canEditSections.includes('B') && mode === 'create' ? (rowId) => {/* implement remove row logic */} : undefined}
            onAddColumn={canEditSections.includes('B') && mode === 'create' ? () => {/* implement add column logic */} : undefined}
            onRemoveColumn={canEditSections.includes('B') && mode === 'create' ? (colId) => {/* implement remove column logic */} : undefined}
            onColumnNameChange={canEditSections.includes('B') && mode === 'create' ? (colId, newName) => {/* implement column name change logic */} : undefined}
            title="Eligibility Table"
          />
          {/* Compliance Table */}
          <TableEditor
            columns={sectionB?.bidders?.[0]?.complianceMatrix?.columns || []}
            rows={sectionB?.bidders?.[0]?.complianceMatrix?.rows || []}
            editable={canEdit('B')}
            structureEditable={canEditSections.includes('B') && mode === 'create'}
            onCellChange={(rowId, colId, value) => {
              const copy = { ...(sectionB as any) };
              const table = copy.bidders[0].complianceMatrix;
              table.rows = table.rows.map((r: any) => r.id === rowId ? { ...r, data: { ...r.data, [colId]: value } } : r);
              setSectionB(copy);
            }}
            onAddRow={canEditSections.includes('B') && mode === 'create' ? () => {/* implement add row logic */} : undefined}
            onRemoveRow={canEditSections.includes('B') && mode === 'create' ? (rowId) => {/* implement remove row logic */} : undefined}
            onAddColumn={canEditSections.includes('B') && mode === 'create' ? () => {/* implement add column logic */} : undefined}
            onRemoveColumn={canEditSections.includes('B') && mode === 'create' ? (colId) => {/* implement remove column logic */} : undefined}
            onColumnNameChange={canEditSections.includes('B') && mode === 'create' ? (colId, newName) => {/* implement column name change logic */} : undefined}
            title="Compliance Table"
          />
          {/* Technical Table */}
          <TableEditor
            columns={sectionB?.bidders?.[0]?.technicalEvaluation?.columns || []}
            rows={sectionB?.bidders?.[0]?.technicalEvaluation?.rows || []}
            editable={canEdit('B')}
            structureEditable={canEditSections.includes('B') && mode === 'create'}
            onCellChange={(rowId, colId, value) => {
              const copy = { ...(sectionB as any) };
              const table = copy.bidders[0].technicalEvaluation;
              table.rows = table.rows.map((r: any) => r.id === rowId ? { ...r, data: { ...r.data, [colId]: value } } : r);
              setSectionB(copy);
            }}
            onAddRow={canEditSections.includes('B') && mode === 'create' ? () => {/* implement add row logic */} : undefined}
            onRemoveRow={canEditSections.includes('B') && mode === 'create' ? (rowId) => {/* implement remove row logic */} : undefined}
            onAddColumn={canEditSections.includes('B') && mode === 'create' ? () => {/* implement add column logic */} : undefined}
            onRemoveColumn={canEditSections.includes('B') && mode === 'create' ? (colId) => {/* implement remove column logic */} : undefined}
            onColumnNameChange={canEditSections.includes('B') && mode === 'create' ? (colId, newName) => {/* implement column name change logic */} : undefined}
            title="Technical Table"
          />
        </div>
        {canEdit('B') && (
          <div className="p-5 flex justify-end">
            <button className="btn btn-primary" disabled={saving} onClick={() => saveSec('B')}>
              {saving ? 'Saving…' : 'Save Section B'}
            </button>
          </div>
        )}
      </div>

      {/* Section C */}
      <div className="panel">
        <div className="mb-5 -m-5 p-5 bg-warning/10 border-l-4 border-warning">
          <h5 className="text-lg font-bold text-warning">Section C</h5>
          <p className="text-sm mt-1">Evaluator Comments</p>
        </div>
        <div className="p-5 grid grid-cols-1 gap-4">
          <div>
            <label className="block mb-1 text-sm font-semibold">Comments</label>
            <textarea className="form-textarea w-full" rows={4} disabled={!canEdit('C')} value={sectionC?.comments || ''} onChange={(e) => setSectionC({ ...(sectionC as any), comments: e.target.value })} />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold">Recommended Supplier</label>
            <input className="form-input w-full" disabled={!canEdit('C')} value={sectionC?.recommendedSupplier || ''} onChange={(e) => setSectionC({ ...(sectionC as any), recommendedSupplier: e.target.value })} />
          </div>
        </div>
        {canEdit('C') && (
          <div className="p-5 flex justify-end">
            <button className="btn btn-primary" disabled={saving} onClick={() => saveSec('C')}>
              {saving ? 'Saving…' : 'Save Section C'}
            </button>
          </div>
        )}
      </div>

      {/* Section D */}
      <div className="panel">
        <div className="mb-5 -m-5 p-5 bg-warning/10 border-l-4 border-warning">
          <h5 className="text-lg font-bold text-warning">Section D</h5>
          <p className="text-sm mt-1">Summary</p>
        </div>
        <div className="p-5">
          <label className="block mb-1 text-sm font-semibold">Evaluation Summary</label>
          <textarea className="form-textarea w-full" rows={4} disabled={!canEdit('D')} value={sectionD?.summary || ''} onChange={(e) => setSectionD({ ...(sectionD as any), summary: e.target.value })} />
        </div>
        {canEdit('D') && (
          <div className="p-5 flex justify-end">
            <button className="btn btn-primary" disabled={saving} onClick={() => saveSec('D')}>
              {saving ? 'Saving…' : 'Save Section D'}
            </button>
          </div>
        )}
      </div>

      {/* Section E */}
      <div className="panel">
        <div className="mb-5 -m-5 p-5 bg-success/10 border-l-4 border-success">
          <h5 className="text-lg font-bold text-success">Section E</h5>
          <p className="text-sm mt-1">Final Recommendation</p>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block mb-1 text-sm font-semibold">Recommendation</label>
            <textarea className="form-textarea w-full" rows={4} disabled={!canEdit('E')} value={sectionE?.finalRecommendation || ''} onChange={(e) => setSectionE({ ...(sectionE as any), finalRecommendation: e.target.value })} />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold">Prepared By</label>
            <input className="form-input w-full" disabled={!canEdit('E')} value={sectionE?.preparedBy || ''} onChange={(e) => setSectionE({ ...(sectionE as any), preparedBy: e.target.value })} />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold">% Difference</label>
            <input className="form-input w-full" disabled={!canEdit('E')} value={sectionE?.percentageDifference ?? ''} onChange={(e) => setSectionE({ ...(sectionE as any), percentageDifference: Number(e.target.value) })} />
          </div>
        </div>
        {canEdit('E') && (
          <div className="p-5 flex justify-end">
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