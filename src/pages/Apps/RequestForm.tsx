import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconPlus from '../../components/Icon/IconPlus';
import IconX from '../../components/Icon/IconX';

interface RequestItem {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
}

const RequestForm = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [items, setItems] = useState<RequestItem[]>([
        { id: '1', description: '', quantity: 1, unitPrice: 0 }
    ]);
    const [attachments, setAttachments] = useState<File[]>([]);

    useEffect(() => {
        dispatch(setPageTitle('New Request'));
    }, [dispatch]);

    const addItem = () => {
        setItems([...items, { 
            id: Date.now().toString(), 
            description: '', 
            quantity: 1, 
            unitPrice: 0 
        }]);
    };

    const removeItem = (id: string) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const updateItem = (id: string, field: keyof RequestItem, value: string | number) => {
        setItems(items.map(item => 
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setAttachments([...attachments, ...Array.from(e.target.files)]);
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(attachments.filter((_, i) => i !== index));
    };

    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Add API call to create request with FormData for file uploads
        const formData = new FormData(e.target as HTMLFormElement);
        console.log('Request Data:', {
            items,
            attachments,
            total: calculateTotal()
        });
        alert('Request submitted! (Add API integration here)');
        navigate('/apps/requests');
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold">New Request</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Submit a new procurement request</p>
            </div>

            <div className="bg-white dark:bg-slate-800 shadow rounded p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Request Title <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="title"
                                className="form-input w-full"
                                placeholder="e.g., Purchase Office Chairs"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Department <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                name="department"
                                className="form-input w-full"
                                placeholder="e.g., HR"
                                required
                            />
                        </div>
                    </div>

                    {/* Funding Source */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Funding Source <span className="text-red-500">*</span></label>
                            <select name="fundingSource" className="form-select w-full" required>
                                <option value="">Select funding source</option>
                                <option value="operational">Operational Budget</option>
                                <option value="capital">Capital Budget</option>
                                <option value="project">Project Budget</option>
                                <option value="grant">Grant Funded</option>
                                <option value="other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Budget Code</label>
                            <input
                                type="text"
                                name="budgetCode"
                                className="form-input w-full"
                                placeholder="e.g., OP-2025-HR-001"
                            />
                        </div>
                    </div>

                    {/* Items/Services */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium">Items/Services <span className="text-red-500">*</span></label>
                            <button
                                type="button"
                                onClick={addItem}
                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            >
                                <IconPlus className="w-4 h-4" />
                                Add Item
                            </button>
                        </div>

                        <div className="space-y-3">
                            {items.map((item, index) => (
                                <div key={item.id} className="grid grid-cols-12 gap-2 items-start p-3 border border-gray-200 dark:border-gray-700 rounded">
                                    <div className="col-span-6">
                                        <input
                                            type="text"
                                            placeholder="Item description"
                                            className="form-input w-full"
                                            value={item.description}
                                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <input
                                            type="number"
                                            placeholder="Qty"
                                            className="form-input w-full"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                            required
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <input
                                            type="number"
                                            placeholder="Unit Price"
                                            className="form-input w-full"
                                            step="0.01"
                                            min="0"
                                            value={item.unitPrice}
                                            onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                            required
                                        />
                                    </div>
                                    <div className="col-span-1 flex items-center justify-center">
                                        {items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeItem(item.id)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <IconX className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="col-span-12 text-sm text-gray-500 dark:text-gray-400">
                                        Subtotal: ${(item.quantity * item.unitPrice).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded text-right">
                            <span className="text-sm font-medium">Total Estimated Cost: </span>
                            <span className="text-lg font-bold text-primary">${calculateTotal().toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Justification */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Justification <span className="text-red-500">*</span></label>
                        <textarea
                            name="justification"
                            className="form-textarea w-full"
                            rows={4}
                            placeholder="Explain why this request is needed, expected benefits, and urgency..."
                            required
                        />
                    </div>

                    {/* Attachments */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Attachments</label>
                        <div className="space-y-2">
                            <input
                                type="file"
                                onChange={handleFileChange}
                                className="form-input w-full"
                                multiple
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Accepted formats: PDF, Word, Excel, Images (Max 10MB per file)
                            </p>
                            
                            {attachments.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    <p className="text-sm font-medium">Attached files:</p>
                                    {attachments.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded">
                                            <span className="text-sm truncate flex-1">{file.name}</span>
                                            <span className="text-xs text-gray-500 mx-2">
                                                ({(file.size / 1024).toFixed(2)} KB)
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removeAttachment(index)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <IconX className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="submit"
                            className="px-6 py-2 rounded bg-primary text-white hover:opacity-95 font-medium"
                        >
                            Submit Request
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/apps/requests')}
                            className="px-6 py-2 rounded border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RequestForm;
