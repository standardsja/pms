/**
 * RequestForm Component - Procurement Requisition Form
 * 
 * Features:
 * - Role-based access control (Requesters can only edit Section I)
 * - Form validation with error display
 * - File upload with size/type validation (10MB max)
 * - Auto-calculated estimated total
 * - API integration with error handling
 * 
 * @returns {JSX.Element} Procurement request form
 */
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconPlus from '../../components/Icon/IconPlus';
import IconX from '../../components/Icon/IconX';
import Swal from 'sweetalert2';

interface RequestItem {
    id: string;
    stockLevel: string;
    description: string;
    quantity: number;
    unitOfMeasure: string;
    unitCost: number;
    partNumber: string;
}

interface FormErrors {
    [key: string]: string;
}

interface User {
    name?: string;
    email?: string;
    roles?: string[];
    department_id?: number;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];

const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const RequestForm = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isRequester, setIsRequester] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    
    // Section I - Requester fields
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [requestedBy, setRequestedBy] = useState('');
    const [estimatedTotal, setEstimatedTotal] = useState(0);
    const [institution, setInstitution] = useState('');
    const [division, setDivision] = useState('');
    const [branchUnit, setBranchUnit] = useState('');
    const [budgetActivity, setBudgetActivity] = useState('yes');
    const [email, setEmail] = useState('');
    const [procurementType, setProcurementType] = useState<string[]>([]);
    const [priority, setPriority] = useState('');
    const [items, setItems] = useState<RequestItem[]>([
        { id: generateId(), stockLevel: '', description: '', quantity: 1, unitOfMeasure: '', unitCost: 0, partNumber: '' }
    ]);
    const [commentsJustification, setCommentsJustification] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    
    // Section II - Budget fields (disabled for requesters)
    const [managerName, setManagerName] = useState('');
    const [headName, setHeadName] = useState('');
    const [commitmentNumber, setCommitmentNumber] = useState('');
    const [accountingCode, setAccountingCode] = useState('');
    const [budgetComments, setBudgetComments] = useState('');
    const [budgetOfficerName, setBudgetOfficerName] = useState('');
    const [budgetManagerName, setBudgetManagerName] = useState('');
    
    // Section III - Procurement fields (disabled for requesters)
    const [procurementCaseNumber, setProcurementCaseNumber] = useState('');
    const [receivedBy, setReceivedBy] = useState('');
    const [dateReceived, setDateReceived] = useState('');
    const [actionDate, setActionDate] = useState('');
    const [procurementComments, setProcurementComments] = useState('');

    useEffect(() => {
        dispatch(setPageTitle('New Procurement Request'));
        
        const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
        setCurrentUser(user);
        
        if (user.name) setRequestedBy(user.name);
        if (user.email) setEmail(user.email);
        
        const roles = user.roles || [];
        setIsRequester(roles.includes('Requester'));
    }, [dispatch]);

    useEffect(() => {
        const total = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
        setEstimatedTotal(total);
    }, [items]);

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!institution.trim()) newErrors.institution = 'Institution is required';
        if (!division.trim()) newErrors.division = 'Division is required';
        if (!email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = 'Invalid email format';
        }
        if (!priority) newErrors.priority = 'Priority is required';
        if (procurementType.length === 0) newErrors.procurementType = 'Select at least one procurement type';
        
        items.forEach((item, index) => {
            if (!item.description.trim()) {
                newErrors[`item_${index}_description`] = 'Description is required';
            }
            if (item.quantity < 1) {
                newErrors[`item_${index}_quantity`] = 'Quantity must be at least 1';
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const addItem = () => {
        setItems([...items, { 
            id: generateId(),
            stockLevel: '', 
            description: '', 
            quantity: 1, 
            unitOfMeasure: '',
            unitCost: 0,
            partNumber: ''
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
            const newFiles = Array.from(e.target.files);
            const validFiles: File[] = [];
            const fileErrors: string[] = [];

            newFiles.forEach(file => {
                if (file.size > MAX_FILE_SIZE) {
                    fileErrors.push(`${file.name} exceeds 10MB limit`);
                    return;
                }

                const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
                if (!ACCEPTED_FILE_TYPES.includes(fileExt)) {
                    fileErrors.push(`${file.name} has an unsupported file type`);
                    return;
                }

                if (attachments.some(existing => existing.name === file.name && existing.size === file.size)) {
                    fileErrors.push(`${file.name} is already attached`);
                    return;
                }

                validFiles.push(file);
            });

            if (fileErrors.length > 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'File Upload Issues',
                    html: fileErrors.join('<br>'),
                });
            }

            if (validFiles.length > 0) {
                setAttachments([...attachments, ...validFiles]);
            }
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(attachments.filter((_, i) => i !== index));
    };

    const handleProcurementTypeChange = (type: string) => {
        setProcurementType(prev => 
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!validateForm()) {
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Please fix the errors in the form before submitting.',
            });
            return;
        }

        setIsLoading(true);

        try {
            const token = localStorage.getItem('auth_token');
            if (!token) throw new Error('No authentication token found');

            const formData = {
                date: formDate,
                requestedBy: requestedBy || currentUser?.name,
                estimatedTotal,
                institution,
                division,
                branchUnit,
                budgetActivity,
                email,
                procurementType,
                priority,
                items: items.map(({ id, ...rest }) => rest),
                commentsJustification,
                ...(!isRequester && {
                    managerName,
                    headName,
                    commitmentNumber,
                    accountingCode,
                    budgetComments,
                    budgetOfficerName,
                    budgetManagerName,
                    procurementCaseNumber,
                    receivedBy,
                    dateReceived,
                    actionDate,
                    procurementComments,
                }),
                attachments: attachments.map(f => f.name)
            };

            const response = await fetch('/api/requisitions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Server error: ${response.status}`);
            }

            await Swal.fire({
                icon: 'success',
                title: 'Request Submitted!',
                html: `Your procurement request <strong>${data.req_number || ''}</strong> has been submitted successfully.`,
            });

            navigate('/apps/requests', {
                state: {
                    add: {
                        id: data.req_number,
                        routeId: data.id,
                        title: items[0]?.description || 'New Request',
                        date: formDate,
                        status: 'Pending',
                        amount: estimatedTotal
                    }
                }
            });

        } catch (error: any) {
            console.error('Submission error:', error);
            Swal.fire({
                icon: 'error',
                title: 'Submission Failed',
                text: error.message || 'An error occurred while submitting your request. Please try again.',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6 text-center">
                <h1 className="text-2xl font-semibold">BUREAU OF STANDARDS JAMAICA</h1>
                <h2 className="text-xl font-semibold mt-1">PROCUREMENT REQUISITION FORM</h2>
            </div>

            <div className="bg-white dark:bg-slate-800 shadow rounded p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Section I: To be completed by Requestor */}
                    <div className="border-b-2 border-red-500 pb-4">
                        <h3 className="text-lg font-bold text-red-600 mb-4">Section I: To be completed by Requestor</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                                <label htmlFor="formDate" className="block text-sm font-medium mb-2">Date</label>
                                <input
                                    id="formDate"
                                    type="date"
                                    value={formDate}
                                    onChange={(e) => setFormDate(e.target.value)}
                                    className="form-input w-full"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="requestedBy" className="block text-sm font-medium mb-2">Requested by</label>
                                <input
                                    id="requestedBy"
                                    type="text"
                                    value={requestedBy}
                                    onChange={(e) => setRequestedBy(e.target.value)}
                                    className="form-input w-full"
                                    placeholder="Your name"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="estimatedTotal" className="block text-sm font-medium mb-2">Estimated Cost (Total)</label>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">JMD $</span>
                                    <input
                                        id="estimatedTotal"
                                        type="number"
                                        value={estimatedTotal}
                                        className="form-input flex-1 bg-gray-50 dark:bg-gray-900"
                                        step="0.01"
                                        readOnly
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label htmlFor="institution" className="block text-sm font-medium mb-2">Institution *</label>
                                <input
                                    id="institution"
                                    type="text"
                                    value={institution}
                                    onChange={(e) => setInstitution(e.target.value)}
                                    className="form-input w-full"
                                    placeholder="Bureau of Standards Jamaica"
                                    required
                                />
                                {errors.institution && (
                                    <p className="text-red-500 text-xs mt-1">{errors.institution}</p>
                                )}
                            </div>
                            <div>
                                <label htmlFor="division" className="block text-sm font-medium mb-2">Division *</label>
                                <input
                                    id="division"
                                    type="text"
                                    value={division}
                                    onChange={(e) => setDivision(e.target.value)}
                                    className="form-input w-full"
                                    placeholder="e.g., Procurement, IT, Finance"
                                    required
                                />
                                {errors.division && (
                                    <p className="text-red-500 text-xs mt-1">{errors.division}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label htmlFor="branchUnit" className="block text-sm font-medium mb-2">Branch / Unit</label>
                                <input
                                    id="branchUnit"
                                    type="text"
                                    value={branchUnit}
                                    onChange={(e) => setBranchUnit(e.target.value)}
                                    className="form-input w-full"
                                    placeholder="Optional"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Budget Activity</label>
                                <div className="flex gap-6 items-center h-[42px]">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="budgetActivity"
                                            value="yes"
                                            checked={budgetActivity === 'yes'}
                                            onChange={(e) => setBudgetActivity(e.target.value)}
                                            className="form-radio"
                                        />
                                        <span>Yes</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="budgetActivity"
                                            value="no"
                                            checked={budgetActivity === 'no'}
                                            onChange={(e) => setBudgetActivity(e.target.value)}
                                            className="form-radio"
                                        />
                                        <span>No</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium mb-2">E-Mail *</label>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="form-input w-full"
                                    placeholder="your.email@example.com"
                                    required
                                />
                                {errors.email && (
                                    <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Procurement Type *</label>
                                <div className="flex gap-4 flex-wrap items-center h-auto py-2">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={procurementType.includes('consulting')}
                                            onChange={() => handleProcurementTypeChange('consulting')}
                                            className="form-checkbox"
                                        />
                                        <span className="text-sm">Consulting Service</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={procurementType.includes('goods')}
                                            onChange={() => handleProcurementTypeChange('goods')}
                                            className="form-checkbox"
                                        />
                                        <span className="text-sm">Goods</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={procurementType.includes('nonConsulting')}
                                            onChange={() => handleProcurementTypeChange('nonConsulting')}
                                            className="form-checkbox"
                                        />
                                        <span className="text-sm">Non-Consulting Service</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={procurementType.includes('works')}
                                            onChange={() => handleProcurementTypeChange('works')}
                                            className="form-checkbox"
                                        />
                                        <span className="text-sm">Works</span>
                                    </label>
                                </div>
                                {errors.procurementType && (
                                    <p className="text-red-500 text-xs mt-1">{errors.procurementType}</p>
                                )}
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Priority *</label>
                            <div className="flex gap-6">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="priority"
                                        value="veryHigh"
                                        checked={priority === 'veryHigh'}
                                        onChange={(e) => setPriority(e.target.value)}
                                        className="form-radio"
                                    />
                                    <span>Very High</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="priority"
                                        value="high"
                                        checked={priority === 'high'}
                                        onChange={(e) => setPriority(e.target.value)}
                                        className="form-radio"
                                    />
                                    <span>High</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="priority"
                                        value="medium"
                                        checked={priority === 'medium'}
                                        onChange={(e) => setPriority(e.target.value)}
                                        className="form-radio"
                                    />
                                    <span>Medium</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="priority"
                                        value="low"
                                        checked={priority === 'low'}
                                        onChange={(e) => setPriority(e.target.value)}
                                        className="form-radio"
                                    />
                                    <span>Low</span>
                                </label>
                            </div>
                            {errors.priority && (
                                <p className="text-red-500 text-xs mt-1">{errors.priority}</p>
                            )}
                        </div>

                        {/* Items Table */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium">Items/Services</label>
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                >
                                    <IconPlus className="w-4 h-4" />
                                    Add Item
                                </button>
                            </div>

                            <div className="overflow-x-auto border border-gray-300 dark:border-gray-600 rounded">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-900">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium">Item No.</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium">Stock Level</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium">Description of Works/Goods/Services</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium">Quantity</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium">Unit of Measure</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium">Unit Cost</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium">Part Number</th>
                                            <th className="px-3 py-2 text-center text-xs font-medium">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {items.map((item, index) => (
                                            <tr key={item.id}>
                                                <td className="px-3 py-2 text-center">{index + 1}</td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="text"
                                                        value={item.stockLevel}
                                                        onChange={(e) => updateItem(item.id, 'stockLevel', e.target.value)}
                                                        className="form-input w-full"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <textarea
                                                        value={item.description}
                                                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                                                        className="form-textarea w-full"
                                                        rows={2}
                                                        placeholder="Provide detailed specifications"
                                                        required
                                                    />
                                                    {errors[`item_${index}_description`] && (
                                                        <p className="text-red-500 text-xs mt-1">{errors[`item_${index}_description`]}</p>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                                        className="form-input w-full"
                                                        min="1"
                                                        required
                                                    />
                                                    {errors[`item_${index}_quantity`] && (
                                                        <p className="text-red-500 text-xs mt-1">{errors[`item_${index}_quantity`]}</p>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="text"
                                                        value={item.unitOfMeasure}
                                                        onChange={(e) => updateItem(item.id, 'unitOfMeasure', e.target.value)}
                                                        className="form-input w-full"
                                                        placeholder="e.g., Each, Box, Kg"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="number"
                                                        value={item.unitCost}
                                                        onChange={(e) => updateItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                                                        className="form-input w-full"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0.00"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="text"
                                                        value={item.partNumber}
                                                        onChange={(e) => updateItem(item.id, 'partNumber', e.target.value)}
                                                        className="form-input w-full"
                                                        placeholder="Optional"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    {items.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(item.id)}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            <IconX className="w-5 h-5" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                                Add additional rows as needed.
                            </p>
                        </div>

                        {/* Comments/Justification */}
                        <div className="mb-4">
                            <label htmlFor="commentsJustification" className="block text-sm font-medium mb-2">Comments/Justification:</label>
                            <textarea
                                id="commentsJustification"
                                value={commentsJustification}
                                onChange={(e) => setCommentsJustification(e.target.value)}
                                className="form-textarea w-full"
                                rows={3}
                                placeholder="Provide justification for this procurement request"
                            />
                        </div>

                        {/* Approved by - Disabled for Requestors */}
                        <fieldset disabled={isRequester} className={isRequester ? "border-t pt-4 opacity-60 cursor-not-allowed" : "border-t pt-4"}>
                            <p className="text-sm font-semibold mb-3">Approved by:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="managerName" className="block text-sm font-medium mb-2">Manager of Division's Name:</label>
                                    <input
                                        id="managerName"
                                        type="text"
                                        value={managerName}
                                        onChange={(e) => setManagerName(e.target.value)}
                                        className={`form-input w-full mb-3 ${isRequester ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                                        placeholder="Full name"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Signature:</label>
                                            <input type="text" className={`form-input w-full ${isRequester ? 'bg-gray-100 dark:bg-gray-800' : ''}`} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Date:</label>
                                            <input type="date" className={`form-input w-full ${isRequester ? 'bg-gray-100 dark:bg-gray-800' : ''}`} />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="headName" className="block text-sm font-medium mb-2">Head of Division's Name:</label>
                                    <input
                                        id="headName"
                                        type="text"
                                        value={headName}
                                        onChange={(e) => setHeadName(e.target.value)}
                                        className={`form-input w-full mb-3 ${isRequester ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                                        placeholder="Full name"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Signature:</label>
                                            <input type="text" className={`form-input w-full ${isRequester ? 'bg-gray-100 dark:bg-gray-800' : ''}`} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Date:</label>
                                            <input type="date" className={`form-input w-full ${isRequester ? 'bg-gray-100 dark:bg-gray-800' : ''}`} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </fieldset>
                    </div>

                    {/* Section II: Commitment from Budget - Disabled for Requestors */}
                    <fieldset disabled={isRequester} className={isRequester ? "border-b-2 border-red-500 pb-4 opacity-60 cursor-not-allowed" : "border-b-2 border-red-500 pb-4"}>
                        <h3 className="text-lg font-bold text-red-600 mb-4">Section II: Commitment from Budget</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label htmlFor="commitmentNumber" className="block text-sm font-medium mb-2">Commitment Number:</label>
                                <input
                                    id="commitmentNumber"
                                    type="text"
                                    value={commitmentNumber}
                                    onChange={(e) => setCommitmentNumber(e.target.value)}
                                    className={`form-input w-full ${isRequester ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                                />
                            </div>
                            <div>
                                <label htmlFor="accountingCode" className="block text-sm font-medium mb-2">Accounting Code:</label>
                                <input
                                    id="accountingCode"
                                    type="text"
                                    value={accountingCode}
                                    onChange={(e) => setAccountingCode(e.target.value)}
                                    className={`form-input w-full ${isRequester ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label htmlFor="budgetComments" className="block text-sm font-medium mb-2">Comments:</label>
                            <textarea
                                id="budgetComments"
                                value={budgetComments}
                                onChange={(e) => setBudgetComments(e.target.value)}
                                className={`form-textarea w-full ${isRequester ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                                rows={2}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="budgetOfficerName" className="block text-sm font-medium mb-2">Budget Officer's Name:</label>
                                <input
                                    id="budgetOfficerName"
                                    type="text"
                                    value={budgetOfficerName}
                                    onChange={(e) => setBudgetOfficerName(e.target.value)}
                                    className={`form-input w-full mb-3 ${isRequester ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Signature:</label>
                                        <input type="text" className={`form-input w-full ${isRequester ? 'bg-gray-100 dark:bg-gray-800' : ''}`} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Date:</label>
                                        <input type="date" className={`form-input w-full ${isRequester ? 'bg-gray-100 dark:bg-gray-800' : ''}`} />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="budgetManagerName" className="block text-sm font-medium mb-2">Budget Manager's Name:</label>
                                <input
                                    id="budgetManagerName"
                                    type="text"
                                    value={budgetManagerName}
                                    onChange={(e) => setBudgetManagerName(e.target.value)}
                                    className={`form-input w-full mb-3 ${isRequester ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Signature:</label>
                                        <input type="text" className={`form-input w-full ${isRequester ? 'bg-gray-100 dark:bg-gray-800' : ''}`} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Date:</label>
                                        <input type="date" className={`form-input w-full ${isRequester ? 'bg-gray-100 dark:bg-gray-800' : ''}`} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    {/* Section III: To be completed by Procurement unit - Disabled for Requestors */}
                    <fieldset disabled={isRequester} className={isRequester ? "pb-4 opacity-60 cursor-not-allowed" : "pb-4"}>
                        <h3 className="text-lg font-bold text-red-600 mb-4">Section III: To be completed by Procurement unit</h3>
                        
                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded mb-4">
                            <p className="text-center font-semibold mb-3">For Procurement office use only.</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="receivedBy" className="block text-sm font-medium mb-2">Rec'd By:</label>
                                    <input
                                        id="receivedBy"
                                        type="text"
                                        value={receivedBy}
                                        onChange={(e) => setReceivedBy(e.target.value)}
                                        className={`form-input w-full ${isRequester ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="procurementCaseNumber" className="block text-sm font-medium mb-2">Procurement Case Number:</label>
                                    <input
                                        id="procurementCaseNumber"
                                        type="text"
                                        value={procurementCaseNumber}
                                        onChange={(e) => setProcurementCaseNumber(e.target.value)}
                                        className={`form-input w-full ${isRequester ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="dateReceived" className="block text-sm font-medium mb-2">Date Rec'd:</label>
                                    <input
                                        id="dateReceived"
                                        type="date"
                                        value={dateReceived}
                                        onChange={(e) => setDateReceived(e.target.value)}
                                        className={`form-input w-full ${isRequester ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="actionDate" className="block text-sm font-medium mb-2">Action Date:</label>
                                    <input
                                        id="actionDate"
                                        type="date"
                                        value={actionDate}
                                        onChange={(e) => setActionDate(e.target.value)}
                                        className={`form-input w-full ${isRequester ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label htmlFor="procurementComments" className="block text-sm font-medium mb-2">Comments:</label>
                                <textarea
                                    id="procurementComments"
                                    value={procurementComments}
                                    onChange={(e) => setProcurementComments(e.target.value)}
                                    className={`form-textarea w-full ${isRequester ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
                                    rows={2}
                                />
                            </div>
                        </div>
                    </fieldset>

                    {/* Attachments */}
                    <div className="border-t pt-4">
                        <label className="block text-sm font-medium mb-2">Supporting Documents</label>
                        <div className="space-y-2">
                            <input
                                type="file"
                                onChange={handleFileChange}
                                className="form-input w-full"
                                multiple
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                PDF, Word, Excel, or Images (Max 10MB per file)
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
                            disabled={isLoading}
                            className="px-6 py-2 rounded bg-primary text-white hover:opacity-95 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Submitting...' : 'Submit Procurement Request'}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/apps/requests')}
                            disabled={isLoading}
                            className="px-6 py-2 rounded border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
