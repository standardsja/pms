import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconFolder from '../../../components/Icon/IconFolder';
import IconPlus from '../../../components/Icon/IconPlus';
import IconEye from '../../../components/Icon/IconEye';
import IconPencil from '../../../components/Icon/IconPencil';

const CatalogList = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Catalog Management'));
    });

    const [catalogItems] = useState([
        { id: 1, itemCode: 'CAT-OFF-001', name: 'Office Chair - Ergonomic', category: 'Office Furniture', supplier: 'Office Pro Supply', price: 299.99, stock: 45, status: 'Active' },
        { id: 2, itemCode: 'CAT-IT-002', name: 'Laptop - Dell Latitude 5520', category: 'IT Equipment', supplier: 'Tech Solutions Inc', price: 1299.99, stock: 12, status: 'Active' },
        { id: 3, itemCode: 'CAT-OFF-003', name: 'Printer Paper A4 - 500 sheets', category: 'Office Supplies', supplier: 'ABC Corporation', price: 8.99, stock: 250, status: 'Active' },
        { id: 4, itemCode: 'CAT-IT-004', name: 'Monitor - 27" LED', category: 'IT Equipment', supplier: 'Tech Solutions Inc', price: 349.99, stock: 8, status: 'Low Stock' },
        { id: 5, itemCode: 'CAT-OFF-005', name: 'Desk - Standing Adjustable', category: 'Office Furniture', supplier: 'Office Pro Supply', price: 599.99, stock: 0, status: 'Out of Stock' },
    ]);

    const [categories] = useState([
        { name: 'Office Furniture', count: 125, value: 85000 },
        { name: 'IT Equipment', count: 234, value: 320000 },
        { name: 'Office Supplies', count: 456, value: 42000 },
        { name: 'Cleaning Supplies', count: 89, value: 15000 },
    ]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Active':
                return 'bg-success';
            case 'Low Stock':
                return 'bg-warning';
            case 'Out of Stock':
                return 'bg-danger';
            default:
                return 'bg-secondary';
        }
    };

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Catalog Management</h2>
                    <p className="text-white-dark">Manage your procurement catalog items</p>
                </div>
                <Link to="/procurement/catalog/new" className="btn btn-primary gap-2">
                    <IconPlus />
                    Add Item
                </Link>
            </div>

            {/* Stats */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Total Items</div>
                        <IconFolder className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl font-bold text-primary">856</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Categories</div>
                        <IconFolder className="h-6 w-6 text-warning" />
                    </div>
                    <div className="text-3xl font-bold text-warning">24</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Active Items</div>
                        <IconFolder className="h-6 w-6 text-success" />
                    </div>
                    <div className="text-3xl font-bold text-success">798</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Low Stock</div>
                        <IconFolder className="h-6 w-6 text-danger" />
                    </div>
                    <div className="text-3xl font-bold text-danger">12</div>
                </div>
            </div>

            {/* Categories Overview */}
            <div className="mb-6 panel">
                <h5 className="mb-4 text-lg font-semibold">Categories Overview</h5>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {categories.map((category, index) => (
                        <div key={index} className="rounded-lg border border-white-light p-4 dark:border-white/10">
                            <h6 className="mb-2 font-semibold">{category.name}</h6>
                            <div className="text-sm text-white-dark">
                                <div>{category.count} items</div>
                                <div className="font-semibold text-success">${category.value.toLocaleString()}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Catalog Items Table */}
            <div className="panel">
                <div className="mb-5 flex items-center justify-between">
                    <h5 className="text-lg font-semibold">Catalog Items</h5>
                    <div className="flex gap-2">
                        <select className="form-select w-auto">
                            <option>All Categories</option>
                            <option>Office Furniture</option>
                            <option>IT Equipment</option>
                            <option>Office Supplies</option>
                        </select>
                        <input type="text" placeholder="Search items..." className="form-input w-auto" />
                    </div>
                </div>
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>Item Code</th>
                                <th>Name</th>
                                <th>Category</th>
                                <th>Supplier</th>
                                <th>Price</th>
                                <th>Stock</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {catalogItems.map((item) => (
                                <tr key={item.id}>
                                    <td className="font-semibold">{item.itemCode}</td>
                                    <td>{item.name}</td>
                                    <td>
                                        <span className="badge bg-primary">{item.category}</span>
                                    </td>
                                    <td>{item.supplier}</td>
                                    <td className="font-bold text-success">${item.price}</td>
                                    <td>{item.stock}</td>
                                    <td>
                                        <span className={`badge ${getStatusBadge(item.status)}`}>{item.status}</span>
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <Link to={`/procurement/catalog/${item.id}`} className="btn btn-sm btn-outline-primary">
                                                <IconEye className="h-4 w-4" />
                                            </Link>
                                            <Link to={`/procurement/catalog/${item.id}/edit`} className="btn btn-sm btn-outline-warning">
                                                <IconPencil className="h-4 w-4" />
                                            </Link>
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

export default CatalogList;
