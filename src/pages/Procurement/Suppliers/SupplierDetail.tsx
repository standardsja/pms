import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';

const SupplierDetail = () => {
    const dispatch = useDispatch();
    const { id } = useParams();

    useEffect(() => {
        dispatch(setPageTitle('Supplier Details'));
    });

    const data = {
        1: {
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
            notes: 'Preferred for bulk stationery. Reliable delivery times.',
        },
        2: {
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
            notes: 'Strong after-sales support. Competitive pricing.',
        },
    } as const;

    const supplier = data[parseInt(id || '1') as keyof typeof data] || data[1];

    const getStatusBadge = (status: string) => (status === 'Active' ? 'badge bg-success' : 'badge bg-danger');

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">{supplier.name}</h2>
                    <p className="text-white-dark">{supplier.category}</p>
                </div>
                <div className="flex gap-2">
                    <Link to={`/procurement/suppliers/${supplier.id}/edit`} className="btn btn-warning">Edit</Link>
                    <Link to="/procurement/suppliers" className="btn btn-outline-danger gap-2">
                        <IconArrowLeft />
                        Back to List
                    </Link>
                </div>
            </div>

            <div className="mb-6 grid gap-6 lg:grid-cols-4">
                <div className="panel">
                    <div className="mb-2 text-white-dark">Status</div>
                    <div className={getStatusBadge(supplier.status)}>{supplier.status}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-white-dark">Rating</div>
                    <div className="text-xl font-bold text-warning">{supplier.rating}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-white-dark">Total Orders</div>
                    <div className="text-xl font-bold">{supplier.totalOrders}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-white-dark">Total Spend</div>
                    <div className="text-xl font-bold text-success">${supplier.totalSpend.toLocaleString()}</div>
                </div>
            </div>

            <div className="panel mb-6">
                <h5 className="mb-5 text-lg font-semibold">Contact Information</h5>
                <div className="grid gap-5 md:grid-cols-2">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="font-semibold text-white-dark">Contact</div>
                        <div className="col-span-2">{supplier.contact}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="font-semibold text-white-dark">Email</div>
                        <div className="col-span-2">{supplier.email}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="font-semibold text-white-dark">Phone</div>
                        <div className="col-span-2">{supplier.phone}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="font-semibold text-white-dark">Address</div>
                        <div className="col-span-2">{supplier.address}</div>
                    </div>
                </div>
            </div>

            {supplier.notes && (
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">Notes</h5>
                    <p className="text-white-dark">{supplier.notes}</p>
                </div>
            )}
        </div>
    );
};

export default SupplierDetail;
