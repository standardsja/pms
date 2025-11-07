import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconPlus from '../../../components/Icon/IconPlus';
import IconX from '../../../components/Icon/IconX';
import IconSave from '../../../components/Icon/IconSave';
import IconSend from '../../../components/Icon/IconSend';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';

const NewQuote = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        dispatch(setPageTitle('Manual Quote Entry'));
    });

    const [formData, setFormData] = useState({
        rfqNumber: '',
        supplierName: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        quoteNumber: '',
        submittedDate: new Date().toISOString().split('T')[0],
        validUntil: '',
        deliveryTime: '',
        deliveryLocation: '',
        paymentTerms: '',
        warranty: '',
        currency: 'USD',
        taxRate: '10',
        notes: '',
        termsAndConditions: '',
    });

    const [items, setItems] = useState([
        { id: 1, description: '', quantity: '', unitPrice: '', specifications: '' },
    ]);

    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [errorFields, setErrorFields] = useState<string[]>([]);
    const [alertType, setAlertType] = useState<'success' | 'warning'>('success');

    // Mock RFQ options
    const rfqOptions = [
        { value: 'RFQ-2024-001', label: 'RFQ-2024-001 - Office Furniture' },
        { value: 'RFQ-2024-002', label: 'RFQ-2024-002 - IT Equipment' },
        { value: 'RFQ-2024-003', label: 'RFQ-2024-003 - Office Supplies' },
    ];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleItemChange = (id: number, field: string, value: string) => {
        setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    };

    const addItem = () => {
        const newId = Math.max(...items.map((i) => i.id), 0) + 1;
        setItems([...items, { id: newId, description: '', quantity: '', unitPrice: '', specifications: '' }]);
    };

    const removeItem = (id: number) => {
        if (items.length > 1) {
            setItems(items.filter((item) => item.id !== id));
        }
    };

    const calculateItemTotal = (item: any) => {
        const quantity = parseFloat(item.quantity) || 0;
        const unitPrice = parseFloat(item.unitPrice) || 0;
        return quantity * unitPrice;
    };

    const calculateSubtotal = () => {
        return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    };

    const calculateTax = () => {
        const subtotal = calculateSubtotal();
        const taxRate = parseFloat(formData.taxRate) || 0;
        return (subtotal * taxRate) / 100;
    };

    const calculateTotal = () => {
        return calculateSubtotal() + calculateTax();
    };

    const handleSaveDraft = () => {
        // Draft save logic would be implemented here

        setAlertType('warning');
        setAlertMessage('Quote has been saved as draft. You can continue editing or submit it later.');
        setShowSuccessAlert(true);

        setTimeout(() => {
            setShowSuccessAlert(false);
            navigate('/procurement/quotes');
        }, 3000);
    };

    const handleSubmitQuote = () => {
        const missingFields: string[] = [];

        if (!formData.rfqNumber) missingFields.push('RFQ Number');
        if (!formData.supplierName) missingFields.push('Supplier Name');
        if (!formData.email) missingFields.push('Email');
        if (!formData.validUntil) missingFields.push('Valid Until Date');
        if (items.every((item) => !item.description)) missingFields.push('At least one item must be added');

        if (missingFields.length > 0) {
            setErrorFields(missingFields);
            setShowErrorAlert(true);

            setTimeout(() => {
                setShowErrorAlert(false);
            }, 5000);
            return;
        }

        // Quote submission logic would be implemented here

        setAlertType('success');
        setAlertMessage(`Quote from ${formData.supplierName} has been submitted successfully. Total Amount: ${formData.currency} $${calculateTotal().toLocaleString()}`);
        setShowSuccessAlert(true);

        setTimeout(() => {
            setShowSuccessAlert(false);
            navigate('/procurement/quotes');
        }, 3000);
    };

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Manual Quote Entry</h2>
                    <p className="text-white-dark">Enter supplier quotation details manually</p>
                </div>
                <Link to="/procurement/quotes" className="btn btn-outline-danger gap-2">
                    <IconArrowLeft />
                    Back to Quotes
                </Link>
            </div>

            {/* Success Alert Modal */}
            {showSuccessAlert && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60">
                    <div className="panel w-full max-w-lg overflow-hidden rounded-lg p-0">
                        <div
                            className={`flex items-center p-3.5 rounded-t ${
                                alertType === 'success' ? 'text-success bg-success-light dark:bg-success-dark-light' : 'text-warning bg-warning-light dark:bg-warning-dark-light'
                            }`}
                        >
                            <span className="ltr:pr-2 rtl:pl-2 flex-1">
                                <strong className="ltr:mr-1 rtl:ml-1 text-lg">{alertType === 'success' ? 'Success!' : 'Saved!'}</strong>
                                {alertMessage}
                            </span>
                            <button type="button" className="ltr:ml-auto rtl:mr-auto hover:opacity-80" onClick={() => setShowSuccessAlert(false)}>
                                <IconX className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Alert Modal */}
            {showErrorAlert && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60">
                    <div className="panel w-full max-w-lg overflow-hidden rounded-lg p-0">
                        <div className="flex items-start p-3.5 rounded-t text-danger bg-danger-light dark:bg-danger-dark-light">
                            <span className="ltr:pr-2 rtl:pl-2 flex-1">
                                <strong className="ltr:mr-1 rtl:ml-1 text-lg block mb-2">Error!</strong>
                                <div>Please complete the following required fields:</div>
                                <ul className="mt-2 ml-4 list-disc">
                                    {errorFields.map((field, index) => (
                                        <li key={index}>{field}</li>
                                    ))}
                                </ul>
                            </span>
                            <button type="button" className="ltr:ml-auto rtl:mr-auto hover:opacity-80" onClick={() => setShowErrorAlert(false)}>
                                <IconX className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {/* RFQ & Supplier Information */}
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">RFQ & Supplier Information</h5>
                    <div className="grid gap-5 md:grid-cols-2">
                        <div>
                            <label htmlFor="rfqNumber" className="mb-2 block font-semibold">
                                RFQ Number <span className="text-danger">*</span>
                            </label>
                            <select id="rfqNumber" name="rfqNumber" className="form-select" value={formData.rfqNumber} onChange={handleInputChange} required>
                                <option value="">Select RFQ...</option>
                                {rfqOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="quoteNumber" className="mb-2 block font-semibold">
                                Quote Number (Optional)
                            </label>
                            <input
                                id="quoteNumber"
                                name="quoteNumber"
                                type="text"
                                className="form-input"
                                placeholder="e.g., Q-2024-001"
                                value={formData.quoteNumber}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <label htmlFor="supplierName" className="mb-2 block font-semibold">
                                Supplier Name <span className="text-danger">*</span>
                            </label>
                            <input
                                id="supplierName"
                                name="supplierName"
                                type="text"
                                className="form-input"
                                placeholder="e.g., ABC Corporation"
                                value={formData.supplierName}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="contactPerson" className="mb-2 block font-semibold">
                                Contact Person
                            </label>
                            <input
                                id="contactPerson"
                                name="contactPerson"
                                type="text"
                                className="form-input"
                                placeholder="e.g., John Smith"
                                value={formData.contactPerson}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="mb-2 block font-semibold">
                                Email <span className="text-danger">*</span>
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                className="form-input"
                                placeholder="supplier@example.com"
                                value={formData.email}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="phone" className="mb-2 block font-semibold">
                                Phone
                            </label>
                            <input id="phone" name="phone" type="tel" className="form-input" placeholder="+1-876-123-4567" value={formData.phone} onChange={handleInputChange} />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="address" className="mb-2 block font-semibold">
                                Supplier Address
                            </label>
                            <input
                                id="address"
                                name="address"
                                type="text"
                                className="form-input"
                                placeholder="Enter supplier address"
                                value={formData.address}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>
                </div>

                {/* Quote Details */}
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">Quote Details</h5>
                    <div className="grid gap-5 md:grid-cols-2">
                        <div>
                            <label htmlFor="submittedDate" className="mb-2 block font-semibold">
                                Submitted Date
                            </label>
                            <input id="submittedDate" name="submittedDate" type="date" className="form-input" value={formData.submittedDate} onChange={handleInputChange} />
                        </div>
                        <div>
                            <label htmlFor="validUntil" className="mb-2 block font-semibold">
                                Valid Until <span className="text-danger">*</span>
                            </label>
                            <input id="validUntil" name="validUntil" type="date" className="form-input" value={formData.validUntil} onChange={handleInputChange} required />
                        </div>
                        <div>
                            <label htmlFor="deliveryTime" className="mb-2 block font-semibold">
                                Delivery Time
                            </label>
                            <input
                                id="deliveryTime"
                                name="deliveryTime"
                                type="text"
                                className="form-input"
                                placeholder="e.g., 14 days"
                                value={formData.deliveryTime}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <label htmlFor="deliveryLocation" className="mb-2 block font-semibold">
                                Delivery Location
                            </label>
                            <input
                                id="deliveryLocation"
                                name="deliveryLocation"
                                type="text"
                                className="form-input"
                                placeholder="Enter delivery address"
                                value={formData.deliveryLocation}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <label htmlFor="paymentTerms" className="mb-2 block font-semibold">
                                Payment Terms
                            </label>
                            <select id="paymentTerms" name="paymentTerms" className="form-select" value={formData.paymentTerms} onChange={handleInputChange}>
                                <option value="">Select Payment Terms</option>
                                <option value="Net 30">Net 30 Days</option>
                                <option value="Net 45">Net 45 Days</option>
                                <option value="Net 60">Net 60 Days</option>
                                <option value="50% Advance">50% Advance, 50% on Delivery</option>
                                <option value="100% Advance">100% Advance Payment</option>
                                <option value="COD">Cash on Delivery</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="warranty" className="mb-2 block font-semibold">
                                Warranty Period
                            </label>
                            <input
                                id="warranty"
                                name="warranty"
                                type="text"
                                className="form-input"
                                placeholder="e.g., 1 year"
                                value={formData.warranty}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>
                </div>

                {/* Quoted Items */}
                <div className="panel">
                    <div className="mb-5 flex items-center justify-between">
                        <h5 className="text-lg font-semibold">Quoted Items</h5>
                        <button onClick={addItem} className="btn btn-primary btn-sm gap-2">
                            <IconPlus className="h-4 w-4" />
                            Add Item
                        </button>
                    </div>
                    <div className="space-y-4">
                        {items.map((item, index) => (
                            <div key={item.id} className="rounded border border-white-light p-4 dark:border-dark">
                                <div className="mb-3 flex items-center justify-between">
                                    <h6 className="font-semibold">Item {index + 1}</h6>
                                    {items.length > 1 && (
                                        <button onClick={() => removeItem(item.id)} className="text-danger hover:text-danger/80">
                                            <IconX className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                                <div className="grid gap-4 md:grid-cols-4">
                                    <div className="md:col-span-2">
                                        <label className="mb-2 block text-sm font-semibold">Description</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Item description"
                                            value={item.description}
                                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold">Quantity</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            placeholder="0"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(item.id, 'quantity', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold">Unit Price</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            placeholder="0.00"
                                            value={item.unitPrice}
                                            onChange={(e) => handleItemChange(item.id, 'unitPrice', e.target.value)}
                                        />
                                    </div>
                                    <div className="md:col-span-4">
                                        <label className="mb-2 block text-sm font-semibold">Specifications</label>
                                        <textarea
                                            rows={2}
                                            className="form-textarea"
                                            placeholder="Technical specifications, quality requirements, etc."
                                            value={item.specifications}
                                            onChange={(e) => handleItemChange(item.id, 'specifications', e.target.value)}
                                        />
                                    </div>
                                    <div className="md:col-span-4">
                                        <div className="text-right text-sm">
                                            <span className="font-semibold">Total: </span>
                                            <span className="text-lg font-bold text-primary">${calculateItemTotal(item).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Totals */}
                    <div className="mt-6 rounded border border-white-light p-4 dark:border-dark">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold">Currency:</span>
                                <select className="form-select w-32" name="currency" value={formData.currency} onChange={handleInputChange}>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="GBP">GBP</option>
                                    <option value="JMD">JMD</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-between border-t border-white-light pt-3 dark:border-dark">
                                <span className="font-semibold">Subtotal:</span>
                                <span className="text-lg font-bold">${calculateSubtotal().toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">Tax Rate:</span>
                                    <input type="number" className="form-input w-20" name="taxRate" value={formData.taxRate} onChange={handleInputChange} />
                                    <span>%</span>
                                </div>
                                <span className="text-lg font-bold">${calculateTax().toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-white-light pt-3 dark:border-dark">
                                <span className="text-xl font-bold">Total Amount:</span>
                                <span className="text-2xl font-bold text-primary">
                                    {formData.currency} ${calculateTotal().toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Additional Information */}
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">Additional Information</h5>
                    <div className="space-y-5">
                        <div>
                            <label htmlFor="notes" className="mb-2 block font-semibold">
                                Additional Notes
                            </label>
                            <textarea
                                id="notes"
                                name="notes"
                                rows={4}
                                className="form-textarea"
                                placeholder="Bulk discounts, free delivery, special conditions, etc."
                                value={formData.notes}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <label htmlFor="termsAndConditions" className="mb-2 block font-semibold">
                                Terms & Conditions
                            </label>
                            <textarea
                                id="termsAndConditions"
                                name="termsAndConditions"
                                rows={4}
                                className="form-textarea"
                                placeholder="Payment terms, return policy, warranty coverage, etc."
                                value={formData.termsAndConditions}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-3">
                    <Link to="/procurement/quotes" className="btn btn-outline-secondary">
                        Cancel
                    </Link>
                    <button onClick={handleSaveDraft} className="btn btn-warning gap-2">
                        <IconSave className="h-4 w-4" />
                        Save as Draft
                    </button>
                    <button onClick={handleSubmitQuote} className="btn btn-success gap-2">
                        <IconSend className="h-4 w-4" />
                        Submit Quote
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewQuote;
