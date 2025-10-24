import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconPlus from '../../../components/Icon/IconPlus';
import IconEye from '../../../components/Icon/IconEye';
import IconEdit from '../../../components/Icon/IconEdit';

const RequestList = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Procurement Requests'));
    });

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Mock data
    const requests = [
        {
            id: 1,
            requestNumber: 'REQ-2024-001',
            requester: 'John Doe',
            department: 'IT',
            description: 'Office Supplies - Paper, Pens, Folders',
            date: '2024-10-20',
            amount: 1500,
            status: 'Pending Review',
            priority: 'Medium',
        },
        {
            id: 2,
            requestNumber: 'REQ-2024-002',
            requester: 'Jane Smith',
            department: 'HR',
            description: 'IT Equipment - Laptops',
            date: '2024-10-19',
            amount: 5000,
            status: 'Approved',
            priority: 'High',
        },
        {
            id: 3,
            requestNumber: 'REQ-2024-003',
            requester: 'Bob Johnson',
            department: 'Operations',
            description: 'Office Furniture - Desks and Chairs',
            date: '2024-10-18',
            amount: 3500,
            status: 'In RFQ',
            priority: 'Low',
        },
        {
            id: 4,
            requestNumber: 'REQ-2024-004',
            requester: 'Alice Williams',
            department: 'Finance',
            description: 'Software Licenses',
            date: '2024-10-17',
            amount: 2000,
            status: 'Draft',
            priority: 'Medium',
        },
    ];

    const filteredRequests = requests.filter((request) => {
        const matchesSearch =
            request.requestNumber.toLowerCase().includes(search.toLowerCase()) ||
            request.description.toLowerCase().includes(search.toLowerCase()) ||
            request.requester.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'Approved':
                return 'badge-outline-success';
            case 'Pending Review':
                return 'badge-outline-warning';
            case 'In RFQ':
                return 'badge-outline-info';
            case 'Draft':
                return 'badge-outline-secondary';
            case 'Rejected':
                return 'badge-outline-danger';
            default:
                return 'badge-outline-primary';
        }
    };

    const getPriorityBadgeClass = (priority: string) => {
        switch (priority) {
            case 'High':
                return 'badge-outline-danger';
            case 'Medium':
                return 'badge-outline-warning';
            case 'Low':
                return 'badge-outline-info';
            default:
                return 'badge-outline-secondary';
        }
    };

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-xl font-bold">Procurement Requests</h2>
                <Link to="/procurement/requests/new" className="btn btn-primary gap-2">
                    <IconPlus />
                    New Request
                </Link>
            </div>

            <div className="panel">
                <div className="mb-5 flex flex-col gap-5 md:flex-row md:items-center">
                    <div className="flex-1">
                        <input
                            type="text"
                            className="form-input w-full"
                            placeholder="Search requests..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-3">
                        <select className="form-select w-full md:w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="all">All Status</option>
                            <option value="Draft">Draft</option>
                            <option value="Pending Review">Pending Review</option>
                            <option value="Approved">Approved</option>
                            <option value="In RFQ">In RFQ</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                    </div>
                </div>

                <div className="datatables">
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Request #</th>
                                    <th>Requester</th>
                                    <th>Department</th>
                                    <th>Description</th>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th className="text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRequests.map((request) => (
                                    <tr key={request.id}>
                                        <td>
                                            <Link to={`/procurement/requests/${request.id}`} className="font-semibold text-primary hover:underline">
                                                {request.requestNumber}
                                            </Link>
                                        </td>
                                        <td>{request.requester}</td>
                                        <td>{request.department}</td>
                                        <td>{request.description}</td>
                                        <td>{request.date}</td>
                                        <td className="font-semibold">${request.amount.toLocaleString()}</td>
                                        <td>
                                            <span className={`badge ${getPriorityBadgeClass(request.priority)}`}>{request.priority}</span>
                                        </td>
                                        <td>
                                            <span className={`badge ${getStatusBadgeClass(request.status)}`}>{request.status}</span>
                                        </td>
                                        <td className="text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Link to={`/procurement/requests/${request.id}`} className="hover:text-info">
                                                    <IconEye className="h-4.5 w-4.5" />
                                                </Link>
                                                {request.status === 'Draft' && (
                                                    <Link to={`/procurement/requests/${request.id}/edit`} className="hover:text-primary">
                                                        <IconEdit className="h-4 w-4" />
                                                    </Link>
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
        </div>
    );
};

export default RequestList;
