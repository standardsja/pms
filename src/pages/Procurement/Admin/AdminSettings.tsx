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
                        <button type="button" className="btn btn-primary gap-2">
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
                                                    <button type="button" className="btn btn-sm btn-outline-primary">
                                                        <IconPencil className="h-4 w-4" />
                                                    </button>
                                                    <button type="button" className="btn btn-sm btn-outline-danger">
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
                        <button type="button" className="btn btn-primary gap-2">
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
                                                    <button type="button" className="btn btn-sm btn-outline-primary">
                                                        <IconPencil className="h-4 w-4" />
                                                    </button>
                                                    <button type="button" className="btn btn-sm btn-outline-danger">
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
                                                <button type="button" className="btn btn-sm btn-outline-primary">
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
                                <input type="checkbox" className="form-checkbox" defaultChecked />
                                <span className="ml-2 text-white-dark">RFQ Status Updates</span>
                            </label>
                            <label className="flex cursor-pointer items-center">
                                <input type="checkbox" className="form-checkbox" defaultChecked />
                                <span className="ml-2 text-white-dark">Quote Submissions</span>
                            </label>
                            <label className="flex cursor-pointer items-center">
                                <input type="checkbox" className="form-checkbox" defaultChecked />
                                <span className="ml-2 text-white-dark">Approval Requests</span>
                            </label>
                            <label className="flex cursor-pointer items-center">
                                <input type="checkbox" className="form-checkbox" />
                                <span className="ml-2 text-white-dark">Payment Reminders</span>
                            </label>
                        </div>
                    </div>

                    <div className="panel">
                        <h5 className="mb-4 text-lg font-semibold">System Preferences</h5>
                        <div className="space-y-4">
                            <div>
                                <label className="mb-2 block">Default Currency</label>
                                <select className="form-select">
                                    <option>USD</option>
                                    <option>EUR</option>
                                    <option>GBP</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-2 block">Date Format</label>
                                <select className="form-select">
                                    <option>YYYY-MM-DD</option>
                                    <option>DD/MM/YYYY</option>
                                    <option>MM/DD/YYYY</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-2 block">Default RFQ Validity (Days)</label>
                                <input type="number" className="form-input" defaultValue={30} />
                            </div>
                        </div>
                    </div>

                    <div className="panel lg:col-span-2">
                        <h5 className="mb-4 text-lg font-semibold">SLA Settings</h5>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <div>
                                <label className="mb-2 block">RFQ Response Time (Days)</label>
                                <input type="number" className="form-input" defaultValue={7} />
                            </div>
                            <div>
                                <label className="mb-2 block">Quote Evaluation Time (Days)</label>
                                <input type="number" className="form-input" defaultValue={5} />
                            </div>
                            <div>
                                <label className="mb-2 block">Approval Time (Days)</label>
                                <input type="number" className="form-input" defaultValue={3} />
                            </div>
                            <div>
                                <label className="mb-2 block">PO Processing Time (Days)</label>
                                <input type="number" className="form-input" defaultValue={2} />
                            </div>
                            <div>
                                <label className="mb-2 block">Payment Processing (Days)</label>
                                <input type="number" className="form-input" defaultValue={30} />
                            </div>
                        </div>
                    </div>

                    <div className="panel lg:col-span-2">
                        <div className="flex items-center justify-end gap-2">
                            <button type="button" className="btn btn-outline-danger">
                                Reset to Default
                            </button>
                            <button type="button" className="btn btn-primary">
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSettings;
