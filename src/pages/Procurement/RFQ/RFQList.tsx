import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconPlus from '../../../components/Icon/IconPlus';
import IconEye from '../../../components/Icon/IconEye';

const RFQList = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('RFQ Management'));
    });

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Mock data
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
                return 'badge-outline-success';
            case 'Closed':
                return 'badge-outline-secondary';
            case 'Cancelled':
                return 'badge-outline-danger';
            default:
                return 'badge-outline-primary';
        }
    };

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-xl font-bold">RFQ Management</h2>
                <Link to="/procurement/rfq/new" className="btn btn-primary gap-2">
                    <IconPlus />
                    New RFQ
                </Link>
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
                                        </td>
                                        <td>
                                            <Link to={`/procurement/requests/${rfq.id}`} className="text-info hover:underline">
                                                {rfq.requestNumber}
                                            </Link>
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
                                            <Link to={`/procurement/rfq/${rfq.id}`} className="hover:text-info">
                                                <IconEye className="h-4.5 w-4.5" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RFQList;
