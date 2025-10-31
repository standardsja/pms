import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconInbox from '../../../components/Icon/IconInbox';
import IconCreditCard from '../../../components/Icon/IconCreditCard';
import IconClock from '../../../components/Icon/IconClock';

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

    const [showDeliverModal, setShowDeliverModal] = useState(false);
    const [deliverWho, setDeliverWho] = useState('Stores');
    const [deliverDate, setDeliverDate] = useState('');
    const [activeDeliverId, setActiveDeliverId] = useState<number | null>(null);

    const [showPayModal, setShowPayModal] = useState(false);
    const [payMethod, setPayMethod] = useState('EFT');
    const [payRef, setPayRef] = useState('');
    const [payDate, setPayDate] = useState('');
    const [activePayId, setActivePayId] = useState<number | null>(null);

    const openDeliveryConfirm = (id: number) => {
        setActiveDeliverId(id);
        setDeliverDate('');
        setDeliverWho('Stores');
        setShowDeliverModal(true);
    };

    const confirmDelivery = () => {
        if (!activeDeliverId) return;
        const date = deliverDate || new Date().toISOString().slice(0, 10);
        setItems((prev) =>
            prev.map((it) =>
                it.id === activeDeliverId
                    ? { ...it, delivered: true, deliveredAt: date, confirmedBy: deliverWho }
                    : it,
            ),
        );
        setShowDeliverModal(false);
    };

    const openRecordPayment = (id: number) => {
        setActivePayId(id);
        setPayMethod('EFT');
        setPayRef('');
        setPayDate('');
        setShowPayModal(true);
    };

    const recordPayment = () => {
        if (!activePayId) return;
        const date = payDate || new Date().toISOString().slice(0, 10);
        setItems((prev) =>
            prev.map((it) =>
                it.id === activePayId
                    ? { ...it, paid: true, paidAt: date, paymentMethod: payMethod, paymentRef: payRef }
                    : it,
            ),
        );
        setShowPayModal(false);
    };

    const awaitingConfirmation = items.filter((i) => !i.delivered && !i.paid);
    const toProcessPayments = items.filter((i) => i.delivered && !i.paid);
    const paymentHistory = items.filter((i) => i.paid);

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold">Finance Dashboard</h2>
                <p className="text-white-dark">Confirm deliveries before payment and record payment completion.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Awaiting Delivery Confirmation */}
                <div className="panel lg:col-span-1">
                    <div className="mb-5 flex items-center justify-between">
                        <h5 className="text-lg font-semibold">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-info/10 text-info mr-2"><IconInbox className="h-4 w-4"/></span>
                            Awaiting Delivery Confirmation
                        </h5>
                    </div>
                    {awaitingConfirmation.length === 0 ? (
                        <div className="text-sm text-white-dark">No items awaiting confirmation.</div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table-hover">
                                <thead>
                                    <tr>
                                        <th>PO #</th>
                                        <th>Supplier</th>
                                        <th>Amount</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {awaitingConfirmation.map((i) => (
                                        <tr key={i.id}>
                                            <td>{i.poNumber}</td>
                                            <td>{i.supplier}</td>
                                            <td className="font-semibold text-primary">${i.amount.toLocaleString()}</td>
                                            <td>
                                                <button className="btn btn-sm btn-info" onClick={() => openDeliveryConfirm(i.id)}>Mark Delivered</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Payments to Process */}
                <div className="panel lg:col-span-2">
                    <div className="mb-5 flex items-center justify-between">
                        <h5 className="text-lg font-semibold">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-success/10 text-success mr-2"><IconCreditCard className="h-4 w-4"/></span>
                            Payments to Process
                        </h5>
                    </div>
                    {toProcessPayments.length === 0 ? (
                        <div className="text-sm text-white-dark">No payments pending processing.</div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table-hover">
                                <thead>
                                    <tr>
                                        <th>PO #</th>
                                        <th>Supplier</th>
                                        <th>Amount</th>
                                        <th>Delivered</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {toProcessPayments.map((i) => (
                                        <tr key={i.id}>
                                            <td>{i.poNumber}</td>
                                            <td>{i.supplier}</td>
                                            <td className="font-semibold text-primary">${i.amount.toLocaleString()}</td>
                                            <td>
                                                <span className="badge bg-success">{i.deliveredAt || 'Yes'}</span>
                                            </td>
                                            <td>
                                                <button className="btn btn-sm btn-success" onClick={() => openRecordPayment(i.id)}>Record Payment</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
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

            {/* Confirm Delivery Modal */}
            {showDeliverModal && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60">
                    <div className="panel w-full max-w-xl">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-xl font-semibold">Confirm Delivery</h5>
                            <button onClick={() => setShowDeliverModal(false)} className="text-white-dark hover:text-dark">×</button>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-semibold mb-2">Confirmed By</label>
                                <input type="text" className="form-input" value={deliverWho} onChange={(e) => setDeliverWho(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2">Delivery Date</label>
                                <input type="date" className="form-input" value={deliverDate} onChange={(e) => setDeliverDate(e.target.value)} />
                            </div>
                        </div>
                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button onClick={() => setShowDeliverModal(false)} className="btn btn-outline-danger">Cancel</button>
                            <button onClick={confirmDelivery} className="btn btn-info">Mark Delivered</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Record Payment Modal */}
            {showPayModal && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60">
                    <div className="panel w-full max-w-xl">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-xl font-semibold">Record Payment</h5>
                            <button onClick={() => setShowPayModal(false)} className="text-white-dark hover:text-dark">×</button>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-semibold mb-2">Method</label>
                                <select className="form-select" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                                    <option value="EFT">EFT</option>
                                    <option value="Cheque">Cheque</option>
                                    <option value="Card">Card</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2">Reference</label>
                                <input className="form-input" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="e.g. TRX-12345" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2">Payment Date</label>
                                <input type="date" className="form-input" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                            </div>
                        </div>
                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button onClick={() => setShowPayModal(false)} className="btn btn-outline-danger">Cancel</button>
                            <button onClick={recordPayment} className="btn btn-success">Record Payment</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinanceDashboard;
