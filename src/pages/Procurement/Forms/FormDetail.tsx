import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';
import IconDownload from '../../../components/Icon/IconDownload';
import IconPrinter from '../../../components/Icon/IconPrinter';
import IconEdit from '../../../components/Icon/IconEdit';
import IconCircleCheck from '../../../components/Icon/IconCircleCheck';
import IconX from '../../../components/Icon/IconX';

interface FormDetail {
    id: string;
    code: string;
    name: string;
    description: string;
    category: string;
    minValue?: string;
    maxValue?: string;
    createdDate: string;
    revisionDate?: string;
    sections: FormSection[];
}

interface FormSection {
    title: string;
    content: string;
    fields?: FormField[];
}

interface FormField {
    id: string;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'checkbox' | 'number';
    placeholder?: string;
    options?: string[];
    required?: boolean;
    value?: string;
}

const FORM_DETAILS: Record<string, FormDetail> = {
    'hoe-approval-form': {
        id: 'hoe-approval-form',
        code: 'PRO_70_F_12/00',
        name: "Head of Entity's Approval Form",
        description: 'Contracts valued at 1¢ up to $2,999k (Goods, Services & Works)',
        category: 'Approval Forms',
        minValue: '1¢',
        maxValue: '$2,999k',
        createdDate: 'Aug 01, 2025',
        revisionDate: 'N/A',
        sections: [
            {
                title: 'Section A: Procurement & Tendering Data',
                content: 'Enter all procurement activity and tendering information',
                fields: [
                    {
                        id: 'procurement_activity_name',
                        label: '1. Name of Procurement Activity & Ref. Code',
                        type: 'text',
                        placeholder: 'insert name of activity',
                        required: true,
                    },
                    {
                        id: 'unit',
                        label: '2. Unit',
                        type: 'text',
                        placeholder: 'insert unit requesting item',
                        required: true,
                    },
                    {
                        id: 'description_goods',
                        label: '3. Description of Goods/Services/Works being procured',
                        type: 'textarea',
                        placeholder: 'Describe the goods, services or works',
                        required: true,
                    },
                    {
                        id: 'contract_type',
                        label: '4. Contract Type',
                        type: 'select',
                        options: ['Goods', 'Consulting Services', 'Non-Consulting Services', 'Works'],
                        required: true,
                    },
                    {
                        id: 'comparable_estimate',
                        label: '5. Comparable Estimate',
                        type: 'text',
                        placeholder: 'insert estimated cost',
                        required: true,
                    },
                    {
                        id: 'approved_supplier',
                        label: '6. Is the Supplier on the Government of Jamaica List of Approved Suppliers?',
                        type: 'select',
                        options: ['Yes', 'No', 'N/A'],
                        required: true,
                    },
                    {
                        id: 'ppc_registration_category',
                        label: '7. Contractor/Supplier PPC Registration Category',
                        type: 'text',
                        placeholder: 'e.g., Electrical Equipment, Parts and Supplies',
                    },
                    {
                        id: 'contractor_grade',
                        label: "Contractor's Grade",
                        type: 'text',
                        placeholder: 'N/A',
                    },
                    {
                        id: 'ppc_registration_number',
                        label: '7a. Public Procurement Commission (PPC) Registration #',
                        type: 'text',
                        placeholder: 'insert PPC registration number',
                    },
                    {
                        id: 'ppc_expiration_date',
                        label: '7b. PPC Expiration Date',
                        type: 'text',
                        placeholder: 'date PPC expires',
                    },
                    {
                        id: 'tcc_number',
                        label: '8. Tax Compliance Certificate (TCC) #',
                        type: 'text',
                        placeholder: 'insert TCC no.',
                    },
                    {
                        id: 'tcc_expiration_date',
                        label: '8a. TCC Expiration Date',
                        type: 'text',
                        placeholder: 'date TCC expires',
                    },
                    {
                        id: 'procurement_method',
                        label: '9. Procurement Method',
                        type: 'select',
                        options: ['International Competitive Bidding', 'National Competitive Bidding', 'Restricted Bidding', 'Single Source', 'Emergency Single Source'],
                        required: true,
                    },
                    {
                        id: 'method_advertisement',
                        label: '10. Method of Advertisement',
                        type: 'select',
                        options: ['GOJEP', 'Email'],
                        required: true,
                    },
                    {
                        id: 'tender_period_from',
                        label: '11. Tender Period From',
                        type: 'text',
                        placeholder: 'insert tender period',
                    },
                    {
                        id: 'tender_period_days',
                        label: '11a. Number of Days for Tender',
                        type: 'number',
                        placeholder: 'insert no. of days',
                    },
                    {
                        id: 'bid_validity_date',
                        label: '12. Bid Validity Expiration Date',
                        type: 'text',
                        placeholder: 'insert bid validity expiration',
                    },
                    {
                        id: 'bids_requested',
                        label: '13. Number of Bids Requested',
                        type: 'number',
                        placeholder: '0',
                    },
                    {
                        id: 'bids_received',
                        label: '13a. Number of Bids Received',
                        type: 'number',
                        placeholder: '0',
                    },
                    {
                        id: 're_tendered',
                        label: '14. Re-tendered',
                        type: 'select',
                        options: ['Yes', 'No'],
                        required: true,
                    },
                    {
                        id: 'reason_re_tender',
                        label: '15. Reason for Re-tender',
                        type: 'select',
                        options: [
                            'All bids non-responsive',
                            'Awarded supplier refused to enter into contract',
                            'Bid price exceeding comparable estimate',
                            'Cancelled due to procedural irregularity',
                            'Change in bill of quantities',
                            'Incorrect specification',
                            'Material irregularities in tender documents',
                            'No bid received',
                            'Re-scoping of requirements',
                            'VFM cannot be achieved',
                            'Other',
                        ],
                    },
                    {
                        id: 'other_reason',
                        label: '15k. If other, please state reason',
                        type: 'textarea',
                        placeholder: 'Please specify the reason',
                    },
                    {
                        id: 'contract_award_criteria',
                        label: '16. Contract Award Criteria',
                        type: 'select',
                        options: ['Lowest Cost', 'Most Advantageous Bid'],
                        required: true,
                    },
                    {
                        id: 'contractor_recommended',
                        label: '17. Contractor/Supplier Recommended for a Contract Award',
                        type: 'text',
                        placeholder: 'e.g., Appliance Traders Limited',
                        required: true,
                    },
                    {
                        id: 'reason_selection',
                        label: '18. Reason for Selection',
                        type: 'textarea',
                        placeholder: 'Explain the reason for selecting this contractor/supplier',
                        required: true,
                    },
                    {
                        id: 'amount_awarded_without_gct',
                        label: '19. Amount Awarded (without GCT)',
                        type: 'text',
                        placeholder: 'Enter amount',
                        required: true,
                    },
                    {
                        id: 'gct_amount',
                        label: '19a. GCT',
                        type: 'text',
                        placeholder: 'Enter GCT amount',
                    },
                    {
                        id: 'amount_inclusive_gct',
                        label: '19b. Inclusive of GCT',
                        type: 'text',
                        placeholder: 'Total amount including GCT',
                    },
                    {
                        id: 'variance',
                        label: '20. Variance: 0% (+/-)',
                        type: 'text',
                        placeholder: 'Enter variance percentage',
                    },
                ],
            },
            {
                title: 'Section B: Review by Head of Public Procurement',
                content: 'Comments, observations, and review by procurement authority',
                fields: [
                    {
                        id: 'hpp_comments',
                        label: '21. Comments/Observations (if any)',
                        type: 'textarea',
                        placeholder: 'Enter any comments or observations',
                        required: false,
                    },
                    {
                        id: 'hpp_name',
                        label: '22. Reviewed by: Name of HPP',
                        type: 'text',
                        placeholder: 'Full name of Head of Public Procurement',
                        required: true,
                    },
                    {
                        id: 'hpp_signature',
                        label: '22a. Signature',
                        type: 'text',
                        placeholder: 'Signature',
                        required: true,
                    },
                    {
                        id: 'hpp_date',
                        label: '22b. Date',
                        type: 'text',
                        placeholder: 'Date of review',
                        required: true,
                    },
                ],
            },
            {
                title: 'Section C: Head of Entity Decision',
                content: 'Final approval decision (Approved, Rejected, or Deferred) with justification by Executive Director',
                fields: [
                    {
                        id: 'hoe_comments',
                        label: '23. Comments/Observations (if any)',
                        type: 'textarea',
                        placeholder: 'Enter any comments or observations',
                        required: false,
                    },
                    {
                        id: 'action_taken',
                        label: 'Action Taken',
                        type: 'select',
                        options: ['Approved', 'Rejected', 'Deferred'],
                        required: true,
                    },
                    {
                        id: 'rejection_deferral_details',
                        label: '24. If rejected or deferred, please give details below',
                        type: 'textarea',
                        placeholder: 'Provide details for rejection or deferral',
                        required: false,
                    },
                    {
                        id: 'executive_director_name',
                        label: '25. Signed by: Name of Executive Director',
                        type: 'text',
                        placeholder: 'Full name of Executive Director',
                        required: true,
                    },
                    {
                        id: 'executive_director_signature',
                        label: '25a. Signature',
                        type: 'text',
                        placeholder: 'Signature',
                        required: true,
                    },
                    {
                        id: 'executive_director_date',
                        label: '25b. Date',
                        type: 'text',
                        placeholder: 'Date of approval/rejection',
                        required: true,
                    },
                ],
            },
        ],
    },
};

export default function FormDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const [form, setForm] = useState<FormDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editedForm, setEditedForm] = useState<FormDetail | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (id && FORM_DETAILS[id]) {
            const foundForm = FORM_DETAILS[id];
            setForm(foundForm);
            setEditedForm(JSON.parse(JSON.stringify(foundForm)));
            dispatch(setPageTitle(foundForm.name));
        }
        setIsLoading(false);
    }, [id, dispatch]);

    const handleEdit = () => {
        if (form) {
            setEditedForm(JSON.parse(JSON.stringify(form)));
            setIsEditMode(true);
        }
    };

    const handleCancel = () => {
        setIsEditMode(false);
        setEditedForm(null);
    };

    const handleSave = async () => {
        if (!editedForm) return;

        setIsSaving(true);
        try {
            // Simulate API call - in production, this would be an actual API endpoint
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Update the form
            setForm(editedForm);
            FORM_DETAILS[id!] = editedForm;

            setIsEditMode(false);
            setEditedForm(null);

            // Show success message
            alert('Form updated successfully');
        } catch (error) {
            alert('Error saving form');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFieldChange = (field: keyof FormDetail, value: any) => {
        if (editedForm) {
            setEditedForm({
                ...editedForm,
                [field]: value,
            });
        }
    };

    const handleSectionChange = (idx: number, field: 'title' | 'content', value: string) => {
        if (editedForm && editedForm.sections) {
            const newSections = [...editedForm.sections];
            newSections[idx] = {
                ...newSections[idx],
                [field]: value,
            };
            setEditedForm({
                ...editedForm,
                sections: newSections,
            });
        }
    };

    if (isLoading) {
        return <div className="text-center py-12">Loading...</div>;
    }

    if (!form) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-600 dark:text-gray-400 mb-4">Form not found</p>
                <button onClick={() => navigate('/procurement/forms')} className="btn btn-primary">
                    Back to Forms
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Back Button */}
            <button onClick={() => navigate('/procurement/forms')} className="flex items-center gap-2 text-primary hover:text-primary-dark transition-colors">
                <IconArrowLeft className="w-5 h-5" />
                <span>Back to Forms</span>
            </button>

            {/* BSJ Form Header - Official Header with Logo */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
                {/* BSJ Logo */}
                <div className="flex justify-center mb-4">
                    <div className="text-center">
                        <div className="text-6xl font-bold mb-2">
                            <span className="text-gray-400">BSJ</span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Bureau of<br />
                            Standards<br />
                            Jamaica
                        </div>
                    </div>
                </div>

                {/* Official Form Title */}
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2 uppercase">
                    BUREAU OF STANDARDS JAMAICA
                </h1>
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Head of Entity's Approval Form
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                    Contracts valued at 1¢ up to $2,999k (Goods, Services & Works)
                </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
                {!isEditMode ? (
                    <>
                        <button
                            onClick={handleEdit}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        >
                            <IconEdit className="w-5 h-5" />
                            <span>Edit</span>
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            <IconPrinter className="w-5 h-5" />
                            <span>Print</span>
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors">
                            <IconDownload className="w-5 h-5" />
                            <span>Download PDF</span>
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors disabled:opacity-50"
                        >
                            <IconCircleCheck className="w-5 h-5" />
                            <span>{isSaving ? 'Saving...' : 'Save'}</span>
                        </button>
                        <button
                            onClick={handleCancel}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            <IconX className="w-5 h-5" />
                            <span>Cancel</span>
                        </button>
                    </>
                )}
            </div>

            {/* Form Sections */}
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Form Structure</h2>
                {(isEditMode && editedForm ? editedForm.sections : form!.sections).map((section, idx) => (
                    <div
                        key={idx}
                        className={`p-6 border rounded-lg ${
                            isEditMode ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
                        }`}
                    >
                        {isEditMode && editedForm ? (
                            <>
                                <input
                                    type="text"
                                    value={section.title}
                                    onChange={(e) => handleSectionChange(idx, 'title', e.target.value)}
                                    className="block w-full text-lg font-bold text-gray-800 dark:text-white mb-3 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-700"
                                    placeholder="Section title"
                                />
                                <textarea
                                    value={section.content}
                                    onChange={(e) => handleSectionChange(idx, 'content', e.target.value)}
                                    className="block w-full text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 dark:bg-gray-700"
                                    placeholder="Section content"
                                    rows={3}
                                />
                            </>
                        ) : (
                            <>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3">{section.title}</h3>
                                <p className="text-gray-700 dark:text-gray-300 mb-6">{section.content}</p>

                                {/* Render form fields if they exist */}
                                {section.fields && section.fields.length > 0 && (
                                    <div className="space-y-4">
                                        {section.fields.map((field) => (
                                            <div key={field.id}>
                                                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                                                    {field.label}
                                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                                </label>

                                                {field.type === 'text' && (
                                                    <input
                                                        type="text"
                                                        placeholder={field.placeholder}
                                                        defaultValue={field.value}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                                                    />
                                                )}

                                                {field.type === 'number' && (
                                                    <input
                                                        type="number"
                                                        placeholder={field.placeholder}
                                                        defaultValue={field.value}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                                                    />
                                                )}

                                                {field.type === 'textarea' && (
                                                    <textarea
                                                        placeholder={field.placeholder}
                                                        defaultValue={field.value}
                                                        rows={3}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                                                    />
                                                )}

                                                {field.type === 'select' && (
                                                    <select
                                                        defaultValue={field.value}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary"
                                                    >
                                                        <option value="">-- Select --</option>
                                                        {field.options?.map((option) => (
                                                            <option key={option} value={option}>
                                                                {option}
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}

                                                {field.type === 'checkbox' && (
                                                    <input
                                                        type="checkbox"
                                                        defaultChecked={field.value === 'true'}
                                                        className="w-4 h-4 text-primary border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                ))}
            </div>

            {/* Instructions */}
            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-2">Instructions</h3>
                <ul className="space-y-2 text-blue-800 dark:text-blue-200">
                    <li className="flex gap-2">
                        <span className="font-semibold">1.</span>
                        <span>Download the form or print it directly</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-semibold">2.</span>
                        <span>Complete all required fields in each section</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-semibold">3.</span>
                        <span>Ensure all signatories provide required signatures and dates</span>
                    </li>
                    <li className="flex gap-2">
                        <span className="font-semibold">4.</span>
                        <span>Submit the completed form through the procurement portal</span>
                    </li>
                </ul>
            </div>

            {/* Form Footer - Official Document Information */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p className="font-semibold">{form!.code}</p>
                    <p>Issue Date: {form!.createdDate}</p>
                    <p>Rev. Date: {form!.revisionDate}</p>
                    <p>Rev. #: 00</p>
                </div>
            </div>
        </div>
    );
}
