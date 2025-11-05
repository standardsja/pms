import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconPlus from '../../../components/Icon/IconPlus';
import IconX from '../../../components/Icon/IconX';
import IconSave from '../../../components/Icon/IconSave';
import IconSend from '../../../components/Icon/IconSend';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';

const NewRFQ = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        dispatch(setPageTitle('Create New RFQ'));
    });

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        requestNumber: '',
        category: '',
        issueDate: new Date().toISOString().split('T')[0],
        closingDate: '',
        deliveryDate: '',
        deliveryLocation: '',
        estimatedValue: '',
        currency: 'USD',
        paymentTerms: '',
        notes: '',
    });

    const [items, setItems] = useState([
        { id: 1, description: '', quantity: '', unit: '', specifications: '' },
    ]);

    const [selectedVendors, setSelectedVendors] = useState<number[]>([]);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [errorFields, setErrorFields] = useState<string[]>([]);
    const [alertType, setAlertType] = useState<'success' | 'warning'>('success');

    // Mock verified requests (to import/create RFQ from a verified request)
    const verifiedRequests = [
        {
            id: 'REQ-2025-100',
            title: 'New Workstations for Dev Team',
            requester: 'IT Department',
            items: [
                { id: 1, description: 'Desktop Computer - i7', quantity: '10', unit: 'Each', specifications: 'i7, 16GB RAM, 512GB SSD' },
                { id: 2, description: '24" Monitor', quantity: '10', unit: 'Each', specifications: 'IPS, 1080p' },
            ],
            category: 'IT Equipment',
            estimatedValue: 15000,
        },
        {
            id: 'REQ-2025-101',
            title: 'Office Chairs Replacement',
            requester: 'Facilities',
            items: [
                { id: 1, description: 'Ergonomic Chair', quantity: '30', unit: 'Each', specifications: 'Adjustable, lumbar support' },
            ],
            category: 'Furniture',
            estimatedValue: 9000,
        },
    ];

    // Mock vendor data
    const vendors = [
        { id: 1, name: 'ABC Corp', email: 'contact@abccorp.com', category: 'Office Supplies', rating: 4.5 },
        { id: 2, name: 'Tech Solutions', email: 'info@techsolutions.com', category: 'IT Equipment', rating: 4.8 },
        { id: 3, name: 'Office Pro', email: 'sales@officepro.com', category: 'Office Supplies', rating: 4.2 },
        { id: 4, name: 'Furniture Plus', email: 'support@furnitureplus.com', category: 'Furniture', rating: 4.6 },
        { id: 5, name: 'Supplies Direct', email: 'orders@suppliesdirect.com', category: 'Office Supplies', rating: 4.3 },
        { id: 6, name: 'IT World', email: 'contact@itworld.com', category: 'IT Equipment', rating: 4.7 },
    ];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const [importRequestId, setImportRequestId] = useState('');

    const handleImportRequest = () => {
        const req = verifiedRequests.find((r) => r.id === importRequestId);
        if (!req) return;
        setFormData((prev) => ({
            ...prev,
            title: req.title,
            requestNumber: req.id,
            category: req.category,
            estimatedValue: String(req.estimatedValue),
        }));
        // map items, ensure ids are numeric and unique
        const mapped = req.items.map((it: any, idx: number) => ({ id: idx + 1, description: it.description, quantity: it.quantity, unit: it.unit || 'Each', specifications: it.specifications || '' }));
        setItems(mapped);
    };

    const handleItemChange = (id: number, field: string, value: string) => {
        setItems(items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
    };

    const addItem = () => {
        const newId = Math.max(...items.map((i) => i.id), 0) + 1;
        setItems([...items, { id: newId, description: '', quantity: '', unit: '', specifications: '' }]);
    };

    const removeItem = (id: number) => {
        if (items.length > 1) {
            setItems(items.filter((item) => item.id !== id));
        }
    };

    const toggleVendor = (vendorId: number) => {
        if (selectedVendors.includes(vendorId)) {
            setSelectedVendors(selectedVendors.filter((id) => id !== vendorId));
        } else {
            setSelectedVendors([...selectedVendors, vendorId]);
        }
    };

    const handleSaveDraft = () => {
        // RFQ draft save logic would be implemented here
        
        // Show warning alert for draft
        setAlertType('warning');
        setAlertMessage('RFQ has been saved as draft. You can continue editing or send it later.');
        setShowSuccessAlert(true);
        
        // Hide alert and navigate after 3 seconds
        setTimeout(() => {
            setShowSuccessAlert(false);
            navigate('/procurement/rfq/list');
        }, 3000);
    };

    const handleSendRFQ = () => {
        const missingFields: string[] = [];
        
        if (!formData.title) missingFields.push('RFQ Title');
        if (!formData.closingDate) missingFields.push('Closing Date');
        if (selectedVendors.length === 0) missingFields.push('At least one vendor must be selected');
        
        if (missingFields.length > 0) {
            setErrorFields(missingFields);
            setShowErrorAlert(true);
            
            // Auto-hide error alert after 5 seconds
            setTimeout(() => {
                setShowErrorAlert(false);
            }, 5000);
            return;
        }
        
        // RFQ send logic would be implemented here
        
        // Show success alert for sending
        setAlertType('success');
        setAlertMessage(`RFQ "${formData.title}" has been sent successfully to ${selectedVendors.length} vendor(s). Vendors will receive the RFQ via email.`);
        setShowSuccessAlert(true);
        
        // Navigate after 3 seconds
        setTimeout(() => {
            setShowSuccessAlert(false);
            navigate('/procurement/rfq/list');
        }, 3000);
    };

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Create New RFQ</h2>
                    <p className="text-white-dark">Fill in the details to create a Request for Quotation</p>
                </div>
                <Link to="/procurement/rfq/list" className="btn btn-outline-danger gap-2">
                    <IconArrowLeft />
                    Back to RFQ List
                </Link>
            </div>

            <div className="space-y-6">
                {/* Basic Information */}
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">Basic Information</h5>
                    <div className="grid gap-5 md:grid-cols-2">
                        <div>
                            <label htmlFor="title" className="mb-2 block font-semibold">
                                RFQ Title <span className="text-danger">*</span>
                            </label>
                            <input
                                id="title"
                                name="title"
                                type="text"
                                className="form-input"
                                placeholder="e.g., Office Furniture Procurement"
                                value={formData.title}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="requestNumber" className="mb-2 block font-semibold">
                                Request Number
                            </label>
                            <input
                                id="requestNumber"
                                name="requestNumber"
                                type="text"
                                className="form-input"
                                placeholder="e.g., REQ-2024-001"
                                value={formData.requestNumber}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <label htmlFor="category" className="mb-2 block font-semibold">
                                Category
                            </label>
                            <select id="category" name="category" className="form-select" value={formData.category} onChange={handleInputChange}>
                                <option value="">Select Category</option>
                                <option value="Office Supplies">Office Supplies</option>
                                <option value="IT Equipment">IT Equipment</option>
                                <option value="Furniture">Furniture</option>
                                <option value="Services">Services</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="estimatedValue" className="mb-2 block font-semibold">
                                Estimated Value
                            </label>
                            <div className="flex gap-2">
                                <select id="currency" name="currency" className="form-select w-32" value={formData.currency} onChange={handleInputChange}>
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="GBP">GBP</option>
                                    <option value="JMD">JMD</option>
                                </select>
                                <input
                                    id="estimatedValue"
                                    name="estimatedValue"
                                    type="number"
                                    className="form-input flex-1"
                                    placeholder="0.00"
                                    value={formData.estimatedValue}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="issueDate" className="mb-2 block font-semibold">
                                Issue Date
                            </label>
                            <input id="issueDate" name="issueDate" type="date" className="form-input" value={formData.issueDate} onChange={handleInputChange} />
                        </div>
                        <div>
                            <label htmlFor="closingDate" className="mb-2 block font-semibold">
                                Closing Date <span className="text-danger">*</span>
                            </label>
                            <input
                                id="closingDate"
                                name="closingDate"
                                type="date"
                                className="form-input"
                                value={formData.closingDate}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="deliveryDate" className="mb-2 block font-semibold">
                                Expected Delivery Date
                            </label>
                            <input id="deliveryDate" name="deliveryDate" type="date" className="form-input" value={formData.deliveryDate} onChange={handleInputChange} />
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
                        <div className="md:col-span-2">
                            <label htmlFor="description" className="mb-2 block font-semibold">
                                Description
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                rows={4}
                                className="form-textarea"
                                placeholder="Provide a detailed description of what you need..."
                                value={formData.description}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>
                </div>

                {/* Items/Requirements */}
                <div className="panel">
                    <div className="mb-5 flex items-center justify-between">
                        <h5 className="text-lg font-semibold">Items / Requirements</h5>
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
                                <div className="grid gap-4 md:grid-cols-2">
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
                                        <label className="mb-2 block text-sm font-semibold">Unit</label>
                                        <select className="form-select" value={item.unit} onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}>
                                            <option value="">Select Unit</option>
                                            <option value="Each">Each</option>
                                            <option value="Box">Box</option>
                                            <option value="Case">Case</option>
                                            <option value="Dozen">Dozen</option>
                                            <option value="Set">Set</option>
                                            <option value="Piece">Piece</option>
                                            <option value="Kg">Kilogram</option>
                                            <option value="Lb">Pound</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="mb-2 block text-sm font-semibold">Specifications / Requirements</label>
                                        <textarea
                                            rows={2}
                                            className="form-textarea"
                                            placeholder="Technical specifications, quality requirements, etc."
                                            value={item.specifications}
                                            onChange={(e) => handleItemChange(item.id, 'specifications', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Vendor Selection */}
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">
                        Select Vendors <span className="text-danger">*</span>
                    </h5>
                    <p className="mb-4 text-sm text-white-dark">Choose vendors to send this RFQ to ({selectedVendors.length} selected)</p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {vendors.map((vendor) => (
                            <label
                                key={vendor.id}
                                className={`flex cursor-pointer items-start gap-3 rounded border p-4 transition ${
                                    selectedVendors.includes(vendor.id)
                                        ? 'border-primary bg-primary-light dark:bg-primary/20'
                                        : 'border-white-light hover:border-primary dark:border-dark'
                                }`}
                            >
                                <input type="checkbox" className="form-checkbox mt-1" checked={selectedVendors.includes(vendor.id)} onChange={() => toggleVendor(vendor.id)} />
                                <div className="flex-1">
                                    <div className="font-semibold">{vendor.name}</div>
                                    <div className="mt-1 text-xs text-white-dark">{vendor.email}</div>
                                    <div className="mt-2 flex gap-2 text-xs">
                                        <span className="rounded bg-white-light px-2 py-0.5 dark:bg-dark">{vendor.category}</span>
                                        <span className="text-warning">★ {vendor.rating}</span>
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Terms and Additional Information */}
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">Terms & Additional Information</h5>
                    <div className="space-y-5">
                        <div>
                            <label htmlFor="paymentTerms" className="mb-2 block font-semibold">
                                Payment Terms
                            </label>
                            <select id="paymentTerms" name="paymentTerms" className="form-select" value={formData.paymentTerms} onChange={handleInputChange}>
                                <option value="">Select Payment Terms</option>
                                <option value="Net 30">Net 30 Days</option>
                                <option value="Net 60">Net 60 Days</option>
                                <option value="Net 90">Net 90 Days</option>
                                <option value="50% Advance">50% Advance, 50% on Delivery</option>
                                <option value="100% Advance">100% Advance Payment</option>
                                <option value="COD">Cash on Delivery</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="notes" className="mb-2 block font-semibold">
                                Additional Notes / Instructions
                            </label>
                            <textarea
                                id="notes"
                                name="notes"
                                rows={4}
                                className="form-textarea"
                                placeholder="Any additional requirements, terms, or instructions for vendors..."
                                value={formData.notes}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-3">
                    <Link to="/procurement/rfq/list" className="btn btn-outline-secondary">
                        Cancel
                    </Link>
                    <button onClick={handleSaveDraft} className="btn btn-warning gap-2">
                        <IconSave className="h-4 w-4" />
                        Save as Draft
                    </button>
                    <button onClick={handleSendRFQ} className="btn btn-success gap-2">
                        <IconSend className="h-4 w-4" />
                        Send RFQ to Vendors
                    </button>
                </div>
            </div>

            {/* Success Alert Modal */}
            {showSuccessAlert && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60">
                    <div className="panel w-full max-w-lg overflow-hidden rounded-lg p-0">
                        <div className={`flex items-center p-3.5 rounded-t ${
                            alertType === 'success' 
                                ? 'text-success bg-success-light dark:bg-success-dark-light'
                                : 'text-warning bg-warning-light dark:bg-warning-dark-light'
                        }`}>
                            <span className="ltr:pr-2 rtl:pl-2 flex-1">
                                <strong className="ltr:mr-1 rtl:ml-1 text-lg">
                                    {alertType === 'success' ? 'Success!' : 'Saved!'}
                                </strong>
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
        </div>
    );
};

export default NewRFQ;
