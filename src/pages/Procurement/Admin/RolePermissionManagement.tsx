import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { getApiUrl } from '../../../config/api';
import { getAuthHeaders } from '../../../utils/api';
import IconLoader from '../../../components/Icon/IconLoader';
import IconSquareCheck from '../../../components/Icon/IconSquareCheck';
import IconAlertCircle from '../../../components/Icon/IconAlertCircle';
import IconPlus from '../../../components/Icon/IconPlus';
import IconEdit from '../../../components/Icon/IconEdit';
import IconTrash from '../../../components/Icon/IconTrash';
import IconX from '../../../components/Icon/IconX';

interface Permission {
    id: string;
    name: string;
    description: string;
    module: string;
}

interface Role {
    id: string;
    name: string;
    description: string;
    permissions: string[];
    userCount: number;
    createdAt: string;
}

const RolePermissionManagement = () => {
    const dispatch = useDispatch();
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [showRoleForm, setShowRoleForm] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);

    const [roleFormData, setRoleFormData] = useState({
        name: '',
        description: '',
        permissions: [] as string[],
    });

    const modules = ['procurement', 'innovation', 'committee', 'admin'];

    useEffect(() => {
        dispatch(setPageTitle('Role & Permission Management'));
    }, [dispatch]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const authHeaders = getAuthHeaders();

            const [rolesRes, permsRes] = await Promise.all([
                fetch(getApiUrl('/api/admin/roles'), { headers: authHeaders }).catch(() => null),
                fetch(getApiUrl('/api/admin/permissions'), { headers: authHeaders }).catch(() => null),
            ]);

            let loadedRoles: Role[] = [];
            if (rolesRes?.ok) {
                const data = await rolesRes.json();
                loadedRoles = Array.isArray(data) ? data : data.data || data.roles || [];
            } else {
                console.warn('Failed to fetch roles');
            }

            if (permsRes?.ok) {
                const data = await permsRes.json();
                setPermissions(Array.isArray(data) ? data : data.data || data.permissions || []);
            } else {
                console.warn('Failed to fetch permissions');
                setPermissions([]);
            }

            // Fetch permissions for each role and populate them
            const rolesWithPermissions = await Promise.all(
                loadedRoles.map(async (role) => {
                    try {
                        const permRes = await fetch(getApiUrl(`/api/admin/roles/${role.id}/permissions`), {
                            headers: authHeaders,
                        });
                        if (permRes.ok) {
                            const permData = await permRes.json();
                            return {
                                ...role,
                                permissions: permData.assignedPermissions || [],
                            };
                        }
                    } catch (e) {
                        console.warn(`Failed to load permissions for role ${role.id}:`, e);
                    }
                    return role;
                })
            );

            setRoles(rolesWithPermissions);
        } catch (e: any) {
            console.error('Error loading data:', e);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRole = () => {
        setEditingRole(null);
        setRoleFormData({
            name: '',
            description: '',
            permissions: [],
        });
        setShowRoleForm(true);
    };

    const handleEditRole = (role: Role) => {
        setEditingRole(role);
        setRoleFormData({
            name: role.name,
            description: role.description,
            permissions: [...(role.permissions || [])],
        });
        setShowRoleForm(true);

        // Load permissions for this role from backend
        loadRolePermissions(role.id);
    };

    const loadRolePermissions = async (roleId: string | number) => {
        try {
            const authHeaders = getAuthHeaders();
            const response = await fetch(getApiUrl(`/api/admin/roles/${roleId}/permissions`), {
                headers: authHeaders,
            });

            if (response.ok) {
                const data = await response.json();
                setRoleFormData((prev) => ({
                    ...prev,
                    permissions: data.assignedPermissions.map((pId: number) => pId.toString()),
                }));
            }
        } catch (e) {
            console.warn('Failed to load role permissions:', e);
        }
    };

    const handleSaveRole = async () => {
        if (!roleFormData.name) {
            setError('Role name is required');
            return;
        }

        setProcessing(true);
        try {
            const authHeaders = getAuthHeaders();
            let response;

            if (editingRole) {
                // Update existing role
                response = await fetch(getApiUrl(`/api/admin/roles/${editingRole.id}`), {
                    method: 'PUT',
                    headers: authHeaders,
                    body: JSON.stringify({
                        name: roleFormData.name,
                        description: roleFormData.description,
                    }),
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.message || 'Failed to update role');
                }

                const updated = await response.json();
                setRoles(
                    roles.map((r) =>
                        r.id === editingRole.id
                            ? {
                                  ...r,
                                  name: updated.name,
                                  description: updated.description,
                              }
                            : r
                    )
                );
                setSuccess('Role updated successfully');
            } else {
                // Create new role
                response = await fetch(getApiUrl('/api/admin/roles'), {
                    method: 'POST',
                    headers: authHeaders,
                    body: JSON.stringify({
                        name: roleFormData.name,
                        description: roleFormData.description,
                    }),
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.message || 'Failed to create role');
                }

                const created = await response.json();
                setRoles([
                    ...roles,
                    {
                        id: created.id,
                        name: created.name,
                        description: created.description,
                        permissions: [],
                        userCount: created.userCount || 0,
                        createdAt: new Date().toISOString().split('T')[0],
                    },
                ]);
                setSuccess('Role created successfully');
            }

            // Save permissions if any are selected
            if (roleFormData.permissions.length > 0) {
                const roleId = editingRole?.id || roles[roles.length - 1].id;
                const permResponse = await fetch(getApiUrl(`/api/admin/roles/${roleId}/permissions`), {
                    method: 'POST',
                    headers: authHeaders,
                    body: JSON.stringify({
                        permissionIds: roleFormData.permissions.map((p) => {
                            const perm = permissions.find((pf) => pf.id.toString() === p || pf.name === p);
                            return perm?.id || parseInt(p);
                        }),
                    }),
                });

                if (!permResponse.ok) {
                    console.warn('Failed to save permissions');
                }
            }

            setShowRoleForm(false);
            setTimeout(() => setSuccess(''), 2000);
        } catch (e: any) {
            setError(e.message || 'Failed to save role');
            console.error('Error saving role:', e);
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteRole = async (id: string) => {
        if (!confirm('Delete this role? Users with this role will be affected.')) return;

        setProcessing(true);
        try {
            const authHeaders = getAuthHeaders();
            const response = await fetch(getApiUrl(`/api/admin/roles/${id}`), {
                method: 'DELETE',
                headers: authHeaders,
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Failed to delete role');
            }

            setRoles(roles.filter((r) => r.id !== id));
            setSuccess('Role deleted successfully');
            setTimeout(() => setSuccess(''), 2000);
        } catch (e: any) {
            setError(e.message || 'Failed to delete role');
            console.error('Error deleting role:', e);
        } finally {
            setProcessing(false);
        }
    };

    const togglePermission = (permissionId: string) => {
        if (roleFormData.permissions.includes(permissionId)) {
            setRoleFormData({
                ...roleFormData,
                permissions: roleFormData.permissions.filter((p) => p !== permissionId),
            });
        } else {
            setRoleFormData({
                ...roleFormData,
                permissions: [...roleFormData.permissions, permissionId],
            });
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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Role & Permission Management</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Configure custom roles and assign permissions</p>
            </div>

            {/* Alerts */}
            {success && (
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/40 text-green-800 dark:text-green-200 flex items-center gap-2">
                    <IconSquareCheck className="w-5 h-5" />
                    {success}
                </div>
            )}
            {error && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 text-red-800 dark:text-red-200 flex items-center gap-2">
                    <IconAlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Role Form Modal */}
            {showRoleForm && (
                <div className="panel bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/40 max-h-[80vh] overflow-y-auto">
                    <div className="flex items-center justify-between mb-4 sticky top-0 bg-blue-50 dark:bg-blue-900/20 pb-4">
                        <h2 className="text-xl font-bold">{editingRole ? 'Edit Role' : 'Create New Role'}</h2>
                        <button onClick={() => setShowRoleForm(false)}>
                            <IconX className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Role Name *"
                            value={roleFormData.name}
                            onChange={(e) => setRoleFormData({ ...roleFormData, name: e.target.value })}
                            className="form-input w-full"
                        />
                        <textarea
                            placeholder="Description"
                            value={roleFormData.description}
                            onChange={(e) => setRoleFormData({ ...roleFormData, description: e.target.value })}
                            className="form-textarea w-full"
                            rows={2}
                        />

                        <div>
                            <h3 className="font-bold mb-3">Permissions by Module</h3>
                            <div className="space-y-4">
                                {modules.map((module) => (
                                    <div key={module} className="border border-gray-200 dark:border-gray-700 rounded p-4">
                                        <h4 className="font-semibold text-sm uppercase mb-3 text-gray-700 dark:text-gray-300">{module}</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            {permissions
                                                .filter((p) => p.module === module)
                                                .map((permission) => (
                                                    <label key={permission.id} className="flex items-start gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={roleFormData.permissions.includes(permission.id)}
                                                            onChange={() => togglePermission(permission.id)}
                                                            className="form-checkbox mt-1"
                                                        />
                                                        <div>
                                                            <p className="text-sm font-semibold">{permission.name}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{permission.description}</p>
                                                        </div>
                                                    </label>
                                                ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2 sticky bottom-0 bg-blue-50 dark:bg-blue-900/20 pt-4">
                            <button onClick={handleSaveRole} disabled={processing} className="btn btn-primary">
                                {processing ? 'Saving...' : 'Save Role'}
                            </button>
                            <button onClick={() => setShowRoleForm(false)} className="btn btn-outline">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="panel p-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700/40">
                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Total Roles</p>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-2">{roles.length}</p>
                </div>
                <div className="panel p-5 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700/40">
                    <p className="text-sm font-semibold text-green-700 dark:text-green-300">Permissions</p>
                    <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-2">{permissions.length}</p>
                </div>
                <div className="panel p-5 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700/40">
                    <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">Users Assigned</p>
                    <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-2">{roles.reduce((sum, r) => sum + (r.userCount || 0), 0)}</p>
                </div>
            </div>

            {/* Roles List */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Roles</h2>
                    <button onClick={handleAddRole} className="btn btn-primary btn-sm">
                        <IconPlus className="w-4 h-4 mr-2" />
                        Add Role
                    </button>
                </div>

                <div className="space-y-3">
                    {roles.map((role) => (
                        <div key={role.id} className="panel p-5 border-l-4 border-l-blue-500">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-bold text-lg">{role.name}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{role.description}</p>
                                    <div className="flex gap-2 mt-2">
                                        <span className="badge badge-info">{role.userCount || 0} users</span>
                                        <span className="badge badge-primary">{role.permissions?.length || 0} permissions</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEditRole(role)} className="btn btn-sm btn-outline-primary">
                                        <IconEdit className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteRole(role.id)}
                                        disabled={role.userCount > 0}
                                        className="btn btn-sm btn-outline-danger"
                                        title={role.userCount > 0 ? 'Cannot delete role with users' : ''}
                                    >
                                        <IconTrash className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Permission Grid */}
                            <div className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded">
                                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Permissions:</p>
                                <div className="flex flex-wrap gap-2">
                                    {(role.permissions || []).length > 0 ? (
                                        (role.permissions || []).map((permId) => {
                                            const perm = permissions.find((p) => p.id === String(permId));
                                            return perm ? (
                                                <span key={permId} className="badge badge-outline-primary text-xs">
                                                    {perm.name}
                                                </span>
                                            ) : null;
                                        })
                                    ) : (
                                        <p className="text-xs text-gray-500 italic">No permissions assigned</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Permission Reference */}
            <div>
                <h2 className="text-xl font-bold mb-4">Available Permissions</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {permissions.map((permission) => (
                        <div key={permission.id} className="panel p-4 border-l-2 border-l-gray-400">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h4 className="font-semibold">{permission.name}</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{permission.description}</p>
                                    <span className="badge badge-outline-secondary text-xs mt-2">{permission.module}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default RolePermissionManagement;
