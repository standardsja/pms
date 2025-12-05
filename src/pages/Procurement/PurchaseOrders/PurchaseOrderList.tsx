import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconPlus from '../../../components/Icon/IconPlus';
import IconEye from '../../../components/Icon/IconEye';
import IconDownload from '../../../components/Icon/IconDownload';
import IconPrinter from '../../../components/Icon/IconPrinter';
import IconCreditCard from '../../../components/Icon/IconCreditCard';
import { getApiUrl } from '../../../utils/api';

interface PurchaseOrder {
    id: number;
    poNumber: string;
    rfqNumber: string | null;
    supplier: string;
    description: string;
    poDate: string;
    deliveryDate: string | null;
    amount: number;
    currency: string;
    status: string;
    paymentStatus: string;
    deliveryStatus: string;
}

const PurchaseOrderList = () => {
    const dispatch = useDispatch();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('Purchase Orders'));
        fetchPurchaseOrders();
    }, [dispatch, statusFilter]);

    const fetchPurchaseOrders = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            const userId = localStorage.getItem('userId');

            const params = new URLSearchParams();
            if (statusFilter !== 'all') {
                params.append('status', statusFilter);
            }

            const response = await fetch(`${getApiUrl('/api/purchase-orders')}?${params}`, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    'x-user-id': userId || '',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch purchase orders');
            }

            const data = await response.json();
            setPurchaseOrders(data);
        } catch (err) {
            console.error('Error fetching purchase orders:', err);
            setError(err instanceof Error ? err.message : 'Failed to load purchase orders');
        } finally {
            setLoading(false);
        }
    };

    const filteredPOs = purchaseOrders.filter((po) => {
        const matchesSearch =
            po.poNumber.toLowerCase().includes(search.toLowerCase()) || po.supplier.toLowerCase().includes(search.toLowerCase()) || po.description.toLowerCase().includes(search.toLowerCase());
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-white-dark">Loading purchase orders...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="panel">
                <div className="text-center py-8">
                    <h3 className="mb-2 text-lg font-semibold text-danger">Error Loading Purchase Orders</h3>
                    <p className="text-white-dark mb-4">{error}</p>
                    <button onClick={fetchPurchaseOrders} className="btn btn-primary">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

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
                        <input type="text" className="form-input w-full" placeholder="Search purchase orders..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
                                    <td>{po.rfqNumber ? <span className="text-info">{po.rfqNumber}</span> : <span className="text-white-dark">N/A</span>}</td>
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
                                            <button type="button" className="hover:text-info" title="Download" onClick={() => alert(`Downloading ${po.poNumber}.pdf`)}>
                                                <IconDownload className="h-4.5 w-4.5" />
                                            </button>
                                            <button type="button" className="hover:text-secondary" title="Print" onClick={() => window.print()}>
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
