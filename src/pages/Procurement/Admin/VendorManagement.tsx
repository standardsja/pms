import { useEffect, useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { getApiUrl } from '../../../config/api';
import IconLoader from '../../../components/Icon/IconLoader';
import IconSquareCheck from '../../../components/Icon/IconSquareCheck';
import IconAlertCircle from '../../../components/Icon/IconAlertCircle';
import IconSearch from '../../../components/Icon/IconSearch';
import IconPlus from '../../../components/Icon/IconPlus';
import IconEdit from '../../../components/Icon/IconEdit';
import IconTrash from '../../../components/Icon/IconTrash';
import IconX from '../../../components/Icon/IconX';

interface Vendor {
    id: string;
    name: string;
    email: string;
    phone: string;
    category: string;
    location: string;
    rating: number;
    totalOrders: number;
    totalSpent: number;
    status: 'active' | 'inactive' | 'suspended';
    performanceScore: number;
    lastContact: string;
}

const VendorManagement = () => {
    const dispatch = useDispatch();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        category: 'software',
        location: '',
    });

    const categories = ['software', 'hardware', 'services', 'supplies', 'consulting', 'maintenance'];

    useEffect(() => {
        dispatch(setPageTitle('Vendor Management'));
    }, [dispatch]);

    useEffect(() => {
        loadVendors();
    }, []);

    const loadVendors = async () => {
        setLoading(true);
        try {
            const response = await fetch(getApiUrl('/api/suppliers'));
            if (response.ok) {
                const data = await response.json();
                const vendors = Array.isArray(data) ? data : data.data || data.suppliers || [];
                setVendors(vendors);
                setError('');
            } else {
                throw new Error('Failed to load vendors');
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredVendors = useMemo(() => {
        return vendors.filter((vendor) => {
            const matchesSearch = !searchTerm || vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) || vendor.email.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = filterStatus === 'all' || vendor.status === filterStatus;
            const matchesCategory = filterCategory === 'all' || vendor.category === filterCategory;
            return matchesSearch && matchesStatus && matchesCategory;
        });
    }, [vendors, searchTerm, filterStatus, filterCategory]);

    const handleAddVendor = () => {
        setEditingVendor(null);
        setFormData({
            name: '',
            email: '',
            phone: '',
            category: 'software',
            location: '',
        });
        setShowForm(true);
    };

    const handleEditVendor = (vendor: Vendor) => {
        setEditingVendor(vendor);
        setFormData({
            name: vendor.name,
            email: vendor.email,
            phone: vendor.phone,
            category: vendor.category,
            location: vendor.location,
        });
        setShowForm(true);
    };

    const handleSaveVendor = async () => {
        if (!formData.name || !formData.email) {
            setError('Name and email are required');
            return;
        }

        setProcessing(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 800));

            if (editingVendor) {
                setVendors(
                    vendors.map((v) =>
                        v.id === editingVendor.id
                            ? {
                                  ...v,
                                  ...formData,
                              }
                            : v
                    )
                );
                setSuccess('Vendor updated successfully');
            } else {
                setVendors([
                    ...vendors,
                    {
                        id: Date.now().toString(),
                        ...formData,
                        rating: 3.5,
                        totalOrders: 0,
                        totalSpent: 0,
                        status: 'active' as const,
                        performanceScore: 50,
                        lastContact: new Date().toISOString().split('T')[0],
                    },
                ]);
                setSuccess('Vendor created successfully');
            }

            setShowForm(false);
            setTimeout(() => setSuccess(''), 2000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleDeleteVendor = async (id: string) => {
        if (!confirm('Delete this vendor?')) return;

        setProcessing(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 600));
            setVendors(vendors.filter((v) => v.id !== id));
            setSuccess('Vendor deleted successfully');
            setTimeout(() => setSuccess(''), 2000);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setProcessing(false);
        }
    };

    const getStatusBadgeClass = (status: Vendor['status']) => {
        const classes = {
            active: 'badge-success',
            inactive: 'badge-secondary',
            suspended: 'badge-danger',
        };
        return classes[status];
    };

    const getPerformanceColor = (score: number) => {
        if (score >= 90) return 'text-green-600 dark:text-green-400';
        if (score >= 75) return 'text-yellow-600 dark:text-yellow-400';
        if (score >= 60) return 'text-orange-600 dark:text-orange-400';
        return 'text-red-600 dark:text-red-400';
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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Vendor Management</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Manage vendor registry, performance, and communications</p>
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

            {/* Form Modal */}
            {showForm && (
                <div className="panel bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/40">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold">{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</h2>
                        <button onClick={() => setShowForm(false)}>
                            <IconX className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="space-y-4">
                        <input type="text" placeholder="Vendor Name *" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="form-input w-full" />
                        <input type="email" placeholder="Email *" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="form-input w-full" />
                        <input type="tel" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="form-input w-full" />
                        <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="form-select w-full">
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                </option>
                            ))}
                        </select>
                        <input type="text" placeholder="Location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="form-input w-full" />
                        <div className="flex gap-2">
                            <button onClick={handleSaveVendor} disabled={processing} className="btn btn-primary">
                                {processing ? 'Saving...' : 'Save Vendor'}
                            </button>
                            <button onClick={() => setShowForm(false)} className="btn btn-outline">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="panel p-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700/40">
                    <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Total Vendors</p>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-2">{vendors.length}</p>
                </div>
                <div className="panel p-5 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700/40">
                    <p className="text-sm font-semibold text-green-700 dark:text-green-300">Active</p>
                    <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-2">{vendors.filter((v) => v.status === 'active').length}</p>
                </div>
                <div className="panel p-5 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-700/40">
                    <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">Total Spent</p>
                    <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100 mt-2">${(vendors.reduce((sum, v) => sum + v.totalSpent, 0) / 1000).toFixed(0)}K</p>
                </div>
                <div className="panel p-5 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700/40">
                    <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">Avg Rating</p>
                    <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-2">{(vendors.reduce((sum, v) => sum + v.rating, 0) / vendors.length).toFixed(1)}⭐</p>
                </div>
            </div>

            {/* Filters and Search */}
            <div className="flex gap-4 items-end flex-wrap">
                <div className="flex-1 min-w-xs relative">
                    <input type="text" placeholder="Search vendors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="form-input pl-10 w-full" />
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                </div>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="form-select">
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                </select>
                <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="form-select">
                    <option value="all">All Categories</option>
                    {categories.map((cat) => (
                        <option key={cat} value={cat}>
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                    ))}
                </select>
                <button onClick={handleAddVendor} className="btn btn-primary">
                    <IconPlus className="w-4 h-4 mr-2" />
                    Add Vendor
                </button>
            </div>

            {/* Vendors List */}
            <div className="space-y-3">
                {filteredVendors.length === 0 ? (
                    <div className="panel text-center py-12">
                        <p className="text-gray-500 dark:text-gray-400">No vendors found</p>
                    </div>
                ) : (
                    filteredVendors.map((vendor) => (
                        <div key={vendor.id} className="panel p-5 border-l-4 border-l-blue-500">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{vendor.name}</h3>
                                        <span className={`badge ${getStatusBadgeClass(vendor.status)}`}>{vendor.status}</span>
                                        <span className={`badge badge-outline font-semibold ${getPerformanceColor(vendor.performanceScore)}`}>Score: {vendor.performanceScore}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{vendor.email}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{vendor.phone}</p>

                                    <div className="grid grid-cols-4 gap-4 mt-4 p-3 bg-gray-50 dark:bg-gray-900/20 rounded">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Category</p>
                                            <p className="font-semibold text-sm">{vendor.category}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Orders</p>
                                            <p className="font-semibold text-sm">{vendor.totalOrders}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Total Spent</p>
                                            <p className="font-semibold text-sm">${(vendor.totalSpent / 1000).toFixed(0)}K</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Rating</p>
                                            <p className="font-semibold text-sm">{vendor.rating}⭐</p>
                                        </div>
                                    </div>

                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Last contact: {new Date(vendor.lastContact).toLocaleDateString()}</p>
                                </div>

                                <div className="flex gap-2 flex-shrink-0">
                                    <button onClick={() => handleEditVendor(vendor)} className="btn btn-sm btn-outline-primary">
                                        <IconEdit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDeleteVendor(vendor.id)} className="btn btn-sm btn-outline-danger">
                                        <IconTrash className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default VendorManagement;
