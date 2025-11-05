import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconPlus from '../../components/Icon/IconPlus';
import IconX from '../../components/Icon/IconX';

interface RequestItem {
    itemNo: number;
    stockLevel: string;
    description: string;
    quantity: number;
    unitOfMeasure: string;
    unitCost: number;
    partNumber: string;
}

const RequestForm = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [estimatedTotal, setEstimatedTotal] = useState(0);
    const [institution, setInstitution] = useState('');
    const [division, setDivision] = useState('');
    const [branchUnit, setBranchUnit] = useState('');
    const [budgetActivity, setBudgetActivity] = useState('yes');
    const [email, setEmail] = useState('');
    const [procurementType, setProcurementType] = useState<string[]>([]);
    const [priority, setPriority] = useState('');
    const [items, setItems] = useState<RequestItem[]>([
        { itemNo: 1, stockLevel: '', description: '', quantity: 1, unitOfMeasure: '', unitCost: 0, partNumber: '' }
    ]);
    const [commentsJustification, setCommentsJustification] = useState('');
    const [managerName, setManagerName] = useState('');
    const [headName, setHeadName] = useState('');
    const [commitmentNumber, setCommitmentNumber] = useState('');
    const [accountingCode, setAccountingCode] = useState('');
    const [budgetComments, setBudgetComments] = useState('');
    const [budgetOfficerName, setBudgetOfficerName] = useState('');
    const [budgetManagerName, setBudgetManagerName] = useState('');
    const [procurementCaseNumber, setProcurementCaseNumber] = useState('');
    const [receivedBy, setReceivedBy] = useState('');
    const [dateReceived, setDateReceived] = useState('');
    const [actionDate, setActionDate] = useState('');
    const [procurementComments, setProcurementComments] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);

    useEffect(() => {
        dispatch(setPageTitle('New Procurement Request'));
        // Calculate total whenever items change
        const total = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
        setEstimatedTotal(total);
    }, [dispatch, items]);

    const addItem = () => {
        const newItemNo = items.length + 1;
        setItems([...items, { 
            itemNo: newItemNo,
            stockLevel: '', 
            description: '', 
            quantity: 1, 
            unitOfMeasure: '',
            unitCost: 0,
            partNumber: ''
        }]);
    };

    const removeItem = (itemNo: number) => {
        if (items.length > 1) {
            const updatedItems = items
                .filter(item => item.itemNo !== itemNo)
                .map((item, index) => ({ ...item, itemNo: index + 1 }));
            setItems(updatedItems);
        }
    };

    const updateItem = (itemNo: number, field: keyof RequestItem, value: string | number) => {
        setItems(items.map(item => 
            item.itemNo === itemNo ? { ...item, [field]: value } : item
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

    const handleProcurementTypeChange = (type: string) => {
        if (procurementType.includes(type)) {
            setProcurementType(procurementType.filter(t => t !== type));
        } else {
            setProcurementType([...procurementType, type]);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const formData = {
            date: formDate,
            requestedBy: 'Current User', // TODO: Get from auth
            estimatedTotal,
            institution,
            division,
            branchUnit,
            budgetActivity,
            email,
            procurementType,
            priority,
            items,
            commentsJustification,
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
            attachments: attachments.map(f => f.name)
        };
        console.log('Procurement Request Data:', formData);
        alert('Procurement Request submitted! (Add API integration here)');
        navigate('/apps/requests');
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
                                <label className="block text-sm font-medium mb-2">Date: {formDate}</label>
                                <input
                                    type="date"
                                    value={formDate}
                                    onChange={(e) => setFormDate(e.target.value)}
                                    className="form-input w-full"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Requested by</label>
                                <input
                                    type="text"
                                    className="form-input w-full"
                                    placeholder="Click here to enter text"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Estimated Cost (Total)</label>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">JMD $</span>
                                    <input
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
                                <label className="block text-sm font-medium mb-2">Institution</label>
                                <input
                                    type="text"
                                    value={institution}
                                    onChange={(e) => setInstitution(e.target.value)}
                                    className="form-input w-full"
                                    placeholder="Choose an item"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Division</label>
                                <input
                                    type="text"
                                    value={division}
                                    onChange={(e) => setDivision(e.target.value)}
                                    className="form-input w-full"
                                    placeholder="Choose an item"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Branch / Unit</label>
                                <input
                                    type="text"
                                    value={branchUnit}
                                    onChange={(e) => setBranchUnit(e.target.value)}
                                    className="form-input w-full"
                                    placeholder="Choose an item"
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
                                        <span>yes</span>
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
                                        <span>no</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">E-Mail</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="form-input w-full"
                                    placeholder="Enter email"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Procurement Type</label>
                                <div className="flex gap-4 flex-wrap items-center h-[42px]">
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
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Priority</label>
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
                                        {items.map((item) => (
                                            <tr key={item.itemNo}>
                                                <td className="px-3 py-2 text-center">{item.itemNo}</td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="text"
                                                        value={item.stockLevel}
                                                        onChange={(e) => updateItem(item.itemNo, 'stockLevel', e.target.value)}
                                                        className="form-input w-full"
                                                        placeholder=""
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <textarea
                                                        value={item.description}
                                                        onChange={(e) => updateItem(item.itemNo, 'description', e.target.value)}
                                                        className="form-textarea w-full"
                                                        rows={2}
                                                        placeholder="Generic specification to be provided"
                                                        required
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="number"
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(item.itemNo, 'quantity', parseInt(e.target.value) || 1)}
                                                        className="form-input w-full"
                                                        min="1"
                                                        required
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="text"
                                                        value={item.unitOfMeasure}
                                                        onChange={(e) => updateItem(item.itemNo, 'unitOfMeasure', e.target.value)}
                                                        className="form-input w-full"
                                                        placeholder="Each"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="number"
                                                        value={item.unitCost}
                                                        onChange={(e) => updateItem(item.itemNo, 'unitCost', parseFloat(e.target.value) || 0)}
                                                        className="form-input w-full"
                                                        step="0.01"
                                                        min="0"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="text"
                                                        value={item.partNumber}
                                                        onChange={(e) => updateItem(item.itemNo, 'partNumber', e.target.value)}
                                                        className="form-input w-full"
                                                        placeholder="If applicable"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    {items.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(item.itemNo)}
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
                                Please continue the description on a separate page if the above space is inadequate. Add rows as required.
                            </p>
                        </div>

                        {/* Comments/Justification */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Comments/Justification:</label>
                            <textarea
                                value={commentsJustification}
                                onChange={(e) => setCommentsJustification(e.target.value)}
                                className="form-textarea w-full"
                                rows={3}
                                placeholder="Click or tap here to enter text."
                            />
                        </div>

                        {/* Approved by - Disabled for Requestors */}
                        <fieldset disabled className="border-t pt-4 opacity-60 cursor-not-allowed">
                            <p className="text-sm font-semibold mb-3">Approved by:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Manager of Division's Name:</label>
                                    <input
                                        type="text"
                                        value={managerName}
                                        onChange={(e) => setManagerName(e.target.value)}
                                        className="form-input w-full mb-3 bg-gray-100 dark:bg-gray-800"
                                        placeholder="Enter name of head of department"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Signature:</label>
                                            <input type="text" className="form-input w-full bg-gray-100 dark:bg-gray-800" placeholder="" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Date:</label>
                                            <input type="date" className="form-input w-full bg-gray-100 dark:bg-gray-800" defaultValue="2025-05-15" />
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Head of Division's Name:</label>
                                    <input
                                        type="text"
                                        value={headName}
                                        onChange={(e) => setHeadName(e.target.value)}
                                        className="form-input w-full mb-3 bg-gray-100 dark:bg-gray-800"
                                        placeholder="Enter name of head of department"
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Signature:</label>
                                            <input type="text" className="form-input w-full bg-gray-100 dark:bg-gray-800" placeholder="" />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Date:</label>
                                            <input type="date" className="form-input w-full bg-gray-100 dark:bg-gray-800" defaultValue="2025-05-15" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </fieldset>
                    </div>

                    {/* Section II: Commitment from Budget - Disabled for Requestors */}
                    <fieldset disabled className="border-b-2 border-red-500 pb-4 opacity-60 cursor-not-allowed">
                        <h3 className="text-lg font-bold text-red-600 mb-4">Section II: Commitment from Budget</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Commitment Number:</label>
                                <input
                                    type="text"
                                    value={commitmentNumber}
                                    onChange={(e) => setCommitmentNumber(e.target.value)}
                                    className="form-input w-full"
                                    placeholder=""
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Accounting Code:</label>
                                <input
                                    type="text"
                                    value={accountingCode}
                                    onChange={(e) => setAccountingCode(e.target.value)}
                                    className="form-input w-full"
                                    placeholder=""
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Comments:</label>
                            <textarea
                                value={budgetComments}
                                onChange={(e) => setBudgetComments(e.target.value)}
                                className="form-textarea w-full bg-gray-100 dark:bg-gray-800"
                                rows={2}
                                placeholder=""
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium mb-2">Budget Officer's Name:</label>
                                <input
                                    type="text"
                                    value={budgetOfficerName}
                                    onChange={(e) => setBudgetOfficerName(e.target.value)}
                                    className="form-input w-full mb-3 bg-gray-100 dark:bg-gray-800"
                                    placeholder=""
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Signature:</label>
                                        <input type="text" className="form-input w-full bg-gray-100 dark:bg-gray-800" placeholder="" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Date:</label>
                                        <input type="date" className="form-input w-full bg-gray-100 dark:bg-gray-800" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Budget Manager's Name:</label>
                                <input
                                    type="text"
                                    value={budgetManagerName}
                                    onChange={(e) => setBudgetManagerName(e.target.value)}
                                    className="form-input w-full mb-3 bg-gray-100 dark:bg-gray-800"
                                    placeholder=""
                                />
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Signature:</label>
                                        <input type="text" className="form-input w-full bg-gray-100 dark:bg-gray-800" placeholder="" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Date:</label>
                                        <input type="date" className="form-input w-full bg-gray-100 dark:bg-gray-800" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </fieldset>

                    {/* Section III: To be completed by Procurement unit - Disabled for Requestors */}
                    <fieldset disabled className="pb-4 opacity-60 cursor-not-allowed">
                        <h3 className="text-lg font-bold text-red-600 mb-4">Section III: To be completed by Procurement unit</h3>
                        
                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded mb-4">
                            <p className="text-center font-semibold mb-3">For Procurement office use only.</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Rec'd By:</label>
                                    <input
                                        type="text"
                                        value={receivedBy}
                                        onChange={(e) => setReceivedBy(e.target.value)}
                                        className="form-input w-full bg-gray-100 dark:bg-gray-800"
                                        placeholder=""
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Procurement Case Number:</label>
                                    <input
                                        type="text"
                                        value={procurementCaseNumber}
                                        onChange={(e) => setProcurementCaseNumber(e.target.value)}
                                        className="form-input w-full bg-gray-100 dark:bg-gray-800"
                                        placeholder=""
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Date Rec'd:</label>
                                    <input
                                        type="date"
                                        value={dateReceived}
                                        onChange={(e) => setDateReceived(e.target.value)}
                                        className="form-input w-full bg-gray-100 dark:bg-gray-800"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Action Date:</label>
                                    <input
                                        type="date"
                                        value={actionDate}
                                        onChange={(e) => setActionDate(e.target.value)}
                                        className="form-input w-full bg-gray-100 dark:bg-gray-800"
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium mb-2">Comments:</label>
                                <textarea
                                    value={procurementComments}
                                    onChange={(e) => setProcurementComments(e.target.value)}
                                    className="form-textarea w-full bg-gray-100 dark:bg-gray-800"
                                    rows={2}
                                    placeholder=""
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
                                Attach quotations, specifications, or other supporting documents (PDF, Word, Excel, Images - Max 10MB per file)
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
                            Submit Procurement Request
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
