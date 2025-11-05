/**
 * RequestForm Component - Procurement Requisition Form
 * 
 * Features:
 * - Role-based access control (Requesters can only edit Section I)
 * - Form validation with real-time debounced feedback
 * - File upload with size/type validation and progress indicator
 * - Auto-save to prevent data loss
 * - Auto-calculated estimated total
 * - API integration with error handling
 * - Error boundary for crash protection
 * 
 * @returns {JSX.Element} Procurement request form
 */
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconX from '../../components/Icon/IconX';
import ItemsTable, { RequestItem } from '../../components/ItemsTable';
import ErrorBoundary from '../../components/ErrorBoundary';
import { useAutoSave, restoreAutoSave, clearAutoSave } from '../../utils/useAutoSave';
import { useDebounce } from '../../utils/useDebounce';
import { uploadWithProgress, createFormData } from '../../utils/uploadWithProgress';
import Swal from 'sweetalert2';

interface FormErrors {
    [key: string]: string;
}

interface User {
    name?: string;
    email?: string;
    roles?: string[];
    department_id?: number;
}

interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    data?: T;
    errors?: Record<string, string[]>;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];
const ROLE_REQUESTER = 'Requester';

const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const RequestForm = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isRequester, setIsRequester] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [errors, setErrors] = useState<FormErrors>({});
    
    // Computed className for disabled fields
    const disabledFieldClass = isRequester ? 'bg-gray-100 dark:bg-gray-800' : '';
    
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

    // Auto-save form data (debounced by 2 seconds)
    const formData = {
        formDate, requestedBy, institution, division, branchUnit, budgetActivity,
        email, procurementType, priority, items, commentsJustification,
        managerName, headName, commitmentNumber, accountingCode, budgetComments,
        budgetOfficerName, budgetManagerName, procurementCaseNumber, receivedBy,
        dateReceived, actionDate, procurementComments
    };
    useAutoSave('procurement_request_draft', formData, 2000);

    // Debounced validation for real-time feedback
    const debouncedInstitution = useDebounce(institution, 500);
    const debouncedEmail = useDebounce(email, 500);

    useEffect(() => {
        dispatch(setPageTitle('New Procurement Request'));
        
        try {
            const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
            setCurrentUser(user);
            
            if (user.name) setRequestedBy(user.name);
            if (user.email) setEmail(user.email);
            
            const roles = user.roles || [];
            setIsRequester(roles.includes(ROLE_REQUESTER));

            // Restore auto-saved draft
            const savedDraft = restoreAutoSave<typeof formData>('procurement_request_draft');
            if (savedDraft) {
                Swal.fire({
                    title: 'Draft Found',
                    text: 'Would you like to restore your previous draft?',
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonText: 'Restore',
                    cancelButtonText: 'Start Fresh'
                }).then((result) => {
                    if (result.isConfirmed) {
                        // Restore all saved fields
                        if (savedDraft.formDate) setFormDate(savedDraft.formDate);
                        if (savedDraft.requestedBy) setRequestedBy(savedDraft.requestedBy);
                        if (savedDraft.institution) setInstitution(savedDraft.institution);
                        if (savedDraft.division) setDivision(savedDraft.division);
                        if (savedDraft.branchUnit) setBranchUnit(savedDraft.branchUnit);
                        if (savedDraft.budgetActivity) setBudgetActivity(savedDraft.budgetActivity);
                        if (savedDraft.email) setEmail(savedDraft.email);
                        if (savedDraft.procurementType) setProcurementType(savedDraft.procurementType);
                        if (savedDraft.priority) setPriority(savedDraft.priority);
                        if (savedDraft.items) setItems(savedDraft.items);
                        if (savedDraft.commentsJustification) setCommentsJustification(savedDraft.commentsJustification);
                        
                        if (!roles.includes(ROLE_REQUESTER)) {
                            if (savedDraft.managerName) setManagerName(savedDraft.managerName);
                            if (savedDraft.headName) setHeadName(savedDraft.headName);
                            if (savedDraft.commitmentNumber) setCommitmentNumber(savedDraft.commitmentNumber);
                            if (savedDraft.accountingCode) setAccountingCode(savedDraft.accountingCode);
                            if (savedDraft.budgetComments) setBudgetComments(savedDraft.budgetComments);
                            if (savedDraft.budgetOfficerName) setBudgetOfficerName(savedDraft.budgetOfficerName);
                            if (savedDraft.budgetManagerName) setBudgetManagerName(savedDraft.budgetManagerName);
                            if (savedDraft.procurementCaseNumber) setProcurementCaseNumber(savedDraft.procurementCaseNumber);
                            if (savedDraft.receivedBy) setReceivedBy(savedDraft.receivedBy);
                            if (savedDraft.dateReceived) setDateReceived(savedDraft.dateReceived);
                            if (savedDraft.actionDate) setActionDate(savedDraft.actionDate);
                            if (savedDraft.procurementComments) setProcurementComments(savedDraft.procurementComments);
                        }

                        Swal.fire('Restored!', 'Your draft has been restored.', 'success');
                    } else {
                        clearAutoSave('procurement_request_draft');
                    }
                });
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            setIsRequester(true);
        }
    }, [dispatch]);

    // Real-time validation for debounced fields
    useEffect(() => {
        if (debouncedInstitution && !debouncedInstitution.trim()) {
            setErrors(prev => ({ ...prev, institution: 'Institution is required' }));
        } else {
            setErrors(prev => {
                const { institution, ...rest } = prev;
                return rest;
            });
        }
    }, [debouncedInstitution]);

    useEffect(() => {
        if (debouncedEmail) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(debouncedEmail)) {
                setErrors(prev => ({ ...prev, email: 'Invalid email format' }));
            } else {
                setErrors(prev => {
                    const { email, ...rest } = prev;
                    return rest;
                });
            }
        }
    }, [debouncedEmail]);

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
        setUploadProgress(0);

        try {
            const token = localStorage.getItem('auth_token');
            if (!token) throw new Error('No authentication token found');

            const requestData = {
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
                })
            };

            // Use FormData for file upload with progress
            const formDataToSend = createFormData(requestData, attachments);

            const data: ApiResponse<{ req_number: string; id: number }> = await uploadWithProgress(
                '/api/requisitions',
                formDataToSend,
                token,
                (progress) => {
                    setUploadProgress(progress);
                }
            );

            if (!data.success) {
                throw new Error(data.message || 'Submission failed');
            }

            // Clear auto-save after successful submission
            clearAutoSave('procurement_request_draft');

            await Swal.fire({
                icon: 'success',
                title: 'Request Submitted!',
                html: `Your procurement request <strong>${data.data?.req_number || ''}</strong> has been submitted successfully.`,
            });

            navigate('/apps/requests', {
                state: {
                    add: {
                        id: data.data?.req_number,
                        routeId: data.data?.id,
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
            setUploadProgress(0);
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
                                    placeholder="Institution name"
                                    required
                                    aria-invalid={!!errors.institution}
                                    aria-describedby={errors.institution ? 'institution-error' : undefined}
                                />
                                {errors.institution && (
                                    <p id="institution-error" role="alert" className="text-red-500 text-xs mt-1">{errors.institution}</p>
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
                                    aria-invalid={!!errors.division}
                                    aria-describedby={errors.division ? 'division-error' : undefined}
                                />
                                {errors.division && (
                                    <p id="division-error" role="alert" className="text-red-500 text-xs mt-1">{errors.division}</p>
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
                                    aria-invalid={!!errors.email}
                                    aria-describedby={errors.email ? 'email-error' : undefined}
                                />
                                {errors.email && (
                                    <p id="email-error" role="alert" className="text-red-500 text-xs mt-1">{errors.email}</p>
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
                                    <p role="alert" className="text-red-500 text-xs mt-1">{errors.procurementType}</p>
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
                                <p role="alert" className="text-red-500 text-xs mt-1">{errors.priority}</p>
                            )}
                        </div>

                        {/* Items Table */}
                        <ItemsTable
                            items={items}
                            errors={errors}
                            onAddItem={addItem}
                            onRemoveItem={removeItem}
                            onUpdateItem={updateItem}
                        />

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
                                        className={`form-input w-full mb-3 ${disabledFieldClass}`}
                                        placeholder="Full name"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Signature:</label>
                                            <input type="text" className={`form-input w-full ${disabledFieldClass}`} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Date:</label>
                                            <input type="date" className={`form-input w-full ${disabledFieldClass}`} />
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
                                        className={`form-input w-full mb-3 ${disabledFieldClass}`}
                                        placeholder="Full name"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Signature:</label>
                                            <input type="text" className={`form-input w-full ${disabledFieldClass}`} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Date:</label>
                                            <input type="date" className={`form-input w-full ${disabledFieldClass}`} />
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
                                    className={`form-input w-full ${disabledFieldClass}`}
                                />
                            </div>
                            <div>
                                <label htmlFor="accountingCode" className="block text-sm font-medium mb-2">Accounting Code:</label>
                                <input
                                    id="accountingCode"
                                    type="text"
                                    value={accountingCode}
                                    onChange={(e) => setAccountingCode(e.target.value)}
                                    className={`form-input w-full ${disabledFieldClass}`}
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label htmlFor="budgetComments" className="block text-sm font-medium mb-2">Comments:</label>
                            <textarea
                                id="budgetComments"
                                value={budgetComments}
                                onChange={(e) => setBudgetComments(e.target.value)}
                                className={`form-textarea w-full ${disabledFieldClass}`}
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
                                    className={`form-input w-full mb-3 ${disabledFieldClass}`}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Signature:</label>
                                        <input type="text" className={`form-input w-full ${disabledFieldClass}`} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Date:</label>
                                        <input type="date" className={`form-input w-full ${disabledFieldClass}`} />
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
                                    className={`form-input w-full mb-3 ${disabledFieldClass}`}
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Signature:</label>
                                        <input type="text" className={`form-input w-full ${disabledFieldClass}`} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Date:</label>
                                        <input type="date" className={`form-input w-full ${disabledFieldClass}`} />
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
                                        className={`form-input w-full ${disabledFieldClass}`}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="procurementCaseNumber" className="block text-sm font-medium mb-2">Procurement Case Number:</label>
                                    <input
                                        id="procurementCaseNumber"
                                        type="text"
                                        value={procurementCaseNumber}
                                        onChange={(e) => setProcurementCaseNumber(e.target.value)}
                                        className={`form-input w-full ${disabledFieldClass}`}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="dateReceived" className="block text-sm font-medium mb-2">Date Rec'd:</label>
                                    <input
                                        id="dateReceived"
                                        type="date"
                                        value={dateReceived}
                                        onChange={(e) => setDateReceived(e.target.value)}
                                        className={`form-input w-full ${disabledFieldClass}`}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="actionDate" className="block text-sm font-medium mb-2">Action Date:</label>
                                    <input
                                        id="actionDate"
                                        type="date"
                                        value={actionDate}
                                        onChange={(e) => setActionDate(e.target.value)}
                                        className={`form-input w-full ${disabledFieldClass}`}
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label htmlFor="procurementComments" className="block text-sm font-medium mb-2">Comments:</label>
                                <textarea
                                    id="procurementComments"
                                    value={procurementComments}
                                    onChange={(e) => setProcurementComments(e.target.value)}
                                    className={`form-textarea w-full ${disabledFieldClass}`}
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
                                                ({formatFileSize(file.size)})
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
                            className="px-6 py-2 rounded bg-primary text-white hover:opacity-95 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isLoading && (
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            )}
                            {isLoading ? (uploadProgress > 0 ? `Uploading ${uploadProgress}%` : 'Submitting...') : 'Submit Procurement Request'}
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

// Wrap component in ErrorBoundary
const RequestFormWithErrorBoundary = () => (
    <ErrorBoundary>
        <RequestForm />
    </ErrorBoundary>
);

export default RequestFormWithErrorBoundary;
