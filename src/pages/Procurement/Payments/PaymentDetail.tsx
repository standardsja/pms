import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';
import IconDownload from '../../../components/Icon/IconDownload';
import IconPrinter from '../../../components/Icon/IconPrinter';
import IconChecks from '../../../components/Icon/IconChecks';

const PaymentDetail = () => {
    const dispatch = useDispatch();
    const { id } = useParams();

    useEffect(() => {
        dispatch(setPageTitle('Payment Details'));
    });

    const data = {
        1: {
            id: 1,
            paymentNumber: 'PAY-2024-001',
            poId: 1,
            poNumber: 'PO-2024-098',
            supplier: 'ABC Corporation',
            supplierAccount: '****-****-1234',
            amount: 12500,
            dueDate: '2024-10-28',
            invoiceDate: '2024-10-15',
            invoiceNumber: 'INV-2024-567',
            status: 'Pending Approval' as 'Pending Approval' | 'Approved' | 'Processing' | 'Paid',
            description: 'Payment for office furniture supplies as per PO-2024-098',
            paymentMethod: 'Bank Transfer',
            terms: 'Net 30',
            approvedBy: null as string | null,
            paidDate: null as string | null,
            items: [
                { description: 'Executive Office Desk', quantity: 10, unitPrice: 800, total: 8000 },
                { description: 'Ergonomic Chair', quantity: 25, unitPrice: 180, total: 4500 },
            ],
        },
        2: {
            id: 2,
            paymentNumber: 'PAY-2024-002',
            poId: 2,
            poNumber: 'PO-2024-097',
            supplier: 'Tech Solutions Inc',
            supplierAccount: '****-****-5678',
            amount: 15200,
            dueDate: '2024-10-25',
            invoiceDate: '2024-10-12',
            invoiceNumber: 'INV-2024-456',
            status: 'Approved' as 'Pending Approval' | 'Approved' | 'Processing' | 'Paid',
            description: 'Payment for IT equipment as per PO-2024-097',
            paymentMethod: 'Bank Transfer',
            terms: 'Net 30',
            approvedBy: 'John Doe',
            paidDate: null as string | null,
            items: [
                { description: 'Laptop Dell Latitude', quantity: 10, unitPrice: 1200, total: 12000 },
                { description: '24" Monitor', quantity: 10, unitPrice: 220, total: 2200 },
                { description: 'Wireless Mouse', quantity: 10, unitPrice: 100, total: 1000 },
            ],
        },
    };

    const payment = data[parseInt(id || '1') as keyof typeof data] || data[1];

    const [showApprovalModal, setShowApprovalModal] = useState(false);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Paid':
                return 'badge bg-success';
            case 'Approved':
                return 'badge bg-info';
            case 'Processing':
                return 'badge bg-warning';
            case 'Pending Approval':
                return 'badge bg-secondary';
            default:
                return 'badge bg-danger';
        }
    };

    const handleDownloadInvoice = () => {
        alert(`Downloading invoice ${payment.invoiceNumber}.pdf...`);
    };

    const handleDownloadReceipt = () => {
        alert(`Downloading payment receipt for ${payment.paymentNumber}.pdf...`);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleApprove = () => {
        setShowApprovalModal(false);
        alert(`Payment ${payment.paymentNumber} has been approved successfully!`);
    };

    const handleProcessPayment = () => {
        if (confirm(`Process payment of $${payment.amount.toLocaleString()} to ${payment.supplier}?`)) {
            alert(`Payment ${payment.paymentNumber} is being processed. The supplier will be notified.`);
        }
    };

    const subtotal = payment.items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * 0.15;
    const total = subtotal + tax;

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">{payment.paymentNumber}</h2>
                    <p className="text-white-dark">
                        Supplier: {payment.supplier} • Invoice: {payment.invoiceNumber}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handlePrint} className="btn btn-outline-secondary gap-2">
                        <IconPrinter className="h-4 w-4" />
                        Print
                    </button>
                    <button onClick={handleDownloadInvoice} className="btn btn-outline-info gap-2">
                        <IconDownload className="h-4 w-4" />
                        Invoice
                    </button>
                    {payment.status === 'Paid' && (
                        <button onClick={handleDownloadReceipt} className="btn btn-outline-success gap-2">
                            <IconDownload className="h-4 w-4" />
                            Receipt
                        </button>
                    )}
                    <Link to="/procurement/payments" className="btn btn-outline-danger gap-2">
                        <IconArrowLeft />
                        Back to List
                    </Link>
                </div>
            </div>

            {/* Status and Key Info */}
            <div className="mb-6 grid gap-6 lg:grid-cols-4">
                <div className="panel">
                    <div className="mb-2 text-white-dark">Status</div>
                    <div className={getStatusBadge(payment.status)}>{payment.status}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-white-dark">Amount</div>
                    <div className="text-xl font-bold text-primary">${payment.amount.toLocaleString()}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-white-dark">Due Date</div>
                    <div className="text-lg font-semibold">{payment.dueDate}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-white-dark">Payment Method</div>
                    <div className="text-lg font-semibold">{payment.paymentMethod}</div>
                </div>
            </div>

            {/* Payment Information */}
            <div className="panel mb-6">
                <h5 className="mb-5 text-lg font-semibold">Payment Information</h5>
                <div className="grid gap-5 md:grid-cols-2">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="font-semibold text-white-dark">Payment #</div>
                        <div className="col-span-2">{payment.paymentNumber}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="font-semibold text-white-dark">Invoice #</div>
                        <div className="col-span-2">{payment.invoiceNumber}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="font-semibold text-white-dark">PO Reference</div>
                        <div className="col-span-2">
                            <Link to={`/procurement/purchase-orders/${payment.poId}`} className="text-info hover:underline">
                                {payment.poNumber}
                            </Link>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="font-semibold text-white-dark">Supplier Account</div>
                        <div className="col-span-2">{payment.supplierAccount}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="font-semibold text-white-dark">Invoice Date</div>
                        <div className="col-span-2">{payment.invoiceDate}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="font-semibold text-white-dark">Payment Terms</div>
                        <div className="col-span-2">{payment.terms}</div>
                    </div>
                    {payment.approvedBy && (
                        <div className="grid grid-cols-3 gap-4">
                            <div className="font-semibold text-white-dark">Approved By</div>
                            <div className="col-span-2">{payment.approvedBy}</div>
                        </div>
                    )}
                    <div className="md:col-span-2">
                        <div className="font-semibold text-white-dark">Description</div>
                        <div className="mt-2 text-white-dark">{payment.description}</div>
                    </div>
                </div>
            </div>

            {/* Line Items */}
            <div className="panel mb-6">
                <h5 className="mb-5 text-lg font-semibold">Invoice Items</h5>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Description</th>
                                <th>Quantity</th>
                                <th>Unit Price</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payment.items.map((item, idx) => (
                                <tr key={idx}>
                                    <td>{idx + 1}</td>
                                    <td className="font-semibold">{item.description}</td>
                                    <td>{item.quantity}</td>
                                    <td>${item.unitPrice.toLocaleString()}</td>
                                    <td className="font-semibold">${item.total.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="mt-4 flex flex-col items-end gap-1">
                    <div>Subtotal: <span className="font-semibold">${subtotal.toLocaleString()}</span></div>
                    <div>Tax (15%): <span className="font-semibold">${tax.toLocaleString()}</span></div>
                    <div className="text-lg">Total: <span className="font-bold text-primary">${total.toLocaleString()}</span></div>
                </div>
            </div>

            {/* Action Buttons */}
            {payment.status === 'Pending Approval' && (
                <div className="flex gap-3">
                    <button className="btn btn-success gap-2" onClick={() => setShowApprovalModal(true)}>
                        <IconChecks className="h-4 w-4" />
                        Approve Payment
                    </button>
                    <button className="btn btn-danger">Reject</button>
                </div>
            )}

            {payment.status === 'Approved' && (
                <div className="flex gap-3">
                    <button className="btn btn-primary gap-2" onClick={handleProcessPayment}>
                        Process Payment
                    </button>
                </div>
            )}

            {/* Approval Modal */}
            {showApprovalModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
                        <div className="mb-3 text-lg font-semibold text-success">Approve Payment</div>
                        <div className="text-white-dark">
                            <p className="mb-2">You are about to approve payment {payment.paymentNumber}</p>
                            <p className="mb-2">Amount: <span className="font-bold text-primary">${payment.amount.toLocaleString()}</span></p>
                            <p>Supplier: <span className="font-semibold">{payment.supplier}</span></p>
                        </div>
                        <div className="mt-5 flex gap-3">
                            <button className="btn btn-success flex-1" onClick={handleApprove}>Confirm Approval</button>
                            <button className="btn btn-outline-secondary flex-1" onClick={() => setShowApprovalModal(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentDetail;
