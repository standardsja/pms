import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';
import IconPlus from '../../../components/Icon/IconPlus';
import IconTrashLines from '../../../components/Icon/IconTrashLines';

interface RequestItem {
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
}

const NewRequest = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        dispatch(setPageTitle('New Procurement Request'));
    });

    const [formData, setFormData] = useState({
        requester: '',
        department: '',
        email: '',
        phone: '',
        priority: 'Medium',
        budgetCode: '',
        justification: '',
        deliveryDate: '',
        deliveryLocation: '',
    });

    const [items, setItems] = useState<RequestItem[]>([
        { id: 1, description: '', quantity: 1, unitPrice: 0, totalPrice: 0 },
    ]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleItemChange = (id: number, field: string, value: string | number) => {
        const updatedItems = items.map((item) => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value };
                if (field === 'quantity' || field === 'unitPrice') {
                    updatedItem.totalPrice = updatedItem.quantity * updatedItem.unitPrice;
                }
                return updatedItem;
            }
            return item;
        });
        setItems(updatedItems);
    };

    const addItem = () => {
        const newItem: RequestItem = {
            id: items.length + 1,
            description: '',
            quantity: 1,
            unitPrice: 0,
            totalPrice: 0,
        };
        setItems([...items, newItem]);
    };

    const removeItem = (id: number) => {
        if (items.length > 1) {
            setItems(items.filter((item) => item.id !== id));
        }
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + item.totalPrice, 0);
    };

    const handleSubmit = (status: 'draft' | 'submit') => {
        // Handle form submission
        console.log('Form submitted with status:', status);
        console.log('Form data:', formData);
        console.log('Items:', items);
        navigate('/procurement/requests');
    };

    return (
        <div>
            <div className="mb-6 flex items-center gap-4">
                <Link to="/procurement/requests" className="hover:text-primary">
                    <IconArrowLeft />
                </Link>
                <h2 className="text-xl font-bold">New Procurement Request</h2>
            </div>

            <div className="space-y-6">
                {/* Requester Information */}
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">Requester Information</h5>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                            <label htmlFor="requester">Requester Name *</label>
                            <input
                                id="requester"
                                name="requester"
                                type="text"
                                placeholder="Enter requester name"
                                className="form-input"
                                value={formData.requester}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <label htmlFor="department">Department *</label>
                            <select id="department" name="department" className="form-select" value={formData.department} onChange={handleInputChange}>
                                <option value="">Select Department</option>
                                <option value="IT">IT</option>
                                <option value="HR">HR</option>
                                <option value="Finance">Finance</option>
                                <option value="Operations">Operations</option>
                                <option value="Marketing">Marketing</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="email">Email *</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="Enter email"
                                className="form-input"
                                value={formData.email}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <label htmlFor="phone">Phone</label>
                            <input
                                id="phone"
                                name="phone"
                                type="tel"
                                placeholder="Enter phone number"
                                className="form-input"
                                value={formData.phone}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>
                </div>

                {/* Request Details */}
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">Request Details</h5>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div>
                            <label htmlFor="priority">Priority *</label>
                            <select id="priority" name="priority" className="form-select" value={formData.priority} onChange={handleInputChange}>
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Urgent">Urgent</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="budgetCode">Budget Code *</label>
                            <input
                                id="budgetCode"
                                name="budgetCode"
                                type="text"
                                placeholder="Enter budget code"
                                className="form-input"
                                value={formData.budgetCode}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <label htmlFor="deliveryDate">Required Delivery Date *</label>
                            <input
                                id="deliveryDate"
                                name="deliveryDate"
                                type="date"
                                className="form-input"
                                value={formData.deliveryDate}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <label htmlFor="deliveryLocation">Delivery Location *</label>
                            <input
                                id="deliveryLocation"
                                name="deliveryLocation"
                                type="text"
                                placeholder="Enter delivery location"
                                className="form-input"
                                value={formData.deliveryLocation}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="justification">Justification *</label>
                            <textarea
                                id="justification"
                                name="justification"
                                rows={4}
                                className="form-textarea"
                                placeholder="Enter justification for this request"
                                value={formData.justification}
                                onChange={handleInputChange}
                            ></textarea>
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="panel">
                    <div className="mb-5 flex items-center justify-between">
                        <h5 className="text-lg font-semibold">Items</h5>
                        <button type="button" className="btn btn-primary btn-sm gap-1" onClick={addItem}>
                            <IconPlus className="h-4 w-4" />
                            Add Item
                        </button>
                    </div>
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: '40%' }}>Description *</th>
                                    <th>Quantity *</th>
                                    <th>Unit Price *</th>
                                    <th>Total</th>
                                    <th className="text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Item description"
                                                value={item.description}
                                                onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                className="form-input"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                className="form-input"
                                                min="0"
                                                step="0.01"
                                                value={item.unitPrice}
                                                onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                            />
                                        </td>
                                        <td className="font-semibold">${item.totalPrice.toFixed(2)}</td>
                                        <td className="text-center">
                                            <button type="button" className="hover:text-danger" onClick={() => removeItem(item.id)} disabled={items.length === 1}>
                                                <IconTrashLines className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={3} className="text-right font-semibold">
                                        Grand Total:
                                    </td>
                                    <td className="text-lg font-bold">${calculateTotal().toFixed(2)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <Link to="/procurement/requests" className="btn btn-outline-danger">
                        Cancel
                    </Link>
                    <button type="button" className="btn btn-outline-primary" onClick={() => handleSubmit('draft')}>
                        Save as Draft
                    </button>
                    <button type="button" className="btn btn-primary" onClick={() => handleSubmit('submit')}>
                        Submit Request
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewRequest;
