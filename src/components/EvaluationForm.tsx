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
              value(sectionA?.comparableEstimate ?? '')
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
          {Array.isArray(sectionB?.bidders) && sectionB!.bidders.length > 0 ? (
            sectionB!.bidders.map((b, idx) => (
              <div key={idx} className="mb-4 p-4 border rounded">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs mb-1">Bidder Name</label>
                    <input className="form-input w-full" disabled={!canEdit('B')} value={b.bidderName || ''} onChange={(e) => {
                      const copy = { ...(sectionB as any) };
                      copy.bidders[idx] = { ...copy.bidders[idx], bidderName: e.target.value };
                      setSectionB(copy);
                    }} />
                  </div>
                  <div>
                    <label className="block text-xs mb-1">PPC Category</label>
                    <input className="form-input w-full" disabled={!canEdit('B')} value={b.ppcCategory || ''} onChange={(e) => {
                      const copy = { ...(sectionB as any) };
                      copy.bidders[idx] = { ...copy.bidders[idx], ppcCategory: e.target.value };
                      setSectionB(copy);
                    }} />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-white-dark">No bidders loaded.</div>
          )}
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