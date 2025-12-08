import { useEffect, useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { getApiUrl } from '../../../config/api';
import { getUser } from '../../../utils/auth';
import IconPlus from '../../../components/Icon/IconPlus';
import IconEdit from '../../../components/Icon/IconEdit';
import IconTrash from '../../../components/Icon/IconTrash';
import IconSearch from '../../../components/Icon/IconSearch';
import IconX from '../../../components/Icon/IconX';
import IconSave from '../../../components/Icon/IconSave';
import IconLoader from '../../../components/Icon/IconLoader';
import IconSquareCheck from '../../../components/Icon/IconSquareCheck';
import IconAlertCircle from '../../../components/Icon/IconAlertCircle';

interface Department {
    id: number;
    name: string;
    code: string;
    description?: string;
    budget?: number;
    parentId?: number;
    createdAt?: string;
}

const DepartmentManagement = () => {
    const dispatch = useDispatch();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: '',
        budget: '',
        parentId: '',
    });

    useEffect(() => {
        dispatch(setPageTitle('Department Management'));
    }, [dispatch]);

    useEffect(() => {
        loadDepartments();
    }, []);

    const loadDepartments = async () => {
        setLoading(true);
        try {
            const res = await fetch(getApiUrl('/api/departments'));
            if (!res.ok) throw new Error('Failed to fetch departments');
            const data = await res.json();
            setDepartments(data);
            setError(null);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredDepartments = useMemo(
        () => departments.filter((dept) => dept.name.toLowerCase().includes(searchTerm.toLowerCase()) || dept.code.toLowerCase().includes(searchTerm.toLowerCase())),
        [departments, searchTerm]
    );

    const handleAddClick = () => {
        setFormData({ name: '', code: '', description: '', budget: '', parentId: '' });
        setEditingId(null);
        setShowForm(true);
    };

    const handleEditClick = (dept: Department) => {
        setFormData({
            name: dept.name,
            code: dept.code,
            description: dept.description || '',
            budget: dept.budget?.toString() || '',
            parentId: dept.parentId?.toString() || '',
        });
        setEditingId(dept.id);
        setShowForm(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.code) {
            setError('Name and code are required');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const currentUser = getUser();
            if (!currentUser?.id) {
                throw new Error('User not authenticated');
            }

            const url = editingId ? `/api/admin/departments/${editingId}` : '/api/admin/departments';
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(getApiUrl(url), {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': String(currentUser.id),
                },
                body: JSON.stringify({
                    name: formData.name,
                    code: formData.code,
                    description: formData.description || undefined,
                    budget: formData.budget ? parseFloat(formData.budget) : undefined,
                    parentId: formData.parentId ? parseInt(formData.parentId) : undefined,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to save department');
            }

            setSuccessMessage(`Department ${editingId ? 'updated' : 'created'} successfully`);
            setShowSuccess(true);
            setShowForm(false);
            setTimeout(() => loadDepartments(), 500);
            setTimeout(() => setShowSuccess(false), 2000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure? This action cannot be undone.')) return;

        try {
            const currentUser = getUser();
            if (!currentUser?.id) {
                throw new Error('User not authenticated');
            }

            const res = await fetch(getApiUrl(`/api/admin/departments/${id}`), {
                method: 'DELETE',
                headers: {
                    'x-user-id': String(currentUser.id),
                },
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to delete department');
            }

            setSuccessMessage('Department deleted successfully');
            setShowSuccess(true);
            await loadDepartments();
            setTimeout(() => setShowSuccess(false), 2000);
        } catch (e: any) {
            setError(e.message);
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Department Management</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Create, edit, and manage organizational departments</p>
                </div>
                <button onClick={handleAddClick} className="btn btn-primary">
                    <IconPlus className="w-5 h-5 mr-2" />
                    Add Department
                </button>
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

            {/* Form Modal */}
            {showForm && (
                <div className="panel">
                    <h2 className="text-xl font-bold mb-4">{editingId ? 'Edit Department' : 'Add New Department'}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-2">Department Name *</label>
                            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-input w-full" placeholder="e.g., Finance" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Code *</label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className="form-input w-full"
                                placeholder="e.g., FIN"
                                maxLength={3}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold mb-2">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="form-textarea w-full"
                                placeholder="Department description"
                                rows={3}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Annual Budget</label>
                            <input type="number" value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} className="form-input w-full" placeholder="0.00" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2">Parent Department</label>
                            <select value={formData.parentId} onChange={(e) => setFormData({ ...formData, parentId: e.target.value })} className="form-select w-full">
                                <option value="">None</option>
                                {departments
                                    .filter((d) => d.id !== editingId)
                                    .map((dept) => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-6">
                        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                            <IconSave className="w-4 h-4 mr-2" />
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => setShowForm(false)} className="btn btn-outline-primary">
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <input type="text" placeholder="Search departments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="form-input pl-10 w-full" />
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>

            {/* List */}
            <div className="grid gap-4">
                {filteredDepartments.length === 0 ? (
                    <div className="panel text-center py-12">
                        <p className="text-gray-500 dark:text-gray-400">No departments found</p>
                    </div>
                ) : (
                    filteredDepartments.map((dept) => (
                        <div key={dept.id} className="panel p-5 flex items-center justify-between">
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 dark:text-white">{dept.name}</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{dept.code}</p>
                                {dept.description && <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{dept.description}</p>}
                                {dept.budget && <p className="text-xs font-semibold text-primary mt-1">Budget: ${dept.budget.toLocaleString()}</p>}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEditClick(dept)} className="btn btn-sm btn-outline-primary">
                                    <IconEdit className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDelete(dept.id)} className="btn btn-sm btn-outline-danger">
                                    <IconTrash className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DepartmentManagement;
