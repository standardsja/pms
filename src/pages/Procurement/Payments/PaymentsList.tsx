import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconDollarSignCircle from '../../../components/Icon/IconDollarSignCircle';
import IconEye from '../../../components/Icon/IconEye';
import IconChecks from '../../../components/Icon/IconChecks';

const PaymentsList = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Payments Management'));
    });

    const handleApprove = (payment: { paymentNumber: string; supplier: string }) => {
        if (confirm(`Approve payment ${payment.paymentNumber} to ${payment.supplier}?`)) {
            alert(`Payment ${payment.paymentNumber} has been approved and will be processed.`);
        }
    };

    const [payments] = useState([
        { id: 1, paymentNumber: 'PAY-2024-001', poNumber: 'PO-2024-098', supplier: 'ABC Corporation', amount: 12500, dueDate: '2024-10-28', invoiceDate: '2024-10-15', status: 'Pending Approval' },
        { id: 2, paymentNumber: 'PAY-2024-002', poNumber: 'PO-2024-097', supplier: 'Tech Solutions Inc', amount: 15200, dueDate: '2024-10-25', invoiceDate: '2024-10-12', status: 'Approved' },
        { id: 3, paymentNumber: 'PAY-2024-003', poNumber: 'PO-2024-096', supplier: 'Office Pro Supply', amount: 8900, dueDate: '2024-10-30', invoiceDate: '2024-10-18', status: 'Processing' },
        { id: 4, paymentNumber: 'PAY-2024-004', poNumber: 'PO-2024-095', supplier: 'Clean Corp Ltd', amount: 3200, dueDate: '2024-10-22', invoiceDate: '2024-10-08', status: 'Paid' },
    ]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Paid':
                return 'bg-success';
            case 'Approved':
                return 'bg-info';
            case 'Processing':
                return 'bg-warning';
            case 'Pending Approval':
                return 'bg-secondary';
            default:
                return 'bg-danger';
        }
    };

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold">Payments Management</h2>
                <p className="text-white-dark">Track and manage procurement payments</p>
            </div>

            {/* Stats */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Total Payments</div>
                        <IconDollarSignCircle className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl font-bold text-primary">$542K</div>
                    <div className="mt-2 text-xs text-white-dark">This month</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Pending Approval</div>
                        <IconDollarSignCircle className="h-6 w-6 text-warning" />
                    </div>
                    <div className="text-3xl font-bold text-warning">$78K</div>
                    <div className="mt-2 text-xs text-white-dark">7 invoices</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Processing</div>
                        <IconDollarSignCircle className="h-6 w-6 text-info" />
                    </div>
                    <div className="text-3xl font-bold text-info">$42K</div>
                    <div className="mt-2 text-xs text-white-dark">5 payments</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Paid</div>
                        <IconDollarSignCircle className="h-6 w-6 text-success" />
                    </div>
                    <div className="text-3xl font-bold text-success">$422K</div>
                    <div className="mt-2 text-xs text-white-dark">38 payments</div>
                </div>
            </div>

            {/* Payment Schedule */}
            <div className="mb-6 panel">
                <h5 className="mb-4 text-lg font-semibold">Upcoming Payment Schedule</h5>
                <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border border-white-light p-4 dark:border-white/10">
                        <div>
                            <h6 className="font-semibold">This Week</h6>
                            <p className="text-sm text-white-dark">3 payments due</p>
                        </div>
                        <div className="text-right">
                            <div className="text-xl font-bold text-danger">$28,500</div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-white-light p-4 dark:border-white/10">
                        <div>
                            <h6 className="font-semibold">Next Week</h6>
                            <p className="text-sm text-white-dark">5 payments due</p>
                        </div>
                        <div className="text-right">
                            <div className="text-xl font-bold text-warning">$45,200</div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-white-light p-4 dark:border-white/10">
                        <div>
                            <h6 className="font-semibold">This Month</h6>
                            <p className="text-sm text-white-dark">12 payments due</p>
                        </div>
                        <div className="text-right">
                            <div className="text-xl font-bold text-info">$98,750</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payments Table */}
            <div className="panel">
                <div className="mb-5 flex items-center justify-between">
                    <h5 className="text-lg font-semibold">All Payments</h5>
                    <div className="flex gap-2">
                        <select className="form-select w-auto">
                            <option>All Status</option>
                            <option>Pending Approval</option>
                            <option>Approved</option>
                            <option>Processing</option>
                            <option>Paid</option>
                        </select>
                        <input type="text" placeholder="Search payments..." className="form-input w-auto" />
                    </div>
                </div>
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>Payment #</th>
                                <th>PO #</th>
                                <th>Supplier</th>
                                <th>Amount</th>
                                <th>Invoice Date</th>
                                <th>Due Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map((payment) => (
                                <tr key={payment.id}>
                                    <td>
                                        <Link to={`/procurement/payments/${payment.id}`} className="font-semibold text-primary hover:underline">
                                            {payment.paymentNumber}
                                        </Link>
                                    </td>
                                    <td>
                                        <Link to={`/procurement/purchase-orders/${payment.poNumber}`} className="text-info hover:underline">
                                            {payment.poNumber}
                                        </Link>
                                    </td>
                                    <td>{payment.supplier}</td>
                                    <td className="font-bold text-success">${payment.amount.toLocaleString()}</td>
                                    <td>{payment.invoiceDate}</td>
                                    <td>
                                        <span className={new Date(payment.dueDate) < new Date() ? 'text-danger font-semibold' : ''}>
                                            {payment.dueDate}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge ${getStatusBadge(payment.status)}`}>{payment.status}</span>
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <Link to={`/procurement/payments/${payment.id}`} className="btn btn-sm btn-outline-primary" title="View Details">
                                                <IconEye className="h-4 w-4" />
                                            </Link>
                                            {payment.status === 'Pending Approval' && (
                                                <button type="button" className="btn btn-sm btn-outline-success" onClick={() => handleApprove(payment)} title="Approve Payment">
                                                    <IconChecks className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PaymentsList;
