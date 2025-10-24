import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconSettings from '../../../components/Icon/IconSettings';
import IconFile from '../../../components/Icon/IconFile';
import IconPlus from '../../../components/Icon/IconPlus';
import IconPencil from '../../../components/Icon/IconPencil';
import IconTrash from '../../../components/Icon/IconTrash';

const AdminSettings = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Admin Settings'));
    });

    const [activeTab, setActiveTab] = useState('workflows');

    // Modal states
    const [showModal, setShowModal] = useState<{ open: boolean; title: string; message: string; tone: 'success' | 'warning' | 'danger' }>(
        { open: false, title: '', message: '', tone: 'success' }
    );

    const openModal = (tone: 'success' | 'warning' | 'danger', title: string, message: string) => 
        setShowModal({ open: true, title, message, tone });
    const closeModal = () => setShowModal({ open: false, title: '', message: '', tone: 'success' });

    // Email notifications state
    const [emailNotifications, setEmailNotifications] = useState({
        rfqUpdates: true,
        quoteSubmissions: true,
        approvalRequests: true,
        paymentReminders: false,
    });

    // System preferences state
    const [systemPrefs, setSystemPrefs] = useState({
        currency: 'USD',
        dateFormat: 'YYYY-MM-DD',
        rfqValidity: 30,
    });

    // SLA settings state
    const [slaSettings, setSlaSettings] = useState({
        rfqResponse: 7,
        quoteEvaluation: 5,
        approval: 3,
        poProcessing: 2,
        paymentProcessing: 30,
    });

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
        { id: 1, name: 'RFQ Template - Standard', category: 'RFQ', version: '2.1', lastModified: '2024-10-22' },
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
                                <option>RFQ</option>
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
                                <span className="ml-2 text-white-dark">RFQ Status Updates</span>
                            </label>
                            <label className="flex cursor-pointer items-center">
                                <input 
                                    type="checkbox" 
                                    className="form-checkbox" 
                                    checked={emailNotifications.quoteSubmissions}
                                    onChange={(e) => setEmailNotifications({ ...emailNotifications, quoteSubmissions: e.target.checked })}
                                />
                                <span className="ml-2 text-white-dark">Quote Submissions</span>
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
                                <label className="mb-2 block">Default RFQ Validity (Days)</label>
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
                                <label className="mb-2 block">RFQ Response Time (Days)</label>
                                <input 
                                    type="number" 
                                    className="form-input" 
                                    value={slaSettings.rfqResponse}
                                    onChange={(e) => setSlaSettings({ ...slaSettings, rfqResponse: parseInt(e.target.value) || 7 })}
                                />
                            </div>
                            <div>
                                <label className="mb-2 block">Quote Evaluation Time (Days)</label>
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
