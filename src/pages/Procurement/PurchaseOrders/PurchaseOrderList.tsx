import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconPlus from '../../../components/Icon/IconPlus';
import IconEye from '../../../components/Icon/IconEye';
import IconDownload from '../../../components/Icon/IconDownload';
import IconPrinter from '../../../components/Icon/IconPrinter';
import IconCreditCard from '../../../components/Icon/IconCreditCard';

const PurchaseOrderList = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Purchase Orders'));
    });

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Mock PO data
    const purchaseOrders = [
        {
            id: 1,
            poNumber: 'PO-2024-001',
            rfqNumber: 'RFQ-2024-045',
            supplier: 'ABC Corporation',
            description: 'Office Equipment - Desks and Chairs',
            poDate: '2024-10-15',
            deliveryDate: '2024-11-15',
            amount: 12500,
            status: 'Approved',
            paymentStatus: 'Pending',
            deliveryStatus: 'Not Started',
        },
        {
            id: 2,
            poNumber: 'PO-2024-002',
            rfqNumber: 'RFQ-2024-046',
            supplier: 'Tech Solutions Inc',
            description: 'IT Equipment - Laptops and Monitors',
            poDate: '2024-10-18',
            deliveryDate: '2024-11-20',
            amount: 25000,
            status: 'Issued',
            paymentStatus: 'Partial',
            deliveryStatus: 'In Transit',
        },
        {
            id: 3,
            poNumber: 'PO-2024-003',
            rfqNumber: 'RFQ-2024-047',
            supplier: 'Office Pro Supply',
            description: 'Office Supplies - Paper, Stationery',
            poDate: '2024-10-20',
            deliveryDate: '2024-11-10',
            amount: 3500,
            status: 'Issued',
            paymentStatus: 'Pending',
            deliveryStatus: 'Preparing',
        },
        {
            id: 4,
            poNumber: 'PO-2024-004',
            rfqNumber: 'RFQ-2024-048',
            supplier: 'Clean Corp Ltd',
            description: 'Cleaning Services - 6 Month Contract',
            poDate: '2024-10-12',
            deliveryDate: '2024-10-25',
            amount: 8900,
            status: 'Completed',
            paymentStatus: 'Paid',
            deliveryStatus: 'Delivered',
        },
        {
            id: 5,
            poNumber: 'PO-2024-005',
            rfqNumber: 'RFQ-2024-049',
            supplier: 'XYZ Suppliers Ltd',
            description: 'Security Equipment',
            poDate: '2024-10-22',
            deliveryDate: '2024-11-25',
            amount: 18000,
            status: 'Draft',
            paymentStatus: 'Not Initiated',
            deliveryStatus: 'Not Started',
        },
    ];

    const filteredPOs = purchaseOrders.filter((po) => {
        const matchesSearch =
            po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
            po.supplier.toLowerCase().includes(search.toLowerCase()) ||
            po.description.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadge = (status: string) => {
        const badges: Record<string, string> = {
            Draft: 'bg-secondary',
            Approved: 'bg-info',
            Issued: 'bg-primary',
            Completed: 'bg-success',
            Cancelled: 'bg-danger',
        };
        return badges[status] || 'bg-secondary';
    };

    const getPaymentStatusBadge = (status: string) => {
        const badges: Record<string, string> = {
            'Not Initiated': 'bg-secondary',
            Pending: 'bg-warning',
            Partial: 'bg-info',
            Paid: 'bg-success',
        };
        return badges[status] || 'bg-secondary';
    };

    const getDeliveryStatusBadge = (status: string) => {
        const badges: Record<string, string> = {
            'Not Started': 'bg-secondary',
            Preparing: 'bg-warning',
            'In Transit': 'bg-info',
            Delivered: 'bg-success',
        };
        return badges[status] || 'bg-secondary';
    };

    const stats = {
        total: purchaseOrders.length,
        draft: purchaseOrders.filter((po) => po.status === 'Draft').length,
        issued: purchaseOrders.filter((po) => po.status === 'Issued').length,
        completed: purchaseOrders.filter((po) => po.status === 'Completed').length,
        totalValue: purchaseOrders.reduce((sum, po) => sum + po.amount, 0),
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Purchase Orders</h2>
                    <p className="text-white-dark">Manage and track purchase orders</p>
                </div>
                <Link to="/procurement/purchase-orders/new" className="btn btn-primary gap-2">
                    <IconPlus />
                    New PO
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Total POs</div>
                        <IconCreditCard className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl font-bold text-primary">{stats.total}</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Draft</div>
                        <IconCreditCard className="h-6 w-6 text-secondary" />
                    </div>
                    <div className="text-3xl font-bold text-secondary">{stats.draft}</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Issued</div>
                        <IconCreditCard className="h-6 w-6 text-info" />
                    </div>
                    <div className="text-3xl font-bold text-info">{stats.issued}</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Completed</div>
                        <IconCreditCard className="h-6 w-6 text-success" />
                    </div>
                    <div className="text-3xl font-bold text-success">{stats.completed}</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Total Value</div>
                        <IconCreditCard className="h-6 w-6 text-warning" />
                    </div>
                    <div className="text-3xl font-bold text-warning">${stats.totalValue.toLocaleString()}</div>
                </div>
            </div>

            {/* PO Table */}
            <div className="panel">
                <div className="mb-5 flex flex-col gap-5 md:flex-row md:items-center">
                    <div className="flex-1">
                        <input
                            type="text"
                            className="form-input w-full"
                            placeholder="Search purchase orders..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-3">
                        <select className="form-select w-full md:w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="all">All Status</option>
                            <option value="Draft">Draft</option>
                            <option value="Approved">Approved</option>
                            <option value="Issued">Issued</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>PO Number</th>
                                <th>RFQ #</th>
                                <th>Supplier</th>
                                <th>Description</th>
                                <th>PO Date</th>
                                <th>Delivery Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Payment</th>
                                <th>Delivery</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPOs.map((po) => (
                                <tr key={po.id}>
                                    <td>
                                        <Link to={`/procurement/purchase-orders/${po.id}`} className="font-semibold text-primary hover:underline">
                                            {po.poNumber}
                                        </Link>
                                    </td>
                                    <td>
                                        <Link to={`/procurement/rfq/${po.rfqNumber}`} className="text-info hover:underline">
                                            {po.rfqNumber}
                                        </Link>
                                    </td>
                                    <td>{po.supplier}</td>
                                    <td>{po.description}</td>
                                    <td>{po.poDate}</td>
                                    <td>{po.deliveryDate}</td>
                                    <td className="font-bold text-success">${po.amount.toLocaleString()}</td>
                                    <td>
                                        <span className={`badge ${getStatusBadge(po.status)}`}>{po.status}</span>
                                    </td>
                                    <td>
                                        <span className={`badge ${getPaymentStatusBadge(po.paymentStatus)}`}>{po.paymentStatus}</span>
                                    </td>
                                    <td>
                                        <span className={`badge ${getDeliveryStatusBadge(po.deliveryStatus)}`}>{po.deliveryStatus}</span>
                                    </td>
                                    <td>
                                        <div className="flex items-center justify-center gap-2">
                                            <Link to={`/procurement/purchase-orders/${po.id}`} className="hover:text-primary" title="View">
                                                <IconEye className="h-4.5 w-4.5" />
                                            </Link>
                                            <button type="button" className="hover:text-info" title="Download">
                                                <IconDownload className="h-4.5 w-4.5" />
                                            </button>
                                            <button type="button" className="hover:text-secondary" title="Print">
                                                <IconPrinter className="h-4.5 w-4.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredPOs.length === 0 && (
                    <div className="py-8 text-center">
                        <p className="text-white-dark">No purchase orders found matching your search.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PurchaseOrderList;
