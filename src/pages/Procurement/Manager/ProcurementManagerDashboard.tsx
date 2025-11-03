import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { Link } from 'react-router-dom';
import IconChecks from '../../../components/Icon/IconChecks';
import IconFile from '../../../components/Icon/IconFile';
import IconEye from '../../../components/Icon/IconEye';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

type RFQ = {
	id: string;
	title: string;
	requester: string;
	amount: number;
	date: string; // ISO or display string
	status: 'Pending Approval' | 'Approved';
};

type Evaluation = {
	id: string;
	rfqId: string;
	title: string;
	evaluator: string;
	score: number; // 0-100
	date: string;
	status: 'Pending Validation' | 'Validated' | 'Changes Requested';
};

const ProcurementManagerDashboard = () => {
	const dispatch = useDispatch();

	useEffect(() => {
		dispatch(setPageTitle('Procurement Manager Dashboard'));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Mock data — in real app this would be fetched
	const initialRFQs: RFQ[] = useMemo(
		() => [
			{ id: 'RFQ-1024', title: 'Laptops for IT', requester: 'IT Department', amount: 1250000, date: '2025-10-10', status: 'Pending Approval' },
			{ id: 'RFQ-1027', title: 'Office Chairs', requester: 'Facilities', amount: 420000, date: '2025-10-18', status: 'Pending Approval' },
			{ id: 'RFQ-1030', title: 'Network Switches', requester: 'IT Infrastructure', amount: 980000, date: '2025-10-22', status: 'Pending Approval' },
		],
		[]
	);

	const initialEvaluations: Evaluation[] = useMemo(
		() => [
			{ id: 'EV-550', rfqId: 'RFQ-998', title: 'Evaluation: Printers', evaluator: 'Sarah Johnson', score: 86, date: '2025-10-20', status: 'Pending Validation' },
			{ id: 'EV-551', rfqId: 'RFQ-1001', title: 'Evaluation: Software Licenses', evaluator: 'Mark Lee', score: 92, date: '2025-10-23', status: 'Pending Validation' },
		],
		[]
	);

	const [rfqs, setRfqs] = useState<RFQ[]>(initialRFQs);
	const [evaluations, setEvaluations] = useState<Evaluation[]>(initialEvaluations);

	const [approveTarget, setApproveTarget] = useState<RFQ | null>(null);
	const [validateTarget, setValidateTarget] = useState<Evaluation | null>(null);
	const [validationDecision, setValidationDecision] = useState<'Validated' | 'Changes Requested'>('Validated');
	const [validationNotes, setValidationNotes] = useState('');

	const currency = (n: number) => new Intl.NumberFormat('en-JM', { style: 'currency', currency: 'JMD', maximumFractionDigits: 0 }).format(n);
	const dateFmt = (s: string) => new Date(s).toLocaleDateString();

	const handleApproveRFQ = (rfq: RFQ) => {
		setApproveTarget(rfq);
	};

	const confirmApprove = () => {
		if (!approveTarget) return;
		setRfqs((prev) => prev.map((r) => (r.id === approveTarget.id ? { ...r, status: 'Approved' } : r)));
		setApproveTarget(null);
	};

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

	const pendingRFQs = rfqs.filter((r) => r.status === 'Pending Approval');
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
		// Build 7-day trend for RFQs submitted vs approved
		const labels = lastNDays(7);
		const labelToDateKey = (label: string) => {
			// approximate key by removing comma and spaces for matching with rfq.date
			return label;
		};
		const mapDate = (dStr: string) => new Date(dStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
		const submissions = labels.map((lbl) => rfqs.filter((r) => mapDate(r.date) === labelToDateKey(lbl)).length);
		const approvals = labels.map((lbl) => rfqs.filter((r) => r.status === 'Approved' && mapDate(r.date) === labelToDateKey(lbl)).length);

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
			{ name: 'RFQs Submitted', data: submissions },
			{ name: 'RFQs Approved', data: approvals },
		];

		// Spend by requester (pending RFQs)
		const grouped: Record<string, number> = {};
		for (const r of pendingRFQs) grouped[r.requester] = (grouped[r.requester] || 0) + r.amount;
		const spendLabels = Object.keys(grouped);
		const spendData = Object.values(grouped);
		const spendOptions: ApexOptions = {
			chart: { type: 'donut' },
			labels: spendLabels,
			legend: { position: 'bottom' },
			stroke: { show: false },
		};
		const spendSeries = spendData.length ? spendData : [1];

		// Average pending evaluation score
		const avg = pendingEvals.length ? Math.round(pendingEvals.reduce((a, b) => a + b.score, 0) / pendingEvals.length) : 0;
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
	}, [rfqs, pendingRFQs, pendingEvals]);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Manager Overview</h1>
			</div>

			{/* Summary cards */
			}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="panel flex items-center justify-between">
					<div>
						<div className="text-sm text-white-dark">RFQs awaiting approval</div>
						<div className="text-3xl font-bold text-primary">{pendingRFQs.length}</div>
					</div>
					<Link to="/procurement/manager/rfqs-awaiting" className="btn btn-primary btn-sm">Open Page</Link>
				</div>
				<div className="panel flex items-center justify-between">
					<div>
						<div className="text-sm text-white-dark">Evaluations to validate</div>
						<div className="text-3xl font-bold text-primary">{pendingEvals.length}</div>
					</div>
					<Link to="/procurement/manager/evaluations-to-validate" className="btn btn-primary btn-sm">Open Page</Link>
				</div>
			</div>

			{/* Insights */}
			<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
				<div className="panel">
					<div className="mb-4 flex items-center justify-between">
						<div className="font-semibold">RFQs Submitted vs Approved (7 days)</div>
					</div>
					<ReactApexChart options={trendOptions} series={trendSeries} type="area" height={260} />
				</div>
				<div className="panel">
					<div className="mb-4 font-semibold">Pending RFQ Spend by Requester</div>
					<ReactApexChart options={spendOptions} series={spendSeries} type="donut" height={260} />
				</div>
				<div className="panel">
					<div className="mb-4 font-semibold">Average Pending Evaluation Score</div>
					<ReactApexChart options={scoreOptions} series={scoreSeries} type="radialBar" height={260} />
				</div>
			</div>

			<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
				{/* Pending RFQs for Approval */}
				<div className="card p-0">
					<div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
						<div className="flex items-center gap-2">
							<IconFile className="w-5 h-5 text-primary" />
							<h2 className="text-lg font-semibold">RFQs awaiting approval</h2>
						</div>
						<Link to="/procurement/manager/rfqs-awaiting" className="text-primary text-sm font-semibold hover:text-primary-dark">
							View all
						</Link>
					</div>
					<div className="p-5 overflow-x-auto">
						{pendingRFQs.length === 0 ? (
							<p className="text-gray-500">No RFQs pending approval.</p>
						) : (
							<table className="table-auto min-w-full">
								<thead>
									<tr className="text-left text-gray-600 dark:text-gray-300">
										<th className="py-2 pr-4">RFQ</th>
										<th className="py-2 pr-4">Requester</th>
										<th className="py-2 pr-4">Amount</th>
										<th className="py-2 pr-4">Date</th>
										<th className="py-2 pr-4">Actions</th>
									</tr>
								</thead>
								<tbody>
									{pendingRFQs.map((r) => (
										<tr key={r.id} className="border-t border-gray-100 dark:border-gray-700">
											<td className="py-3 pr-4">
												<div className="font-semibold">{r.title}</div>
												<div className="text-xs text-gray-500">{r.id}</div>
											</td>
											<td className="py-3 pr-4">{r.requester}</td>
											<td className="py-3 pr-4">{currency(r.amount)}</td>
											<td className="py-3 pr-4">{dateFmt(r.date)}</td>
											<td className="py-3 pr-4">
												<div className="flex items-center gap-2">
													<Link
														to={`/procurement/rfq/${encodeURIComponent(r.id)}`}
														className="btn btn-outline-primary btn-sm flex items-center gap-1"
													>
														<IconEye className="w-4 h-4" /> View
													</Link>
													<button
														className="btn btn-primary btn-sm flex items-center gap-1"
														onClick={() => handleApproveRFQ(r)}
													>
														<IconChecks className="w-4 h-4" /> Approve
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
													<Link
														to={`/procurement/evaluation/${encodeURIComponent(e.id)}`}
														className="btn btn-outline-primary btn-sm flex items-center gap-1"
													>
														<IconEye className="w-4 h-4" /> View
													</Link>
													<button
														className="btn btn-primary btn-sm"
														onClick={() => handleValidateEval(e)}
													>
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

			{/* Approve RFQ Modal */}
			{approveTarget && (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<div className="absolute inset-0 bg-black/50" onClick={() => setApproveTarget(null)} />
					<div className="relative bg-white dark:bg-black rounded-xl shadow-xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-700">
						<h3 className="text-lg font-bold mb-2">Approve RFQ</h3>
						<p className="text-gray-600 dark:text-gray-300 mb-4">
							Are you sure you want to approve <span className="font-semibold">{approveTarget.title}</span> ({approveTarget.id}) for dispatch?
						</p>
						<div className="flex justify-end gap-2">
							<button className="btn btn-outline-primary" onClick={() => setApproveTarget(null)}>
								Cancel
							</button>
							<button className="btn btn-primary" onClick={confirmApprove}>
								Approve
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Validate Evaluation Modal */}
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
		</div>
	);
};

export default ProcurementManagerDashboard;

