import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';

type POItem = {
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
};

const NewPurchaseOrder = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        dispatch(setPageTitle('New Purchase Order'));
    });

    const [supplier, setSupplier] = useState('');
    const [rfqRef, setRfqRef] = useState('');
    const [poDate, setPoDate] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState<POItem[]>([{ id: 1, description: '', quantity: 1, unitPrice: 0 }]);

    const [showModal, setShowModal] = useState<{ open: boolean; title: string; message: string; tone: 'success' | 'warning' }>(
        { open: false, title: '', message: '', tone: 'success' }
    );

    const addItem = () => {
        setItems((prev) => [...prev, { id: prev.length + 1, description: '', quantity: 1, unitPrice: 0 }]);
    };

    const removeItem = (id: number) => setItems((prev) => prev.filter((i) => i.id !== id));

    const updateItem = (id: number, field: keyof POItem, value: string | number) => {
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)));
    };

    const subtotal = items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
    const tax = subtotal * 0.15;
    const total = subtotal + tax;

    const validate = () => supplier.trim() && poDate && deliveryDate && items.every((i) => i.description.trim());

    const openModal = (tone: 'success' | 'warning', title: string, message: string) => setShowModal({ open: true, title, message, tone });
    const closeModal = () => setShowModal({ open: false, title: '', message: '', tone: 'success' });

    const handleDraft = () => {
        openModal('warning', 'Saved as Draft', 'Your purchase order has been saved as a draft. You can complete it later.');
    };

    const handleCreate = () => {
        if (!validate()) {
            openModal('warning', 'Missing Information', 'Please complete Supplier, Dates, and item descriptions.');
            return;
        }
        openModal('success', 'Purchase Order Created', 'The purchase order has been created successfully.');
        setTimeout(() => {
            closeModal();
            navigate('/procurement/purchase-orders');
        }, 800);
    };

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">New Purchase Order</h2>
                    <p className="text-white-dark">Create a new purchase order and send to supplier</p>
                </div>
                <Link to="/procurement/purchase-orders" className="btn btn-outline-danger gap-2">
                    <IconArrowLeft />
                    Back to List
                </Link>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">Supplier & References</h5>
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1 block text-white-dark">Supplier</label>
                            <input className="form-input" placeholder="e.g. Tech Solutions Inc" value={supplier} onChange={(e) => setSupplier(e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-white-dark">RFQ Reference</label>
                            <input className="form-input" placeholder="e.g. RFQ-2024-046" value={rfqRef} onChange={(e) => setRfqRef(e.target.value)} />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-white-dark">PO Date</label>
                                <input type="date" className="form-input" value={poDate} onChange={(e) => setPoDate(e.target.value)} />
                            </div>
                            <div>
                                <label className="mb-1 block text-white-dark">Delivery Date</label>
                                <input type="date" className="form-input" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label className="mb-1 block text-white-dark">Notes</label>
                            <textarea className="form-textarea" rows={3} placeholder="Optional instructions for supplier" value={notes} onChange={(e) => setNotes(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">Totals</h5>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-white-dark">Subtotal</span>
                            <span className="font-semibold">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-white-dark">Tax (15%)</span>
                            <span className="font-semibold">${tax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex items-center justify-between text-lg">
                            <span className="font-semibold">Total</span>
                            <span className="font-bold text-primary">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Items */}
            <div className="panel mt-6">
                <div className="mb-5 flex items-center justify-between">
                    <h5 className="text-lg font-semibold">Line Items</h5>
                    <button type="button" className="btn btn-outline-primary" onClick={addItem}>
                        Add Item
                    </button>
                </div>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th style={{ width: 40 }}>#</th>
                                <th>Description</th>
                                <th style={{ width: 120 }}>Qty</th>
                                <th style={{ width: 160 }}>Unit Price</th>
                                <th style={{ width: 160 }}>Line Total</th>
                                <th style={{ width: 80 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => (
                                <tr key={item.id}>
                                    <td>{idx + 1}</td>
                                    <td>
                                        <input
                                            className="form-input"
                                            placeholder="Item description"
                                            value={item.description}
                                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            className="form-input"
                                            min={1}
                                            value={item.quantity}
                                            onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))}
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            className="form-input"
                                            min={0}
                                            step="0.01"
                                            value={item.unitPrice}
                                            onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                                        />
                                    </td>
                                    <td className="font-semibold">
                                        ${((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)).toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </td>
                                    <td>
                                        {items.length > 1 && (
                                            <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => removeItem(item.id)}>
                                                Remove
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" className="btn bg-warning text-white hover:opacity-90" onClick={handleDraft}>
                    Save as Draft
                </button>
                <button type="button" className="btn btn-primary" onClick={handleCreate}>
                    Create Purchase Order
                </button>
            </div>

            {/* Modal Pop-up */}
            {showModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
                        <div className={`mb-3 text-lg font-semibold ${showModal.tone === 'success' ? 'text-success' : 'text-warning'}`}>{showModal.title}</div>
                        <div className="text-white-dark">{showModal.message}</div>
                        <div className="mt-5 text-right">
                            <button className={`btn ${showModal.tone === 'success' ? 'btn-success' : 'bg-warning text-white hover:opacity-90'}`} onClick={closeModal}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NewPurchaseOrder;
