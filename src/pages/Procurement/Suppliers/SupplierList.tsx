import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconPlus from '../../../components/Icon/IconPlus';
import IconEye from '../../../components/Icon/IconEye';
import IconPencil from '../../../components/Icon/IconPencil';
import IconUser from '../../../components/Icon/IconUser';
import IconPhone from '../../../components/Icon/IconPhone';
import IconMail from '../../../components/Icon/IconMail';

const SupplierList = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Supplier Management'));
    });

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch suppliers from API
    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            const userId = localStorage.getItem('userId');

            const response = await fetch('http://localhost:4000/api/suppliers', {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'x-user-id': userId || '',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch suppliers');
            }

            const data = await response.json();
            setSuppliers(data);
        } catch (err) {
            console.error('Error fetching suppliers:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const filteredSuppliers = suppliers.filter((supplier) => {
        const matchesSearch =
            supplier.name.toLowerCase().includes(search.toLowerCase()) || supplier.contact.toLowerCase().includes(search.toLowerCase()) || supplier.email.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || supplier.status === statusFilter;
        const matchesCategory = categoryFilter === 'all' || supplier.category === categoryFilter;
        return matchesSearch && matchesStatus && matchesCategory;
    });

    const getStatusBadge = (status: string) => {
        return status === 'Active' ? 'bg-success' : 'bg-danger';
    };

    const renderStars = (rating: number) => {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const stars = [];

        for (let i = 0; i < fullStars; i++) {
            stars.push(
                <span key={`full-${i}`} className="text-warning">
                    ★
                </span>
            );
        }
        if (hasHalfStar) {
            stars.push(
                <span key="half" className="text-warning">
                    ★
                </span>
            );
        }
        const emptyStars = 5 - stars.length;
        for (let i = 0; i < emptyStars; i++) {
            stars.push(
                <span key={`empty-${i}`} className="text-gray-400">
                    ★
                </span>
            );
        }
        return stars;
    };

    const stats = {
        total: suppliers.length,
        active: suppliers.filter((s) => s.status === 'Active').length,
        inactive: suppliers.filter((s) => s.status === 'Inactive').length,
        totalSpend: suppliers.reduce((sum, s) => sum + s.totalSpend, 0),
    };

    const categories = [...new Set(suppliers.map((s) => s.category))];

    if (loading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-l-transparent"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="panel">
                <div className="py-8 text-center">
                    <div className="mb-4 text-danger">Error loading suppliers</div>
                    <p className="text-white-dark">{error}</p>
                    <button onClick={fetchSuppliers} className="btn btn-primary mt-4">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Supplier Management</h2>
                    <p className="text-white-dark">Manage your supplier database and relationships</p>
                </div>
                <Link to="/procurement/suppliers/new" className="btn btn-primary gap-2">
                    <IconPlus />
                    Add Supplier
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Active</div>
                        <IconUser className="h-6 w-6 text-success" />
                    </div>
                    <div className="text-3xl font-bold text-success">{stats.active}</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Inactive</div>
                        <IconUser className="h-6 w-6 text-danger" />
                    </div>
                    <div className="text-3xl font-bold text-danger">{stats.inactive}</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Total Spend</div>
                        <IconUser className="h-6 w-6 text-warning" />
                    </div>
                    <div className="text-3xl font-bold text-warning">${stats.totalSpend.toLocaleString()}</div>
                </div>
            </div>

            {/* Suppliers Grid View */}
            <div className="panel mb-6">
                <div className="mb-5 flex flex-col gap-5 md:flex-row md:items-center">
                    <div className="flex-1">
                        <input type="text" className="form-input w-full" placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className="flex gap-3">
                        <select className="form-select w-full md:w-auto" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                            <option value="all">All Categories</option>
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                        <select className="form-select w-full md:w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            <option value="all">All Status</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredSuppliers.map((supplier) => (
                        <div key={supplier.id} className="rounded-lg border border-white-light p-5 dark:border-white/10">
                            {/* Header */}
                            <div className="mb-4 flex items-start justify-between">
                                <div className="flex-1">
                                    <Link to={`/procurement/suppliers/${supplier.id}`} className="text-lg font-bold hover:text-primary">
                                        {supplier.name}
                                    </Link>
                                    <div className="mt-1 text-sm text-white-dark">{supplier.category}</div>
                                </div>
                                <span className={`badge ${getStatusBadge(supplier.status)}`}>{supplier.status}</span>
                            </div>

                            {/* Rating */}
                            <div className="mb-4 flex items-center gap-2">
                                <div className="flex">{renderStars(supplier.rating)}</div>
                                <span className="text-sm font-semibold">{supplier.rating}</span>
                            </div>

                            {/* Contact Info */}
                            <div className="mb-4 space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-white-dark">
                                    <IconUser className="h-4 w-4" />
                                    <span>{supplier.contact}</span>
                                </div>
                                <div className="flex items-center gap-2 text-white-dark">
                                    <IconMail className="h-4 w-4" />
                                    <a href={`mailto:${supplier.email}`} className="hover:text-primary">
                                        {supplier.email}
                                    </a>
                                </div>
                                <div className="flex items-center gap-2 text-white-dark">
                                    <IconPhone className="h-4 w-4" />
                                    <a href={`tel:${supplier.phone}`} className="hover:text-primary">
                                        {supplier.phone}
                                    </a>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="mb-4 grid grid-cols-2 gap-3 border-t border-white-light pt-4 dark:border-white/10">
                                <div>
                                    <div className="text-xs text-white-dark">Total Orders</div>
                                    <div className="font-bold">{supplier.totalOrders}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-white-dark">Total Spend</div>
                                    <div className="font-bold text-success">${supplier.totalSpend.toLocaleString()}</div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Link to={`/procurement/suppliers/${supplier.id}`} className="btn btn-outline-primary btn-sm flex-1 gap-1">
                                    <IconEye className="h-4 w-4" />
                                    View
                                </Link>
                                <Link to={`/procurement/suppliers/${supplier.id}/edit`} className="btn btn-outline-warning btn-sm flex-1 gap-1">
                                    <IconPencil className="h-4 w-4" />
                                    Edit
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredSuppliers.length === 0 && (
                    <div className="py-8 text-center">
                        <IconUser className="mx-auto mb-4 h-16 w-16 text-gray-400" />
                        <h3 className="mb-2 text-lg font-semibold">No suppliers found</h3>
                        <p className="text-white-dark">Try adjusting your search or filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SupplierList;
