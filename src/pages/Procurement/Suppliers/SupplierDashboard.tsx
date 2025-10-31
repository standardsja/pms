import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { Link } from 'react-router-dom';
import IconShoppingCart from '../../../components/Icon/IconShoppingCart';
import IconTag from '../../../components/Icon/IconTag';
import IconCreditCard from '../../../components/Icon/IconCreditCard';
import IconBell from '../../../components/Icon/IconBell';

interface RFQ {
    id: number;
    rfqNumber: string;
    title: string;
    dueDate: string;
    status: 'New' | 'Open' | 'Closed';
    invitedBy: string;
}

interface Quote {
    id: number;
    rfqNumber: string;
    amount: number;
    status: 'Draft' | 'Submitted' | 'Awarded' | 'Not Awarded';
    submittedAt?: string;
}

interface Notification {
    id: number;
    type: 'PO' | 'Contract';
    number: string;
    description: string;
    date: string;
    read: boolean;
}

const SupplierDashboard = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Supplier Dashboard'));
    }, [dispatch]);

    const [rfqs, setRfqs] = useState<RFQ[]>([
        { id: 1, rfqNumber: 'RFQ-2025-001', title: 'Office Supplies', dueDate: '2025-11-05', status: 'Open', invitedBy: 'Procurement Officer' },
        { id: 2, rfqNumber: 'RFQ-2025-002', title: 'IT Equipment', dueDate: '2025-11-10', status: 'Open', invitedBy: 'Procurement Officer' },
        { id: 3, rfqNumber: 'RFQ-2025-003', title: 'Cleaning Services', dueDate: '2025-11-15', status: 'New', invitedBy: 'Procurement Officer' },
    ]);

    const [quotes, setQuotes] = useState<Quote[]>([
        { id: 1, rfqNumber: 'RFQ-2025-000', amount: 12500, status: 'Submitted', submittedAt: '2025-10-29 14:22' },
        { id: 2, rfqNumber: 'RFQ-2025-001', amount: 8400, status: 'Draft' },
    ]);

    const [notifications, setNotifications] = useState<Notification[]>([
        { id: 1, type: 'PO', number: 'PO-2025-014', description: 'Office Chairs (Awarded)', date: '2025-10-30', read: false },
        { id: 2, type: 'Contract', number: 'CT-2025-003', description: 'Cleaning Services (Awarded)', date: '2025-10-28', read: true },
    ]);

    const [showQuoteModal, setShowQuoteModal] = useState(false);
    const [activeRFQ, setActiveRFQ] = useState<RFQ | null>(null);
    const [quoteAmount, setQuoteAmount] = useState('');
    const [quoteNotes, setQuoteNotes] = useState('');

    const openSubmitQuote = (rfq: RFQ) => {
        setActiveRFQ(rfq);
        setQuoteAmount('');
        setQuoteNotes('');
        setShowQuoteModal(true);
    };

    const submitQuote = () => {
        if (!activeRFQ) return;
        const amt = Number(quoteAmount);
        if (!amt || amt <= 0) return;
        const now = new Date();
        const submittedAt = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        setQuotes((prev) => {
            const existing = prev.find((q) => q.rfqNumber === activeRFQ.rfqNumber);
            if (existing) {
                return prev.map((q) => (q.rfqNumber === activeRFQ.rfqNumber ? { ...q, amount: amt, status: 'Submitted', submittedAt } : q));
            }
            return [...prev, { id: prev.length + 1, rfqNumber: activeRFQ.rfqNumber, amount: amt, status: 'Submitted', submittedAt }];
        });
        setShowQuoteModal(false);
    };

    const markNotificationRead = (id: number) => {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold">Supplier Dashboard</h2>
                <p className="text-white-dark">Receive RFQs, submit quotes securely, and track PO/contract awards.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* RFQs Inbox */}
                <div className="panel lg:col-span-2">
                    <div className="mb-5 flex items-center justify-between">
                        <h5 className="text-lg font-semibold">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-primary/10 text-primary mr-2"><IconShoppingCart className="h-4 w-4"/></span>
                            RFQs Inbox
                        </h5>
                        <Link to="/procurement/rfq/list" className="text-sm font-semibold text-primary hover:underline">All RFQs</Link>
                    </div>
                    <div className="table-responsive">
                        <table className="table-hover">
                            <thead>
                                <tr>
                                    <th>RFQ #</th>
                                    <th>Title</th>
                                    <th>Due Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rfqs.map((r) => (
                                    <tr key={r.id}>
                                        <td>
                                            <Link to={`/procurement/rfq/${r.id}`} className="text-primary hover:underline">{r.rfqNumber}</Link>
                                        </td>
                                        <td>{r.title}</td>
                                        <td>{r.dueDate}</td>
                                        <td>
                                            <span className={`badge ${r.status === 'Open' ? 'bg-success' : r.status === 'New' ? 'bg-info' : 'bg-secondary'}`}>{r.status}</span>
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
                                                <Link to={`/procurement/rfq/${r.id}`} className="btn btn-sm btn-outline-primary">View</Link>
                                                <button onClick={() => openSubmitQuote(r)} className="btn btn-sm btn-primary">
                                                    Submit Quote
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Notifications */}
                <div className="panel">
                    <div className="mb-5 flex items-center justify-between">
                        <h5 className="text-lg font-semibold">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-success/10 text-success mr-2"><IconBell className="h-4 w-4"/></span>
                            Awards & Notifications
                        </h5>
                        <Link to="/procurement/purchase-orders" className="text-sm font-semibold text-success hover:underline">POs</Link>
                    </div>
                    <ul className="space-y-3">
                        {notifications.map((n) => (
                            <li key={n.id} className="flex items-start justify-between">
                                <div>
                                    <div className="font-semibold">
                                        <span className={`badge mr-2 ${n.type === 'PO' ? 'bg-success' : 'bg-info'}`}>{n.type}</span>
                                        {n.number}
                                    </div>
                                    <div className="text-sm text-white-dark">{n.description}</div>
                                    <div className="text-xs text-white-dark">{n.date}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!n.read && (
                                        <button onClick={() => markNotificationRead(n.id)} className="btn btn-outline-secondary btn-sm">Mark read</button>
                                    )}
                                    <Link to={n.type === 'PO' ? `/procurement/purchase-orders/${n.number}` : '#'} className="btn btn-success btn-sm">View</Link>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* My Quotes */}
            <div className="panel mt-6">
                <div className="mb-5 flex items-center justify-between">
                    <h5 className="text-lg font-semibold">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-warning/10 text-warning mr-2"><IconTag className="h-4 w-4"/></span>
                        My Quotes
                    </h5>
                    <Link to="/procurement/quotes" className="text-sm font-semibold text-warning hover:underline">All Quotes</Link>
                </div>
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>RFQ #</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Submitted</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quotes.map((q) => (
                                <tr key={q.id}>
                                    <td>{q.rfqNumber}</td>
                                    <td className="font-semibold text-primary">${q.amount.toLocaleString()}</td>
                                    <td>
                                        <span className={`badge ${q.status === 'Submitted' ? 'bg-success' : q.status === 'Draft' ? 'bg-info' : q.status === 'Awarded' ? 'bg-success' : 'bg-secondary'}`}>{q.status}</span>
                                    </td>
                                    <td>{q.submittedAt || '-'}</td>
                                    <td>
                                        {q.status === 'Draft' ? (
                                            <button className="btn btn-sm btn-primary" onClick={() => openSubmitQuote({ id: 0, rfqNumber: q.rfqNumber, title: '', dueDate: '', status: 'Open', invitedBy: '' })}>Submit</button>
                                        ) : (
                                            <button className="btn btn-sm btn-outline-secondary">View</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Submit Quote Modal */}
            {showQuoteModal && activeRFQ && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60">
                    <div className="panel w-full max-w-2xl">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-xl font-semibold">Submit Quote — {activeRFQ.rfqNumber}</h5>
                            <button onClick={() => setShowQuoteModal(false)} className="text-white-dark hover:text-dark">×</button>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-semibold mb-2">Amount (USD)</label>
                                <input type="number" className="form-input" value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value)} placeholder="e.g. 12500" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2">Attachment</label>
                                <input type="file" className="form-input" />
                                <div className="text-xs text-white-dark mt-1">Attach your detailed quotation (PDF, XLSX)</div>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-semibold mb-2">Notes</label>
                                <textarea className="form-textarea" rows={4} value={quoteNotes} onChange={(e) => setQuoteNotes(e.target.value)} placeholder="Optional notes or clarifications"></textarea>
                            </div>
                        </div>
                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button onClick={() => setShowQuoteModal(false)} className="btn btn-outline-danger">Cancel</button>
                            <button onClick={submitQuote} className="btn btn-primary">Submit Quote</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupplierDashboard;
