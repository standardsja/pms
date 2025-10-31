import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconPlus from '../../../components/Icon/IconPlus';
import IconEye from '../../../components/Icon/IconEye';
import IconSend from '../../../components/Icon/IconSend';
import IconDownload from '../../../components/Icon/IconDownload';
import IconShoppingCart from '../../../components/Icon/IconShoppingCart';
import IconClock from '../../../components/Icon/IconClock';

const RFQList = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('RFQ Management'));
    });

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showSendModal, setShowSendModal] = useState(false);
    const [selectedRFQ, setSelectedRFQ] = useState<any>(null);

    // Mock data with enhanced vendor information
    const rfqs = [
        {
            id: 1,
            rfqNumber: 'RFQ-2024-001',
            requestNumber: 'REQ-2024-003',
            title: 'Office Furniture',
            issueDate: '2024-10-15',
            closingDate: '2024-10-30',
            suppliersInvited: 5,
            quotesReceived: 3,
            status: 'Open',
            estimatedValue: 3500,
            daysRemaining: 6,
            vendors: ['ABC Corp', 'Office Pro', 'Furniture Plus', 'Desk Solutions', 'Chair World'],
        },
        {
            id: 2,
            rfqNumber: 'RFQ-2024-002',
            requestNumber: 'REQ-2024-005',
            title: 'IT Equipment',
            issueDate: '2024-10-10',
            closingDate: '2024-10-25',
            suppliersInvited: 4,
            quotesReceived: 4,
            status: 'Closed',
            estimatedValue: 5000,
            daysRemaining: 0,
            vendors: ['Tech Solutions', 'IT World', 'Computer Hub', 'Digital Store'],
        },
        {
            id: 3,
            rfqNumber: 'RFQ-2024-003',
            requestNumber: 'REQ-2024-007',
            title: 'Office Supplies',
            issueDate: '2024-10-12',
            closingDate: '2024-10-28',
            suppliersInvited: 6,
            quotesReceived: 2,
            status: 'Open',
            estimatedValue: 1200,
            daysRemaining: 4,
            vendors: ['ABC Corp', 'Supplies Direct', 'Office Depot', 'Staples', 'Paper World', 'Pen Store'],
        },
        {
            id: 4,
            rfqNumber: 'RFQ-2024-004',
            requestNumber: 'REQ-2024-008',
            title: 'Cleaning Services Contract',
            issueDate: '2024-10-20',
            closingDate: '2024-11-05',
            suppliersInvited: 3,
            quotesReceived: 0,
            status: 'Draft',
            estimatedValue: 8900,
            daysRemaining: 12,
            vendors: ['Clean Corp', 'Sparkle Services', 'Tidy Solutions'],
        },
    ];

    const filteredRFQs = rfqs.filter((rfq) => {
        const matchesSearch =
            rfq.rfqNumber.toLowerCase().includes(search.toLowerCase()) ||
            rfq.title.toLowerCase().includes(search.toLowerCase()) ||
            rfq.requestNumber.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || rfq.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'Open':
                return 'bg-success';
            case 'Closed':
                return 'bg-secondary';
            case 'Cancelled':
                return 'bg-danger';
            case 'Draft':
                return 'bg-warning';
            default:
                return 'bg-primary';
        }
    };

    const handleSendRFQ = (rfq: any) => {
        setSelectedRFQ(rfq);
        setShowSendModal(true);
    };

    const confirmSendRFQ = () => {
        console.log('Sending RFQ to vendors:', selectedRFQ);
        // Implement send logic here
        setShowSendModal(false);
        setSelectedRFQ(null);
    };

    const handleDownloadRFQ = (rfq: any) => {
        console.log('Downloading RFQ:', rfq.rfqNumber);
        // In a real application, this would generate and download a PDF
        alert(`Downloading ${rfq.rfqNumber}.pdf\n\nRFQ: ${rfq.title}\nStatus: ${rfq.status}\nClosing Date: ${rfq.closingDate}`);
    };

    const exportCSV = (rows: any[]) => {
        if (!rows || rows.length === 0) return;
        const keys = Object.keys(rows[0]);
        const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify((r as any)[k] ?? '')).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rfqs_export_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const stats = {
        total: rfqs.length,
        open: rfqs.filter((r) => r.status === 'Open').length,
        draft: rfqs.filter((r) => r.status === 'Draft').length,
        closed: rfqs.filter((r) => r.status === 'Closed').length,
        quotesReceived: rfqs.reduce((sum, r) => sum + r.quotesReceived, 0),
    };

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">RFQ Management</h2>
                    <p className="text-white-dark">Create and send RFQs to collect vendor quotations</p>
                </div>
                <div className="flex gap-3">
                    <Link to="/procurement/rfq/new" className="btn btn-primary gap-2">
                        <IconPlus />
                        Create New RFQ
                    </Link>
                    <button onClick={() => exportCSV(filteredRFQs)} className="btn btn-outline-primary gap-2">
                        <IconDownload /> Export CSV
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Total RFQs</div>
                        <IconShoppingCart className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl font-bold text-primary">{stats.total}</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Open</div>
                        <IconShoppingCart className="h-6 w-6 text-success" />
                    </div>
                    <div className="text-3xl font-bold text-success">{stats.open}</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Draft</div>
                        <IconShoppingCart className="h-6 w-6 text-warning" />
                    </div>
                    <div className="text-3xl font-bold text-warning">{stats.draft}</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Closed</div>
                        <IconShoppingCart className="h-6 w-6 text-secondary" />
                    </div>
                    <div className="text-3xl font-bold text-secondary">{stats.closed}</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Quotes Received</div>
                        <IconShoppingCart className="h-6 w-6 text-info" />
                    </div>
                    <div className="text-3xl font-bold text-info">{stats.quotesReceived}</div>
                </div>
            </div>

            <div className="panel">
                <div className="mb-5 flex flex-col gap-5 md:flex-row md:items-center">
                    <div className="flex-1">
                        <input
                            type="text"
                            className="form-input w-full"
                            placeholder="Search RFQs..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-3">
                        <select className="form-select w-full md:w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="all">All Status</option>
                            <option value="Open">Open</option>
                            <option value="Closed">Closed</option>
                            <option value="Cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>

                <div className="datatables">
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>RFQ #</th>
                                    <th>Request #</th>
                                    <th>Title</th>
                                    <th>Issue Date</th>
                                    <th>Closing Date</th>
                                    <th>Suppliers</th>
                                    <th>Quotes</th>
                                    <th>Est. Value</th>
                                    <th>Status</th>
                                    <th className="text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRFQs.map((rfq) => (
                                    <tr key={rfq.id}>
                                        <td>
                                            <Link to={`/procurement/rfq/${rfq.id}`} className="font-semibold text-primary hover:underline">
                                                {rfq.rfqNumber}
                                            </Link>
                                            {rfq.status === 'Draft' && (
                                                <div className="mt-1 text-xs text-warning">Not sent yet</div>
                                            )}
                                            {rfq.status === 'Open' && rfq.daysRemaining !== undefined && (
                                                <div className="mt-1 flex items-center gap-1 text-xs text-info">
                                                    <IconClock className="h-3 w-3" />
                                                    {rfq.daysRemaining} days left
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <span className="text-info">{rfq.requestNumber}</span>
                                        </td>
                                        <td>{rfq.title}</td>
                                        <td>{rfq.issueDate}</td>
                                        <td>{rfq.closingDate}</td>
                                        <td className="text-center">{rfq.suppliersInvited}</td>
                                        <td className="text-center">
                                            <span className="font-semibold">
                                                {rfq.quotesReceived}/{rfq.suppliersInvited}
                                            </span>
                                        </td>
                                        <td className="font-semibold">${rfq.estimatedValue.toLocaleString()}</td>
                                        <td>
                                            <span className={`badge ${getStatusBadgeClass(rfq.status)}`}>{rfq.status}</span>
                                        </td>
                                        <td className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {rfq.status === 'Draft' && (
                                                    <button onClick={() => handleSendRFQ(rfq)} className="btn btn-sm btn-success gap-1" title="Send RFQ to Vendors">
                                                        <IconSend className="h-4 w-4" />
                                                        Send
                                                    </button>
                                                )}
                                                <Link to={`/procurement/rfq/${rfq.id}`} className="btn btn-sm btn-outline-primary" title="View Details">
                                                    <IconEye className="h-4 w-4" />
                                                </Link>
                                                <button onClick={() => handleDownloadRFQ(rfq)} className="btn btn-sm btn-outline-info" title="Download RFQ">
                                                    <IconDownload className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Send RFQ Modal */}
            {showSendModal && selectedRFQ && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60">
                    <div className="panel w-full max-w-3xl overflow-hidden rounded-lg">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-xl font-semibold">Send RFQ to Vendors</h5>
                            <button onClick={() => setShowSendModal(false)} className="text-white-dark hover:text-dark">
                                ×
                            </button>
                        </div>

                        <div className="mb-5">
                            <h6 className="mb-3 text-lg font-semibold">{selectedRFQ.rfqNumber} - {selectedRFQ.title}</h6>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="text-sm font-semibold text-white-dark">Issue Date</label>
                                    <div>{selectedRFQ.issueDate}</div>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-white-dark">Closing Date</label>
                                    <div>{selectedRFQ.closingDate}</div>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-white-dark">Estimated Value</label>
                                    <div className="font-semibold">${selectedRFQ.estimatedValue.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>

                        <div className="mb-5">
                            <h6 className="mb-3 font-semibold">Select Vendors to Send RFQ</h6>
                            <div className="max-h-[300px] space-y-2 overflow-y-auto rounded border border-white-light p-4 dark:border-dark">
                                {selectedRFQ.vendors && selectedRFQ.vendors.map((vendor: any) => (
                                    <label key={vendor.id} className="flex cursor-pointer items-center gap-3 rounded p-3 hover:bg-gray-100 dark:hover:bg-gray-800">
                                        <input type="checkbox" defaultChecked className="form-checkbox" />
                                        <div className="flex-1">
                                            <div className="font-semibold">{vendor.name}</div>
                                            <div className="text-xs text-white-dark">{vendor.email} • {vendor.contact}</div>
                                            <div className="mt-1 flex gap-2 text-xs">
                                                <span className="rounded bg-primary-light px-2 py-0.5 text-primary">{vendor.category}</span>
                                                {vendor.rating && (
                                                    <span className="text-warning">★ {vendor.rating}</span>
                                                )}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="mb-5">
                            <label className="mb-2 block font-semibold">Email Message (Optional)</label>
                            <textarea
                                rows={4}
                                className="form-textarea"
                                placeholder="Add a custom message to include with the RFQ..."
                                defaultValue={`Dear Vendor,\n\nPlease find attached our Request for Quotation for ${selectedRFQ.title}.\n\nKindly submit your quotation by ${selectedRFQ.closingDate}.\n\nBest regards,\nProcurement Team`}
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3">
                            <button onClick={() => setShowSendModal(false)} className="btn btn-outline-danger">
                                Cancel
                            </button>
                            <button onClick={confirmSendRFQ} className="btn btn-success gap-2">
                                <IconSend className="h-4 w-4" />
                                Send RFQ to Selected Vendors
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RFQList;
