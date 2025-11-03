import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconInbox from '../../../components/Icon/IconInbox';
import IconCreditCard from '../../../components/Icon/IconCreditCard';
import IconClock from '../../../components/Icon/IconClock';
import { Link } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';
import type { ApexOptions } from 'apexcharts';

interface PaymentItem {
    id: number;
    poNumber: string;
    supplier: string;
    amount: number;
    delivered: boolean;
    deliveredAt?: string;
    confirmedBy?: string;
    paid: boolean;
    paidAt?: string;
    paymentMethod?: string;
    paymentRef?: string;
}

const FinanceDashboard = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Finance Dashboard'));
    }, [dispatch]);

    const [items, setItems] = useState<PaymentItem[]>([
        { id: 1, poNumber: 'PO-2025-014', supplier: 'ABC Corp', amount: 15240, delivered: false, paid: false },
        { id: 2, poNumber: 'PO-2025-015', supplier: 'XYZ Supplies', amount: 9800, delivered: true, deliveredAt: '2025-10-30', confirmedBy: 'Stores', paid: false },
        { id: 3, poNumber: 'PO-2025-016', supplier: 'Office Pro', amount: 4320, delivered: true, deliveredAt: '2025-10-29', confirmedBy: 'Stores', paid: true, paidAt: '2025-10-30', paymentMethod: 'EFT', paymentRef: 'TRX-883012' },
    ]);

    // Note: Delivery confirmation and payment recording moved to dedicated pages.

    const awaitingConfirmation = items.filter((i) => !i.delivered && !i.paid);
    const toProcessPayments = items.filter((i) => i.delivered && !i.paid);
    const paymentHistory = items.filter((i) => i.paid);

    // Charts: compute series from items state
    const { paymentsOptions, paymentsSeries, outstandingOptions, outstandingSeries, avgDaysOptions, avgDaysSeries } = useMemo(() => {
        // Payments over last 7 days by paidAt
        const days = (() => {
            const labels: string[] = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                labels.push(d.toISOString().slice(0, 10)); // yyyy-mm-dd
            }
            return labels;
        })();
        const labelFmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        const paidMap: Record<string, number> = Object.fromEntries(days.map((d) => [d, 0]));
        for (const p of paymentHistory) {
            if (p.paidAt && paidMap[p.paidAt] !== undefined) {
                paidMap[p.paidAt] += p.amount;
            }
        }
        const paymentsOptions: ApexOptions = {
            chart: { type: 'area', toolbar: { show: false }, height: 260 },
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 2 },
            xaxis: { categories: days.map(labelFmt) },
            colors: ['#00ab55'],
            grid: { strokeDashArray: 4 },
            tooltip: { y: { formatter: (val) => `$${Number(val).toLocaleString()}` } },
        };
        const paymentsSeries = [{ name: 'Paid Amount', data: days.map((d) => paidMap[d]) }];

        // Outstanding by supplier (delivered & not paid)
        const outstanding = items.filter((i) => i.delivered && !i.paid);
        const outGrouped: Record<string, number> = {};
        for (const it of outstanding) outGrouped[it.supplier] = (outGrouped[it.supplier] || 0) + it.amount;
        const outLabels = Object.keys(outGrouped);
        const outData = Object.values(outGrouped);
        const outstandingOptions: ApexOptions = {
            chart: { type: 'donut' },
            labels: outLabels,
            legend: { position: 'bottom' },
            stroke: { show: false },
            tooltip: { y: { formatter: (val) => `$${Number(val).toLocaleString()}` } },
        };
        const outstandingSeries = outData.length ? outData : [1];

        // Average days to pay (paidAt - deliveredAt)
        const paidWithDates = paymentHistory.filter((p) => p.paidAt && p.deliveredAt);
        const daysToPay = paidWithDates.map((p) => {
            const d1 = new Date(p.deliveredAt as string).getTime();
            const d2 = new Date(p.paidAt as string).getTime();
            const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
            return Math.max(diff, 0);
        });
        const avgDays = daysToPay.length ? Math.round(daysToPay.reduce((a, b) => a + b, 0) / daysToPay.length) : 0;
        const avgDaysOptions: ApexOptions = {
            chart: { type: 'radialBar' },
            plotOptions: {
                radialBar: {
                    hollow: { size: '55%' },
                    track: { background: 'rgba(226,160,63,0.15)' },
                    dataLabels: { name: { show: true, offsetY: 10 }, value: { fontSize: '22px' } },
                },
            },
            labels: ['Avg Days to Pay'],
            colors: ['#e2a03f'],
        };
        const avgDaysSeries = [avgDays];

        return { paymentsOptions, paymentsSeries, outstandingOptions, outstandingSeries, avgDaysOptions, avgDaysSeries };
    }, [items, paymentHistory]);

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold">Finance Dashboard</h2>
                <p className="text-white-dark">Confirm deliveries before payment and record payment completion.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Summary tiles */}
                <div className="panel lg:col-span-1 flex items-center justify-between">
                    <div>
                        <div className="text-sm text-white-dark">Awaiting Delivery Confirmation</div>
                        <div className="text-3xl font-bold text-primary">{awaitingConfirmation.length}</div>
                    </div>
                    <Link to="/finance/awaiting-delivery" className="btn btn-info btn-sm">Open Page</Link>
                </div>
                <div className="panel lg:col-span-1 flex items-center justify-between">
                    <div>
                        <div className="text-sm text-white-dark">Payments to Process</div>
                        <div className="text-3xl font-bold text-primary">{toProcessPayments.length}</div>
                    </div>
                    <Link to="/finance/payments-to-process" className="btn btn-success btn-sm">Open Page</Link>
                </div>
                <div className="panel lg:col-span-1">
                    <div className="text-sm text-white-dark mb-1">Total Paid</div>
                    <div className="text-3xl font-bold text-primary">${paymentHistory.reduce((a, b) => a + b.amount, 0).toLocaleString()}</div>
                </div>
            </div>

            {/* Finance insights */}
            <div className="grid gap-6 grid-cols-1 xl:grid-cols-3 mt-6">
                <div className="panel">
                    <div className="mb-4 font-semibold">Payments (Last 7 Days)</div>
                    <ReactApexChart options={paymentsOptions} series={paymentsSeries} type="area" height={260} />
                </div>
                <div className="panel">
                    <div className="mb-4 font-semibold">Outstanding by Supplier</div>
                    <ReactApexChart options={outstandingOptions} series={outstandingSeries} type="donut" height={260} />
                </div>
                <div className="panel">
                    <div className="mb-4 font-semibold">Average Days to Pay</div>
                    <ReactApexChart options={avgDaysOptions} series={avgDaysSeries} type="radialBar" height={260} />
                </div>
            </div>

            {/* Payment History */}
            <div className="panel mt-6">
                <div className="mb-5 flex items-center justify-between">
                    <h5 className="text-lg font-semibold">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-secondary/10 text-secondary mr-2"><IconClock className="h-4 w-4"/></span>
                        Payment History
                    </h5>
                </div>
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>PO #</th>
                                <th>Supplier</th>
                                <th>Amount</th>
                                <th>Paid On</th>
                                <th>Method</th>
                                <th>Ref</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paymentHistory.map((i) => (
                                <tr key={i.id}>
                                    <td>{i.poNumber}</td>
                                    <td>{i.supplier}</td>
                                    <td className="font-semibold text-primary">${i.amount.toLocaleString()}</td>
                                    <td>{i.paidAt}</td>
                                    <td>{i.paymentMethod}</td>
                                    <td>{i.paymentRef || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals moved to dedicated pages */}
        </div>
    );
};

export default FinanceDashboard;
