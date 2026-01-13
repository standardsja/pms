import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import adminService from '../../../services/adminService';
import IconLoader from '../../../components/Icon/IconLoader';
import IconSquareCheck from '../../../components/Icon/IconSquareCheck';
import IconAlertCircle from '../../../components/Icon/IconAlertCircle';
import IconX from '../../../components/Icon/IconX';
import IconEdit from '../../../components/Icon/IconEdit';
import IconPlus from '../../../components/Icon/IconPlus';
import IconTrash from '../../../components/Icon/IconTrash';

interface WorkflowStatus {
    id: number;
    statusId: string;
    name: string;
    description?: string | null;
    color: string;
    icon?: string | null;
    displayOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

interface WorkflowSLA {
    id: number;
    slaId: string;
    name: string;
    description?: string | null;
    fromStatus: string;
    toStatus: string;
    slaHours: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

const RequestWorkflowConfiguration = () => {
    const dispatch = useDispatch();
    const [statuses, setStatuses] = useState<WorkflowStatus[]>([]);
    const [slas, setSlas] = useState<WorkflowSLA[]>([]);

    const [loading, setLoading] = useState(false);
    const [showStatusForm, setShowStatusForm] = useState(false);
    const [showSLAForm, setShowSLAForm] = useState(false);
    const [editingStatus, setEditingStatus] = useState<WorkflowStatus | null>(null);
    const [editingSLA, setEditingSLA] = useState<WorkflowSLA | null>(null);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        statusId: '',
        name: '',
        description: '',
        color: '#3B82F6',
        icon: '',
        displayOrder: 0,
    });

    const [slaData, setSLAData] = useState({
        slaId: '',
        name: '',
        description: '',
        fromStatus: '',
        toStatus: '',
        slaHours: 48,
    });

    useEffect(() => {
        dispatch(setPageTitle('Request Workflow Configuration'));
        loadWorkflowConfig();
    }, [dispatch]);

    const loadWorkflowConfig = async () => {
        setLoading(true);
        try {
            const [statusesData, slasData] = await Promise.all([adminService.getWorkflowStatuses(), adminService.getWorkflowSLAs()]);

            setStatuses(Array.isArray(statusesData) ? statusesData : []);
            setSlas(Array.isArray(slasData) ? slasData : []);
            setError('');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddStatus = () => {
        setEditingStatus(null);
        setFormData({
            statusId: '',
            name: '',
            description: '',
            color: '#3B82F6',
            icon: '',
            displayOrder: statuses.length,
        });
        setShowStatusForm(true);
    };

    const handleEditStatus = (status: WorkflowStatus) => {
        setEditingStatus(status);
        setFormData({
            statusId: status.statusId,
            name: status.name,
            description: status.description || '',
            color: status.color,
            icon: status.icon || '',
            displayOrder: status.displayOrder,
        });
        setShowStatusForm(true);
    };

    const handleSaveStatus = async () => {
        if (!formData.name || !formData.statusId) {
            setError('Name and Status ID are required');
            return;
        }

        setLoading(true);
        try {
            if (editingStatus) {
                const updated = await adminService.updateWorkflowStatus(editingStatus.id, {
                    name: formData.name,
                    description: formData.description,
                    color: formData.color,
                    icon: formData.icon,
                    displayOrder: formData.displayOrder,
                });
                setStatuses(statuses.map((s) => (s.id === editingStatus.id ? { ...s, ...updated } : s)));
                setSuccess('Status updated successfully');
            } else {
                const created = await adminService.createWorkflowStatus({
                    statusId: formData.statusId,
                    name: formData.name,
                    description: formData.description,
                    color: formData.color,
                    icon: formData.icon,
                    displayOrder: formData.displayOrder,
                });
                setStatuses([...statuses, created]);
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

    const handleDeleteStatus = async (id: number) => {
        if (!confirm('Delete this status? Requests using it may be affected.')) return;

        setLoading(true);
        try {
            await adminService.deleteWorkflowStatus(id);
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
            slaId: '',
            name: '',
            description: '',
            fromStatus: '',
            toStatus: '',
            slaHours: 48,
        });
        setShowSLAForm(true);
    };

    const handleSaveSLA = async () => {
        if (!slaData.name || !slaData.fromStatus || !slaData.toStatus || !slaData.slaHours) {
            setError('All fields are required');
            return;
        }

        setLoading(true);
        try {
            if (editingSLA) {
                const updated = await adminService.updateWorkflowSLA(editingSLA.id, {
                    name: slaData.name,
                    description: slaData.description,
                    fromStatus: slaData.fromStatus,
                    toStatus: slaData.toStatus,
                    slaHours: slaData.slaHours,
                });
                setSlas(slas.map((s) => (s.id === editingSLA.id ? { ...s, ...updated } : s)));
                setSuccess('SLA updated successfully');
            } else {
                const created = await adminService.createWorkflowSLA({
                    slaId: slaData.slaId || `${slaData.fromStatus}-${slaData.toStatus}`,
                    name: slaData.name,
                    description: slaData.description,
                    fromStatus: slaData.fromStatus,
                    toStatus: slaData.toStatus,
                    slaHours: slaData.slaHours,
                });
                setSlas([...slas, created]);
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

    const handleDeleteSLA = async (id: number) => {
        if (!confirm('Delete this SLA?')) return;

        setLoading(true);
        try {
            await adminService.deleteWorkflowSLA(id);
            setSlas(slas.filter((s) => s.id !== id));
            setSuccess('SLA deleted successfully');
            setTimeout(() => setSuccess(''), 2000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusDisplay = (statusId: string) => {
        return statuses.find((s) => s.statusId === statusId)?.name || statusId;
    };

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

            {loading && statuses.length === 0 && (
                <div className="flex items-center justify-center py-12">
                    <IconLoader className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="ml-2 text-gray-600 dark:text-gray-400">Loading configuration...</span>
                </div>
            )}

            {!loading && (
                <>
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
                                <input
                                    type="text"
                                    placeholder="Status ID (e.g., SUBMITTED)"
                                    value={formData.statusId}
                                    onChange={(e) => setFormData({ ...formData, statusId: e.target.value.toUpperCase() })}
                                    disabled={!!editingStatus}
                                    className="form-input w-full"
                                />
                                <input type="text" placeholder="Status Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-input w-full" />
                                <textarea
                                    placeholder="Description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="form-textarea w-full"
                                    rows={2}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold mb-2">Color (Hex)</label>
                                        <input
                                            type="text"
                                            placeholder="#3B82F6"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            className="form-input w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-2">Display Order</label>
                                        <input
                                            type="number"
                                            value={formData.displayOrder}
                                            onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
                                            className="form-input w-full"
                                            min="0"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold mb-2">Icon</label>
                                    <input
                                        type="text"
                                        placeholder="Icon name or emoji"
                                        value={formData.icon}
                                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                                        className="form-input w-full"
                                    />
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
                                <input type="text" placeholder="SLA ID" value={slaData.slaId} onChange={(e) => setSLAData({ ...slaData, slaId: e.target.value })} className="form-input w-full" />
                                <input type="text" placeholder="SLA Name" value={slaData.name} onChange={(e) => setSLAData({ ...slaData, name: e.target.value })} className="form-input w-full" />
                                <textarea
                                    placeholder="Description"
                                    value={slaData.description}
                                    onChange={(e) => setSLAData({ ...slaData, description: e.target.value })}
                                    className="form-textarea w-full"
                                    rows={2}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold mb-2">From Status</label>
                                        <select value={slaData.fromStatus} onChange={(e) => setSLAData({ ...slaData, fromStatus: e.target.value })} className="form-select w-full">
                                            <option value="">Select status</option>
                                            {statuses.map((s) => (
                                                <option key={s.id} value={s.statusId}>
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
                                                <option key={s.id} value={s.statusId}>
                                                    {s.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <input
                                    type="number"
                                    placeholder="Hours"
                                    value={slaData.slaHours}
                                    onChange={(e) => setSLAData({ ...slaData, slaHours: parseInt(e.target.value) })}
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
                                <div key={status.id} className="panel p-4 border-l-4" style={{ borderLeftColor: status.color }}>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-bold text-lg">{status.name}</h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{status.statusId}</p>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{status.description}</p>
                                            <div className="flex gap-2 mt-3">
                                                <span className="badge text-xs" style={{ backgroundColor: status.color + '20', color: status.color }}>
                                                    Order: {status.displayOrder}
                                                </span>
                                                {status.icon && <span className="badge text-xs">{status.icon}</span>}
                                                {!status.isActive && <span className="badge badge-danger text-xs">Inactive</span>}
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
                                        <th className="px-4 py-3 text-left font-semibold">Name</th>
                                        <th className="px-4 py-3 text-left font-semibold">From Status</th>
                                        <th className="px-4 py-3 text-left font-semibold">To Status</th>
                                        <th className="px-4 py-3 text-left font-semibold">SLA Hours</th>
                                        <th className="px-4 py-3 text-left font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {slas.map((sla) => (
                                        <tr key={sla.id} className="border-b border-gray-100 dark:border-gray-800">
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-semibold">{sla.name}</p>
                                                    {sla.description && <p className="text-xs text-gray-500 dark:text-gray-400">{sla.description}</p>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">{getStatusDisplay(sla.fromStatus)}</td>
                                            <td className="px-4 py-3">{getStatusDisplay(sla.toStatus)}</td>
                                            <td className="px-4 py-3">
                                                <span className="badge badge-info">{sla.slaHours}h</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingSLA(sla);
                                                            setSLAData({
                                                                slaId: sla.slaId,
                                                                name: sla.name,
                                                                description: sla.description || '',
                                                                fromStatus: sla.fromStatus,
                                                                toStatus: sla.toStatus,
                                                                slaHours: sla.slaHours,
                                                            });
                                                            setShowSLAForm(true);
                                                        }}
                                                        className="btn btn-sm btn-outline-primary"
                                                    >
                                                        <IconEdit className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteSLA(sla.id)} className="btn btn-sm btn-outline-danger">
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
                </>
            )}
        </div>
    );
};

export default RequestWorkflowConfiguration;
