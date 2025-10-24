import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';

const mockItems = {
    1: {
        id: 1,
        itemCode: 'CAT-OFF-001',
        name: 'Office Chair - Ergonomic',
        category: 'Office Furniture',
        supplier: 'Office Pro Supply',
        price: 299.99,
        stock: 45,
        status: 'Active' as 'Active' | 'Inactive',
        description: 'High-quality ergonomic office chair with lumbar support.',
        specifications: 'Adjustable height: 42-52cm\nWeight capacity: 150kg',
    },
    2: {
        id: 2,
        itemCode: 'CAT-IT-002',
        name: 'Laptop - Dell Latitude 5520',
        category: 'IT Equipment',
        supplier: 'Tech Solutions Inc',
        price: 1299.99,
        stock: 12,
        status: 'Active' as 'Active' | 'Inactive',
        description: 'Professional laptop with Intel i5 processor.',
        specifications: 'Processor: Intel Core i5\nRAM: 16GB DDR4\nStorage: 512GB SSD',
    },
} as const;

const EditCatalogItem = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { id } = useParams();

    useEffect(() => {
        dispatch(setPageTitle('Edit Catalog Item'));
    });

    const i = mockItems[parseInt(id || '1') as keyof typeof mockItems] || mockItems[1];

    const [itemCode, setItemCode] = useState<string>(i.itemCode);
    const [name, setName] = useState<string>(i.name);
    const [category, setCategory] = useState<string>(i.category);
    const [supplier, setSupplier] = useState<string>(i.supplier);
    const [price, setPrice] = useState<number>(i.price);
    const [stock, setStock] = useState<number>(i.stock);
    const [status, setStatus] = useState<'Active' | 'Inactive'>(i.status);
    const [description, setDescription] = useState<string>(i.description);
    const [specifications, setSpecifications] = useState<string>(i.specifications);

    const [modal, setModal] = useState<{ open: boolean; title: string; message: string; tone: 'success' | 'warning' }>(
        { open: false, title: '', message: '', tone: 'success' }
    );

    const openModal = (tone: 'success' | 'warning', title: string, message: string) => setModal({ open: true, title, message, tone });
    const closeModal = () => setModal({ open: false, title: '', message: '', tone: 'success' });

    const validate = () => itemCode.trim() && name.trim() && category.trim();

    const handleDraft = () => {
        openModal('warning', 'Saved as Draft', 'Changes saved as draft. You can finalize later.');
    };

    const handleSave = () => {
        if (!validate()) {
            openModal('warning', 'Missing Information', 'Please fill in Item Code, Name, and Category.');
            return;
        }
        openModal('success', 'Item Updated', 'The catalog item has been updated successfully.');
        setTimeout(() => {
            closeModal();
            navigate(`/procurement/catalog/${i.id}`);
        }, 800);
    };

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Edit Catalog Item</h2>
                    <p className="text-white-dark">Update catalog item information</p>
                </div>
                <Link to={`/procurement/catalog/${i.id}`} className="btn btn-outline-danger gap-2">
                    <IconArrowLeft />
                    Back to Details
                </Link>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">Basic Information</h5>
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1 block text-white-dark">Item Code</label>
                            <input className="form-input" value={itemCode} onChange={(e) => setItemCode(e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-white-dark">Item Name</label>
                            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-white-dark">Category</label>
                                <input className="form-input" value={category} onChange={(e) => setCategory(e.target.value)} />
                            </div>
                            <div>
                                <label className="mb-1 block text-white-dark">Supplier</label>
                                <input className="form-input" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-white-dark">Price (USD)</label>
                                <input type="number" min={0} step="0.01" className="form-input" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
                            </div>
                            <div>
                                <label className="mb-1 block text-white-dark">Stock Quantity</label>
                                <input type="number" min={0} className="form-input" value={stock} onChange={(e) => setStock(Number(e.target.value))} />
                            </div>
                        </div>
                        <div>
                            <label className="mb-1 block text-white-dark">Status</label>
                            <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">Additional Details</h5>
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1 block text-white-dark">Description</label>
                            <textarea className="form-textarea" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-white-dark">Specifications</label>
                            <textarea className="form-textarea" rows={4} value={specifications} onChange={(e) => setSpecifications(e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
                <button className="btn bg-warning text-white hover:opacity-90" onClick={handleDraft}>Save as Draft</button>
                <button className="btn btn-primary" onClick={handleSave}>Save Changes</button>
            </div>

            {modal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
                        <div className={`mb-3 text-lg font-semibold ${modal.tone === 'success' ? 'text-success' : 'text-warning'}`}>{modal.title}</div>
                        <div className="text-white-dark">{modal.message}</div>
                        <div className="mt-5 text-right">
                            <button className={`btn ${modal.tone === 'success' ? 'btn-success' : 'bg-warning text-white hover:opacity-90'}`} onClick={closeModal}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditCatalogItem;
