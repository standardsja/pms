import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';

const CatalogItemDetail = () => {
    const dispatch = useDispatch();
    const { id } = useParams();

    useEffect(() => {
        dispatch(setPageTitle('Catalog Item Details'));
    });

    const data = {
        1: {
            id: 1,
            itemCode: 'CAT-OFF-001',
            name: 'Office Chair - Ergonomic',
            category: 'Office Furniture',
            supplier: 'Office Pro Supply',
            price: 299.99,
            stock: 45,
            status: 'Active',
            description: 'High-quality ergonomic office chair with lumbar support, adjustable height, and mesh back for maximum comfort.',
            specifications: 'Adjustable height: 42-52cm\nWeight capacity: 150kg\nMaterial: Mesh back, foam seat\nWarranty: 2 years',
        },
        2: {
            id: 2,
            itemCode: 'CAT-IT-002',
            name: 'Laptop - Dell Latitude 5520',
            category: 'IT Equipment',
            supplier: 'Tech Solutions Inc',
            price: 1299.99,
            stock: 12,
            status: 'Active',
            description: 'Professional laptop with Intel i5 processor, perfect for business and productivity.',
            specifications: 'Processor: Intel Core i5-1135G7\nRAM: 16GB DDR4\nStorage: 512GB SSD\nDisplay: 15.6" Full HD\nOS: Windows 11 Pro',
        },
    } as const;

    const item = data[parseInt(id || '1') as keyof typeof data] || data[1];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Active':
                return 'badge bg-success';
            case 'Low Stock':
                return 'badge bg-warning';
            case 'Out of Stock':
                return 'badge bg-danger';
            default:
                return 'badge bg-secondary';
        }
    };

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">{item.name}</h2>
                    <p className="text-white-dark">{item.itemCode}</p>
                </div>
                <div className="flex gap-2">
                    <Link to={`/procurement/catalog/${item.id}/edit`} className="btn btn-warning">Edit</Link>
                    <Link to="/procurement/catalog" className="btn btn-outline-danger gap-2">
                        <IconArrowLeft />
                        Back to Catalog
                    </Link>
                </div>
            </div>

            <div className="mb-6 grid gap-6 lg:grid-cols-4">
                <div className="panel">
                    <div className="mb-2 text-white-dark">Status</div>
                    <div className={getStatusBadge(item.status)}>{item.status}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-white-dark">Category</div>
                    <div className="text-lg font-semibold">{item.category}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-white-dark">Price</div>
                    <div className="text-xl font-bold text-success">${item.price.toFixed(2)}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-white-dark">Stock</div>
                    <div className="text-xl font-bold">{item.stock} units</div>
                </div>
            </div>

            <div className="panel mb-6">
                <h5 className="mb-5 text-lg font-semibold">Item Information</h5>
                <div className="grid gap-5 md:grid-cols-2">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="font-semibold text-white-dark">Item Code</div>
                        <div className="col-span-2">{item.itemCode}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="font-semibold text-white-dark">Supplier</div>
                        <div className="col-span-2">{item.supplier}</div>
                    </div>
                    <div className="md:col-span-2">
                        <div className="font-semibold text-white-dark">Description</div>
                        <div className="mt-2 text-white-dark">{item.description}</div>
                    </div>
                </div>
            </div>

            {item.specifications && (
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">Specifications</h5>
                    <pre className="whitespace-pre-wrap text-white-dark">{item.specifications}</pre>
                </div>
            )}
        </div>
    );
};

export default CatalogItemDetail;
