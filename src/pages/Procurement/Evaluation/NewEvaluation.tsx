import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconX from '../../../components/Icon/IconX';
import IconSave from '../../../components/Icon/IconSave';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';
import IconChecks from '../../../components/Icon/IconChecks';
import { getUser } from '../../../utils/auth';
import { useTranslation } from 'react-i18next';
import { evaluationService, type CreateEvaluationDTO } from '../../../services/evaluationService';

const NewEvaluation = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { t } = useTranslation();

    useEffect(() => {
        dispatch(setPageTitle(t('evaluation.new.pageTitle', 'Create BSJ Evaluation Report')));
    }, [dispatch, t]);

    // Role guard (Officer / Manager only)
    useEffect(() => {
        const u = getUser();
        if (!u) {
            navigate('/procurement/evaluation');
            return;
        }
        const roles = (u?.roles || (u?.role ? [u.role] : [])).map((r) => r.toUpperCase());
        const hasAccess = roles.some((role) => role.includes('PROCUREMENT_OFFICER') || role.includes('PROCUREMENT_MANAGER') || role.includes('PROCUREMENT') || role.includes('MANAGER'));
        if (!hasAccess) {
            navigate('/procurement/evaluation');
        }
    }, [navigate]);

    const RETENDER_REASON_OPTIONS = [
        { code: 'a', label: 'All bids non-responsive' },
        { code: 'b', label: 'Awarded supplier refused to enter into contract' },
        { code: 'c', label: 'Bid price exceeding comparable estimate' },
        { code: 'd', label: 'Cancelled due to procedural irregularity' },
        { code: 'e', label: 'Change in bill of quantities' },
        { code: 'f', label: 'Incorrect specification' },
        { code: 'g', label: 'Material irregularities in tender documents issued by Procuring Entity' },
        { code: 'h', label: 'No bid received' },
        { code: 'i', label: 'Re-scoping of requirements' },
        { code: 'j', label: 'VFM cannot be achieved' },
        { code: 'k', label: 'Other' },
    ] as const;

    type RetenderReasonCode = (typeof RETENDER_REASON_OPTIONS)[number]['code'];

    const [formData, setFormData] = useState({
        rfqNumber: '',
        rfqTitle: '',
        description: '',
        comparableEstimate: '',
        fundedBy: 'BSJ',
        tenderClosingDate: '',
        tenderClosingTime: '',
        tenderOpeningDate: '',
        tenderOpeningTime: '',
        actualOpeningDate: '',
        actualOpeningTime: '',
        procurementMethod: 'National Competitive Bidding',
        advertisementMethods: [] as string[],
        contractType: 'Goods',
        bidSecurity: 'No' as 'Yes' | 'No' | 'N/A',
        tenderPeriodStartDate: '',
        tenderPeriodEndDate: '',
        tenderPeriodDays: '',
        bidValidityDays: '30',
        bidValidityExpiration: '',
        numberOfBidsRequested: '',
        arithmeticErrorIdentified: 'No' as 'Yes' | 'No',
        retender: 'No' as 'Yes' | 'No',
        retenderReasons: [] as RetenderReasonCode[],
        retenderOtherReason: '',
        awardCriteria: 'Most Advantageous Bid',
        evaluator: '',
        notes: '',
    });

    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [errorFields, setErrorFields] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleCreateEvaluation = async () => {
        const missingFields: string[] = [];

        if (!formData.rfqNumber) missingFields.push('RFQ Number');
        if (!formData.rfqTitle) missingFields.push('RFQ Title');
        if (!formData.comparableEstimate) missingFields.push('Comparable Estimate');
        if (!formData.tenderClosingDate) missingFields.push('Tender Closing Date');
        if (!formData.tenderOpeningDate) missingFields.push('Tender Opening Date');
        if (!formData.numberOfBidsRequested) missingFields.push('Number of Bids Requested');
        if (formData.retender === 'Yes' && formData.retenderReasons.length === 0) missingFields.push('At least one Re-tender Reason');
        if (formData.retender === 'Yes' && formData.retenderReasons.includes('k') && !formData.retenderOtherReason) missingFields.push('Other Re-tender Reason Description');

        if (missingFields.length > 0) {
            setErrorFields(missingFields);
            setShowErrorAlert(true);

            setTimeout(() => {
                setShowErrorAlert(false);
            }, 5000);
            return;
        }

        try {
            setLoading(true);

            // Generate evaluation number (in production, backend should generate this)
            const evalNumber = `PRO_70_F_14/${String(Date.now()).slice(-5)}`;

            // Helper function to safely parse numbers
            const safeParseFloat = (value: string | undefined): number => {
                if (!value || value.trim() === '') return 0;
                const parsed = parseFloat(value);
                return isNaN(parsed) ? 0 : parsed;
            };

            const safeParseInt = (value: string | undefined): number => {
                if (!value || value.trim() === '') return 0;
                const parsed = parseInt(value);
                return isNaN(parsed) ? 0 : parsed;
            };

            // Prepare the evaluation data matching the backend API structure
            const evaluationData: CreateEvaluationDTO = {
                evalNumber,
                rfqNumber: formData.rfqNumber,
                rfqTitle: formData.rfqTitle,
                description: formData.description || formData.notes || undefined,
                evaluator: formData.evaluator || undefined,
                dueDate: formData.bidValidityExpiration || undefined,
                sectionA: {
                    comparableEstimate: safeParseFloat(formData.comparableEstimate),
                    fundedBy: formData.fundedBy || '',
                    tenderClosingDate: formData.tenderClosingDate || '',
                    tenderClosingTime: formData.tenderClosingTime || '',
                    tenderOpeningDate: formData.tenderOpeningDate || '',
                    tenderOpeningTime: formData.tenderOpeningTime || '',
                    actualOpeningDate: formData.actualOpeningDate || '',
                    actualOpeningTime: formData.actualOpeningTime || '',
                    procurementMethod:
                        formData.procurementMethod === 'National Competitive Bidding'
                            ? 'NATIONAL_COMPETITIVE_BIDDING'
                            : formData.procurementMethod === 'International Competitive Bidding'
                            ? 'INTERNATIONAL_COMPETITIVE_BIDDING'
                            : formData.procurementMethod === 'Restricted Bidding'
                            ? 'RESTRICTED_BIDDING'
                            : formData.procurementMethod === 'Single Source'
                            ? 'SINGLE_SOURCE'
                            : 'EMERGENCY_SINGLE_SOURCE',
                    advertisementMethods: Array.isArray(formData.advertisementMethods) && formData.advertisementMethods.length > 0 ? formData.advertisementMethods : ['Not Specified'],
                    contractType:
                        formData.contractType === 'Goods'
                            ? 'GOODS'
                            : formData.contractType === 'Consulting Services'
                            ? 'CONSULTING_SERVICES'
                            : formData.contractType === 'Non-Consulting Services'
                            ? 'NON_CONSULTING_SERVICES'
                            : 'WORKS',
                    bidSecurity: formData.bidSecurity || '',
                    tenderPeriodStartDate: formData.tenderPeriodStartDate || '',
                    tenderPeriodEndDate: formData.tenderPeriodEndDate || '',
                    tenderPeriodDays: safeParseInt(formData.tenderPeriodDays),
                    bidValidityDays: safeParseInt(formData.bidValidityDays),
                    bidValidityExpiration: formData.bidValidityExpiration || '',
                    numberOfBidsRequested: safeParseInt(formData.numberOfBidsRequested),
                    numberOfBidsReceived: 0, // Will be updated later
                    arithmeticErrorIdentified: formData.arithmeticErrorIdentified === 'Yes',
                    retender: formData.retender === 'Yes',
                    retenderReasons: formData.retender === 'Yes' ? formData.retenderReasons : undefined,
                    retenderOtherReason: formData.retenderOtherReason || undefined,
                    awardCriteria: formData.awardCriteria === 'Lowest Cost' ? 'LOWEST_COST' : 'MOST_ADVANTAGEOUS_BID',
                },
            };

            console.log('Sending evaluation data to backend:', JSON.stringify(evaluationData, null, 2));

            const result = await evaluationService.createEvaluation(evaluationData);

            setAlertMessage(`BSJ Evaluation ${evalNumber} created successfully!`);
            setShowSuccessAlert(true);

            setTimeout(() => {
                setShowSuccessAlert(false);
                navigate('/procurement/evaluation');
            }, 2000);
        } catch (error: any) {
            console.error('Failed to create evaluation:', error);
            setErrorFields([error.message || 'Failed to create evaluation. Please try again.']);
            setShowErrorAlert(true);

            setTimeout(() => {
                setShowErrorAlert(false);
            }, 5000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">{t('evaluation.new.heading', 'Create BSJ Evaluation Report')}</h2>
                    <p className="text-white-dark">{t('evaluation.new.subheading', 'Bureau of Standards Jamaica - Official Evaluation Report Form (PRO_70_F_14/00)')}</p>
                </div>
                <Link to="/procurement/evaluation" className="btn btn-outline-danger gap-2">
                    <IconArrowLeft />
                    {t('evaluation.detail.back', 'Back to List')}
                </Link>
            </div>

            {/* Success Alert Modal */}
            {showSuccessAlert && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60">
                    <div className="panel w-full max-w-lg overflow-hidden rounded-lg p-0">
                        <div className="flex items-center p-3.5 rounded-t text-success bg-success-light dark:bg-success-dark-light">
                            <span className="ltr:pr-2 rtl:pl-2 flex-1">
                                <strong className="ltr:mr-1 rtl:ml-1 text-lg">{t('common.success', 'Success!')}</strong>
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
                                <strong className="ltr:mr-1 rtl:ml-1 text-lg block mb-2">{t('common.error', 'Error!')}</strong>
                                <div>{t('evaluation.new.errorPrompt', 'Please complete the following:')}</div>
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
                    <h5 className="mb-5 text-lg font-semibold bg-primary/10 -m-5 p-5">Basic Information</h5>
                    <div className="grid gap-5 md:grid-cols-2 mt-5">
                        <div>
                            <label htmlFor="rfqNumber" className="mb-2 block font-semibold">
                                RFQ Number <span className="text-danger">*</span>
                            </label>
                            <input
                                id="rfqNumber"
                                name="rfqNumber"
                                type="text"
                                className="form-input"
                                placeholder="OFMB/AUG/2025/015"
                                value={formData.rfqNumber}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="rfqTitle" className="mb-2 block font-semibold">
                                RFQ Title <span className="text-danger">*</span>
                            </label>
                            <input
                                id="rfqTitle"
                                name="rfqTitle"
                                type="text"
                                className="form-input"
                                placeholder="Procurement of Chair"
                                value={formData.rfqTitle}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="description" className="mb-2 block font-semibold">
                                Description
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                rows={2}
                                className="form-textarea"
                                placeholder="Brief description of the procurement..."
                                value={formData.description}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div>
                            <label htmlFor="evaluator" className="mb-2 block font-semibold">
                                Evaluator Name
                            </label>
                            <input id="evaluator" name="evaluator" type="text" className="form-input" placeholder="Enter evaluator name" value={formData.evaluator} onChange={handleInputChange} />
                        </div>
                    </div>
                </div>

                {/* Financial Information */}
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold bg-success/10 -m-5 p-5">Financial Information</h5>
                    <div className="grid gap-5 md:grid-cols-2 mt-5">
                        <div>
                            <label htmlFor="comparableEstimate" className="mb-2 block font-semibold">
                                Comparable Estimate (JMD) <span className="text-danger">*</span>
                            </label>
                            <input
                                id="comparableEstimate"
                                name="comparableEstimate"
                                type="number"
                                step="0.01"
                                className="form-input"
                                placeholder="49680.00"
                                value={formData.comparableEstimate}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="fundedBy" className="mb-2 block font-semibold">
                                Funded By
                            </label>
                            <input id="fundedBy" name="fundedBy" type="text" className="form-input" placeholder="BSJ" value={formData.fundedBy} onChange={handleInputChange} />
                        </div>
                    </div>
                </div>

                {/* Procurement Details */}
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold bg-info/10 -m-5 p-5">Procurement Details</h5>
                    <div className="grid gap-5 md:grid-cols-2 mt-5">
                        <div>
                            <label htmlFor="procurementMethod" className="mb-2 block font-semibold">
                                Procurement Method
                            </label>
                            <select id="procurementMethod" name="procurementMethod" className="form-select" value={formData.procurementMethod} onChange={handleInputChange}>
                                <option value="National Competitive Bidding">National Competitive Bidding</option>
                                <option value="International Competitive Bidding">International Competitive Bidding</option>
                                <option value="Restricted Bidding">Restricted Bidding</option>
                                <option value="Single Source">Single Source</option>
                                <option value="Emergency Single Source">Emergency Single Source</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="contractType" className="mb-2 block font-semibold">
                                Contract Type
                            </label>
                            <select id="contractType" name="contractType" className="form-select" value={formData.contractType} onChange={handleInputChange}>
                                <option value="Goods">Goods</option>
                                <option value="Consulting Services">Consulting Services</option>
                                <option value="Non-Consulting Services">Non-Consulting Services</option>
                                <option value="Works">Works</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="awardCriteria" className="mb-2 block font-semibold">
                                Contract Award Criteria
                            </label>
                            <select id="awardCriteria" name="awardCriteria" className="form-select" value={formData.awardCriteria} onChange={handleInputChange}>
                                <option value="Most Advantageous Bid">Most Advantageous Bid</option>
                                <option value="Lowest Cost">Lowest Cost</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="numberOfBidsRequested" className="mb-2 block font-semibold">
                                Number of Bids Requested <span className="text-danger">*</span>
                            </label>
                            <input
                                id="numberOfBidsRequested"
                                name="numberOfBidsRequested"
                                type="number"
                                className="form-input"
                                placeholder="1"
                                value={formData.numberOfBidsRequested}
                                onChange={handleInputChange}
                                required
                            />
                        </div>
                        <div>
                            <div className="mb-2 font-semibold">Method of Advertisement</div>
                            <div className="grid gap-2">
                                {['International Advertisement', 'National Advertisement', 'GOJEP', 'Email'].map((m) => (
                                    <label key={m} className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            className="form-checkbox"
                                            checked={formData.advertisementMethods.includes(m)}
                                            onChange={(e) => {
                                                setFormData({
                                                    ...formData,
                                                    advertisementMethods: e.target.checked ? [...formData.advertisementMethods, m] : formData.advertisementMethods.filter((x) => x !== m),
                                                });
                                            }}
                                        />
                                        <span>{m}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="mb-2 font-semibold">Bid Security</div>
                            <div className="flex gap-4">
                                {['Yes', 'No', 'N/A'].map((opt) => (
                                    <label key={opt} className="flex items-center gap-1 text-sm">
                                        <input
                                            type="radio"
                                            name="bidSecurity"
                                            value={opt}
                                            checked={formData.bidSecurity === opt}
                                            onChange={(e) => setFormData({ ...formData, bidSecurity: e.target.value as 'Yes' | 'No' | 'N/A' })}
                                        />
                                        <span>{opt}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tender Timeline */}
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold bg-warning/10 -m-5 p-5">Tender Timeline</h5>
                    <div className="grid gap-5 md:grid-cols-2 mt-5">
                        <div className="grid gap-2">
                            <label className="font-semibold">
                                Tender Closing Date & Time <span className="text-danger">*</span>
                            </label>
                            <div className="flex gap-2">
                                <input
                                    id="tenderClosingDate"
                                    name="tenderClosingDate"
                                    type="date"
                                    className="form-input flex-1"
                                    value={formData.tenderClosingDate}
                                    onChange={handleInputChange}
                                    required
                                />
                                <input
                                    id="tenderClosingTime"
                                    name="tenderClosingTime"
                                    type="time"
                                    className="form-input w-32"
                                    value={formData.tenderClosingTime}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <label className="font-semibold">
                                Tender Opening Date & Time <span className="text-danger">*</span>
                            </label>
                            <div className="flex gap-2">
                                <input
                                    id="tenderOpeningDate"
                                    name="tenderOpeningDate"
                                    type="date"
                                    className="form-input flex-1"
                                    value={formData.tenderOpeningDate}
                                    onChange={handleInputChange}
                                    required
                                />
                                <input
                                    id="tenderOpeningTime"
                                    name="tenderOpeningTime"
                                    type="time"
                                    className="form-input w-32"
                                    value={formData.tenderOpeningTime}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <label className="font-semibold">Actual Opening Date & Time</label>
                            <div className="flex gap-2">
                                <input id="actualOpeningDate" name="actualOpeningDate" type="date" className="form-input flex-1" value={formData.actualOpeningDate} onChange={handleInputChange} />
                                <input id="actualOpeningTime" name="actualOpeningTime" type="time" className="form-input w-32" value={formData.actualOpeningTime} onChange={handleInputChange} />
                            </div>
                        </div>
                        <div></div>
                        <div className="grid gap-2">
                            <label className="font-semibold">Tender Period</label>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <input
                                        id="tenderPeriodStartDate"
                                        name="tenderPeriodStartDate"
                                        type="date"
                                        className="form-input flex-1"
                                        placeholder="Start Date"
                                        value={formData.tenderPeriodStartDate}
                                        onChange={handleInputChange}
                                    />
                                    <input
                                        id="tenderPeriodEndDate"
                                        name="tenderPeriodEndDate"
                                        type="date"
                                        className="form-input flex-1"
                                        placeholder="End Date"
                                        value={formData.tenderPeriodEndDate}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <input
                                    id="tenderPeriodDays"
                                    name="tenderPeriodDays"
                                    type="number"
                                    className="form-input"
                                    placeholder="Number of Days"
                                    value={formData.tenderPeriodDays}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <label className="font-semibold">Bid Validity</label>
                            <div className="flex gap-2">
                                <input
                                    id="bidValidityDays"
                                    name="bidValidityDays"
                                    type="number"
                                    className="form-input w-32"
                                    placeholder="30"
                                    value={formData.bidValidityDays}
                                    onChange={handleInputChange}
                                />
                                <input
                                    id="bidValidityExpiration"
                                    name="bidValidityExpiration"
                                    type="date"
                                    className="form-input flex-1"
                                    value={formData.bidValidityExpiration}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Additional Information */}
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold bg-danger/10 -m-5 p-5">Additional Information</h5>
                    <div className="grid gap-5 md:grid-cols-2 mt-5">
                        <div>
                            <div className="mb-2 font-semibold">Arithmetic Error Identified</div>
                            <div className="flex gap-4">
                                {['Yes', 'No'].map((opt) => (
                                    <label key={opt} className="flex items-center gap-1 text-sm">
                                        <input
                                            type="radio"
                                            name="arithmeticErrorIdentified"
                                            value={opt}
                                            checked={formData.arithmeticErrorIdentified === opt}
                                            onChange={(e) => setFormData({ ...formData, arithmeticErrorIdentified: e.target.value as 'Yes' | 'No' })}
                                        />
                                        <span>{opt}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div></div>
                        <div className="md:col-span-2">
                            <div className="mb-2 font-semibold">Re-tendered</div>
                            <div className="flex gap-4 mb-4">
                                {['Yes', 'No'].map((opt) => (
                                    <label key={opt} className="flex items-center gap-1 text-sm">
                                        <input
                                            type="radio"
                                            name="retender"
                                            value={opt}
                                            checked={formData.retender === opt}
                                            onChange={(e) => {
                                                const val = e.target.value as 'Yes' | 'No';
                                                setFormData({ ...formData, retender: val, retenderReasons: val === 'No' ? [] : formData.retenderReasons });
                                            }}
                                        />
                                        <span>{opt}</span>
                                    </label>
                                ))}
                            </div>
                            {formData.retender === 'Yes' && (
                                <div className="rounded border p-4 bg-warning/5">
                                    <h6 className="mb-3 font-semibold">14. Reason for re-tender (select all that apply)</h6>
                                    <div className="grid md:grid-cols-2 gap-2">
                                        {RETENDER_REASON_OPTIONS.map((r) => (
                                            <label key={r.code} className="flex items-start gap-2 text-xs md:text-sm">
                                                <input
                                                    type="checkbox"
                                                    className="form-checkbox mt-0.5"
                                                    checked={formData.retenderReasons.includes(r.code)}
                                                    onChange={(e) => {
                                                        setFormData({
                                                            ...formData,
                                                            retenderReasons: e.target.checked ? [...formData.retenderReasons, r.code] : formData.retenderReasons.filter((x) => x !== r.code),
                                                        });
                                                    }}
                                                />
                                                <span>
                                                    <span className="font-semibold mr-1">{r.code}.</span>
                                                    {r.label}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    {formData.retenderReasons.includes('k') && (
                                        <div className="mt-3">
                                            <label htmlFor="retenderOtherReason" className="mb-1 block text-sm font-semibold">
                                                Provide details for Other
                                            </label>
                                            <textarea
                                                id="retenderOtherReason"
                                                name="retenderOtherReason"
                                                rows={2}
                                                className="form-textarea"
                                                placeholder="Describe other reason"
                                                value={formData.retenderOtherReason}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="md:col-span-2">
                            <label htmlFor="notes" className="mb-2 block font-semibold">
                                {t('evaluation.new.notes', 'Additional Notes')}
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

                {/* Note: Sections B, C, D, E */}
                <div className="panel bg-info/5 border-2 border-info">
                    <div className="flex items-start gap-3">
                        <div className="mt-1">
                            <svg className="h-6 w-6 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h6 className="mb-2 font-semibold text-info">BSJ Evaluation Report Workflow</h6>
                            <p className="text-sm text-white-dark mb-3">After creating this evaluation, you will complete the remaining sections:</p>
                            <ul className="ml-4 list-disc space-y-1 text-sm text-white-dark">
                                <li>
                                    <strong>Section B:</strong> Eligibility Requirements & Compliance Matrix for each bidder
                                </li>
                                <li>
                                    <strong>Technical Evaluation:</strong> Specifications and quantities review for each bid
                                </li>
                                <li>
                                    <strong>Section C:</strong> Evaluator comments, action taken (Recommended/Rejected/Deferred), and signature
                                </li>
                                <li>
                                    <strong>Section D:</strong> Summary of evaluation findings
                                </li>
                                <li>
                                    <strong>Section E:</strong> Final recommendation by Procurement Officer
                                </li>
                            </ul>
                            <p className="mt-3 text-sm text-info font-semibold">These sections will be available in the evaluation detail page once the report is created.</p>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="badge bg-info/10 text-info border border-info/20 px-3 py-1.5">
                            Creates as: <strong className="ml-1">Pending (Draft)</strong>
                        </span>
                        <span className="text-white-dark">→ In Progress → Committee Review → Completed → Validated</span>
                    </div>
                    <div className="flex gap-3">
                        <Link to="/procurement/evaluation" className="btn btn-outline-secondary">
                            {t('common.cancel', 'Cancel')}
                        </Link>
                        <button onClick={handleCreateEvaluation} className="btn btn-success gap-2" disabled={loading}>
                            {loading ? (
                                <>
                                    <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-4 h-4 inline-block align-middle"></span>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <IconChecks className="h-4 w-4" />
                                    {t('evaluation.new.create', 'Create Evaluation')}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewEvaluation;
