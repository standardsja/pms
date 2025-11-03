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

    // Mock supplier data
    const suppliers = [
        {
            id: 1,
            name: 'ABC Corporation',
            category: 'Office Supplies',
            contact: 'John Smith',
            email: 'john@abccorp.com',
            phone: '+1-555-0101',
            address: '123 Business St, City',
            rating: 4.8,
            totalOrders: 45,
            totalSpend: 125000,
            status: 'Active',
            registeredDate: '2023-01-15',
        },
        {
            id: 2,
            name: 'Tech Solutions Inc',
            category: 'IT Equipment',
            contact: 'Sarah Johnson',
            email: 'sarah@techsolutions.com',
            phone: '+1-555-0102',
            address: '456 Tech Ave, City',
            rating: 4.9,
            totalOrders: 28,
            totalSpend: 87500,
            status: 'Active',
            registeredDate: '2023-03-20',
        },
        {
            id: 3,
            name: 'Office Pro Supply',
            category: 'Office Furniture',
            contact: 'Mike Wilson',
            email: 'mike@officepro.com',
            phone: '+1-555-0103',
            address: '789 Commerce Rd, City',
            rating: 4.5,
            totalOrders: 52,
            totalSpend: 65000,
            status: 'Active',
            registeredDate: '2022-11-10',
        },
        {
            id: 4,
            name: 'Clean Corp Ltd',
            category: 'Cleaning Services',
            contact: 'Emily Brown',
            email: 'emily@cleancorp.com',
            phone: '+1-555-0104',
            address: '321 Service Lane, City',
            rating: 4.7,
            totalOrders: 18,
            totalSpend: 54000,
            status: 'Active',
            registeredDate: '2023-05-05',
        },
        {
            id: 5,
            name: 'XYZ Suppliers Ltd',
            category: 'General',
            contact: 'David Lee',
            email: 'david@xyzsuppliers.com',
            phone: '+1-555-0105',
            address: '654 Industrial Park, City',
            rating: 4.6,
            totalOrders: 32,
            totalSpend: 98000,
            status: 'Active',
            registeredDate: '2023-02-28',
        },
        {
            id: 6,
            name: 'Beta Industries',
            category: 'IT Equipment',
            contact: 'Lisa Anderson',
            email: 'lisa@betaindustries.com',
            phone: '+1-555-0106',
            address: '987 Market St, City',
            rating: 3.8,
            totalOrders: 12,
            totalSpend: 42000,
            status: 'Inactive',
            registeredDate: '2022-08-12',
        },
    ];

    const filteredSuppliers = suppliers.filter((supplier) => {
        const matchesSearch =
            supplier.name.toLowerCase().includes(search.toLowerCase()) ||
            supplier.contact.toLowerCase().includes(search.toLowerCase()) ||
            supplier.email.toLowerCase().includes(search.toLowerCase());
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
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Total Suppliers</div>
                        <IconUser className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl font-bold text-primary">{stats.total}</div>
                </div>
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
                        <input
                            type="text"
                            className="form-input w-full"
                            placeholder="Search suppliers..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
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
