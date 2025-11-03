import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';
import IconDownload from '../../../components/Icon/IconDownload';
import IconPrinter from '../../../components/Icon/IconPrinter';

const PurchaseOrderDetail = () => {
    const dispatch = useDispatch();
    const { id } = useParams();

    useEffect(() => {
        dispatch(setPageTitle('Purchase Order Details'));
    });

    // Mock data. In real app, fetch by id.
    const poData = {
        1: {
            id: 1,
            poNumber: 'PO-2024-001',
            rfqId: 1,
            rfqNumber: 'RFQ-2024-045',
            supplier: 'ABC Corporation',
            description: 'Office Equipment - Desks and Chairs',
            poDate: '2024-10-15',
            deliveryDate: '2024-11-15',
            amount: 12500,
            currency: 'USD',
            status: 'Approved',
            items: [
                { id: 1, description: 'Executive Office Desk', quantity: 10, unitPrice: 800 },
                { id: 2, description: 'Ergonomic Chair', quantity: 25, unitPrice: 180 },
            ],
            notes: 'Deliver to Kingston HQ, 2nd floor. Coordinate with Facilities team.',
        },
        2: {
            id: 2,
            poNumber: 'PO-2024-002',
            rfqId: 2,
            rfqNumber: 'RFQ-2024-046',
            supplier: 'Tech Solutions Inc',
            description: 'IT Equipment - Laptops and Monitors',
            poDate: '2024-10-18',
            deliveryDate: '2024-11-20',
            amount: 25000,
            currency: 'USD',
            status: 'Issued',
            items: [
                { id: 1, description: 'Laptop 16GB/512GB', quantity: 12, unitPrice: 1200 },
                { id: 2, description: '24" Monitor', quantity: 12, unitPrice: 220 },
            ],
            notes: 'Include warranty certificates in shipment.',
        },
    } as const;

    const po = poData[parseInt(id || '1') as keyof typeof poData] || poData[1];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Approved':
                return 'badge bg-info';
            case 'Issued':
                return 'badge bg-primary';
            case 'Completed':
                return 'badge bg-success';
            case 'Draft':
                return 'badge bg-secondary';
            case 'Cancelled':
                return 'badge bg-danger';
            default:
                return 'badge bg-secondary';
        }
    };

    const handleDownloadPDF = () => {
        alert(`Downloading ${po.poNumber}.pdf`);
    };

    const handlePrint = () => {
        window.print();
    };

    const subtotal = po.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
    const tax = subtotal * 0.15;
    const total = subtotal + tax;

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">{po.poNumber}</h2>
                    <p className="text-white-dark">{po.description}</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handlePrint} className="btn btn-outline-secondary gap-2">
                        <IconPrinter className="h-4 w-4" />
                        Print
                    </button>
                    <button onClick={handleDownloadPDF} className="btn btn-info gap-2">
                        <IconDownload className="h-4 w-4" />
                        Download PDF
                    </button>
                    <Link to="/procurement/purchase-orders" className="btn btn-outline-danger gap-2">
                        <IconArrowLeft />
                        Back to List
                    </Link>
                </div>
            </div>

            {/* Status and Key Info */}
            <div className="mb-6 grid gap-6 lg:grid-cols-4">
                <div className="panel">
                    <div className="mb-2 text-white-dark">Status</div>
                    <div className={getStatusBadge(po.status)}>{po.status}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-white-dark">Supplier</div>
                    <div className="text-lg font-semibold">{po.supplier}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-white-dark">PO Date</div>
                    <div className="text-lg font-semibold">{po.poDate}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-white-dark">Delivery Date</div>
                    <div className="text-lg font-semibold">{po.deliveryDate}</div>
                </div>
            </div>

            {/* References */}
            <div className="panel mb-6">
                <h5 className="mb-5 text-lg font-semibold">References</h5>
                <div className="grid gap-5 md:grid-cols-2">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="font-semibold text-white-dark">PO Number</div>
                        <div className="col-span-2">{po.poNumber}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="font-semibold text-white-dark">RFQ Reference</div>
                        <div className="col-span-2">
                            <Link to={`/procurement/rfq/${po.rfqId}`} className="text-info hover:underline">{po.rfqNumber}</Link>
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <div className="font-semibold text-white-dark">Notes</div>
                        <div className="mt-2 text-white-dark">{po.notes}</div>
                    </div>
                </div>
            </div>

            {/* Items */}
            <div className="panel">
                <h5 className="mb-5 text-lg font-semibold">Items</h5>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Description</th>
                                <th>Qty</th>
                                <th>Unit Price</th>
                                <th>Line Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {po.items.map((item, idx) => (
                                <tr key={item.id}>
                                    <td>{idx + 1}</td>
                                    <td className="font-semibold">{item.description}</td>
                                    <td>{item.quantity}</td>
                                    <td>${item.unitPrice.toLocaleString()}</td>
                                    <td className="font-semibold">
                                        ${(item.quantity * item.unitPrice).toLocaleString()}
                                    </td>
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
        </div>
    );
};

export default PurchaseOrderDetail;
