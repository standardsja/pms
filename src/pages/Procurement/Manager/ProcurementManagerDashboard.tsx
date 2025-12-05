import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { Link } from 'react-router-dom';
import IconChecks from '../../../components/Icon/IconChecks';
import IconEye from '../../../components/Icon/IconEye';
import { selectAuthLoading, selectUser } from '../../../store/authSlice';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

type Evaluation = {
    id: string;
    rfqId: string;
    title: string;
    evaluator: string;
    score: number; // 0-100
    date: string;
    status: 'Pending Validation' | 'Validated' | 'Changes Requested';
};

type ManagerDashboardStats = {
    pendingApprovals: number;
    evaluationsToValidate: number;
    autoAssignQueue: number;
    loadBalancingEnabled: boolean;
    strategy: 'AI_SMART' | 'SKILL_BASED' | 'PREDICTIVE' | 'ROUND_ROBIN' | 'LEAST_LOADED' | 'RANDOM';
    trendSubmissions: number[]; // last 7 days
    trendApprovals: number[]; // last 7 days
    avgPendingEvalScore: number; // 0-100
};

const ProcurementManagerDashboard = () => {
    const dispatch = useDispatch();
    const authLoading = useSelector(selectAuthLoading);
    const authUser = useSelector(selectUser);

    useEffect(() => {
        dispatch(setPageTitle('Procurement Manager Dashboard'));
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
    const [stats, setStats] = useState<ManagerDashboardStats>({
        pendingApprovals: 0,
        evaluationsToValidate: 0,
        autoAssignQueue: 0,
        loadBalancingEnabled: false,
        strategy: 'AI_SMART',
        trendSubmissions: [0, 0, 0, 0, 0, 0, 0],
        trendApprovals: [0, 0, 0, 0, 0, 0, 0],
        avgPendingEvalScore: 0,
    });

    const [validateTarget, setValidateTarget] = useState<Evaluation | null>(null);
    const [validationDecision, setValidationDecision] = useState<'Validated' | 'Changes Requested'>('Validated');
    const [validationNotes, setValidationNotes] = useState('');

    const dateFmt = (s: string) => new Date(s).toLocaleDateString();

    const handleValidateEval = (ev: Evaluation) => {
        setValidateTarget(ev);
        setValidationDecision('Validated');
        setValidationNotes('');
    };

    const confirmValidate = () => {
        if (!validateTarget) return;
        setEvaluations((prev) => prev.map((e) => (e.id === validateTarget.id ? { ...e, status: validationDecision } : e)));
        setValidateTarget(null);
    };

    const pendingEvals = evaluations.filter((e) => e.status === 'Pending Validation');

    // Charts data
    const lastNDays = (n: number) => {
        const days: string[] = [];
        for (let i = n - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
        }
        return days;
    };

    const { trendOptions, trendSeries, spendOptions, spendSeries, scoreOptions, scoreSeries } = useMemo(() => {
        // Build 7-day trend for requests submitted vs approved (from API stats)
        const labels = lastNDays(7);
        const submissions = stats.trendSubmissions;
        const approvals = stats.trendApprovals;

        const trendOptions: ApexOptions = {
            chart: { type: 'area', toolbar: { show: false }, height: 260 },
            stroke: { curve: 'smooth', width: 2 },
            dataLabels: { enabled: false },
            xaxis: { categories: labels },
            colors: ['#4361ee', '#00ab55'],
            legend: { position: 'top' },
            grid: { strokeDashArray: 4 },
        };
        const trendSeries = [
            { name: 'Requests Submitted', data: submissions },
            { name: 'Requests Approved', data: approvals },
        ];

        // Removed RFQ spend donut — RFQs are not shown on Manager overview
        const spendOptions: ApexOptions = { chart: { type: 'donut' }, labels: [], legend: { position: 'bottom' }, stroke: { show: false } };
        const spendSeries: number[] = [];

        // Average pending evaluation score
        const avg = stats.avgPendingEvalScore || (pendingEvals.length ? Math.round(pendingEvals.reduce((a, b) => a + b.score, 0) / pendingEvals.length) : 0);
        const scoreOptions: ApexOptions = {
            chart: { type: 'radialBar' },
            plotOptions: {
                radialBar: {
                    hollow: { size: '55%' },
                    track: { background: 'rgba(67,97,238,0.15)' },
                    dataLabels: { name: { show: true, offsetY: 10, color: 'inherit' }, value: { fontSize: '22px' } },
                },
            },
            labels: ['Avg Score'],
            colors: ['#805dca'],
        };
        const scoreSeries = [avg];

        return { trendOptions, trendSeries, spendOptions, spendSeries, scoreOptions, scoreSeries };
    }, [stats, pendingEvals]);

    // Heron-only API base
    const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://heron:4000';

    useEffect(() => {
        if (authLoading || !authUser) return;
        const controller = new AbortController();
        const loadStats = async () => {
            try {
                const resp = await fetch(`${API_BASE}/api/stats/dashboard`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                    signal: controller.signal,
                });
                if (!resp.ok) throw new Error(`Failed to load stats: ${resp.status}`);
                const data = (await resp.json()) as unknown as {
                    procurement?: {
                        pendingApprovals: number;
                        evaluationsToValidate: number;
                        autoAssignQueue: number;
                        loadBalancingEnabled: boolean;
                        strategy: ManagerDashboardStats['strategy'];
                        trendSubmissions: number[];
                        trendApprovals: number[];
                        avgPendingEvalScore: number;
                    };
                };
                const p = data.procurement;
                if (p) {
                    setStats({
                        pendingApprovals: p.pendingApprovals,
                        evaluationsToValidate: p.evaluationsToValidate,
                        autoAssignQueue: p.autoAssignQueue,
                        loadBalancingEnabled: p.loadBalancingEnabled,
                        strategy: p.strategy,
                        trendSubmissions: p.trendSubmissions,
                        trendApprovals: p.trendApprovals,
                        avgPendingEvalScore: p.avgPendingEvalScore,
                    });
                }
            } catch (e) {
                // Fail silently on dashboard; keep defaults
            }
        };
        loadStats();
        const interval = setInterval(loadStats, 30000);
        return () => {
            controller.abort();
            clearInterval(interval);
        };
    }, [authLoading, authUser]);

    if (authLoading || !authUser) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Procurement Manager Dashboard</h1>
                    <p className="text-gray-500 text-sm mt-1">Comprehensive procurement management overview</p>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="panel">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm mb-2">Pending Approvals</p>
                            <p className="text-4xl font-bold text-primary">{stats.pendingApprovals}</p>
                        </div>
                        <div className="text-5xl text-blue-100">📋</div>
                    </div>
                </div>
                <div className="panel">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm mb-2">Evaluations to Validate</p>
                            <p className="text-4xl font-bold text-orange-500">{stats.evaluationsToValidate}</p>
                        </div>
                        <div className="text-5xl text-orange-100">✓</div>
                    </div>
                </div>
                <div className="panel">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm mb-2">Auto-assign Queue</p>
                            <p className="text-4xl font-bold text-purple-500">{stats.autoAssignQueue}</p>
                        </div>
                        <div className="text-5xl text-purple-100">⚙️</div>
                    </div>
                </div>
            </div>

            {/* Insights */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="panel">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="font-semibold">Requests Submitted vs Approved (7 days)</div>
                    </div>
                    <ReactApexChart options={trendOptions} series={trendSeries} type="area" height={260} />
                </div>
                <div className="panel">
                    <div className="mb-4 font-semibold">Average Pending Evaluation Score</div>
                    <ReactApexChart options={scoreOptions} series={scoreSeries} type="radialBar" height={260} />
                </div>
                <div className="panel">
                    <div className="mb-2 font-semibold">Load Balancing</div>
                    <div className="text-sm">
                        Enabled: <span className={stats.loadBalancingEnabled ? 'text-green-600' : 'text-red-600'}>{stats.loadBalancingEnabled ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="text-sm">
                        Strategy: <span className="font-semibold">{stats.strategy}</span>
                    </div>
                    <div className="mt-3">
                        <Link to="/procurement/manager/load-balancing" className="btn btn-outline-primary btn-sm">
                            Manage
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Evaluation Reports Pending Validation */}
                <div className="card p-0">
                    <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <IconChecks className="w-5 h-5 text-primary" />
                            <h2 className="text-lg font-semibold">Evaluation reports to validate</h2>
                        </div>
                        <Link to="/procurement/manager/evaluations-to-validate" className="text-primary text-sm font-semibold hover:text-primary-dark">
                            View all
                        </Link>
                    </div>
                    <div className="p-5 overflow-x-auto">
                        {pendingEvals.length === 0 ? (
                            <p className="text-gray-500">No evaluation reports pending validation.</p>
                        ) : (
                            <table className="table-auto min-w-full">
                                <thead>
                                    <tr className="text-left text-gray-600 dark:text-gray-300">
                                        <th className="py-2 pr-4">Evaluation</th>
                                        <th className="py-2 pr-4">RFQ</th>
                                        <th className="py-2 pr-4">Evaluator</th>
                                        <th className="py-2 pr-4">Score</th>
                                        <th className="py-2 pr-4">Date</th>
                                        <th className="py-2 pr-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingEvals.map((e) => (
                                        <tr key={e.id} className="border-t border-gray-100 dark:border-gray-700">
                                            <td className="py-3 pr-4">
                                                <div className="font-semibold">{e.title}</div>
                                                <div className="text-xs text-gray-500">{e.id}</div>
                                            </td>
                                            <td className="py-3 pr-4">
                                                <Link to={`/procurement/rfq/${encodeURIComponent(e.rfqId)}`} className="text-primary hover:text-primary-dark">
                                                    {e.rfqId}
                                                </Link>
                                            </td>
                                            <td className="py-3 pr-4">{e.evaluator}</td>
                                            <td className="py-3 pr-4">{e.score}%</td>
                                            <td className="py-3 pr-4">{dateFmt(e.date)}</td>
                                            <td className="py-3 pr-4">
                                                <div className="flex items-center gap-2">
                                                    <Link to={`/procurement/evaluation/${encodeURIComponent(e.id)}`} className="btn btn-outline-primary btn-sm flex items-center gap-1">
                                                        <IconEye className="w-4 h-4" /> View
                                                    </Link>
                                                    <button className="btn btn-primary btn-sm" onClick={() => handleValidateEval(e)}>
                                                        Validate
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {/* Validate Evaluation Modal */}
            {validateTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setValidateTarget(null)} />
                    <div className="relative bg-white dark:bg-black rounded-xl shadow-xl w-full max-w-lg p-6 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-bold mb-2">Validate Evaluation</h3>
                        <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                            <div>
                                <span className="font-semibold">Evaluation:</span> {validateTarget.title} ({validateTarget.id})
                            </div>
                            <div>
                                <span className="font-semibold">RFQ:</span> {validateTarget.rfqId}
                            </div>
                            <div>
                                <span className="font-semibold">Evaluator:</span> {validateTarget.evaluator}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="validationDecision"
                                        className="form-radio"
                                        checked={validationDecision === 'Validated'}
                                        onChange={() => setValidationDecision('Validated')}
                                    />
                                    <span>Mark compliant</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="validationDecision"
                                        className="form-radio"
                                        checked={validationDecision === 'Changes Requested'}
                                        onChange={() => setValidationDecision('Changes Requested')}
                                    />
                                    <span>Request changes</span>
                                </label>
                            </div>

                            {validationDecision === 'Changes Requested' && (
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Notes to evaluation team</label>
                                    <textarea
                                        className="form-textarea w-full"
                                        rows={4}
                                        placeholder="Provide brief details on what needs to be corrected or clarified"
                                        value={validationNotes}
                                        onChange={(e) => setValidationNotes(e.target.value)}
                                    />
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

            {/* Quick Access Section */}
            <div className="mt-8">
                <h2 className="text-xl font-bold mb-4">Quick Access</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Link to="/procurement/manager/requests" className="panel hover:shadow-lg transition-shadow cursor-pointer">
                        <div className="text-center">
                            <div className="text-4xl mb-2">📄</div>
                            <p className="font-semibold">All Requests</p>
                            <p className="text-sm text-gray-500">View all procurement requests</p>
                        </div>
                    </Link>
                    <Link to="/procurement/manager/assign" className="panel hover:shadow-lg transition-shadow cursor-pointer">
                        <div className="text-center">
                            <div className="text-4xl mb-2">👥</div>
                            <p className="font-semibold">Assign Requests</p>
                            <p className="text-sm text-gray-500">Manage request assignments</p>
                        </div>
                    </Link>
                    <Link to="/procurement/manager/settings" className="panel hover:shadow-lg transition-shadow cursor-pointer">
                        <div className="text-center">
                            <div className="text-4xl mb-2">⚖️</div>
                            <p className="font-semibold">Load Balancing</p>
                            <p className="text-sm text-gray-500">Configure auto-assignment</p>
                        </div>
                    </Link>
                    <Link to="/procurement/evaluation" className="panel hover:shadow-lg transition-shadow cursor-pointer">
                        <div className="text-center">
                            <div className="text-4xl mb-2">📊</div>
                            <p className="font-semibold">Evaluation</p>
                            <p className="text-sm text-gray-500">Manage evaluations</p>
                        </div>
                    </Link>
                    <Link to="/apps/requests/combine" className="panel hover:shadow-lg transition-shadow cursor-pointer">
                        <div className="text-center">
                            <div className="text-4xl mb-2">🔗</div>
                            <p className="font-semibold">Combine Requests</p>
                            <p className="text-sm text-gray-500">Combine multiple requests</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ProcurementManagerDashboard;
