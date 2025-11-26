import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { Link } from 'react-router-dom';
import IconEye from '../../../components/Icon/IconEye';
import { selectAuthLoading, selectUser } from '../../../store/authSlice';


type Evaluation = {
    id: string;
    rfqId: string;
    title: string;
    evaluator: string;
    score: number; // 0-100
    date: string;
    status: 'Pending Validation' | 'Validated' | 'Changes Requested';
};

const EvaluationsToValidate = () => {
    const dispatch = useDispatch();
    const authLoading = useSelector(selectAuthLoading);
    const authUser = useSelector(selectUser);

    useEffect(() => {
        dispatch(setPageTitle('Evaluation Reports to Validate'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const initialEvaluations: Evaluation[] = useMemo(
        () => [
            { id: 'EV-550', rfqId: 'RFQ-998', title: 'Evaluation: Printers', evaluator: 'Sarah Johnson', score: 86, date: '2025-10-20', status: 'Pending Validation' },
            { id: 'EV-551', rfqId: 'RFQ-1001', title: 'Evaluation: Software Licenses', evaluator: 'Mark Lee', score: 92, date: '2025-10-23', status: 'Pending Validation' },
        ],
        []
    );

    const [evaluations, setEvaluations] = useState<Evaluation[]>(initialEvaluations);
    const [validateTarget, setValidateTarget] = useState<Evaluation | null>(null);
    const [decision, setDecision] = useState<'Validated' | 'Changes Requested'>('Validated');
    const [notes, setNotes] = useState('');

    const dateFmt = (s: string) => new Date(s).toLocaleDateString();

    const pendingEvals = evaluations.filter((e) => e.status === 'Pending Validation');

    const confirmValidate = () => {
        if (!validateTarget) return;
        setEvaluations((prev) => prev.map((e) => (e.id === validateTarget.id ? { ...e, status: decision } : e)));
        setValidateTarget(null);
        setNotes('');
    };

    if (authLoading || !authUser) {
        return (
            <div className="flex justify-center items-center min-h-[300px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Evaluation reports to validate</h1>
                <Link to="/procurement/manager" className="text-primary hover:text-primary-dark">Back to Manager Dashboard</Link>
            </div>

            <div className="panel">
                {pendingEvals.length === 0 ? (
                    <p className="text-gray-500">No evaluation reports pending validation.</p>
                ) : (
                    <div className="table-responsive">
                        <table className="table-hover">
                            <thead>
                                <tr>
                                    <th>Evaluation</th>
                                    <th>RFQ</th>
                                    <th>Evaluator</th>
                                    <th>Score</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingEvals.map((e) => (
                                    <tr key={e.id}>
                                        <td>
                                            <div className="font-semibold">{e.title}</div>
                                            <div className="text-xs text-white-dark">{e.id}</div>
                                        </td>
                                        <td>
                                            <Link to={`/procurement/rfq/${encodeURIComponent(e.rfqId)}`} className="text-primary hover:text-primary-dark">
                                                {e.rfqId}
                                            </Link>
                                        </td>
                                        <td>{e.evaluator}</td>
                                        <td>{e.score}%</td>
                                        <td>{dateFmt(e.date)}</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <Link to={`/procurement/evaluation/${encodeURIComponent(e.id)}`} className="btn btn-outline-primary btn-sm flex items-center gap-1">
                                                    <IconEye className="w-4 h-4" /> View
                                                </Link>
                                                <button className="btn btn-primary btn-sm" onClick={() => { setValidateTarget(e); setDecision('Validated'); setNotes(''); }}>
                                                    Validate
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {validateTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setValidateTarget(null)} />
                    <div className="relative bg-white dark:bg-black rounded-xl shadow-xl w-full max-w-lg p-6 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-bold mb-2">Validate Evaluation</h3>
                        <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                            <div><span className="font-semibold">Evaluation:</span> {validateTarget.title} ({validateTarget.id})</div>
                            <div><span className="font-semibold">RFQ:</span> {validateTarget.rfqId}</div>
                            <div><span className="font-semibold">Evaluator:</span> {validateTarget.evaluator}</div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="decision" className="form-radio" checked={decision === 'Validated'} onChange={() => setDecision('Validated')} />
                                    <span>Mark compliant</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name="decision" className="form-radio" checked={decision === 'Changes Requested'} onChange={() => setDecision('Changes Requested')} />
                                    <span>Request changes</span>
                                </label>
                            </div>

                            {decision === 'Changes Requested' && (
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Notes to evaluation team</label>
                                    <textarea className="form-textarea w-full" rows={4} placeholder="Provide brief details on what needs to be corrected or clarified" value={notes} onChange={(e) => setNotes(e.target.value)} />
                                </div>
                            )}

                            <div className="flex justify-end gap-2">
                                <button className="btn btn-outline-primary" onClick={() => setValidateTarget(null)}>
                                    Cancel
                                </button>
                                <button className="btn btn-primary" onClick={confirmValidate}>
                                    Submit
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EvaluationsToValidate;
