/**
 * Role Requests Admin Dashboard
 * For admins to view, approve, and reject pending role requests
 */

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import IconSquareCheck from './Icon/IconSquareCheck';
import IconX from './Icon/IconX';
import IconClock from './Icon/IconClock';
import IconInfoTriangle from './Icon/IconInfoTriangle';
import IconLoader from './Icon/IconLoader';
import { roleRequestService, RoleRequest } from '../services/roleRequestApi';

interface AdminDashboardStats {
    pendingCount: number;
    approvedCount: number;
    rejectedCount: number;
    totalCount: number;
    byModule: Array<{
        module: string;
        count: number;
    }>;
    byRole: Array<{
        role: string;
        count: number;
    }>;
    recentRequests: RoleRequest[];
}

export const RoleRequestsAdminDashboard: React.FC = () => {
    const [requests, setRequests] = useState<RoleRequest[]>([]);
    const [stats, setStats] = useState<AdminDashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
    const [selectedRequest, setSelectedRequest] = useState<RoleRequest | null>(null);
    const [rejectionNotes, setRejectionNotes] = useState('');
    const [approvalExpiry, setApprovalExpiry] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [requestsData, statsData] = await Promise.all([roleRequestService.getPendingRequests(), roleRequestService.getDashboardStats()]);
            setRequests(requestsData);
            setStats(statsData);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const getFilteredRequests = () => {
        if (activeTab === 'all') return requests;
        return requests.filter((r) => r.status === activeTab.toUpperCase());
    };

    const handleApprove = async (request: RoleRequest) => {
        setProcessing(true);
        try {
            await roleRequestService.approveRequest(request.id, {
                expiresAt: approvalExpiry || undefined,
            });
            setRequests(requests.filter((r) => r.id !== request.id));
            setSelectedRequest(null);
            setApprovalExpiry('');

            await Swal.fire({
                title: 'Approved',
                text: `Role request for ${request.user?.name} has been approved successfully.`,
                icon: 'success',
                timer: 3000,
                showConfirmButton: false,
            });
        } catch (err) {
            await Swal.fire({
                title: 'Error',
                text: err instanceof Error ? err.message : 'Failed to approve request',
                icon: 'error',
            });
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async (request: RoleRequest) => {
        if (!rejectionNotes.trim()) {
            await Swal.fire({
                title: 'Missing Information',
                text: 'Please provide rejection notes to explain your decision.',
                icon: 'warning',
            });
            return;
        }

        setProcessing(true);
        try {
            await roleRequestService.rejectRequest(request.id, rejectionNotes);
            setRequests(requests.filter((r) => r.id !== request.id));
            setSelectedRequest(null);
            setRejectionNotes('');

            await Swal.fire({
                title: 'Rejected',
                text: `Role request for ${request.user?.name} has been rejected.`,
                icon: 'success',
                timer: 3000,
                showConfirmButton: false,
            });
        } catch (err) {
            await Swal.fire({
                title: 'Error',
                text: err instanceof Error ? err.message : 'Failed to reject request',
                icon: 'error',
            });
        } finally {
            setProcessing(false);
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getRoleColor = (role: string) => {
        const colors: { [key: string]: string } = {
            PROCUREMENT_OFFICER: 'bg-blue-100 text-blue-800',
            PROCUREMENT_MANAGER: 'bg-purple-100 text-purple-800',
            FINANCE_OFFICER: 'bg-green-100 text-green-800',
            DEPARTMENT_HEAD: 'bg-orange-100 text-orange-800',
            AUDITOR: 'bg-gray-100 text-gray-800',
        };
        return colors[role] || 'bg-gray-100 text-gray-800';
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <IconClock className="h-4 w-4 text-yellow-600" />;
            case 'APPROVED':
                return <IconSquareCheck className="h-4 w-4 text-green-600" />;
            case 'REJECTED':
                return <IconX className="h-4 w-4 text-red-600" />;
            default:
                return null;
        }
    };

    const filteredRequests = getFilteredRequests();

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Role Requests</h1>
                    <p className="text-gray-600">Manage user role access requests for the procurement system</p>
                </div>

                {error && (
                    <div className="mb-6 rounded-lg bg-red-50 p-4 flex items-center gap-3">
                        <IconInfoTriangle className="h-5 w-5 text-red-600" />
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                {/* Stats Grid */}
                {stats && !loading && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <div className="rounded-lg bg-white p-6 shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Pending</p>
                                    <p className="text-3xl font-bold text-yellow-600 mt-2">{stats.pendingCount}</p>
                                </div>
                                <IconClock className="h-10 w-10 text-yellow-100" />
                            </div>
                        </div>

                        <div className="rounded-lg bg-white p-6 shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Approved</p>
                                    <p className="text-3xl font-bold text-green-600 mt-2">{stats.approvedCount}</p>
                                </div>
                                <IconSquareCheck className="h-10 w-10 text-green-100" />
                            </div>
                        </div>

                        <div className="rounded-lg bg-white p-6 shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Rejected</p>
                                    <p className="text-3xl font-bold text-red-600 mt-2">{stats.rejectedCount}</p>
                                </div>
                                <IconX className="h-10 w-10 text-red-100" />
                            </div>
                        </div>

                        <div className="rounded-lg bg-white p-6 shadow">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600 text-sm font-medium">Total</p>
                                    <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalCount}</p>
                                </div>
                                <IconInfoTriangle className="h-10 w-10 text-blue-100" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab Navigation */}
                <div className="mb-6 flex gap-2 border-b border-gray-200">
                    {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                                activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Requests Table */}
                <div className="rounded-lg bg-white shadow overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center p-12">
                            <IconLoader className="h-8 w-8 animate-spin text-blue-600" />
                        </div>
                    ) : filteredRequests.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-gray-500">No role requests found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Role</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Department</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Requested</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredRequests.map((request) => (
                                        <tr key={request.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{request.user?.name}</p>
                                                    <p className="text-xs text-gray-500">{request.user?.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getRoleColor(request.role)}`}>{request.role.replace(/_/g, ' ')}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{request.department?.name || '-'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(request.createdAt)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(request.status)}
                                                    <span className="text-sm font-medium capitalize">{request.status}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {request.status === 'PENDING' ? (
                                                    <button onClick={() => setSelectedRequest(request)} className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                                                        Review
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-400 text-sm">No action</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Review Modal */}
                {selectedRequest && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                        <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Review Role Request</h2>

                            <div className="space-y-4 mb-6">
                                <div>
                                    <p className="text-sm text-gray-600">User</p>
                                    <p className="font-semibold text-gray-900">{selectedRequest.user?.name}</p>
                                    <p className="text-sm text-gray-500">{selectedRequest.user?.email}</p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-600">Requested Role</p>
                                    <p className="font-semibold text-gray-900">{selectedRequest.role.replace(/_/g, ' ')}</p>
                                </div>

                                <div>
                                    <p className="text-sm text-gray-600">Reason</p>
                                    <p className="font-semibold text-gray-900">{selectedRequest.reason || 'No reason provided'}</p>
                                </div>

                                {/* Approval expiry input */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (Optional)</label>
                                    <input type="date" value={approvalExpiry} onChange={(e) => setApprovalExpiry(e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2" />
                                </div>

                                {/* Rejection notes textarea */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Notes</label>
                                    <textarea
                                        value={rejectionNotes}
                                        onChange={(e) => setRejectionNotes(e.target.value)}
                                        placeholder="Explain why this request is being rejected..."
                                        rows={3}
                                        className="w-full rounded-lg border border-gray-300 px-4 py-2"
                                    />
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setSelectedRequest(null);
                                        setRejectionNotes('');
                                        setApprovalExpiry('');
                                    }}
                                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleReject(selectedRequest)}
                                    disabled={processing}
                                    className="flex-1 rounded-lg bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:opacity-50"
                                >
                                    {processing ? 'Rejecting...' : 'Reject'}
                                </button>
                                <button
                                    onClick={() => handleApprove(selectedRequest)}
                                    disabled={processing}
                                    className="flex-1 rounded-lg bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                    {processing ? 'Approving...' : 'Approve'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoleRequestsAdminDashboard;
