import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
// Icons grouped by usage context (workflows/templates/roles) - remove unused as needed
import IconSettings from '../../../components/Icon/IconSettings';
import IconFile from '../../../components/Icon/IconFile';
import IconPlus from '../../../components/Icon/IconPlus';
import IconPencil from '../../../components/Icon/IconPencil';
import IconTrash from '../../../components/Icon/IconTrash';
import adminService, { ADMIN_ROLE_NAMES, type AdminUser } from '../../../services/adminService';

const AdminSettings = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Admin Settings'));
    });

    const [activeTab, setActiveTab] = useState<'users' | 'departments' | 'workflows' | 'templates' | 'approvals' | 'general' | 'reassign'>('users');

    // Modal states
    const [showModal, setShowModal] = useState<{ open: boolean; title: string; message: string; tone: 'success' | 'warning' | 'danger' }>(
        { open: false, title: '', message: '', tone: 'success' }
    );

    const openModal = (tone: 'success' | 'warning' | 'danger', title: string, message: string) => 
        setShowModal({ open: true, title, message, tone });
    const closeModal = () => setShowModal({ open: false, title: '', message: '', tone: 'success' });

    // === Email Notifications State ===
    const [emailNotifications, setEmailNotifications] = useState({
        rfqUpdates: true,
        quoteSubmissions: true,
        approvalRequests: true,
        paymentReminders: false,
    });

    // === System Preferences State ===
    const [systemPrefs, setSystemPrefs] = useState({
        currency: 'USD',
        dateFormat: 'YYYY-MM-DD',
        rfqValidity: 30,
    });

    // === SLA Settings State ===
    const [slaSettings, setSlaSettings] = useState({
        rfqResponse: 7,
        quoteEvaluation: 5,
        approval: 3,
        poProcessing: 2,
        paymentProcessing: 30,
    });

    // ------- Users & Departments (backend wired) -------
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [usersError, setUsersError] = useState<string | null>(null);

    const [deptName, setDeptName] = useState('');
    const [deptCode, setDeptCode] = useState('');
    const [deptManagerId, setDeptManagerId] = useState<number | ''>('');
    const [deptLoading, setDeptLoading] = useState(false);
    const [deptError, setDeptError] = useState<string | null>(null);
    const [deptSuccess, setDeptSuccess] = useState<string | null>(null);

    const flatUsers = useMemo(() => {
        return users.map(u => ({
            id: u.id,
            email: u.email,
            name: u.name || '',
            dept: u.department?.name || '',
            roles: (u.roles || []).map(r => r.role?.name).filter(Boolean) as string[],
        }));
    }, [users]);

    // Fetch users for users & departments tabs
    async function loadUsers() {
        setUsersLoading(true);
        setUsersError(null);
        try {
            const list = await adminService.getUsers();
            setUsers(list);
        } catch (e: any) {
            setUsersError(e?.message || 'Failed to load users');
        } finally {
            setUsersLoading(false);
        }
    }

    useEffect(() => {
        if (activeTab === 'users' || activeTab === 'departments') {
            loadUsers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    // Persist role changes
    async function handleSaveRoles(userId: number, roles: string[]) {
        try {
            await adminService.updateUserRoles(userId, roles);
            await loadUsers();
            openModal('success', 'Roles Updated', 'User roles have been updated.');
        } catch (e: any) {
            openModal('danger', 'Update Failed', e?.message || 'Failed to update roles');
        }
    }

    // Create new department
    async function handleCreateDepartment(e: React.FormEvent) {
        e.preventDefault();
        setDeptError(null);
        setDeptSuccess(null);
        setDeptLoading(true);
        try {
            const payload: any = { name: deptName.trim(), code: deptCode.trim().toUpperCase() };
            if (deptManagerId) payload.managerId = Number(deptManagerId);
            const created = await adminService.createDepartment(payload);
            setDeptSuccess(`Department created: ${created?.name || ''} (${created?.code || ''})`);
            setDeptName('');
            setDeptCode('');
            setDeptManagerId('');
            await loadUsers();
        } catch (e: any) {
            setDeptError(e?.message || 'Failed to create department');
        } finally {
            setDeptLoading(false);
        }
    }

    // ------- Existing demo UI actions below (not wired) -------
    // Action handlers
    const handleCreateWorkflow = () => {
        openModal('success', 'Create Workflow', 'New workflow creation form would open here. This feature allows you to define custom approval workflows.');
    };

    const handleEditWorkflow = (workflow: { name: string }) => {
        openModal('success', 'Edit Workflow', `Editing workflow: ${workflow.name}. You can modify steps, approvers, and conditions.`);
    };

    const handleDeleteWorkflow = (workflow: { name: string }) => {
        if (confirm(`Are you sure you want to delete the workflow "${workflow.name}"? This action cannot be undone.`)) {
            openModal('warning', 'Workflow Deleted', `Workflow "${workflow.name}" has been deleted successfully.`);
        }
    };

    const handleUploadTemplate = () => {
        openModal('success', 'Upload Template', 'Template upload dialog would open here. Supported formats: DOCX, PDF, XLSX.');
    };

    const handleEditTemplate = (template: { name: string }) => {
        openModal('success', 'Edit Template', `Editing template: ${template.name}. You can modify the template content and variables.`);
    };

    const handleDeleteTemplate = (template: { name: string }) => {
        if (confirm(`Are you sure you want to delete the template "${template.name}"?`)) {
            openModal('warning', 'Template Deleted', `Template "${template.name}" has been deleted successfully.`);
        }
    };

    const handleEditApprovalLimit = (role: string) => {
        openModal('success', 'Edit Approval Limit', `Editing approval limit for ${role}. You can set the maximum amount this role can approve.`);
    };

    const handleSaveSettings = () => {
        openModal('success', 'Settings Saved', 'All settings have been saved successfully. Changes will take effect immediately.');
    };

    const handleResetSettings = () => {
        if (confirm('Are you sure you want to reset all settings to default values? This action cannot be undone.')) {
            setEmailNotifications({ rfqUpdates: true, quoteSubmissions: true, approvalRequests: true, paymentReminders: false });
            setSystemPrefs({ currency: 'USD', dateFormat: 'YYYY-MM-DD', rfqValidity: 30 });
            setSlaSettings({ rfqResponse: 7, quoteEvaluation: 5, approval: 3, poProcessing: 2, paymentProcessing: 30 });
            openModal('warning', 'Settings Reset', 'All settings have been reset to default values.');
        }
    };

    const [workflows] = useState([
        { id: 1, name: 'Standard Purchase Request', steps: 5, status: 'Active', lastModified: '2024-10-20' },
        { id: 2, name: 'Emergency Procurement', steps: 3, status: 'Active', lastModified: '2024-10-18' },
        { id: 3, name: 'IT Equipment Request', steps: 6, status: 'Active', lastModified: '2024-10-15' },
        { id: 4, name: 'Capital Expenditure', steps: 8, status: 'Draft', lastModified: '2024-10-12' },
    ]);

    const [templates] = useState([
        { id: 1, name: 'Requisition Template - Standard', category: 'Requisition', version: '2.1', lastModified: '2024-10-22' },
        { id: 2, name: 'Purchase Order - General', category: 'PO', version: '1.5', lastModified: '2024-10-20' },
        { id: 3, name: 'Contract Template - Services', category: 'Contract', version: '3.0', lastModified: '2024-10-19' },
        { id: 4, name: 'Evaluation Matrix', category: 'Evaluation', version: '1.2', lastModified: '2024-10-18' },
        { id: 5, name: 'Supplier Agreement - NDA', category: 'Legal', version: '2.0', lastModified: '2024-10-15' },
    ]);

    const [approvalLimits] = useState([
        { role: 'Procurement Officer', limit: 50000, currency: 'USD' },
        { role: 'Procurement Manager', limit: 100000, currency: 'USD' },
        { role: 'Finance Director', limit: 250000, currency: 'USD' },
        { role: 'CEO', limit: 'Unlimited', currency: 'USD' },
    ]);

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold">Admin Settings</h2>
                <p className="text-white-dark">Manage workflows, templates, and system configurations</p>
            </div>

            {/* Tabs */}
            <div className="mb-6">
                <ul className="flex flex-wrap border-b border-white-light dark:border-[#191e3a]">
                    <li>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`-mb-[1px] flex items-center gap-2 border-b border-transparent p-5 py-3 hover:text-primary ${
                                activeTab === 'users' ? '!border-primary text-primary' : ''
                            }`}
                        >
                            <IconSettings className="h-5 w-5" />
                            Users
                        </button>
                    </li>
                    <li>
                        <button
                            onClick={() => setActiveTab('departments')}
                            className={`-mb-[1px] flex items-center gap-2 border-b border-transparent p-5 py-3 hover:text-primary ${
                                activeTab === 'departments' ? '!border-primary text-primary' : ''
                            }`}
                        >
                            <IconSettings className="h-5 w-5" />
                            Departments
                        </button>
                    </li>
                    <li>
                        <button
                            onClick={() => setActiveTab('workflows')}
                            className={`-mb-[1px] flex items-center gap-2 border-b border-transparent p-5 py-3 hover:text-primary ${
                                activeTab === 'workflows' ? '!border-primary text-primary' : ''
                            }`}
                        >
                            <IconSettings className="h-5 w-5" />
                            Workflows
                        </button>
                    </li>
                    <li>
                        <button
                            onClick={() => setActiveTab('templates')}
                            className={`-mb-[1px] flex items-center gap-2 border-b border-transparent p-5 py-3 hover:text-primary ${
                                activeTab === 'templates' ? '!border-primary text-primary' : ''
                            }`}
                        >
                            <IconFile className="h-5 w-5" />
                            Templates
                        </button>
                    </li>
                    <li>
                        <button
                            onClick={() => setActiveTab('approvals')}
                            className={`-mb-[1px] flex items-center gap-2 border-b border-transparent p-5 py-3 hover:text-primary ${
                                activeTab === 'approvals' ? '!border-primary text-primary' : ''
                            }`}
                        >
                            <IconSettings className="h-5 w-5" />
                            Approval Limits
                        </button>
                    </li>
                    <li>
                        <button
                            onClick={() => setActiveTab('reassign')}
                            className={`-mb-[1px] flex items-center gap-2 border-b border-transparent p-5 py-3 hover:text-primary ${
                                activeTab === 'reassign' ? '!border-primary text-primary' : ''
                            }`}
                        >
                            <IconSettings className="h-5 w-5" />
                            Reassign Requests
                        </button>
                    </li>
                    <li>
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`-mb-[1px] flex items-center gap-2 border-b border-transparent p-5 py-3 hover:text-primary ${
                                activeTab === 'general' ? '!border-primary text-primary' : ''
                            }`}
                        >
                            <IconSettings className="h-5 w-5" />
                            General Settings
                        </button>
                    </li>
                </ul>
            </div>

            {/* Users Tab (wired) */}
            {activeTab === 'users' && (
                <div className="panel">
                    <div className="mb-4 flex items-center justify-between">
                        <h5 className="text-lg font-semibold">Users</h5>
                        <button type="button" className="btn btn-outline-primary" onClick={loadUsers} disabled={usersLoading}>
                            Refresh
                        </button>
                    </div>
                    {usersError && (
                        <div className="mb-4 rounded border border-danger bg-danger-light p-3 text-danger">{usersError}</div>
                    )}
                    {usersLoading ? (
                        <div>Loading users…</div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table-hover">
                                <thead>
                                    <tr>
                                        <th>Email</th>
                                        <th>Name</th>
                                        <th>Department</th>
                                        <th>Roles</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {flatUsers.map((u) => (
                                        <UserRow key={u.id} user={u} onSave={handleSaveRoles} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Departments Tab (wired) */}
            {activeTab === 'departments' && (
                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="panel">
                        <h5 className="mb-4 text-lg font-semibold">Create Department</h5>
                        {deptError && (
                            <div className="mb-4 rounded border border-danger bg-danger-light p-3 text-danger">{deptError}</div>
                        )}
                        {deptSuccess && (
                            <div className="mb-4 rounded border border-success bg-success/10 p-3 text-success">{deptSuccess}</div>
                        )}
                        <form className="space-y-4" onSubmit={handleCreateDepartment}>
                            <div>
                                <label className="mb-1 block">Name</label>
                                <input className="form-input" value={deptName} onChange={(e) => setDeptName(e.target.value)} required />
                            </div>
                            <div>
                                <label className="mb-1 block">Code</label>
                                <input className="form-input" value={deptCode} onChange={(e) => setDeptCode(e.target.value)} required />
                            </div>
                            <div>
                                <label className="mb-1 block">Manager (optional)</label>
                                <select
                                    className="form-select"
                                    value={deptManagerId}
                                    onChange={(e) => setDeptManagerId(e.target.value ? Number(e.target.value) : '')}
                                >
                                    <option value="">-- none --</option>
                                    {flatUsers.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name || u.email} ({u.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button type="button" className="btn btn-outline-danger" onClick={() => { setDeptName(''); setDeptCode(''); setDeptManagerId(''); setDeptError(null); setDeptSuccess(null); }}>
                                    Reset
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={deptLoading}>
                                    {deptLoading ? 'Creating…' : 'Create Department'}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="panel">
                        <h5 className="mb-4 text-lg font-semibold">Managers Quick View</h5>
                        <div className="table-responsive">
                            <table className="table-hover">
                                <thead>
                                    <tr>
                                        <th>Email</th>
                                        <th>Name</th>
                                        <th>Department</th>
                                        <th>Roles</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {flatUsers
                                        .filter(u => u.roles.includes('DEPT_MANAGER') || u.roles.includes('HEAD_OF_DIVISION'))
                                        .map((u) => (
                                            <tr key={u.id}>
                                                <td className="font-mono">{u.email}</td>
                                                <td>{u.name}</td>
                                                <td>{u.dept}</td>
                                                <td>{u.roles.join(', ')}</td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Workflows Tab */}
            {activeTab === 'workflows' && (
                <div>
                    <div className="mb-6 flex items-center justify-between">
                        <h5 className="text-lg font-semibold">Workflow Management</h5>
                        <button type="button" className="btn btn-primary gap-2" onClick={handleCreateWorkflow}>
                            <IconPlus />
                            Create Workflow
                        </button>
                    </div>
                    <div className="panel">
                        <div className="table-responsive">
                            <table className="table-hover">
                                <thead>
                                    <tr>
                                        <th>Workflow Name</th>
                                        <th>Steps</th>
                                        <th>Status</th>
                                        <th>Last Modified</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {workflows.map((workflow) => (
                                        <tr key={workflow.id}>
                                            <td className="font-semibold">{workflow.name}</td>
                                            <td>
                                                <span className="badge bg-primary">{workflow.steps} steps</span>
                                            </td>
                                            <td>
                                                <span className={`badge ${workflow.status === 'Active' ? 'bg-success' : 'bg-warning'}`}>
                                                    {workflow.status}
                                                </span>
                                            </td>
                                            <td>{workflow.lastModified}</td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => handleEditWorkflow(workflow)}>
                                                        <IconPencil className="h-4 w-4" />
                                                    </button>
                                                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteWorkflow(workflow)}>
                                                        <IconTrash className="h-4 w-4" />
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
            )}

            {/* Templates Tab */}
            {activeTab === 'templates' && (
                <div>
                    <div className="mb-6 flex items-center justify-between">
                        <h5 className="text-lg font-semibold">Document Templates</h5>
                        <button type="button" className="btn btn-primary gap-2" onClick={handleUploadTemplate}>
                            <IconPlus />
                            Upload Template
                        </button>
                    </div>
                    <div className="panel">
                        <div className="mb-5 flex items-center justify-between">
                            <select className="form-select w-auto">
                                <option>All Categories</option>
                                <option>Requisition</option>
                                <option>PO</option>
                                <option>Contract</option>
                                <option>Evaluation</option>
                                <option>Legal</option>
                            </select>
                            <input type="text" placeholder="Search templates..." className="form-input w-auto" />
                        </div>
                        <div className="table-responsive">
                            <table className="table-hover">
                                <thead>
                                    <tr>
                                        <th>Template Name</th>
                                        <th>Category</th>
                                        <th>Version</th>
                                        <th>Last Modified</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {templates.map((template) => (
                                        <tr key={template.id}>
                                            <td className="font-semibold">{template.name}</td>
                                            <td>
                                                <span className="badge bg-info">{template.category}</span>
                                            </td>
                                            <td>v{template.version}</td>
                                            <td>{template.lastModified}</td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => handleEditTemplate(template)}>
                                                        <IconPencil className="h-4 w-4" />
                                                    </button>
                                                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteTemplate(template)}>
                                                        <IconTrash className="h-4 w-4" />
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
            )}

            {/* Approval Limits Tab */}
            {activeTab === 'approvals' && (
                <div>
                    <div className="mb-6">
                        <h5 className="text-lg font-semibold">Approval Authority Limits</h5>
                        <p className="text-sm text-white-dark">Configure spending limits for different roles</p>
                    </div>
                    <div className="panel">
                        <div className="table-responsive">
                            <table className="table-hover">
                                <thead>
                                    <tr>
                                        <th>Role</th>
                                        <th>Approval Limit</th>
                                        <th>Currency</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {approvalLimits.map((limit, index) => (
                                        <tr key={index}>
                                            <td className="font-semibold">{limit.role}</td>
                                            <td className="text-lg font-bold text-success">
                                                {limit.limit === 'Unlimited' ? limit.limit : `$${limit.limit.toLocaleString()}`}
                                            </td>
                                            <td>{limit.currency}</td>
                                            <td>
                                                <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => handleEditApprovalLimit(limit.role)}>
                                                    <IconPencil className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Reassign Requests Tab */}
            {activeTab === 'reassign' && <ReassignRequestsTab />}

            {/* General Settings Tab */}
            {activeTab === 'general' && (
                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="panel">
                        <h5 className="mb-4 text-lg font-semibold">Email Notifications</h5>
                        <div className="space-y-4">
                            <label className="flex cursor-pointer items-center">
                                <input 
                                    type="checkbox" 
                                    className="form-checkbox" 
                                    checked={emailNotifications.rfqUpdates}
                                    onChange={(e) => setEmailNotifications({ ...emailNotifications, rfqUpdates: e.target.checked })}
                                />
                                <span className="ml-2 text-white-dark">Request Status Updates</span>
                            </label>
                            <label className="flex cursor-pointer items-center">
                                <input 
                                    type="checkbox" 
                                    className="form-checkbox" 
                                    checked={emailNotifications.quoteSubmissions}
                                    onChange={(e) => setEmailNotifications({ ...emailNotifications, quoteSubmissions: e.target.checked })}
                                />
                                <span className="ml-2 text-white-dark">Offer Submissions</span>
                            </label>
                            <label className="flex cursor-pointer items-center">
                                <input 
                                    type="checkbox" 
                                    className="form-checkbox" 
                                    checked={emailNotifications.approvalRequests}
                                    onChange={(e) => setEmailNotifications({ ...emailNotifications, approvalRequests: e.target.checked })}
                                />
                                <span className="ml-2 text-white-dark">Approval Requests</span>
                            </label>
                            <label className="flex cursor-pointer items-center">
                                <input 
                                    type="checkbox" 
                                    className="form-checkbox" 
                                    checked={emailNotifications.paymentReminders}
                                    onChange={(e) => setEmailNotifications({ ...emailNotifications, paymentReminders: e.target.checked })}
                                />
                                <span className="ml-2 text-white-dark">Payment Reminders</span>
                            </label>
                        </div>
                    </div>

                    <div className="panel">
                        <h5 className="mb-4 text-lg font-semibold">System Preferences</h5>
                        <div className="space-y-4">
                            <div>
                                <label className="mb-2 block">Default Currency</label>
                                <select 
                                    className="form-select"
                                    value={systemPrefs.currency}
                                    onChange={(e) => setSystemPrefs({ ...systemPrefs, currency: e.target.value })}
                                >
                                    <option>USD</option>
                                    <option>EUR</option>
                                    <option>GBP</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-2 block">Date Format</label>
                                <select 
                                    className="form-select"
                                    value={systemPrefs.dateFormat}
                                    onChange={(e) => setSystemPrefs({ ...systemPrefs, dateFormat: e.target.value })}
                                >
                                    <option>YYYY-MM-DD</option>
                                    <option>DD/MM/YYYY</option>
                                    <option>MM/DD/YYYY</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-2 block">Default Request Validity (Days)</label>
                                <input 
                                    type="number" 
                                    className="form-input" 
                                    value={systemPrefs.rfqValidity}
                                    onChange={(e) => setSystemPrefs({ ...systemPrefs, rfqValidity: parseInt(e.target.value) || 30 })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="panel lg:col-span-2">
                        <h5 className="mb-4 text-lg font-semibold">SLA Settings</h5>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div>
                                <label className="mb-2 block">Request Response Time (Days)</label>
                                <input 
                                    type="number" 
                                    className="form-input" 
                                    value={slaSettings.rfqResponse}
                                    onChange={(e) => setSlaSettings({ ...slaSettings, rfqResponse: parseInt(e.target.value) || 7 })}
                                />
                            </div>
                            <div>
                                <label className="mb-2 block">Offer Evaluation Time (Days)</label>
                                <input 
                                    type="number" 
                                    className="form-input" 
                                    value={slaSettings.quoteEvaluation}
                                    onChange={(e) => setSlaSettings({ ...slaSettings, quoteEvaluation: parseInt(e.target.value) || 5 })}
                                />
                            </div>
                            <div>
                                <label className="mb-2 block">Approval Time (Days)</label>
                                <input 
                                    type="number" 
                                    className="form-input" 
                                    value={slaSettings.approval}
                                    onChange={(e) => setSlaSettings({ ...slaSettings, approval: parseInt(e.target.value) || 3 })}
                                />
                            </div>
                            <div>
                                <label className="mb-2 block">PO Processing Time (Days)</label>
                                <input 
                                    type="number" 
                                    className="form-input" 
                                    value={slaSettings.poProcessing}
                                    onChange={(e) => setSlaSettings({ ...slaSettings, poProcessing: parseInt(e.target.value) || 2 })}
                                />
                            </div>
                            <div>
                                <label className="mb-2 block">Payment Processing (Days)</label>
                                <input 
                                    type="number" 
                                    className="form-input" 
                                    value={slaSettings.paymentProcessing}
                                    onChange={(e) => setSlaSettings({ ...slaSettings, paymentProcessing: parseInt(e.target.value) || 30 })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="panel lg:col-span-2">
                        <div className="flex items-center justify-end gap-2">
                            <button type="button" className="btn btn-outline-danger" onClick={handleResetSettings}>
                                Reset to Default
                            </button>
                            <button type="button" className="btn btn-primary" onClick={handleSaveSettings}>
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="panel w-full max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{showModal.title}</h3>
                            <button onClick={closeModal} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div 
                            className={`mb-6 rounded-lg p-4 ${
                                showModal.tone === 'success' ? 'bg-green-100 dark:bg-green-900/30' :
                                showModal.tone === 'danger' ? 'bg-red-100 dark:bg-red-900/30' :
                                'bg-yellow-100 dark:bg-yellow-900/30'
                            }`}
                        >
                            <p className={`${
                                showModal.tone === 'success' ? 'text-green-800 dark:text-green-200' :
                                showModal.tone === 'danger' ? 'text-red-800 dark:text-red-200' :
                                'text-yellow-800 dark:text-yellow-200'
                            }`}>
                                {showModal.message}
                            </p>
                        </div>
                        <div className="flex justify-end">
                            <button onClick={closeModal} className="btn btn-primary">
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSettings;

// Reassign Requests Tab Component
function ReassignRequestsTab() {
    const [requests, setRequests] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string>('');

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const [reqsRes, usersRes] = await Promise.all([
                fetch('http://heron:4000/requests'),
                fetch('http://heron:4000/admin/users')
            ]);
            const reqs = await reqsRes.json();
            const usrs = await usersRes.json();
            setRequests(reqs);
            setUsers(usrs);
        } catch (e) {
            console.error('Failed to load data:', e);
        } finally {
            setLoading(false);
        }
    }

    async function reassignRequest(requestId: number, assigneeId: number | null) {
        try {
            const userProfile = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
            const user = userProfile ? JSON.parse(userProfile) : null;
            
            const res = await fetch(`http://heron:4000/admin/requests/${requestId}/reassign`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': String(user?.id || ''),
                },
                body: JSON.stringify({ assigneeId, comment: 'Manually reassigned by admin', newStatus: selectedStatus || undefined }),
            });

            if (!res.ok) throw new Error('Failed to reassign');
            
            await loadData();
            alert('Request reassigned successfully!');
        } catch (e: any) {
            alert(e?.message || 'Failed to reassign request');
        }
    }

    if (loading) return <div className="panel">Loading...</div>;

    return (
        <div className="panel">
            <h5 className="mb-4 text-lg font-semibold">Reassign Requests</h5>
            <p className="mb-4 text-sm text-white-dark">Click on a request, then click on a user to reassign it</p>
            
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Requests List */}
                <div>
                    <h6 className="mb-3 font-semibold">Requests</h6>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {requests.map((req) => (
                            <div
                                key={req.id}
                                onClick={() => setSelectedRequest(req.id)}
                                className={`cursor-pointer rounded border p-3 hover:bg-primary/10 ${
                                    selectedRequest === req.id ? 'border-primary bg-primary/10' : 'border-white-light dark:border-dark'
                                }`}
                            >
                                <div className="flex justify-between">
                                    <div>
                                        <div className="font-semibold">REQ-{req.id}: {req.title}</div>
                                        <div className="text-xs text-white-dark">
                                            Status: {req.status} | Requester: {req.requester?.name}
                                        </div>
                                    </div>
                                    <div className="text-xs">
                                        {req.currentAssignee ? (
                                            <span className="badge bg-success">{req.currentAssignee.name}</span>
                                        ) : (
                                            <span className="badge bg-danger">Unassigned</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Users List */}
                <div>
                    <h6 className="mb-3 font-semibold">Users {selectedRequest ? '(Click to reassign)' : ''}</h6>
                    {/* Optional status change during reassignment */}
                    <div className="mb-3">
                        <label className="block text-sm mb-1">Set Status (optional)</label>
                        <select
                            className="form-select"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            disabled={!selectedRequest}
                        >
                            <option value="">— No change —</option>
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
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                        {users.map((user) => (
                            <div
                                key={user.id}
                                onClick={() => selectedRequest && reassignRequest(selectedRequest, user.id)}
                                className={`rounded border p-3 ${
                                    selectedRequest
                                        ? 'cursor-pointer hover:bg-success/10 border-white-light dark:border-dark'
                                        : 'opacity-50 cursor-not-allowed border-white-light dark:border-dark'
                                }`}
                            >
                                <div className="font-semibold">{user.name}</div>
                                <div className="text-xs text-white-dark">{user.email}</div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                    {user.roles?.map((role: string) => (
                                        <span key={role} className="badge badge-outline-primary text-xs">{role}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {selectedRequest && (
                            <div
                                onClick={() => selectedRequest && reassignRequest(selectedRequest, null)}
                                className="cursor-pointer rounded border border-danger p-3 hover:bg-danger/10"
                            >
                                <div className="font-semibold text-danger">Unassign (Remove assignee)</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Local sub-component: editable user row with role checkboxes
type FlatUser = { id: number; email: string; name: string; dept: string; roles: string[] };

function UserRow({ user, onSave }: { user: FlatUser; onSave: (userId: number, roles: string[]) => void }) {
    const [localRoles, setLocalRoles] = useState<string[]>(user.roles);
    const [saving, setSaving] = useState(false);
    const changed = useMemo(() => {
        const a = [...localRoles].sort().join(',');
        const b = [...user.roles].sort().join(',');
        return a !== b;
    }, [localRoles, user.roles]);

    function toggleRole(role: string) {
        setLocalRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
    }

    async function handleSave() {
        setSaving(true);
        try {
            await onSave(user.id, localRoles);
        } finally {
            setSaving(false);
        }
    }

    return (
        <tr>
            <td className="font-mono">{user.email}</td>
            <td>{user.name}</td>
            <td>{user.dept}</td>
            <td>
                <div className="flex flex-wrap gap-2">
                    {ADMIN_ROLE_NAMES.map((r) => (
                        <label key={r} className="inline-flex items-center gap-1">
                            <input
                                type="checkbox"
                                className="form-checkbox"
                                checked={localRoles.includes(r)}
                                onChange={() => toggleRole(r)}
                            />
                            <span className="text-xs">{r}</span>
                        </label>
                    ))}
                </div>
            </td>
            <td>
                <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={!changed || saving}>
                    {saving ? 'Saving…' : 'Save'}
                </button>
            </td>
        </tr>
    );
}
