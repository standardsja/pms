import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { getApiUrl } from '../../../config/api';
import IconLoader from '../../../components/Icon/IconLoader';
import IconSquareCheck from '../../../components/Icon/IconSquareCheck';
import IconAlertCircle from '../../../components/Icon/IconAlertCircle';
import IconX from '../../../components/Icon/IconX';
import IconEdit from '../../../components/Icon/IconEdit';
import IconPlus from '../../../components/Icon/IconPlus';
import IconTrash from '../../../components/Icon/IconTrash';

interface WorkflowStatus {
    id: string;
    name: string;
    code: string;
    description: string;
    color: string;
    order: number;
    requiresApproval: boolean;
    allowsTransition: string[];
}

interface WorkflowSLA {
    fromStatus: string;
    toStatus: string;
    hours: number;
}

const RequestWorkflowConfiguration = () => {
    const dispatch = useDispatch();
    const [statuses, setStatuses] = useState<WorkflowStatus[]>([
        {
            id: '1',
            name: 'Draft',
            code: 'DRAFT',
            description: 'Initial request draft',
            color: 'gray',
            order: 1,
            requiresApproval: false,
            allowsTransition: ['SUBMITTED', 'REJECTED'],
        },
        {
            id: '2',
            name: 'Submitted',
            code: 'SUBMITTED',
            description: 'Submitted for review',
            color: 'blue',
            order: 2,
            requiresApproval: true,
            allowsTransition: ['APPROVED', 'REJECTED'],
        },
        {
            id: '3',
            name: 'Approved',
            code: 'APPROVED',
            description: 'Approved by manager',
            color: 'green',
            order: 3,
            requiresApproval: false,
            allowsTransition: ['PROCESSING', 'CANCELLED'],
        },
        {
            id: '4',
            name: 'Rejected',
            code: 'REJECTED',
            description: 'Rejected by reviewer',
            color: 'red',
            order: 4,
            requiresApproval: false,
            allowsTransition: ['DRAFT'],
        },
    ]);

    const [slas, setSlas] = useState<WorkflowSLA[]>([
        { fromStatus: 'SUBMITTED', toStatus: 'APPROVED', hours: 48 },
        { fromStatus: 'DRAFT', toStatus: 'SUBMITTED', hours: 72 },
    ]);

    const [loading, setLoading] = useState(false);
    const [showStatusForm, setShowStatusForm] = useState(false);
    const [showSLAForm, setShowSLAForm] = useState(false);
    const [editingStatus, setEditingStatus] = useState<WorkflowStatus | null>(null);
    const [editingSLA, setEditingSLA] = useState<WorkflowSLA | null>(null);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        color: 'blue',
        requiresApproval: false,
        allowsTransition: [] as string[],
    });

    const [slaData, setSLAData] = useState({
        fromStatus: '',
        toStatus: '',
        hours: 48,
    });

    useEffect(() => {
        dispatch(setPageTitle('Request Workflow Configuration'));
        loadWorkflowConfig();
    }, [dispatch]);

    const loadWorkflowConfig = async () => {
        setLoading(true);
        try {
            const [statusRes, slaRes] = await Promise.all([fetch(getApiUrl('/api/admin/workflow-statuses')).catch(() => null), fetch(getApiUrl('/api/admin/workflow-slas')).catch(() => null)]);

            if (statusRes?.ok) {
                const data = await statusRes.json();
                const statuses = Array.isArray(data) ? data : data.data || [];
                setStatuses(statuses);
            } else {
                console.warn('Failed to load workflow statuses');
            }

            if (slaRes?.ok) {
                const data = await slaRes.json();
                const slaData = Array.isArray(data) ? data : data.data || [];
                setSlas(slaData);
            } else {
                console.warn('Failed to load workflow SLAs');
            }
        } catch (e: any) {
            console.error('Error loading workflow config:', e.message);
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddStatus = () => {
        setEditingStatus(null);
        setFormData({
            name: '',
            code: '',
            description: '',
            color: 'blue',
            requiresApproval: false,
            allowsTransition: [],
        });
        setShowStatusForm(true);
    };

    const handleEditStatus = (status: WorkflowStatus) => {
        setEditingStatus(status);
        setFormData({
            name: status.name,
            code: status.code,
            description: status.description,
            color: status.color,
            requiresApproval: status.requiresApproval,
            allowsTransition: status.allowsTransition,
        });
        setShowStatusForm(true);
    };

    const handleSaveStatus = async () => {
        if (!formData.name || !formData.code) {
            setError('Name and code are required');
            return;
        }

        setLoading(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 600));

            if (editingStatus) {
                setStatuses(statuses.map((s) => (s.id === editingStatus.id ? { ...editingStatus, ...formData } : s)));
                setSuccess('Status updated successfully');
            } else {
                setStatuses([
                    ...statuses,
                    {
                        id: Date.now().toString(),
                        ...formData,
                        order: statuses.length + 1,
                    },
                ]);
                setSuccess('Status created successfully');
            }

            setShowStatusForm(false);
            setTimeout(() => setSuccess(''), 2000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteStatus = async (id: string) => {
        if (!confirm('Delete this status? Requests using it may be affected.')) return;

        setLoading(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 600));
            setStatuses(statuses.filter((s) => s.id !== id));
            setSuccess('Status deleted successfully');
            setTimeout(() => setSuccess(''), 2000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSLA = () => {
        setEditingSLA(null);
        setSLAData({
            fromStatus: '',
            toStatus: '',
            hours: 48,
        });
        setShowSLAForm(true);
    };

    const handleSaveSLA = async () => {
        if (!slaData.fromStatus || !slaData.toStatus) {
            setError('Both statuses are required');
            return;
        }

        setLoading(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 600));

            if (editingSLA) {
                setSlas(slas.map((s) => (s.fromStatus === editingSLA.fromStatus && s.toStatus === editingSLA.toStatus ? slaData : s)));
                setSuccess('SLA updated successfully');
            } else {
                setSlas([...slas, slaData]);
                setSuccess('SLA created successfully');
            }

            setShowSLAForm(false);
            setTimeout(() => setSuccess(''), 2000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSLA = async (from: string, to: string) => {
        if (!confirm('Delete this SLA?')) return;

        setLoading(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 600));
            setSlas(slas.filter((s) => !(s.fromStatus === from && s.toStatus === to)));
            setSuccess('SLA deleted successfully');
            setTimeout(() => setSuccess(''), 2000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusDisplay = (code: string) => {
        return statuses.find((s) => s.code === code)?.name || code;
    };

    const colorOptions = ['gray', 'blue', 'green', 'red', 'yellow', 'purple', 'pink', 'indigo'];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Request Workflow Configuration</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Configure request statuses, transitions, and SLAs</p>
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

            {/* Status Form Modal */}
            {showStatusForm && (
                <div className="panel bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/40">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold">{editingStatus ? 'Edit Status' : 'Add New Status'}</h2>
                        <button onClick={() => setShowStatusForm(false)}>
                            <IconX className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="space-y-4">
                        <input type="text" placeholder="Status Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-input w-full" />
                        <input
                            type="text"
                            placeholder="Status Code (e.g., APPROVED)"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                            className="form-input w-full"
                        />
                        <textarea
                            placeholder="Description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="form-textarea w-full"
                            rows={2}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-2">Color</label>
                                <select value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="form-select w-full">
                                    {colorOptions.map((c) => (
                                        <option key={c} value={c}>
                                            {c.charAt(0).toUpperCase() + c.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.requiresApproval}
                                        onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                                        className="form-checkbox"
                                    />
                                    <span className="text-sm font-semibold">Requires Approval</span>
                                </label>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleSaveStatus} disabled={loading} className="btn btn-primary">
                                {loading ? 'Saving...' : 'Save Status'}
                            </button>
                            <button onClick={() => setShowStatusForm(false)} className="btn btn-outline">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SLA Form Modal */}
            {showSLAForm && (
                <div className="panel bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700/40">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold">{editingSLA ? 'Edit SLA' : 'Add New SLA'}</h2>
                        <button onClick={() => setShowSLAForm(false)}>
                            <IconX className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold mb-2">From Status</label>
                                <select value={slaData.fromStatus} onChange={(e) => setSLAData({ ...slaData, fromStatus: e.target.value })} className="form-select w-full">
                                    <option value="">Select status</option>
                                    {statuses.map((s) => (
                                        <option key={s.id} value={s.code}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2">To Status</label>
                                <select value={slaData.toStatus} onChange={(e) => setSLAData({ ...slaData, toStatus: e.target.value })} className="form-select w-full">
                                    <option value="">Select status</option>
                                    {statuses.map((s) => (
                                        <option key={s.id} value={s.code}>
                                            {s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <input
                            type="number"
                            placeholder="Hours"
                            value={slaData.hours}
                            onChange={(e) => setSLAData({ ...slaData, hours: parseInt(e.target.value) })}
                            className="form-input w-full"
                            min="1"
                        />
                        <div className="flex gap-2">
                            <button onClick={handleSaveSLA} disabled={loading} className="btn btn-primary">
                                {loading ? 'Saving...' : 'Save SLA'}
                            </button>
                            <button onClick={() => setShowSLAForm(false)} className="btn btn-outline">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Workflow Statuses */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Workflow Statuses</h2>
                    <button onClick={handleAddStatus} className="btn btn-primary btn-sm">
                        <IconPlus className="w-4 h-4 mr-2" />
                        Add Status
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {statuses.map((status) => (
                        <div key={status.id} className="panel p-4 border-l-4 border-l-blue-500">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-bold text-lg">{status.name}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{status.code}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{status.description}</p>
                                    <div className="flex gap-2 mt-3">
                                        {status.requiresApproval && <span className="badge badge-warning text-xs">Requires Approval</span>}
                                        <span className={`badge text-xs bg-${status.color}-100 text-${status.color}-800`}>{status.color}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEditStatus(status)} className="btn btn-sm btn-outline-primary">
                                        <IconEdit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDeleteStatus(status.id)} className="btn btn-sm btn-outline-danger">
                                        <IconTrash className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* SLA Configuration */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">SLA Configuration</h2>
                    <button onClick={handleAddSLA} className="btn btn-primary btn-sm">
                        <IconPlus className="w-4 h-4 mr-2" />
                        Add SLA
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                                <th className="px-4 py-3 text-left font-semibold">From Status</th>
                                <th className="px-4 py-3 text-left font-semibold">To Status</th>
                                <th className="px-4 py-3 text-left font-semibold">SLA Hours</th>
                                <th className="px-4 py-3 text-left font-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {slas.map((sla, idx) => (
                                <tr key={idx} className="border-b border-gray-100 dark:border-gray-800">
                                    <td className="px-4 py-3">{getStatusDisplay(sla.fromStatus)}</td>
                                    <td className="px-4 py-3">{getStatusDisplay(sla.toStatus)}</td>
                                    <td className="px-4 py-3">
                                        <span className="badge badge-info">{sla.hours}h</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setEditingSLA(sla);
                                                    setSLAData(sla);
                                                    setShowSLAForm(true);
                                                }}
                                                className="btn btn-sm btn-outline-primary"
                                            >
                                                <IconEdit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeleteSLA(sla.fromStatus, sla.toStatus)} className="btn btn-sm btn-outline-danger">
                                                <IconTrash className="w-4 h-4" />
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
    );
};

export default RequestWorkflowConfiguration;
