import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { getApiUrl } from '../../../config/api';
import IconSettings from '../../../components/Icon/IconSettings';
import IconUserPlus from '../../../components/Icon/IconUserPlus';
import IconUsers from '../../../components/Icon/IconUsers';
import IconSearch from '../../../components/Icon/IconSearch';
import IconX from '../../../components/Icon/IconX';
import IconSave from '../../../components/Icon/IconSave';
import IconLoader from '../../../components/Icon/IconLoader';
import IconSquareCheck from '../../../components/Icon/IconSquareCheck';
import IconInfoCircle from '../../../components/Icon/IconInfoCircle';
import adminService, { type AdminUser } from '../../../services/adminService';

const AdminDashboard = () => {
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(setPageTitle('Admin Dashboard'));
    }, [dispatch]);

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [allRoles, setAllRoles] = useState<Array<{ id: number; name: string; description?: string }>>([]);
    const [allDepartments, setAllDepartments] = useState<Array<{ id: number; name: string; code: string }>>([]);

    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterDept, setFilterDept] = useState('');

    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [editingRoles, setEditingRoles] = useState<string[]>([]);
    const [editingDept, setEditingDept] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);

    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Load initial data
    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        setLoading(true);
        try {
            const [usersData, rolesData, deptsData] = await Promise.all([adminService.getUsers(), adminService.getAllRoles(), fetch(getApiUrl('/api/departments')).then((r) => r.json())]);
            setUsers(usersData);
            setAllRoles(rolesData);
            setAllDepartments(deptsData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filter and search users
    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const matchesSearch = !searchTerm || user.email.toLowerCase().includes(searchTerm.toLowerCase()) || user.name?.toLowerCase().includes(searchTerm.toLowerCase());

            const userRoles = (user.roles || []).map((r) => r.role?.name).filter(Boolean);
            const matchesRole = !filterRole || userRoles.includes(filterRole);

            const matchesDept = !filterDept || user.department?.name === filterDept;

            return matchesSearch && matchesRole && matchesDept;
        });
    }, [users, searchTerm, filterRole, filterDept]);

    // Open edit modal
    const handleEditUser = (user: AdminUser) => {
        setSelectedUser(user);
        const userRoles = (user.roles || []).map((r) => r.role?.name).filter(Boolean) as string[];
        setEditingRoles(userRoles);
        setEditingDept(user.department?.id || null);
    };

    // Toggle role in edit modal
    const toggleRole = (roleName: string) => {
        setEditingRoles((prev) => (prev.includes(roleName) ? prev.filter((r) => r !== roleName) : [...prev, roleName]));
    };

    // Save changes
    const handleSaveChanges = async () => {
        if (!selectedUser) return;

        setSaving(true);
        try {
            // Update roles - backend returns updated user data
            const rolesResult = await adminService.updateUserRoles(selectedUser.id, editingRoles);

            // Update department if changed - backend returns updated user data
            let deptResult = null;
            if (editingDept !== selectedUser.department?.id) {
                deptResult = await adminService.updateUserDepartment(selectedUser.id, editingDept);
            }

            // Use the most recent backend response for session update
            const backendUser = deptResult?.updatedUser || rolesResult?.updatedUser;

            // If backend indicates this is the current user, update session from backend data
            if ((rolesResult?.isCurrentUser || deptResult?.isCurrentUser) && backendUser) {
                // Store the user data exactly as returned from backend (trusted source)
                localStorage.setItem('auth_user', JSON.stringify(backendUser));
                sessionStorage.setItem('auth_user', JSON.stringify(backendUser));
                localStorage.setItem('userProfile', JSON.stringify(backendUser));

                // Show success and reload
                setSuccessMessage(`Successfully updated your account - Refreshing...`);
                setShowSuccess(true);
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
                return;
            }

            // Reload data
            await loadAllData();

            // Show success message
            setSuccessMessage(`Successfully updated ${selectedUser.name || selectedUser.email}`);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);

            // Close modal
            setSelectedUser(null);
            setEditingRoles([]);
            setEditingDept(null);
        } catch (error: any) {
            alert(error?.message || 'Failed to update user');
        } finally {
            setSaving(false);
        }
    }; // Quick add role
    const quickAddRole = async (userId: number, roleName: string, currentRoles: string[]) => {
        try {
            const updatedRoles = [...currentRoles, roleName];
            const result = await adminService.updateUserRoles(userId, updatedRoles);

            // If backend indicates this is the current user, update session from backend data
            if (result?.isCurrentUser && result?.updatedUser) {
                // Store the user data exactly as returned from backend (trusted source)
                localStorage.setItem('auth_user', JSON.stringify(result.updatedUser));
                sessionStorage.setItem('auth_user', JSON.stringify(result.updatedUser));
                localStorage.setItem('userProfile', JSON.stringify(result.updatedUser));

                // Show message and reload
                setSuccessMessage(`Added ${roleName} role - Refreshing...`);
                setShowSuccess(true);
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
                return;
            }

            await loadAllData();
            setSuccessMessage(`Added ${roleName} role`);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } catch (error: any) {
            alert(error?.message || 'Failed to add role');
        }
    };

    // Quick remove role
    const quickRemoveRole = async (userId: number, roleName: string, currentRoles: string[]) => {
        try {
            const updatedRoles = currentRoles.filter((r) => r !== roleName);
            const result = await adminService.updateUserRoles(userId, updatedRoles);

            // If backend indicates this is the current user, update session from backend data
            if (result?.isCurrentUser && result?.updatedUser) {
                // Store the user data exactly as returned from backend (trusted source)
                localStorage.setItem('auth_user', JSON.stringify(result.updatedUser));
                sessionStorage.setItem('auth_user', JSON.stringify(result.updatedUser));
                localStorage.setItem('userProfile', JSON.stringify(result.updatedUser));

                // Show message and reload
                setSuccessMessage(`Removed ${roleName} role - Refreshing...`);
                setShowSuccess(true);
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
                return;
            }

            await loadAllData();
            setSuccessMessage(`Removed ${roleName} role`);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } catch (error: any) {
            alert(error?.message || 'Failed to remove role');
        }
    };

    // Get role badge color
    const getRoleBadgeClass = (roleName: string) => {
        const colors: { [key: string]: string } = {
            ADMIN: 'bg-red-100 text-red-800 border-red-200',
            PROCUREMENT_MANAGER: 'bg-purple-100 text-purple-800 border-purple-200',
            PROCUREMENT_OFFICER: 'bg-blue-100 text-blue-800 border-blue-200',
            FINANCE_OFFICER: 'bg-green-100 text-green-800 border-green-200',
            DEPARTMENT_HEAD: 'bg-orange-100 text-orange-800 border-orange-200',
            HEAD_OF_DIVISION: 'bg-pink-100 text-pink-800 border-pink-200',
            EXECUTIVE_DIRECTOR: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        };
        return colors[roleName] || 'bg-gray-100 text-gray-800 border-gray-200';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <IconLoader className="w-10 h-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Success Toast */}
            {showSuccess && (
                <div className="fixed top-20 right-6 z-50 animate-[fadeIn_0.3s_ease-in-out]">
                    <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3 shadow-lg">
                        <IconSquareCheck className="w-5 h-5 text-green-600" />
                        <span className="text-green-800 font-medium">{successMessage}</span>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage user roles and access permissions</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <IconUsers className="w-5 h-5" />
                        <span className="font-semibold">{filteredUsers.length}</span>
                        <span>Users</span>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="panel p-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Users</p>
                            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">{users.length}</p>
                        </div>
                        <IconUsers className="w-12 h-12 text-blue-300 dark:text-blue-700" />
                    </div>
                </div>

                <div className="panel p-5 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Roles Available</p>
                            <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-1">{allRoles.length}</p>
                        </div>
                        <IconSettings className="w-12 h-12 text-purple-300 dark:text-purple-700" />
                    </div>
                </div>

                <div className="panel p-5 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-green-700 dark:text-green-300">Departments</p>
                            <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-1">{allDepartments.length}</p>
                        </div>
                        <IconInfoCircle className="w-12 h-12 text-green-300 dark:text-green-700" />
                    </div>
                </div>

                <div className="panel p-5 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Admins</p>
                            <p className="text-3xl font-bold text-orange-900 dark:text-orange-100 mt-1">{users.filter((u) => (u.roles || []).some((r) => r.role?.name === 'ADMIN')).length}</p>
                        </div>
                        <IconUserPlus className="w-12 h-12 text-orange-300 dark:text-orange-700" />
                    </div>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="panel p-5">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div className="md:col-span-2">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="form-input pl-10 pr-4 py-2.5 w-full"
                            />
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        </div>
                    </div>

                    {/* Role Filter */}
                    <div>
                        <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="form-select py-2.5 w-full">
                            <option value="">All Roles</option>
                            {allRoles.map((role) => (
                                <option key={role.id} value={role.name}>
                                    {role.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Department Filter */}
                    <div>
                        <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="form-select py-2.5 w-full">
                            <option value="">All Departments</option>
                            {allDepartments.map((dept) => (
                                <option key={dept.id} value={dept.name}>
                                    {dept.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Users Grid */}
            <div className="grid grid-cols-1 gap-4">
                {filteredUsers.map((user) => {
                    const userRoles = (user.roles || []).map((r) => r.role?.name).filter(Boolean) as string[];

                    return (
                        <div key={user.id} className="panel p-5 hover:shadow-lg transition-shadow duration-200">
                            <div className="flex items-start justify-between gap-4">
                                {/* User Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-white font-bold text-lg">
                                            {(user.name || user.email).charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{user.name || 'No Name'}</h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                                        </div>
                                    </div>

                                    {/* Department */}
                                    {user.department && (
                                        <div className="mb-3">
                                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                                <IconInfoCircle className="w-4 h-4" />
                                                {user.department.name}
                                            </span>
                                        </div>
                                    )}

                                    {/* Roles */}
                                    <div className="flex flex-wrap gap-2">
                                        {userRoles.length > 0 ? (
                                            userRoles.map((roleName) => (
                                                <div key={roleName} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border ${getRoleBadgeClass(roleName)}`}>
                                                    {roleName}
                                                    <button onClick={() => quickRemoveRole(user.id, roleName, userRoles)} className="hover:opacity-70 transition-opacity" title="Remove role">
                                                        <IconX className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <span className="text-sm text-gray-500 italic">No roles assigned</span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => handleEditUser(user)} className="btn btn-primary btn-sm whitespace-nowrap">
                                        <IconSettings className="w-4 h-4 mr-1" />
                                        Manage Roles
                                    </button>

                                    {/* Quick Add Role Dropdown */}
                                    <div className="relative group">
                                        <button className="btn btn-outline-success btn-sm w-full whitespace-nowrap">
                                            <IconUserPlus className="w-4 h-4 mr-1" />
                                            Quick Add
                                        </button>
                                        <div className="absolute right-0 mt-1 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                                            <div className="p-2 space-y-1">
                                                {allRoles
                                                    .filter((role) => !userRoles.includes(role.name))
                                                    .map((role) => (
                                                        <button
                                                            key={role.id}
                                                            onClick={() => quickAddRole(user.id, role.name, userRoles)}
                                                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                                        >
                                                            {role.name}
                                                        </button>
                                                    ))}
                                                {allRoles.filter((role) => !userRoles.includes(role.name)).length === 0 && <div className="px-3 py-2 text-sm text-gray-500">All roles assigned</div>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filteredUsers.length === 0 && (
                    <div className="panel p-12 text-center">
                        <IconUsers className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">No users found matching your filters</p>
                    </div>
                )}
            </div>

            {/* Edit User Modal */}
            {selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Manage User Access</h2>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedUser.name || selectedUser.email}</p>
                            </div>
                            <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <IconX className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                            {/* Department Selection */}
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Department</label>
                                <select value={editingDept || ''} onChange={(e) => setEditingDept(e.target.value ? Number(e.target.value) : null)} className="form-select w-full">
                                    <option value="">No Department</option>
                                    {allDepartments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name} ({dept.code})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Role Selection */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Roles & Permissions</label>
                                <div className="space-y-3">
                                    {allRoles.map((role) => {
                                        const isSelected = editingRoles.includes(role.name);
                                        return (
                                            <div
                                                key={role.id}
                                                onClick={() => toggleRole(role.name)}
                                                className={`cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 ${
                                                    isSelected ? 'border-primary bg-primary/5 shadow-md' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                                }`}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div
                                                        className={`flex items-center justify-center w-6 h-6 rounded border-2 flex-shrink-0 mt-0.5 ${
                                                            isSelected ? 'bg-primary border-primary' : 'border-gray-300 dark:border-gray-600'
                                                        }`}
                                                    >
                                                        {isSelected && <IconSquareCheck className="w-4 h-4 text-white" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-semibold text-gray-900 dark:text-white">{role.name}</span>
                                                            {isSelected && <span className="px-2 py-0.5 text-xs bg-primary text-white rounded-full">Active</span>}
                                                        </div>
                                                        {role.description && <p className="text-sm text-gray-600 dark:text-gray-400">{role.description}</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                            <button onClick={() => setSelectedUser(null)} className="btn btn-outline-dark" disabled={saving}>
                                Cancel
                            </button>
                            <button onClick={handleSaveChanges} className="btn btn-primary" disabled={saving}>
                                {saving ? (
                                    <>
                                        <IconLoader className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <IconSave className="w-4 h-4 mr-2" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Requests Section */}
            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Assign Requests to Users</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Quickly assign or reassign requests to team members</p>
                <AssignRequestsPanel users={users} />
            </div>
        </div>
    );
};

// Assign Requests Panel Component
function AssignRequestsPanel({ users }: { users: AdminUser[] }) {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
    const [selectedUser, setSelectedUser] = useState<number | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        loadRequests();
    }, []);

    async function loadRequests() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(getApiUrl('/requests'));
            if (!res.ok) {
                throw new Error('Failed to fetch requests');
            }
            const data = await res.json();
            setRequests(data);
        } catch (e: any) {
            console.error('Failed to load requests:', e);
            setError(e?.message || 'Failed to load requests');
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
                    comment: 'Assigned from User Management dashboard',
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
            setTimeout(() => loadRequests(), 1000);
        } catch (e: any) {
            console.error('Assignment error:', e);
            setError(e?.message || 'Failed to assign request');
        } finally {
            setAssigning(false);
        }
    }

    if (loading) {
        return (
            <div className="panel">
                <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400">Loading requests...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="panel">
            {/* Error Message */}
            {error && (
                <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-red-800 dark:text-red-200">
                    <p className="font-semibold flex items-center gap-2">
                        <IconInfoCircle className="w-5 h-5" />
                        Error
                    </p>
                    <p className="text-sm mt-1">{error}</p>
                </div>
            )}

            {/* Success Message */}
            {success && (
                <div className="mb-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 text-green-800 dark:text-green-200">
                    <p className="font-semibold flex items-center gap-2">
                        <IconSquareCheck className="w-5 h-5" />
                        Success
                    </p>
                    <p className="text-sm mt-1">{success}</p>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Requests List */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h6 className="font-semibold flex items-center gap-2">
                            Requests
                            <span className="badge bg-primary text-white text-xs">{requests.length}</span>
                        </h6>
                        <button onClick={loadRequests} disabled={loading} className="btn btn-sm btn-outline-primary">
                            Refresh
                        </button>
                    </div>
                    {requests.length === 0 ? (
                        <div className="rounded border border-dashed border-white-light dark:border-dark p-8 text-center text-gray-500">
                            <p>No requests found</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {requests.map((req) => (
                                <div
                                    key={req.id}
                                    onClick={() => setSelectedRequest(req.id)}
                                    className={`cursor-pointer rounded border p-3 transition-all hover:bg-primary/10 ${
                                        selectedRequest === req.id ? 'border-primary bg-primary/10 ring-2 ring-primary/50' : 'border-white-light dark:border-dark'
                                    }`}
                                >
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-sm">
                                                REQ-{req.id}: {req.title}
                                            </div>
                                            <div className="text-xs text-white-dark mt-1">
                                                <div>
                                                    Status: <span className="font-medium">{req.status}</span>
                                                </div>
                                                <div className="truncate">
                                                    Requester: <span className="font-medium">{req.requester?.name || 'Unknown'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-xs flex-shrink-0">
                                            {req.currentAssignee ? (
                                                <span className="badge bg-success text-white">{req.currentAssignee.name}</span>
                                            ) : (
                                                <span className="badge bg-danger text-white">Unassigned</span>
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
                    <h6 className="mb-3 font-semibold flex items-center gap-2">
                        Team Members {selectedRequest && <span className="badge bg-warning text-white text-xs">Request Selected</span>}
                        <span className="badge bg-primary text-white text-xs ml-auto">{users.length}</span>
                    </h6>

                    {/* Status Selector */}
                    <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        <label className="block text-sm font-medium mb-2">Update Status (optional)</label>
                        <select className="form-select text-sm" value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} disabled={!selectedRequest || assigning}>
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

                    {/* Users */}
                    {users.length === 0 ? (
                        <div className="rounded border border-dashed border-white-light dark:border-dark p-8 text-center text-gray-500">
                            <p>No users found</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                            {users.map((user) => {
                                const userRoles = (user.roles || []).map((r) => r.role?.name).filter(Boolean);
                                return (
                                    <div
                                        key={user.id}
                                        onClick={() => !assigning && selectedRequest && assignRequest(selectedRequest, user.id)}
                                        className={`rounded border p-3 transition-all ${
                                            selectedRequest && !assigning
                                                ? 'cursor-pointer hover:bg-success/10 border-white-light dark:border-dark hover:border-success/50'
                                                : 'opacity-50 cursor-not-allowed border-white-light dark:border-dark'
                                        } ${assigning ? 'pointer-events-none' : ''}`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-sm">{user.name || user.email}</div>
                                                <div className="text-xs text-white-dark truncate">{user.email}</div>
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
                                            {assigning && <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/20 border-t-primary flex-shrink-0"></div>}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Unassign Button */}
                            {selectedRequest && (
                                <div
                                    onClick={() => !assigning && assignRequest(selectedRequest, null)}
                                    className={`cursor-pointer rounded border border-danger p-3 transition-all hover:bg-danger/10 ${assigning ? 'pointer-events-none opacity-50' : ''}`}
                                >
                                    <div className="font-semibold text-danger text-sm flex items-center justify-between">
                                        <span>Unassign (Remove assignee)</span>
                                        {assigning && <div className="h-4 w-4 animate-spin rounded-full border-2 border-danger/20 border-t-danger"></div>}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AdminDashboard;
