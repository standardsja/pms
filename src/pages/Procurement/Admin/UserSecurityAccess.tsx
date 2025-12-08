import { useEffect, useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { getApiUrl } from '../../../config/api';
import adminService, { type AdminUser } from '../../../services/adminService';
import IconLock from '../../../components/Icon/IconLock';
import IconLockOpen from '../../../components/Icon/IconLockOpen';
import IconSearch from '../../../components/Icon/IconSearch';
import IconLoader from '../../../components/Icon/IconLoader';
import IconSquareCheck from '../../../components/Icon/IconSquareCheck';
import IconAlertCircle from '../../../components/Icon/IconAlertCircle';
import IconX from '../../../components/Icon/IconX';
import IconHistory from '../../../components/Icon/IconHistory';

interface UserSecurityData extends AdminUser {
    blocked?: boolean;
    blockedAt?: string;
    blockedReason?: string;
    lastLogin?: string;
    failedLogins?: number;
}

const UserSecurityAccess = () => {
    const dispatch = useDispatch();
    const [users, setUsers] = useState<UserSecurityData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showBlockForm, setShowBlockForm] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserSecurityData | null>(null);
    const [blockReason, setBlockReason] = useState('');
    const [processing, setProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('User Security & Access'));
    }, [dispatch]);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await adminService.getUsers();
            setUsers(data);
            setError(null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const matchesSearch = !searchTerm || user.email.toLowerCase().includes(searchTerm.toLowerCase()) || user.name?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === 'all' || (filterStatus === 'blocked' ? user.blocked : !user.blocked);
            return matchesSearch && matchesStatus;
        });
    }, [users, searchTerm, filterStatus]);

    const handleBlockClick = (user: UserSecurityData) => {
        setSelectedUser(user);
        setBlockReason('');
        setShowBlockForm(true);
    };

    const handleBlockUser = async () => {
        if (!selectedUser || !blockReason.trim()) {
            setError('Please provide a reason for blocking');
            return;
        }

        setProcessing(true);
        try {
            // Simulated API call
            await new Promise((resolve) => setTimeout(resolve, 800));

            const updatedUsers = users.map((user) => (user.id === selectedUser.id ? { ...user, blocked: true, blockedAt: new Date().toISOString(), blockedReason: blockReason } : user));
            setUsers(updatedUsers);

            setSuccessMessage(`User ${selectedUser.name || selectedUser.email} has been blocked`);
            setShowSuccess(true);
            setShowBlockForm(false);
            setSelectedUser(null);
            setTimeout(() => setShowSuccess(false), 2000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleUnblockUser = async (user: UserSecurityData) => {
        if (!confirm(`Unblock ${user.name || user.email}?`)) return;

        setProcessing(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 800));

            const updatedUsers = users.map((u) => (u.id === user.id ? { ...u, blocked: false, blockedAt: undefined, blockedReason: undefined } : u));
            setUsers(updatedUsers);

            setSuccessMessage(`User ${user.name || user.email} has been unblocked`);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <IconLoader className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Security & Access</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Manage user blocking, session control, and security settings</p>
            </div>

            {/* Alerts */}
            {showSuccess && (
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/40 text-green-800 dark:text-green-200 flex items-center gap-2">
                    <IconSquareCheck className="w-5 h-5" />
                    {successMessage}
                </div>
            )}
            {error && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 text-red-800 dark:text-red-200 flex items-center gap-2">
                    <IconAlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Block Form Modal */}
            {showBlockForm && selectedUser && (
                <div className="panel bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700/40">
                    <div className="flex items-start justify-between mb-4">
                        <h2 className="text-xl font-bold text-red-900 dark:text-red-100">Block User</h2>
                        <button onClick={() => setShowBlockForm(false)} className="text-red-600 hover:text-red-800">
                            <IconX className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-sm text-red-800 dark:text-red-200 mb-4">
                        You are about to block <span className="font-bold">{selectedUser.name || selectedUser.email}</span>. They will be unable to access the system until unblocked.
                    </p>
                    <div className="mb-4">
                        <label className="block text-sm font-semibold mb-2 text-red-900 dark:text-red-100">Reason for Blocking *</label>
                        <textarea
                            value={blockReason}
                            onChange={(e) => setBlockReason(e.target.value)}
                            className="form-textarea w-full"
                            placeholder="e.g., Suspected unauthorized access, Security violation"
                            rows={3}
                        />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleBlockUser} disabled={processing || !blockReason.trim()} className="btn btn-danger">
                            <IconLock className="w-4 h-4 mr-2" />
                            {processing ? 'Blocking...' : 'Confirm Block'}
                        </button>
                        <button onClick={() => setShowBlockForm(false)} className="btn btn-outline-danger">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="panel p-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700/40">
                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Total Users</p>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-2">{users.length}</p>
                </div>
                <div className="panel p-5 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700/40">
                    <p className="text-sm font-semibold text-red-700 dark:text-red-300">Blocked Users</p>
                    <p className="text-3xl font-bold text-red-900 dark:text-red-100 mt-2">{users.filter((u) => u.blocked).length}</p>
                </div>
                <div className="panel p-5 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700/40">
                    <p className="text-sm font-semibold text-green-700 dark:text-green-300">Active Users</p>
                    <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-2">{users.filter((u) => !u.blocked).length}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-end">
                <div className="flex-1 relative">
                    <input type="text" placeholder="Search users by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="form-input pl-10 w-full" />
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="form-select">
                    <option value="all">All Users</option>
                    <option value="active">Active</option>
                    <option value="blocked">Blocked</option>
                </select>
            </div>

            {/* User List */}
            <div className="space-y-3">
                {filteredUsers.length === 0 ? (
                    <div className="panel text-center py-12">
                        <p className="text-gray-500 dark:text-gray-400">No users found</p>
                    </div>
                ) : (
                    filteredUsers.map((user) => (
                        <div
                            key={user.id}
                            className={`panel p-5 border-l-4 ${user.blocked ? 'border-l-red-500 bg-red-50/50 dark:bg-red-900/10' : 'border-l-green-500 bg-green-50/50 dark:bg-green-900/10'}`}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-bold text-gray-900 dark:text-white">{user.name || user.email}</h3>
                                        {user.blocked && (
                                            <span className="badge bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200">
                                                <IconLock className="w-3 h-3 mr-1 inline" />
                                                Blocked
                                            </span>
                                        )}
                                        {user.failedLogins && user.failedLogins > 3 && (
                                            <span className="badge bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">⚠️ {user.failedLogins} failed logins</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>

                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {(user.roles || []).slice(0, 2).map((roleItem, idx) => (
                                            <span key={idx} className="badge badge-outline-primary text-xs">
                                                {roleItem.role?.name}
                                            </span>
                                        ))}
                                        {(user.roles || []).length > 2 && <span className="badge badge-outline-primary text-xs">+{(user.roles || []).length - 2}</span>}
                                    </div>

                                    {user.lastLogin && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                            <IconHistory className="w-3 h-3 inline mr-1" />
                                            Last login: {new Date(user.lastLogin).toLocaleDateString()}
                                        </p>
                                    )}

                                    {user.blocked && user.blockedReason && (
                                        <div className="mt-2 p-2 rounded bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-700/40">
                                            <p className="text-xs font-semibold text-red-900 dark:text-red-100">Reason: {user.blockedReason}</p>
                                            {user.blockedAt && <p className="text-xs text-red-700 dark:text-red-200">Blocked on {new Date(user.blockedAt).toLocaleString()}</p>}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 flex-shrink-0">
                                    {user.blocked ? (
                                        <button onClick={() => handleUnblockUser(user)} disabled={processing} className="btn btn-sm btn-outline-success">
                                            <IconLockOpen className="w-4 h-4" />
                                            Unblock
                                        </button>
                                    ) : (
                                        <button onClick={() => handleBlockClick(user)} className="btn btn-sm btn-outline-danger">
                                            <IconLock className="w-4 h-4" />
                                            Block
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default UserSecurityAccess;
