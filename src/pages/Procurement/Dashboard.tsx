import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconShoppingCart from '../../components/Icon/IconShoppingCart';
import IconDollarSignCircle from '../../components/Icon/IconDollarSignCircle';
import IconInbox from '../../components/Icon/IconInbox';
import IconTag from '../../components/Icon/IconTag';
import IconCreditCard from '../../components/Icon/IconCreditCard';

const Dashboard = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Procurement Dashboard'));
    });

    const [loading] = useState(false);

    // Mock data for dashboard metrics
    const stats = {
        pendingRequests: 15,
        activeRFQs: 8,
        awaitingApproval: 12,
        activePOs: 25,
        totalSpend: 45000,
    };

    const recentRequests = [
        { id: 1, reqNumber: 'REQ-2024-001', description: 'Office Supplies', status: 'Pending Review', date: '2024-10-20', amount: 1500 },
        { id: 2, reqNumber: 'REQ-2024-002', description: 'IT Equipment', status: 'Approved', date: '2024-10-19', amount: 5000 },
        { id: 3, reqNumber: 'REQ-2024-003', description: 'Furniture', status: 'In RFQ', date: '2024-10-18', amount: 3500 },
    ];

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-xl font-bold">Procurement Dashboard</h2>
                <p className="text-white-dark">Overview of procurement activities</p>
            </div>

            {/* Stats Cards */}
            <div className="mb-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-5">
                <div className="panel h-full sm:col-span-2 xl:col-span-1">
                    <div className="mb-5 flex items-center justify-between dark:text-white-light">
                        <h5 className="text-lg font-semibold">Pending Requests</h5>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{stats.pendingRequests}</div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-white">
                            <IconInbox className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                <div className="panel h-full sm:col-span-2 xl:col-span-1">
                    <div className="mb-5 flex items-center justify-between dark:text-white-light">
                        <h5 className="text-lg font-semibold">Active RFQs</h5>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{stats.activeRFQs}</div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-warning text-white">
                            <IconShoppingCart />
                        </div>
                    </div>
                </div>

                <div className="panel h-full sm:col-span-2 xl:col-span-1">
                    <div className="mb-5 flex items-center justify-between dark:text-white-light">
                        <h5 className="text-lg font-semibold">Awaiting Approval</h5>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{stats.awaitingApproval}</div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-danger text-white">
                            <IconTag className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                <div className="panel h-full sm:col-span-2 xl:col-span-1">
                    <div className="mb-5 flex items-center justify-between dark:text-white-light">
                        <h5 className="text-lg font-semibold">Active POs</h5>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">{stats.activePOs}</div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-success text-white">
                            <IconCreditCard />
                        </div>
                    </div>
                </div>

                <div className="panel h-full sm:col-span-2 xl:col-span-1">
                    <div className="mb-5 flex items-center justify-between dark:text-white-light">
                        <h5 className="text-lg font-semibold">Total Spend (MTD)</h5>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="text-3xl font-bold ltr:mr-3 rtl:ml-3">${stats.totalSpend.toLocaleString()}</div>
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-info text-white">
                            <IconDollarSignCircle />
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Requests Table */}
            <div className="panel">
                <div className="mb-5 flex items-center justify-between">
                    <h5 className="text-lg font-semibold dark:text-white-light">Recent Requests</h5>
                    <Link to="/procurement/requests" className="font-semibold text-primary hover:text-gray-400 dark:text-gray-400 dark:hover:text-gray-600">
                        View All
                    </Link>
                </div>
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>Request #</th>
                                <th>Description</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentRequests.map((request) => (
                                <tr key={request.id}>
                                    <td>
                                        <Link to={`/procurement/requests/${request.id}`} className="text-primary hover:underline">
                                            {request.reqNumber}
                                        </Link>
                                    </td>
                                    <td>{request.description}</td>
                                    <td>{request.date}</td>
                                    <td className="font-semibold">${request.amount.toLocaleString()}</td>
                                    <td>
                                        <span
                                            className={`badge ${
                                                request.status === 'Approved'
                                                    ? 'bg-success'
                                                    : request.status === 'Pending Review'
                                                    ? 'bg-warning'
                                                    : 'bg-info'
                                            }`}
                                        >
                                            {request.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <Link to="/procurement/requests/new" className="panel flex h-24 items-center justify-center bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700">
                    <div className="text-center">
                        <IconInbox className="mx-auto mb-2 h-8 w-8" />
                        <div className="font-semibold">New Request</div>
                    </div>
                </Link>
                <Link to="/procurement/rfq/list" className="panel flex h-24 items-center justify-center bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700">
                    <div className="text-center">
                        <IconShoppingCart className="mx-auto mb-2 h-8 w-8" />
                        <div className="font-semibold">View RFQs</div>
                    </div>
                </Link>
                <Link to="/procurement/approvals" className="panel flex h-24 items-center justify-center bg-gradient-to-r from-purple-500 to-purple-600 text-white hover:from-purple-600 hover:to-purple-700">
                    <div className="text-center">
                        <IconTag className="mx-auto mb-2 h-8 w-8" />
                        <div className="font-semibold">Pending Approvals</div>
                    </div>
                </Link>
                <Link to="/procurement/purchase-orders" className="panel flex h-24 items-center justify-center bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700">
                    <div className="text-center">
                        <IconCreditCard className="mx-auto mb-2 h-8 w-8" />
                        <div className="font-semibold">Purchase Orders</div>
                    </div>
                </Link>
            </div>
        </div>
    );
};

export default Dashboard;
