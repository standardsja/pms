import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconPlus from '../../../components/Icon/IconPlus';
import IconX from '../../../components/Icon/IconX';
import IconSave from '../../../components/Icon/IconSave';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';
import IconChecks from '../../../components/Icon/IconChecks';

const NewEvaluation = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        dispatch(setPageTitle('Create New Evaluation'));
    });

    const [formData, setFormData] = useState({
        rfqNumber: '',
        description: '',
        dueDate: '',
        evaluator: '',
        notes: '',
    });

    const [criteria, setCriteria] = useState([
        { id: 1, name: 'Price Competitiveness', weight: 40, description: 'Overall cost and value for money' },
        { id: 2, name: 'Quality & Specifications', weight: 30, description: 'Product/service quality and meeting requirements' },
        { id: 3, name: 'Delivery Time', weight: 20, description: 'Speed and reliability of delivery' },
        { id: 4, name: 'After-Sales Service', weight: 10, description: 'Support, warranty, and service quality' },
    ]);

    const [selectedQuotes, setSelectedQuotes] = useState<number[]>([]);
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [errorFields, setErrorFields] = useState<string[]>([]);

    // Mock quotes for selection
    const availableQuotes = [
        { id: 1, quoteNumber: 'Q-2024-001', supplier: 'ABC Corporation', amount: 12500, rfq: 'RFQ-2024-001' },
        { id: 2, quoteNumber: 'Q-2024-002', supplier: 'XYZ Suppliers Ltd', amount: 8900, rfq: 'RFQ-2024-001' },
        { id: 3, quoteNumber: 'Q-2024-003', supplier: 'Tech Solutions Inc', amount: 15200, rfq: 'RFQ-2024-001' },
        { id: 4, quoteNumber: 'Q-2024-004', supplier: 'Office Pro Supply', amount: 6500, rfq: 'RFQ-2024-002' },
    ];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleCriteriaChange = (id: number, field: string, value: string) => {
        setCriteria(criteria.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
    };

    const addCriterion = () => {
        const newId = Math.max(...criteria.map((c) => c.id), 0) + 1;
        setCriteria([...criteria, { id: newId, name: '', weight: 0, description: '' }]);
    };

    const removeCriterion = (id: number) => {
        if (criteria.length > 1) {
            setCriteria(criteria.filter((c) => c.id !== id));
        }
    };

    const toggleQuote = (quoteId: number) => {
        if (selectedQuotes.includes(quoteId)) {
            setSelectedQuotes(selectedQuotes.filter((id) => id !== quoteId));
        } else {
            setSelectedQuotes([...selectedQuotes, quoteId]);
        }
    };

    const totalWeight = criteria.reduce((sum, c) => sum + (parseFloat(c.weight.toString()) || 0), 0);

    const handleCreateEvaluation = () => {
        const missingFields: string[] = [];

        if (!formData.rfqNumber) missingFields.push('RFQ Number');
        if (!formData.description) missingFields.push('Description');
        if (!formData.dueDate) missingFields.push('Due Date');
        if (selectedQuotes.length < 2) missingFields.push('At least 2 quotes must be selected');
        if (totalWeight !== 100) missingFields.push('Criteria weights must total 100%');

        if (missingFields.length > 0) {
            setErrorFields(missingFields);
            setShowErrorAlert(true);

            setTimeout(() => {
                setShowErrorAlert(false);
            }, 5000);
            return;
        }

        console.log('Creating evaluation:', { formData, criteria, selectedQuotes });

        setAlertMessage(`Evaluation created successfully! ${selectedQuotes.length} quotes will be evaluated using ${criteria.length} criteria.`);
        setShowSuccessAlert(true);

        setTimeout(() => {
            setShowSuccessAlert(false);
            navigate('/procurement/evaluation');
        }, 3000);
    };

    const filteredQuotes = formData.rfqNumber ? availableQuotes.filter((q) => q.rfq === formData.rfqNumber) : availableQuotes;

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Create New Evaluation</h2>
                    <p className="text-white-dark">Set up criteria and select quotes to evaluate</p>
                </div>
                <Link to="/procurement/evaluation" className="btn btn-outline-danger gap-2">
                    <IconArrowLeft />
                    Back to List
                </Link>
            </div>

            {/* Success Alert Modal */}
            {showSuccessAlert && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60">
                    <div className="panel w-full max-w-lg overflow-hidden rounded-lg p-0">
                        <div className="flex items-center p-3.5 rounded-t text-success bg-success-light dark:bg-success-dark-light">
                            <span className="ltr:pr-2 rtl:pl-2 flex-1">
                                <strong className="ltr:mr-1 rtl:ml-1 text-lg">Success!</strong>
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
                                <div>Please complete the following:</div>
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
                {/* Basic Information */}
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">Basic Information</h5>
                    <div className="grid gap-5 md:grid-cols-2">
                        <div>
                            <label htmlFor="rfqNumber" className="mb-2 block font-semibold">
                                RFQ Number <span className="text-danger">*</span>
                            </label>
                            <select id="rfqNumber" name="rfqNumber" className="form-select" value={formData.rfqNumber} onChange={handleInputChange} required>
                                <option value="">Select RFQ...</option>
                                <option value="RFQ-2024-001">RFQ-2024-001 - Office Furniture</option>
                                <option value="RFQ-2024-002">RFQ-2024-002 - IT Equipment</option>
                                <option value="RFQ-2024-003">RFQ-2024-003 - Office Supplies</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="dueDate" className="mb-2 block font-semibold">
                                Due Date <span className="text-danger">*</span>
                            </label>
                            <input id="dueDate" name="dueDate" type="date" className="form-input" value={formData.dueDate} onChange={handleInputChange} required />
                        </div>
                        <div>
                            <label htmlFor="evaluator" className="mb-2 block font-semibold">
                                Evaluator Name
                            </label>
                            <input
                                id="evaluator"
                                name="evaluator"
                                type="text"
                                className="form-input"
                                placeholder="Enter evaluator name"
                                value={formData.evaluator}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <label htmlFor="description" className="mb-2 block font-semibold">
                                Description <span className="text-danger">*</span>
                            </label>
                            <input
                                id="description"
                                name="description"
                                type="text"
                                className="form-input"
                                placeholder="e.g., Office Furniture Evaluation"
                                value={formData.description}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="notes" className="mb-2 block font-semibold">
                                Additional Notes
                            </label>
                            <textarea
                                id="notes"
                                name="notes"
                                rows={3}
                                className="form-textarea"
                                placeholder="Any special considerations or requirements..."
                                value={formData.notes}
                                onChange={handleInputChange}
                            />
                        </div>
                    </div>
                </div>

                {/* Evaluation Criteria */}
                <div className="panel">
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <h5 className="text-lg font-semibold">Evaluation Criteria</h5>
                            <p className="text-sm text-white-dark">
                                Total Weight: <span className={`font-bold ${totalWeight === 100 ? 'text-success' : 'text-danger'}`}>{totalWeight}%</span> (must equal 100%)
                            </p>
                        </div>
                        <button onClick={addCriterion} className="btn btn-primary btn-sm gap-2">
                            <IconPlus className="h-4 w-4" />
                            Add Criterion
                        </button>
                    </div>
                    <div className="space-y-4">
                        {criteria.map((criterion, index) => (
                            <div key={criterion.id} className="rounded border border-white-light p-4 dark:border-dark">
                                <div className="mb-3 flex items-center justify-between">
                                    <h6 className="font-semibold">Criterion {index + 1}</h6>
                                    {criteria.length > 1 && (
                                        <button onClick={() => removeCriterion(criterion.id)} className="text-danger hover:text-danger/80">
                                            <IconX className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                                <div className="grid gap-4 md:grid-cols-3">
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold">Criterion Name</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g., Price Competitiveness"
                                            value={criterion.name}
                                            onChange={(e) => handleCriteriaChange(criterion.id, 'name', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold">Weight (%)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            placeholder="0"
                                            min="0"
                                            max="100"
                                            value={criterion.weight}
                                            onChange={(e) => handleCriteriaChange(criterion.id, 'weight', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold">Progress</label>
                                        <div className="flex items-center gap-2 pt-2">
                                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                                <div
                                                    className={`h-full ${
                                                        parseFloat(criterion.weight.toString()) > 0 ? 'bg-primary' : 'bg-gray-400'
                                                    }`}
                                                    style={{ width: `${Math.min(parseFloat(criterion.weight.toString()) || 0, 100)}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-sm font-semibold">{criterion.weight}%</span>
                                        </div>
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="mb-2 block text-sm font-semibold">Description</label>
                                        <textarea
                                            rows={2}
                                            className="form-textarea"
                                            placeholder="Brief description of this criterion"
                                            value={criterion.description}
                                            onChange={(e) => handleCriteriaChange(criterion.id, 'description', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Select Quotes */}
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">
                        Select Quotes to Evaluate <span className="text-danger">*</span>
                        <span className="ml-2 text-sm font-normal text-white-dark">({selectedQuotes.length} selected - minimum 2 required)</span>
                    </h5>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {filteredQuotes.map((quote) => (
                            <label
                                key={quote.id}
                                className={`flex cursor-pointer items-start gap-3 rounded border p-4 transition ${
                                    selectedQuotes.includes(quote.id)
                                        ? 'border-primary bg-primary-light dark:bg-primary/20'
                                        : 'border-white-light hover:border-primary dark:border-dark'
                                }`}
                            >
                                <input type="checkbox" className="form-checkbox mt-1" checked={selectedQuotes.includes(quote.id)} onChange={() => toggleQuote(quote.id)} />
                                <div className="flex-1">
                                    <div className="font-semibold">{quote.quoteNumber}</div>
                                    <div className="mt-1 text-sm text-white-dark">{quote.supplier}</div>
                                    <div className="mt-2 flex gap-3">
                                        <span className="text-xs font-semibold text-primary">${quote.amount.toLocaleString()}</span>
                                        <span className="text-xs text-white-dark">{quote.rfq}</span>
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-3">
                    <Link to="/procurement/evaluation" className="btn btn-outline-secondary">
                        Cancel
                    </Link>
                    <button onClick={handleCreateEvaluation} className="btn btn-success gap-2">
                        <IconChecks className="h-4 w-4" />
                        Create Evaluation
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NewEvaluation;
