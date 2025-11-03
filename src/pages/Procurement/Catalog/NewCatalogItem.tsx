import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';

const NewCatalogItem = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        dispatch(setPageTitle('Add Catalog Item'));
    });

    const [itemCode, setItemCode] = useState('');
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [supplier, setSupplier] = useState('');
    const [price, setPrice] = useState<number>(0);
    const [stock, setStock] = useState<number>(0);
    const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
    const [description, setDescription] = useState('');
    const [specifications, setSpecifications] = useState('');

    const [modal, setModal] = useState<{ open: boolean; title: string; message: string; tone: 'success' | 'warning' }>(
        { open: false, title: '', message: '', tone: 'success' }
    );

    const openModal = (tone: 'success' | 'warning', title: string, message: string) => setModal({ open: true, title, message, tone });
    const closeModal = () => setModal({ open: false, title: '', message: '', tone: 'success' });

    const validate = () => itemCode.trim() && name.trim() && category.trim();

    const handleDraft = () => {
        openModal('warning', 'Saved as Draft', 'Catalog item draft saved. You can complete it later.');
    };

    const handleCreate = () => {
        if (!validate()) {
            openModal('warning', 'Missing Information', 'Please fill in Item Code, Name, and Category.');
            return;
        }
        openModal('success', 'Item Created', 'The catalog item has been added successfully.');
        setTimeout(() => {
            closeModal();
            navigate('/procurement/catalog');
        }, 800);
    };

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Add Catalog Item</h2>
                    <p className="text-white-dark">Create a new catalog item</p>
                </div>
                <Link to="/procurement/catalog" className="btn btn-outline-danger gap-2">
                    <IconArrowLeft />
                    Back to Catalog
                </Link>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">Basic Information</h5>
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1 block text-white-dark">Item Code</label>
                            <input className="form-input" placeholder="e.g. CAT-IT-001" value={itemCode} onChange={(e) => setItemCode(e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-white-dark">Item Name</label>
                            <input className="form-input" placeholder="e.g. Laptop Dell Latitude" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-white-dark">Category</label>
                                <input className="form-input" placeholder="e.g. IT Equipment" value={category} onChange={(e) => setCategory(e.target.value)} />
                            </div>
                            <div>
                                <label className="mb-1 block text-white-dark">Supplier</label>
                                <input className="form-input" placeholder="e.g. Tech Solutions Inc" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
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
                            <textarea className="form-textarea" rows={4} placeholder="Item description" value={description} onChange={(e) => setDescription(e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-white-dark">Specifications</label>
                            <textarea className="form-textarea" rows={4} placeholder="Technical specifications" value={specifications} onChange={(e) => setSpecifications(e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
                <button className="btn bg-warning text-white hover:opacity-90" onClick={handleDraft}>Save as Draft</button>
                <button className="btn btn-primary" onClick={handleCreate}>Create Item</button>
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

export default NewCatalogItem;
