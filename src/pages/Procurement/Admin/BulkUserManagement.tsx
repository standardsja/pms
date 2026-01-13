import { useEffect, useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { getApiUrl } from '../../../config/api';
import { getAuthHeadersSync } from '../../../utils/api';
import IconLoader from '../../../components/Icon/IconLoader';
import IconSquareCheck from '../../../components/Icon/IconSquareCheck';
import IconAlertCircle from '../../../components/Icon/IconAlertCircle';
import IconUpload from '../../../components/Icon/IconUpload';
import IconDownload from '../../../components/Icon/IconDownload';
import IconTrash from '../../../components/Icon/IconTrash';

interface BulkImportResult {
    totalRows: number;
    successCount: number;
    failureCount: number;
    details: string[];
}

interface User {
    id: number;
    email: string;
    name: string;
    departmentId: number;
}

interface Department {
    id: number;
    name: string;
}

interface Role {
    id: number;
    name: string;
}

const BulkUserManagement = () => {
    const dispatch = useDispatch();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
    const [fileName, setFileName] = useState('');

    // Batch operations state
    const [activeModal, setActiveModal] = useState<'role' | 'department' | 'deactivate' | 'reset' | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
    const [selectedRole, setSelectedRole] = useState<number | null>(null);
    const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
    const [deactivationReason, setDeactivationReason] = useState('');
    const [batchLoading, setBatchLoading] = useState(false);
    const [batchSuccess, setBatchSuccess] = useState('');

    // Individual user creation state
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [newUserForm, setNewUserForm] = useState({
        email: '',
        name: '',
        department: '',
        role: '',
    });
    const [createUserLoading, setCreateUserLoading] = useState(false);

    useEffect(() => {
        dispatch(setPageTitle('Bulk User Management'));
        loadUsers();
        loadDepartments();
        loadRoles();
    }, [dispatch]);

    const loadUsers = async () => {
        try {
            const response = await fetch(getApiUrl('/api/admin/users?limit=1000'), {
                headers: getAuthHeadersSync(),
            });
            if (response.ok) {
                const data = await response.json();
                // Handle both paginated and legacy format
                const usersList = data.users || (Array.isArray(data) ? data : []);
                setUsers(usersList);
            }
        } catch (e) {
            // Error handled in component state
        }
    };

    const loadDepartments = async () => {
        try {
            const response = await fetch(getApiUrl('/api/admin/departments'), {
                headers: getAuthHeadersSync(),
            });
            if (response.ok) {
                const data = await response.json();
                setDepartments(Array.isArray(data) ? data : data.departments || []);
            }
        } catch (e) {
            // Error handled in component state
        }
    };

    const loadRoles = async () => {
        try {
            const response = await fetch(getApiUrl('/api/admin/roles'), {
                headers: getAuthHeadersSync(),
            });
            if (response.ok) {
                const data = await response.json();
                setRoles(Array.isArray(data) ? data : data.roles || []);
            }
        } catch (e) {
            // Error handled in component state
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        if (!file.name.endsWith('.csv')) {
            setError('Only CSV files are supported');
            return;
        }
        setError('');
    };

    const handleImport = async () => {
        if (!fileInputRef.current?.files?.[0]) {
            setError('Please select a file');
            return;
        }

        setLoading(true);
        try {
            const file = fileInputRef.current.files[0];
            const csvContent = await file.text();

            const response = await fetch(getApiUrl('/api/admin/bulk-import'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    csvContent,
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Failed to import users');
            }

            const result = await response.json();
            setImportResult(result);
            setSuccess(`Successfully imported ${result.successCount} users!`);
            setTimeout(() => setSuccess(''), 3000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadTemplate = () => {
        const template = `email,name,department,role
john.doe@example.com,John Doe,Operations,User
jane.smith@example.com,Jane Smith,IT,Manager
bob.johnson@example.com,Bob Johnson,Finance,User`;

        const blob = new Blob([template], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bulk-import-template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleClear = () => {
        setImportResult(null);
        setFileName('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const resetBatchModal = () => {
        setActiveModal(null);
        setSelectedUsers([]);
        setSelectedRole(null);
        setSelectedDepartment(null);
        setDeactivationReason('');
        setBatchSuccess('');
    };

    const handleCreateUser = async () => {
        if (!newUserForm.email || !newUserForm.name || !newUserForm.department || !newUserForm.role) {
            setError('Please fill in all fields');
            return;
        }

        setCreateUserLoading(true);
        try {
            const response = await fetch(getApiUrl('/api/admin/create-user'), {
                method: 'POST',
                headers: { ...getAuthHeadersSync(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newUserForm.email.trim(),
                    name: newUserForm.name.trim(),
                    department: newUserForm.department.trim(),
                    role: newUserForm.role.trim(),
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Failed to create user');
            }

            const data = await response.json();
            setSuccess(`User ${newUserForm.email} created successfully! Default password: Passw0rd!`);
            setNewUserForm({ email: '', name: '', department: '', role: '' });
            setShowCreateUser(false);
            loadUsers(); // Refresh users list
            setTimeout(() => setSuccess(''), 5000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setCreateUserLoading(false);
        }
    };

    const handleBatchRoleAssignment = async () => {
        if (!selectedRole || selectedUsers.length === 0) {
            setError('Please select users and a role');
            return;
        }

        setBatchLoading(true);
        try {
            const response = await fetch(getApiUrl('/api/admin/bulk-role-assignment'), {
                method: 'POST',
                headers: { ...getAuthHeadersSync(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userIds: selectedUsers.map(String),
                    roleId: selectedRole,
                }),
            });

            if (!response.ok) throw new Error('Batch operation failed');
            const data = await response.json();
            setBatchSuccess(`✓ Assigned role to ${data.successCount} users`);
            setTimeout(() => resetBatchModal(), 2000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBatchLoading(false);
        }
    };

    const handleBatchDepartmentChange = async () => {
        if (!selectedDepartment || selectedUsers.length === 0) {
            setError('Please select users and a department');
            return;
        }

        setBatchLoading(true);
        try {
            const response = await fetch(getApiUrl('/api/admin/bulk-department-change'), {
                method: 'POST',
                headers: { ...getAuthHeadersSync(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userIds: selectedUsers.map(String),
                    departmentId: selectedDepartment,
                }),
            });

            if (!response.ok) throw new Error('Batch operation failed');
            const data = await response.json();
            setBatchSuccess(`✓ Updated ${data.updatedCount} users`);
            setTimeout(() => resetBatchModal(), 2000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBatchLoading(false);
        }
    };

    const handleBatchDeactivation = async () => {
        if (selectedUsers.length === 0) {
            setError('Please select users to deactivate');
            return;
        }

        setBatchLoading(true);
        try {
            const response = await fetch(getApiUrl('/api/admin/bulk-deactivate'), {
                method: 'POST',
                headers: { ...getAuthHeadersSync(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userIds: selectedUsers.map(String),
                    reason: deactivationReason || undefined,
                }),
            });

            if (!response.ok) throw new Error('Batch operation failed');
            const data = await response.json();
            setBatchSuccess(`✓ Deactivated ${data.deactivatedCount} users`);
            setTimeout(() => resetBatchModal(), 2000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBatchLoading(false);
        }
    };

    const handleBatchPasswordReset = async () => {
        if (selectedUsers.length === 0) {
            setError('Please select users');
            return;
        }

        setBatchLoading(true);
        try {
            const response = await fetch(getApiUrl('/api/admin/bulk-password-reset'), {
                method: 'POST',
                headers: { ...getAuthHeadersSync(), 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userIds: selectedUsers.map(String),
                }),
            });

            if (!response.ok) throw new Error('Batch operation failed');
            const data = await response.json();
            setBatchSuccess(`✓ Password reset emails queued for ${data.queuedCount} users`);
            setTimeout(() => resetBatchModal(), 2000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setBatchLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bulk User Management</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Import multiple users via CSV, batch operations, and bulk role assignment</p>
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

            {/* Create Individual User Section */}
            <div className="panel p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Create Individual User</h2>
                    <button onClick={() => setShowCreateUser(!showCreateUser)} className={`btn btn-sm ${showCreateUser ? 'btn-outline-primary' : 'btn-primary'}`}>
                        {showCreateUser ? 'Hide Form' : 'Add User'}
                    </button>
                </div>

                {showCreateUser && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div>
                            <label className="block text-sm font-semibold mb-2">Email Address</label>
                            <input
                                type="email"
                                placeholder="user@example.com"
                                value={newUserForm.email}
                                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                                className="form-input"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-2">Full Name</label>
                            <input type="text" placeholder="John Doe" value={newUserForm.name} onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })} className="form-input" />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-2">Department</label>
                            <select value={newUserForm.department} onChange={(e) => setNewUserForm({ ...newUserForm, department: e.target.value })} className="form-select">
                                <option value="">Select Department</option>
                                {departments.map((dept) => (
                                    <option key={dept.id} value={dept.name}>
                                        {dept.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold mb-2">Role</label>
                            <select value={newUserForm.role} onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })} className="form-select">
                                <option value="">Select Role</option>
                                {roles.map((role) => (
                                    <option key={role.id} value={role.name}>
                                        {role.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2 flex gap-2">
                            <button onClick={handleCreateUser} disabled={createUserLoading} className="btn btn-primary flex-1">
                                {createUserLoading ? (
                                    <>
                                        <IconLoader className="w-4 h-4 mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create User'
                                )}
                            </button>
                            <button
                                onClick={() => {
                                    setShowCreateUser(false);
                                    setNewUserForm({ email: '', name: '', department: '', role: '' });
                                }}
                                className="btn btn-outline-primary"
                            >
                                Cancel
                            </button>
                        </div>

                        <div className="md:col-span-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 rounded text-sm text-blue-800 dark:text-blue-300">
                            💡 New user will be created with default password: <span className="font-mono font-semibold">Passw0rd!</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Import Section */}
            <div className="panel p-6">
                <h2 className="text-xl font-bold mb-4">Import Users from CSV</h2>

                <div className="space-y-4">
                    {/* File Upload */}
                    <div>
                        <label className="block text-sm font-semibold mb-3">Select CSV File</label>
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                            <div className="flex flex-col items-center gap-3">
                                <IconUpload className="w-12 h-12 text-gray-400" />
                                <div>
                                    <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" disabled={loading} />
                                    <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary mb-2" disabled={loading}>
                                        Choose File
                                    </button>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{fileName || 'or drag and drop CSV file here'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CSV Format Info */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 rounded-lg p-4">
                        <h3 className="font-semibold mb-2">Required CSV Format</h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">Your CSV file must include these columns:</p>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 ml-4">
                            <li>
                                • <span className="font-mono">email</span> (required, unique)
                            </li>
                            <li>
                                • <span className="font-mono">name</span> (required)
                            </li>
                            <li>
                                • <span className="font-mono">department</span> (required)
                            </li>
                            <li>
                                • <span className="font-mono">role</span> (required: User, Manager, Admin)
                            </li>
                        </ul>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={handleImport} disabled={loading || !fileName} className="btn btn-primary">
                            {loading ? (
                                <>
                                    <IconLoader className="w-4 h-4 mr-2 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <IconUpload className="w-4 h-4 mr-2" />
                                    Import Users
                                </>
                            )}
                        </button>
                        <button onClick={handleDownloadTemplate} className="btn btn-outline-primary">
                            <IconDownload className="w-4 h-4 mr-2" />
                            Download Template
                        </button>
                        {fileName && (
                            <button onClick={handleClear} className="btn btn-outline-danger">
                                <IconTrash className="w-4 h-4 mr-2" />
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Import Results */}
            {importResult && (
                <div className="panel p-6">
                    <h2 className="text-xl font-bold mb-4">Import Results</h2>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 rounded">
                            <p className="text-sm text-blue-700 dark:text-blue-300">Total Records</p>
                            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{importResult.totalRows}</p>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/40 rounded">
                            <p className="text-sm text-green-700 dark:text-green-300">Successful</p>
                            <p className="text-2xl font-bold text-green-900 dark:text-green-100">{importResult.successCount}</p>
                        </div>
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/40 rounded">
                            <p className="text-sm text-red-700 dark:text-red-300">Failed</p>
                            <p className="text-2xl font-bold text-red-900 dark:text-red-100">{importResult.failureCount}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {importResult.details.map((detail, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                                {detail.startsWith('✓') ? (
                                    <IconSquareCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                                ) : (
                                    <IconAlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                )}
                                <span>{detail}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Batch Operations */}
            <div className="panel p-6">
                <h2 className="text-xl font-bold mb-4">Batch Operations</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/20">
                        <h3 className="font-semibold mb-1">Bulk Role Assignment</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Assign roles to multiple users at once</p>
                        <button onClick={() => setActiveModal('role')} className="btn btn-sm btn-outline-primary">
                            Configure
                        </button>
                    </div>
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/20">
                        <h3 className="font-semibold mb-1">Bulk Department Change</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Move multiple users to different departments</p>
                        <button onClick={() => setActiveModal('department')} className="btn btn-sm btn-outline-primary">
                            Configure
                        </button>
                    </div>
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/20">
                        <h3 className="font-semibold mb-1">Bulk Deactivation</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Deactivate multiple user accounts</p>
                        <button onClick={() => setActiveModal('deactivate')} className="btn btn-sm btn-outline-danger">
                            Configure
                        </button>
                    </div>
                    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/20">
                        <h3 className="font-semibold mb-1">Bulk Password Reset</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Send password reset emails to users</p>
                        <button onClick={() => setActiveModal('reset')} className="btn btn-sm btn-outline-primary">
                            Configure
                        </button>
                    </div>
                </div>
            </div>

            {/* Guidelines */}
            <div className="panel p-6 bg-gray-50 dark:bg-gray-900/20">
                <h2 className="text-lg font-bold mb-3">Import Guidelines</h2>
                <ul className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
                    <li>• Emails must be unique and valid</li>
                    <li>• Departments and roles must match existing system values</li>
                    <li>• Maximum 1000 users per import</li>
                    <li>• Failed records will not affect successful ones</li>
                    <li>• Import is transactional for consistency</li>
                    <li>• Users will receive welcome emails with login credentials</li>
                </ul>
            </div>

            {/* Batch Operation Modals */}
            {activeModal && (
                <div className="fixed inset-0 bg-black/50 dark:bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-xl font-bold">
                                {activeModal === 'role' && 'Bulk Role Assignment'}
                                {activeModal === 'department' && 'Bulk Department Change'}
                                {activeModal === 'deactivate' && 'Bulk Deactivation'}
                                {activeModal === 'reset' && 'Bulk Password Reset'}
                            </h3>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Batch Success Message */}
                            {batchSuccess && (
                                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/40 text-green-800 dark:text-green-200">
                                    {batchSuccess}
                                </div>
                            )}

                            {/* User Selection */}
                            <div>
                                <label className="block text-sm font-semibold mb-2">Select Users</label>
                                <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-48 overflow-y-auto">
                                    {users.length === 0 ? (
                                        <p className="p-3 text-sm text-gray-500">No users available</p>
                                    ) : (
                                        users.map((user) => (
                                            <label
                                                key={user.id}
                                                className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUsers.includes(user.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedUsers([...selectedUsers, user.id]);
                                                        } else {
                                                            setSelectedUsers(selectedUsers.filter((id) => id !== user.id));
                                                        }
                                                    }}
                                                    className="w-4 h-4 rounded"
                                                />
                                                <span className="ml-3 text-sm">
                                                    {user.name} ({user.email})
                                                </span>
                                            </label>
                                        ))
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{selectedUsers.length} selected</p>
                            </div>

                            {/* Role Selection (for role assignment) */}
                            {activeModal === 'role' && (
                                <div className="space-y-3">
                                    <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 text-amber-800 dark:text-amber-200 text-sm">
                                        <p className="font-semibold mb-1">⚠️ Dual Role Warning</p>
                                        <p>Assigning multiple roles to the same user can affect dashboard routing and sidebar visibility. Higher-priority roles take precedence.</p>
                                        <p className="mt-1 text-xs italic">Known conflict: REQUESTER + DEPARTMENT_MANAGER will only show Department Manager interface.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-2">Select Role</label>
                                        <select
                                            value={selectedRole || ''}
                                            onChange={(e) => setSelectedRole(parseInt(e.target.value))}
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                        >
                                            <option value="">-- Select Role --</option>
                                            {roles.map((role) => (
                                                <option key={role.id} value={role.id}>
                                                    {role.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Department Selection (for department change) */}
                            {activeModal === 'department' && (
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Select Department</label>
                                    <select
                                        value={selectedDepartment || ''}
                                        onChange={(e) => setSelectedDepartment(parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    >
                                        <option value="">-- Select Department --</option>
                                        {departments.map((dept) => (
                                            <option key={dept.id} value={dept.id}>
                                                {dept.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Deactivation Reason (for deactivation) */}
                            {activeModal === 'deactivate' && (
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Deactivation Reason (optional)</label>
                                    <textarea
                                        value={deactivationReason}
                                        onChange={(e) => setDeactivationReason(e.target.value)}
                                        placeholder="e.g., Account no longer needed, User resignation, etc."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                                    />
                                </div>
                            )}

                            {/* Password Reset Info */}
                            {activeModal === 'reset' && (
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/40 rounded">
                                    <p className="text-sm text-blue-800 dark:text-blue-200">
                                        Password reset emails will be sent to the selected users. They will receive instructions to create a new password.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3 justify-end">
                            <button onClick={resetBatchModal} className="btn btn-outline-secondary" disabled={batchLoading}>
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (activeModal === 'role') handleBatchRoleAssignment();
                                    else if (activeModal === 'department') handleBatchDepartmentChange();
                                    else if (activeModal === 'deactivate') handleBatchDeactivation();
                                    else if (activeModal === 'reset') handleBatchPasswordReset();
                                }}
                                className={`btn ${activeModal === 'deactivate' ? 'btn-danger' : 'btn-primary'}`}
                                disabled={batchLoading || selectedUsers.length === 0}
                            >
                                {batchLoading ? (
                                    <>
                                        <IconLoader className="w-4 h-4 mr-2 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    'Execute'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkUserManagement;
