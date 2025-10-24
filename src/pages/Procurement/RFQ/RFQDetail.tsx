import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';
import IconDownload from '../../../components/Icon/IconDownload';
import IconEdit from '../../../components/Icon/IconEdit';
import IconSend from '../../../components/Icon/IconSend';
import IconX from '../../../components/Icon/IconX';
import IconPrinter from '../../../components/Icon/IconPrinter';

const RFQDetail = () => {
    const dispatch = useDispatch();
    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        dispatch(setPageTitle('RFQ Details'));
    });

    // Mock data - in real app, fetch based on id
    const rfqData = {
        1: {
            id: 1,
            rfqNumber: 'RFQ-2024-001',
            requestNumber: 'REQ-2024-003',
            title: 'Office Furniture',
            description: 'Procurement of office furniture including desks, chairs, and filing cabinets for the new office space.',
            category: 'Furniture',
            issueDate: '2024-10-15',
            closingDate: '2024-10-30',
            deliveryDate: '2024-11-15',
            deliveryLocation: '123 Main Street, Kingston, Jamaica',
            suppliersInvited: 5,
            quotesReceived: 3,
            status: 'Open',
            estimatedValue: 3500,
            currency: 'USD',
            paymentTerms: 'Net 30',
            daysRemaining: 6,
            notes: 'Please ensure all items meet the specified quality standards. Installation and delivery must be coordinated with our facilities team.',
            items: [
                { id: 1, description: 'Executive Office Desk', quantity: 10, unit: 'Each', specifications: 'Wood finish, minimum 1.5m x 0.8m, with cable management' },
                { id: 2, description: 'Ergonomic Office Chair', quantity: 25, unit: 'Each', specifications: 'Adjustable height, lumbar support, mesh back' },
                { id: 3, description: 'Filing Cabinet', quantity: 8, unit: 'Each', specifications: '4-drawer, lockable, metal construction' },
            ],
            vendors: [
                { id: 1, name: 'ABC Corp', email: 'contact@abccorp.com', contact: '+1-876-123-4567', category: 'Office Supplies', rating: 4.5, quotedDate: '2024-10-18' },
                { id: 2, name: 'Office Pro', email: 'sales@officepro.com', contact: '+1-876-234-5678', category: 'Office Supplies', rating: 4.2, quotedDate: '2024-10-19' },
                { id: 3, name: 'Furniture Plus', email: 'support@furnitureplus.com', contact: '+1-876-345-6789', category: 'Furniture', rating: 4.6, quotedDate: '2024-10-20' },
                { id: 4, name: 'Desk Solutions', email: 'info@desksolutions.com', contact: '+1-876-456-7890', category: 'Furniture', rating: 4.4, quotedDate: null },
                { id: 5, name: 'Chair World', email: 'sales@chairworld.com', contact: '+1-876-567-8901', category: 'Furniture', rating: 4.3, quotedDate: null },
            ],
            createdBy: 'John Doe',
            createdDate: '2024-10-15',
        },
        2: {
            id: 2,
            rfqNumber: 'RFQ-2024-002',
            requestNumber: 'REQ-2024-005',
            title: 'IT Equipment',
            description: 'Procurement of computers, monitors, and networking equipment for IT infrastructure upgrade.',
            category: 'IT Equipment',
            issueDate: '2024-10-10',
            closingDate: '2024-10-25',
            deliveryDate: '2024-11-10',
            deliveryLocation: '456 Tech Park, Kingston, Jamaica',
            suppliersInvited: 4,
            quotesReceived: 4,
            status: 'Closed',
            estimatedValue: 5000,
            currency: 'USD',
            paymentTerms: 'Net 60',
            daysRemaining: 0,
            notes: 'All equipment must come with manufacturer warranty. Include installation and configuration services.',
            items: [
                { id: 1, description: 'Desktop Computer', quantity: 15, unit: 'Each', specifications: 'Intel i5 or equivalent, 16GB RAM, 512GB SSD' },
                { id: 2, description: '24" Monitor', quantity: 15, unit: 'Each', specifications: 'Full HD, IPS panel, HDMI and DisplayPort' },
                { id: 3, description: 'Network Switch', quantity: 2, unit: 'Each', specifications: '24-port, Gigabit, managed' },
            ],
            vendors: [
                { id: 1, name: 'Tech Solutions', email: 'info@techsolutions.com', contact: '+1-876-111-2222', category: 'IT Equipment', rating: 4.8, quotedDate: '2024-10-12' },
                { id: 2, name: 'IT World', email: 'contact@itworld.com', contact: '+1-876-222-3333', category: 'IT Equipment', rating: 4.7, quotedDate: '2024-10-13' },
                { id: 3, name: 'Computer Hub', email: 'sales@computerhub.com', contact: '+1-876-333-4444', category: 'IT Equipment', rating: 4.6, quotedDate: '2024-10-14' },
                { id: 4, name: 'Digital Store', email: 'info@digitalstore.com', contact: '+1-876-444-5555', category: 'IT Equipment', rating: 4.5, quotedDate: '2024-10-15' },
            ],
            createdBy: 'Jane Smith',
            createdDate: '2024-10-10',
        },
    };

    const rfq = rfqData[parseInt(id || '1') as keyof typeof rfqData] || rfqData[1];

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'Open':
                return 'badge bg-success';
            case 'Closed':
                return 'badge bg-secondary';
            case 'Cancelled':
                return 'badge bg-danger';
            case 'Draft':
                return 'badge bg-warning';
            default:
                return 'badge bg-primary';
        }
    };

    const handleDownloadPDF = () => {
        // In a real application, this would generate and download a PDF
        console.log('Downloading RFQ PDF for:', rfq.rfqNumber);
        alert(`Downloading ${rfq.rfqNumber}.pdf`);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">{rfq.rfqNumber}</h2>
                    <p className="text-white-dark">{rfq.title}</p>
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
                    <Link to="/procurement/rfq/list" className="btn btn-outline-danger gap-2">
                        <IconArrowLeft />
                        Back to List
                    </Link>
                </div>
            </div>

            {/* Status and Key Info */}
            <div className="mb-6 grid gap-6 lg:grid-cols-4">
                <div className="panel">
                    <div className="mb-2 text-white-dark">Status</div>
                    <div className={getStatusBadgeClass(rfq.status)}>{rfq.status}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-white-dark">Estimated Value</div>
                    <div className="text-xl font-bold text-primary">{rfq.currency} ${rfq.estimatedValue.toLocaleString()}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-white-dark">Quotes Received</div>
                    <div className="text-xl font-bold">{rfq.quotesReceived} / {rfq.suppliersInvited}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-white-dark">Days Remaining</div>
                    <div className={`text-xl font-bold ${rfq.daysRemaining > 0 ? 'text-info' : 'text-danger'}`}>
                        {rfq.daysRemaining > 0 ? `${rfq.daysRemaining} days` : 'Closed'}
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Basic Information */}
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">Basic Information</h5>
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="font-semibold text-white-dark">RFQ Number:</div>
                            <div className="col-span-2">{rfq.rfqNumber}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="font-semibold text-white-dark">Request Number:</div>
                            <div className="col-span-2 text-info">{rfq.requestNumber}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="font-semibold text-white-dark">Category:</div>
                            <div className="col-span-2">{rfq.category}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="font-semibold text-white-dark">Issue Date:</div>
                            <div className="col-span-2">{rfq.issueDate}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="font-semibold text-white-dark">Closing Date:</div>
                            <div className="col-span-2 font-semibold text-danger">{rfq.closingDate}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="font-semibold text-white-dark">Delivery Date:</div>
                            <div className="col-span-2">{rfq.deliveryDate}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="font-semibold text-white-dark">Created By:</div>
                            <div className="col-span-2">{rfq.createdBy}</div>
                        </div>
                    </div>
                </div>

                {/* Terms & Delivery */}
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">Terms & Delivery</h5>
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="font-semibold text-white-dark">Payment Terms:</div>
                            <div className="col-span-2">{rfq.paymentTerms}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="font-semibold text-white-dark">Delivery Location:</div>
                            <div className="col-span-2">{rfq.deliveryLocation}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="font-semibold text-white-dark">Expected Delivery:</div>
                            <div className="col-span-2">{rfq.deliveryDate}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Description */}
            <div className="panel mt-6">
                <h5 className="mb-5 text-lg font-semibold">Description</h5>
                <p className="text-white-dark">{rfq.description}</p>
            </div>

            {/* Items/Requirements */}
            <div className="panel mt-6">
                <h5 className="mb-5 text-lg font-semibold">Items / Requirements</h5>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Description</th>
                                <th>Quantity</th>
                                <th>Unit</th>
                                <th>Specifications</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rfq.items.map((item, index) => (
                                <tr key={item.id}>
                                    <td>{index + 1}</td>
                                    <td className="font-semibold">{item.description}</td>
                                    <td>{item.quantity}</td>
                                    <td>{item.unit}</td>
                                    <td className="text-white-dark">{item.specifications}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Invited Vendors */}
            <div className="panel mt-6">
                <h5 className="mb-5 text-lg font-semibold">Invited Vendors ({rfq.vendors.length})</h5>
                <div className="grid gap-4 sm:grid-cols-2">
                    {rfq.vendors.map((vendor) => (
                        <div key={vendor.id} className="rounded border border-white-light p-4 dark:border-dark">
                            <div className="mb-2 flex items-start justify-between">
                                <div className="font-semibold">{vendor.name}</div>
                                {vendor.quotedDate ? (
                                    <span className="badge bg-success">Quote Submitted</span>
                                ) : (
                                    <span className="badge bg-warning">Pending</span>
                                )}
                            </div>
                            <div className="space-y-1 text-sm text-white-dark">
                                <div>📧 {vendor.email}</div>
                                <div>📞 {vendor.contact}</div>
                                <div className="flex items-center gap-2">
                                    <span className="rounded bg-primary-light px-2 py-0.5 text-primary dark:bg-primary/20">{vendor.category}</span>
                                    <span className="text-warning">★ {vendor.rating}</span>
                                </div>
                                {vendor.quotedDate && (
                                    <div className="text-xs text-success">Quoted on: {vendor.quotedDate}</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Additional Notes */}
            {rfq.notes && (
                <div className="panel mt-6">
                    <h5 className="mb-5 text-lg font-semibold">Additional Notes</h5>
                    <p className="text-white-dark">{rfq.notes}</p>
                </div>
            )}

            {/* Action Buttons */}
            {rfq.status === 'Draft' && (
                <div className="mt-6 flex gap-3">
                    <button className="btn btn-primary gap-2">
                        <IconEdit className="h-4 w-4" />
                        Edit RFQ
                    </button>
                    <button className="btn btn-success gap-2">
                        <IconSend className="h-4 w-4" />
                        Send to Vendors
                    </button>
                    <button className="btn btn-danger gap-2">
                        <IconX className="h-4 w-4" />
                        Cancel RFQ
                    </button>
                </div>
            )}
        </div>
    );
};

export default RFQDetail;
