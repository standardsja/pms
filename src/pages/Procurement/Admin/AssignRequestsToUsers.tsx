import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { getApiUrl } from '../../../config/api';
import IconInfoCircle from '../../../components/Icon/IconInfoCircle';
import IconSquareCheck from '../../../components/Icon/IconSquareCheck';
import IconLoader from '../../../components/Icon/IconLoader';
import adminService, { type AdminUser } from '../../../services/adminService';

const AssignRequestsToUsers = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(setPageTitle('Assign Requests to Users'));
    }, [dispatch]);

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [assigning, setAssigning] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
    const [selectedUser, setSelectedUser] = useState<number | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [userSearch, setUserSearch] = useState<string>('');

    useEffect(() => {
        loadInitialData();
    }, []);

    async function loadInitialData() {
        setLoading(true);
        setError(null);
        try {
            const [usersData, requestsResponse] = await Promise.all([
                adminService.getUsers(),
                fetch(getApiUrl('/api/requests'), {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')}`,
                    },
                }),
            ]);
            
            if (!requestsResponse.ok) {
                throw new Error(`Failed to fetch requests: ${requestsResponse.statusText}`);
            }
            
            const requestsData = await requestsResponse.json();
            setUsers(usersData);
            setRequests(requestsData);
        } catch (e: any) {
            console.error('Failed to load data:', e);
            setError(e?.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }

    async function assignRequest(requestId: number, userId: number | null) {
        try {
            setAssigning(true);
            setError(null);
            setSuccess(null);

            const userProfile = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
            const adminUser = userProfile ? JSON.parse(userProfile) : null;

            if (!adminUser?.id) {
                throw new Error('Admin authentication required');
            }

            const res = await fetch(getApiUrl(`/admin/requests/${requestId}/reassign`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': String(adminUser.id),
                },
                body: JSON.stringify({
                    assigneeId: userId,
                    comment: 'Assigned from Assign Requests page',
                    newStatus: selectedStatus || undefined,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData?.message || 'Failed to assign request');
            }

            const assigneeName = userId ? users.find((u) => u.id === userId)?.name || 'user' : 'unassigned';
            setSuccess(`Request successfully assigned to ${assigneeName}${selectedStatus ? ` with status ${selectedStatus}` : ''}`);

            // Reset and reload
            setSelectedRequest(null);
            setSelectedUser(null);
            setSelectedStatus('');
            setTimeout(() => loadInitialData(), 1000);
        } catch (e: any) {
            console.error('Assignment error:', e);
            setError(e?.message || 'Failed to assign request');
        } finally {
            setAssigning(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <IconLoader className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">Loading requests and users...</p>
                </div>
            </div>
        );
    }

    // compute filtered users by search term
    const filteredUsers = users.filter((u) => {
        const q = userSearch.trim().toLowerCase();
        if (!q) return true;
        const rolesStr = (u.roles || [])
            .map((r) => r.role?.name || '')
            .join(' ')
            .toLowerCase();
        return (
            String(u.name || u.email || '')
                ?.toLowerCase()
                .includes(q) ||
            String(u.email || '')
                ?.toLowerCase()
                .includes(q) ||
            rolesStr.includes(q)
        );
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Assign Requests to Users</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Quickly assign or reassign requests to team members and manage their status</p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-800 dark:text-red-200">
                    <p className="font-semibold flex items-center gap-2">
                        <IconInfoCircle className="w-5 h-5" />
                        Error
                    </p>
                    <p className="text-sm mt-1">{error}</p>
                </div>
            )}

            {/* Success Message */}
            {success && (
                <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-green-800 dark:text-green-200">
                    <p className="font-semibold flex items-center gap-2">
                        <IconSquareCheck className="w-5 h-5" />
                        Success
                    </p>
                    <p className="text-sm mt-1">{success}</p>
                </div>
            )}

            {/* Main Panel */}
            <div className="panel">
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Requests List */}
                    <div>
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-white-light dark:border-dark">
                            <h6 className="font-bold text-lg flex items-center gap-2">
                                Available Requests
                                <span className="badge bg-primary text-white text-xs">{requests.length}</span>
                            </h6>
                            <button onClick={loadInitialData} disabled={loading} className="btn btn-sm btn-outline-primary">
                                Refresh
                            </button>
                        </div>
                        {requests.length === 0 ? (
                            <div className="rounded border border-dashed border-white-light dark:border-dark p-12 text-center text-gray-500 dark:text-gray-400">
                                <div className="text-4xl mb-2">📋</div>
                                <p className="font-semibold">No requests found</p>
                                <p className="text-sm">There are currently no requests to assign</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                                {requests.map((req) => (
                                    <div
                                        key={req.id}
                                        onClick={() => setSelectedRequest(req.id)}
                                        className={`cursor-pointer rounded-lg border-2 p-4 transition-all hover:border-primary/50 hover:bg-primary/5 ${
                                            selectedRequest === req.id ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : 'border-white-light dark:border-dark'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-bold text-sm text-gray-900 dark:text-white">
                                                    REQ-{req.id}: {req.title}
                                                </div>
                                                <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 space-y-1">
                                                    <div>
                                                        Status: <span className="font-semibold text-gray-900 dark:text-white">{req.status}</span>
                                                    </div>
                                                    <div className="truncate">
                                                        Requester: <span className="font-semibold text-gray-900 dark:text-white">{req.requester?.name || 'Unknown'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-xs flex-shrink-0">
                                                {req.currentAssignee ? (
                                                    <span className="badge bg-success/20 text-success border border-success/30 font-semibold">{req.currentAssignee.name}</span>
                                                ) : (
                                                    <span className="badge bg-danger/20 text-danger border border-danger/30 font-semibold">Unassigned</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Users List & Status */}
                    <div>
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-white-light dark:border-dark">
                            <h6 className="font-bold text-lg">
                                Team Members
                                {selectedRequest && <span className="badge bg-warning text-white text-xs ml-2">Request Selected</span>}
                            </h6>
                            <span className="badge bg-primary text-white text-xs">{users.length}</span>
                        </div>

                        {/* Search + Status Selector */}
                        <div className="mb-4">
                            <div className="relative mb-3">
                                <input
                                    type="text"
                                    placeholder="Search team members by name, email or role..."
                                    value={userSearch}
                                    onChange={(e) => setUserSearch(e.target.value)}
                                    className="form-input w-full pr-10"
                                />
                                {userSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setUserSearch('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        aria-label="Clear search"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Status Selector */}
                        {selectedRequest && (
                            <div className="mb-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40">
                                <label className="block text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Update Status (optional)</label>
                                <select className="form-select text-sm w-full" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} disabled={assigning}>
                                    <option value="">— Keep current status —</option>
                                    <option value="DRAFT">DRAFT</option>
                                    <option value="SUBMITTED">SUBMITTED</option>
                                    <option value="DEPARTMENT_REVIEW">DEPARTMENT_REVIEW</option>
                                    <option value="DEPARTMENT_RETURNED">DEPARTMENT_RETURNED</option>
                                    <option value="DEPARTMENT_APPROVED">DEPARTMENT_APPROVED</option>
                                    <option value="HOD_REVIEW">HOD_REVIEW</option>
                                    <option value="PROCUREMENT_REVIEW">PROCUREMENT_REVIEW</option>
                                    <option value="FINANCE_REVIEW">FINANCE_REVIEW</option>
                                    <option value="BUDGET_MANAGER_REVIEW">BUDGET_MANAGER_REVIEW</option>
                                    <option value="FINANCE_RETURNED">FINANCE_RETURNED</option>
                                    <option value="FINANCE_APPROVED">FINANCE_APPROVED</option>
                                    <option value="SENT_TO_VENDOR">SENT_TO_VENDOR</option>
                                    <option value="CLOSED">CLOSED</option>
                                    <option value="REJECTED">REJECTED</option>
                                </select>
                            </div>
                        )}

                        {/* Users */}
                        {filteredUsers.length === 0 ? (
                            <div className="rounded border border-dashed border-white-light dark:border-dark p-12 text-center text-gray-500 dark:text-gray-400">
                                <div className="text-4xl mb-2">👥</div>
                                <p className="font-semibold">No users found</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                                {filteredUsers.map((user) => {
                                    const userRoles = (user.roles || []).map((r) => r.role?.name).filter(Boolean);
                                    const canAssign = selectedRequest && !assigning;

                                    return (
                                        <div
                                            key={user.id}
                                            onClick={() => canAssign && assignRequest(selectedRequest, user.id)}
                                            className={`rounded-lg border-2 p-4 transition-all ${
                                                canAssign
                                                    ? 'cursor-pointer border-white-light dark:border-dark hover:border-success/50 hover:bg-success/5'
                                                    : 'opacity-50 border-white-light dark:border-dark'
                                            } ${assigning ? 'pointer-events-none' : ''}`}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-sm text-gray-900 dark:text-white">{user.name || user.email}</div>
                                                    <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{user.email}</div>
                                                    {userRoles && userRoles.length > 0 && (
                                                        <div className="mt-2 flex flex-wrap gap-1">
                                                            {userRoles.slice(0, 2).map((role: string) => (
                                                                <span key={role} className="badge badge-outline-primary text-xs">
                                                                    {role}
                                                                </span>
                                                            ))}
                                                            {userRoles.length > 2 && <span className="badge badge-outline-primary text-xs">+{userRoles.length - 2}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                                {assigning && <IconLoader className="h-4 w-4 animate-spin text-primary flex-shrink-0" />}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Unassign Button */}
                                {selectedRequest && (
                                    <div
                                        onClick={() => !assigning && assignRequest(selectedRequest, null)}
                                        className={`cursor-pointer rounded-lg border-2 border-danger p-4 transition-all hover:bg-danger/5 ${assigning ? 'pointer-events-none opacity-50' : ''}`}
                                    >
                                        <div className="font-bold text-danger text-sm flex items-center justify-between">
                                            <span>🗑️ Unassign (Remove assignee)</span>
                                            {assigning && <IconLoader className="h-4 w-4 animate-spin text-danger" />}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Info Section */}
            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 rounded-lg">
                <div className="flex gap-3">
                    <IconInfoCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">How to Assign Requests</h4>
                        <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                            <li>Select a request from the left panel</li>
                            <li>(Optional) Choose a new status from the dropdown</li>
                            <li>Click on a team member to assign the request to them</li>
                            <li>Or click "Unassign" to remove the current assignee</li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssignRequestsToUsers;
