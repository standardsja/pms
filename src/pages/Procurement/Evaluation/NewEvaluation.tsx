import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconX from '../../../components/Icon/IconX';
import IconSave from '../../../components/Icon/IconSave';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';
import IconChecks from '../../../components/Icon/IconChecks';
import { getUser } from '../../../utils/auth';
import Swal from 'sweetalert2';
import { useTranslation } from 'react-i18next';
import { evaluationService, type CreateEvaluationDTO } from '../../../services/evaluationService';
import { getApiUrl } from '../../../config/api';
import { getAuthHeadersSync } from '../../../utils/api';

const NewEvaluation = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const combinedRequestIdParam = searchParams.get('combinedRequestId');
    const requestIdParam = searchParams.get('requestId');

    const [combinedRequestIdState, setCombinedRequestIdState] = useState<string | null>(combinedRequestIdParam || null);
    const [prefilledRequest, setPrefilledRequest] = useState<any>(null);

    // Combined request data
    const [combinedRequest, setCombinedRequest] = useState<any>(null);
    const [loadingCombinedRequest, setLoadingCombinedRequest] = useState(false);

    useEffect(() => {
        dispatch(setPageTitle(t('evaluation.new.pageTitle', 'Create BSJ Evaluation Report')));
    }, [dispatch, t]);

    // Fetch combined request if ID provided
    useEffect(() => {
        const fetchCombinedRequest = async () => {
            if (!combinedRequestIdState) return;

            try {
                setLoadingCombinedRequest(true);
                const response = await fetch(getApiUrl(`/api/requests/combine/${combinedRequestIdState}`), {
                    headers: getAuthHeadersSync(),
                });

                if (!response.ok) throw new Error('Failed to fetch combined request');

                const data = await response.json();
                setCombinedRequest(data);

                // Pre-fill form data from combined request
                setFormData((prev) => ({
                    ...prev,
                    rfqNumber: data.reference || '',
                    rfqTitle: data.title,
                    description: data.description || data.budgetComments || data.procurementComments || '',
                }));
            } catch (error) {
                console.error('Error fetching combined request:', error);
                toast('Failed to load combined request data', 'error');
            } finally {
                setLoadingCombinedRequest(false);
            }
        };

        fetchCombinedRequest();
    }, [combinedRequestIdState]);

    // Fetch single request if requestId provided (prefill form and derive combinedRequestId)
    useEffect(() => {
        const fetchRequest = async () => {
            if (!requestIdParam) return;
            try {
                const response = await fetch(getApiUrl(`/api/requests/${requestIdParam}`), {
                    headers: getAuthHeadersSync(),
                });

                if (!response.ok) throw new Error('Failed to fetch request');

                const data = await response.json();
                setPrefilledRequest(data);

                // Calculate total from items
                let totalEstimate = 0;
                if (data.items && Array.isArray(data.items)) {
                    totalEstimate = data.items.reduce((sum: number, item: any) => {
                        const quantity = parseFloat(item.quantity) || 0;
                        const unitPrice = parseFloat(item.unitPrice) || 0;
                        return sum + quantity * unitPrice;
                    }, 0);
                } else if (data.totalEstimated) {
                    // Fallback to totalEstimated field if items aren't available
                    totalEstimate = parseFloat(data.totalEstimated) || 0;
                }

                // Prefill basic evaluation fields from the request
                // Use description, budgetComments, procurementComments, or any available justification
                const justification = data.description || data.budgetComments || data.procurementComments || data.justification || '';
                setFormData((prev) => ({
                    ...prev,
                    rfqNumber: data.reference || data.code || '',
                    rfqTitle: data.title || '',
                    description: justification,
                    background: justification,
                    comparableEstimate: totalEstimate > 0 ? totalEstimate.toFixed(2) : '',
                }));

                // If the request belongs to a combinedRequest, use that for linking
                if (!combinedRequestIdState && data.combinedRequestId) {
                    setCombinedRequestIdState(String(data.combinedRequestId));
                }
            } catch (err) {
                console.error('Error fetching request for evaluation prefill:', err);
                toast('Failed to prefill request details', 'error');
            }
        };

        fetchRequest();
    }, [requestIdParam]);

    // Role guard (Officer / Manager only)
    useEffect(() => {
        const u = getUser();
        if (!u) {
            navigate('/procurement/evaluation');
            return;
        }
        const roles = (u?.roles || (u?.role ? [u.role] : [])).map((r: any) => {
            const roleName = typeof r === 'string' ? r : r?.name || '';
            return roleName.toUpperCase();
        });
        const hasAccess = roles.some(
            (role) => role.includes('PROCUREMENT_OFFICER') || role.includes('PROCUREMENT_MANAGER') || role.includes('PROCUREMENT') || role.includes('MANAGER') || role.includes('REQUESTER'),
        );
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
        evaluationTitle: '',
        background: '',
        dateSubmissionConsidered: '',
        reportCompletionDate: '',
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
        numberOfBidsReceived: '',
        arithmeticErrorIdentified: 'No' as 'Yes' | 'No',
        retender: 'No' as 'Yes' | 'No',
        retenderReasons: [] as RetenderReasonCode[],
        retenderOtherReason: '',
        awardCriteria: 'Most Advantageous Bid',
        evaluator: '',
        notes: '',
    });

    const [currentStep, setCurrentStep] = useState(1);
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [errorFields, setErrorFields] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const toast = (title: string, icon: 'success' | 'error' | 'info' | 'warning' = 'info') =>
        Swal.fire({
            toast: true,
            icon,
            title,
            position: 'top-end',
            timer: 2500,
            showConfirmButton: false,
        });

    // Send-to-evaluators modal state
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [createdEvaluationId, setCreatedEvaluationId] = useState<number | null>(null);
    const [availableUsers, setAvailableUsers] = useState<Array<{ id: number; email: string; name?: string | null; roles?: string[] }>>([]);
    const [userSearch, setUserSearch] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    const [manualRecipient, setManualRecipient] = useState('');
    const [selectedSections, setSelectedSections] = useState<Array<'A' | 'B' | 'C' | 'D' | 'E'>>(['B', 'C']);

    const totalSteps = 5; // Background, Section A, Section B, Section C, Sections D & E

    // Section B - Compliance Matrix (fully customizable table)
    type ComplianceColumn = { id: string; name: string; width?: string };
    type ComplianceRow = { id: string; data: Record<string, string> };

    const [complianceColumns, setComplianceColumns] = useState<ComplianceColumn[]>([
        { id: 'col-1', name: 'Clause', width: '120px' },
        { id: 'col-2', name: 'COMPLIANCE MATRIX', width: 'auto' },
        { id: 'col-3', name: 'Stationery & Office Supplies', width: 'auto' },
    ]);

    const [complianceRows, setComplianceRows] = useState<ComplianceRow[]>([
        { id: 'row-1', data: { 'col-1': 'ITB 14.1', 'col-2': 'Signed Letter of Quotation', 'col-3': 'N/A' } },
        { id: 'row-2', data: { 'col-1': '', 'col-2': 'Signed price and delivery schedules', 'col-3': 'N/A' } },
        { id: 'row-3', data: { 'col-1': '', 'col-2': 'Signed and Statement of Compliance', 'col-3': 'N/A' } },
        { id: 'row-4', data: { 'col-1': '', 'col-2': 'Bid Validity of 30 day', 'col-3': 'YES' } },
        { id: 'row-5', data: { 'col-1': '', 'col-2': 'Quotation', 'col-3': 'YES' } },
        { id: 'row-6', data: { 'col-1': '', 'col-2': 'Bid Amount (Inclusive of GCT)', 'col-3': '$49,680.00' } },
    ]);

    const updateComplianceCell = (rowId: string, colId: string, value: string) => {
        setComplianceRows((rows) => rows.map((r) => (r.id === rowId ? { ...r, data: { ...r.data, [colId]: value } } : r)));
    };

    const addComplianceRow = () => {
        const newRow: ComplianceRow = {
            id: `row-${Date.now()}`,
            data: complianceColumns.reduce((acc, col) => ({ ...acc, [col.id]: '' }), {}),
        };
        setComplianceRows((rows) => [...rows, newRow]);
    };

    const removeComplianceRow = (rowId: string) => {
        setComplianceRows((rows) => rows.filter((r) => r.id !== rowId));
    };

    const addComplianceColumn = () => {
        const colId = `col-${Date.now()}`;
        const newCol: ComplianceColumn = { id: colId, name: 'New Column', width: 'auto' };
        setComplianceColumns((cols) => [...cols, newCol]);
        setComplianceRows((rows) => rows.map((r) => ({ ...r, data: { ...r.data, [colId]: '' } })));
    };

    const removeComplianceColumn = (colId: string) => {
        setComplianceColumns((cols) => cols.filter((c) => c.id !== colId));
        setComplianceRows((rows) => rows.map((r) => ({ ...r, data: Object.fromEntries(Object.entries(r.data).filter(([k]) => k !== colId)) })));
    };

    const updateComplianceColumnName = (colId: string, newName: string) => {
        setComplianceColumns((cols) => cols.map((c) => (c.id === colId ? { ...c, name: newName } : c)));
    };

    // Section B.A - Eligibility Requirements (fully customizable table)
    type EligibilityColumn = { id: string; name: string; width?: string };
    type EligibilityRow = { id: string; data: Record<string, string> };

    const [eligibilityColumns, setEligibilityColumns] = useState<EligibilityColumn[]>([
        { id: 'col-1', name: 'ELIGIBILITY REQUIREMENT', width: 'auto' },
        { id: 'col-2', name: 'Stationery & Office Supplies', width: 'auto' },
    ]);

    const [eligibilityRows, setEligibilityRows] = useState<EligibilityRow[]>([
        { id: 'row-1', data: { 'col-1': 'PPC Reg in the category of:', 'col-2': '' } },
        { id: 'row-2', data: { 'col-1': 'TCI/TRN', 'col-2': '' } },
        { id: 'row-3', data: { 'col-1': 'Bid Amount (Inclusive of GCT)', 'col-2': '' } },
    ]);

    const updateEligibilityCell = (rowId: string, colId: string, value: string) => {
        setEligibilityRows((rows) => rows.map((r) => (r.id === rowId ? { ...r, data: { ...r.data, [colId]: value } } : r)));
    };

    const addEligibilityRow = () => {
        const newRow: EligibilityRow = {
            id: `row-${Date.now()}`,
            data: eligibilityColumns.reduce((acc, col) => ({ ...acc, [col.id]: '' }), {}),
        };
        setEligibilityRows((rows) => [...rows, newRow]);
    };

    const removeEligibilityRow = (rowId: string) => {
        setEligibilityRows((rows) => rows.filter((r) => r.id !== rowId));
    };

    const addEligibilityColumn = () => {
        const colId = `col-${Date.now()}`;
        const newCol: EligibilityColumn = { id: colId, name: 'New Column', width: 'auto' };
        setEligibilityColumns((cols) => [...cols, newCol]);
        setEligibilityRows((rows) => rows.map((r) => ({ ...r, data: { ...r.data, [colId]: '' } })));
    };

    const removeEligibilityColumn = (colId: string) => {
        setEligibilityColumns((cols) => cols.filter((c) => c.id !== colId));
        setEligibilityRows((rows) => rows.map((r) => ({ ...r, data: Object.fromEntries(Object.entries(r.data).filter(([k]) => k !== colId)) })));
    };

    const updateEligibilityColumnName = (colId: string, newName: string) => {
        setEligibilityColumns((cols) => cols.map((c) => (c.id === colId ? { ...c, name: newName } : c)));
    };

    // Section B.C - Technical Evaluation (fully customizable table with cell types)
    type TechnicalColumn = { id: string; name: string; width?: string; cellType?: 'text' | 'radio' };
    type TechnicalRow = { id: string; data: Record<string, string> };

    const [technicalColumns, setTechnicalColumns] = useState<TechnicalColumn[]>([
        { id: 'col-1', name: 'Specifications', width: 'auto', cellType: 'text' },
        { id: 'col-2', name: 'Quantity', width: '120px', cellType: 'text' },
        { id: 'col-3', name: 'Stationery & Office Supplies', width: 'auto', cellType: 'text' },
        { id: 'col-4', name: 'Bid Amount (Inclusive of GCT)', width: '200px', cellType: 'text' },
    ]);

    const [technicalRows, setTechnicalRows] = useState<TechnicalRow[]>([
        {
            id: 'row-1',
            data: {
                'col-1': 'AA-532BK Image 3 Lever H/Duty Task Chair w/Arms - Black',
                'col-2': '1',
                'col-3': 'Stationery & Office Supplies',
                'col-4': '49680.00',
            },
        },
    ]);

    const updateTechnicalCell = (rowId: string, colId: string, value: string) => {
        setTechnicalRows((rows) => rows.map((r) => (r.id === rowId ? { ...r, data: { ...r.data, [colId]: value } } : r)));
    };

    const addTechnicalRow = () => {
        const newRow: TechnicalRow = {
            id: `row-${Date.now()}`,
            data: technicalColumns.reduce((acc, col) => ({ ...acc, [col.id]: '' }), {}),
        };
        setTechnicalRows((rows) => [...rows, newRow]);
    };

    const removeTechnicalRow = (rowId: string) => {
        setTechnicalRows((rows) => rows.filter((r) => r.id !== rowId));
    };

    const addTechnicalColumn = () => {
        const colId = `col-${Date.now()}`;
        const newCol: TechnicalColumn = { id: colId, name: 'New Column', width: 'auto', cellType: 'text' };
        setTechnicalColumns((cols) => [...cols, newCol]);
        // Add empty data for this column in all existing rows
        setTechnicalRows((rows) => rows.map((r) => ({ ...r, data: { ...r.data, [colId]: '' } })));
    };

    const removeTechnicalColumn = (colId: string) => {
        setTechnicalColumns((cols) => cols.filter((c) => c.id !== colId));
        // Remove data for this column from all rows
        setTechnicalRows((rows) => rows.map((r) => ({ ...r, data: Object.fromEntries(Object.entries(r.data).filter(([k]) => k !== colId)) })));
    };

    const updateColumnName = (colId: string, newName: string) => {
        setTechnicalColumns((cols) => cols.map((c) => (c.id === colId ? { ...c, name: newName } : c)));
    };

    const updateColumnType = (colId: string, cellType: 'text' | 'radio') => {
        setTechnicalColumns((cols) => cols.map((c) => (c.id === colId ? { ...c, cellType } : c)));
        // If switching to radio, clear values that aren't Yes/No
        if (cellType === 'radio') {
            setTechnicalRows((rows) =>
                rows.map((r) => {
                    const currentValue = r.data[colId]?.toLowerCase();
                    const newValue = currentValue === 'yes' || currentValue === 'no' ? currentValue.charAt(0).toUpperCase() + currentValue.slice(1) : '';
                    return { ...r, data: { ...r.data, [colId]: newValue } };
                }),
            );
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const validateStep = (step: number): boolean => {
        const missingFields: string[] = [];

        switch (step) {
            case 1: // Background
                // Background section has no required fields
                break;
            case 2: // Section A
                if (!formData.comparableEstimate) missingFields.push('Comparable Estimate');
                if (!formData.tenderClosingDate) missingFields.push('Tender Closing Date');
                if (!formData.tenderOpeningDate) missingFields.push('Tender Opening Date');
                if (!formData.numberOfBidsRequested) missingFields.push('Number of Bids Requested');
                if (formData.retender === 'Yes' && formData.retenderReasons.length === 0) {
                    missingFields.push('At least one Re-tender Reason');
                }
                if (formData.retender === 'Yes' && formData.retenderReasons.includes('k') && !formData.retenderOtherReason) {
                    missingFields.push('Other Re-tender Reason Description');
                }
                break;
            // Sections B, C, D, E are optional during creation
        }

        if (missingFields.length > 0) {
            setErrorFields(missingFields);
            setShowErrorAlert(true);
            setTimeout(() => setShowErrorAlert(false), 5000);
            return false;
        }

        return true;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePrevious = () => {
        setCurrentStep((prev) => Math.max(prev - 1, 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const goToStep = (step: number) => {
        setCurrentStep(step);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCreateEvaluation = async () => {
        const missingFields: string[] = [];

        if (!formData.evaluationTitle) missingFields.push('Evaluation Title');
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

            // Only propagate requestId when it is a valid integer (avoid sending string references/null)
            const parsedRequestId = requestIdParam && /^\d+$/.test(requestIdParam) ? parseInt(requestIdParam, 10) : undefined;

            // Prepare the evaluation data matching the backend API structure
            const evaluationData: CreateEvaluationDTO = {
                evalNumber,
                rfqNumber: evalNumber,
                rfqTitle: formData.evaluationTitle || 'BSJ Evaluation Report',
                description: formData.background || undefined,
                dateSubmissionConsidered: formData.dateSubmissionConsidered || null,
                reportCompletionDate: formData.reportCompletionDate || null,
                evaluator: formData.evaluator || undefined,
                dueDate: formData.bidValidityExpiration || undefined,
                combinedRequestId: combinedRequestIdState ? parseInt(combinedRequestIdState) : undefined, // Link to combined request
                requestId: parsedRequestId,
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
                sectionB: {
                    bidders: [
                        {
                            bidderName: '', // Can be extracted from table if needed
                            eligibilityRequirements: {
                                columns: eligibilityColumns,
                                rows: eligibilityRows.map((row) => ({
                                    id: row.id,
                                    data: row.data,
                                })),
                            },
                            complianceMatrix: {
                                columns: complianceColumns,
                                rows: complianceRows.map((row) => ({
                                    id: row.id,
                                    data: row.data,
                                })),
                            },
                            technicalEvaluation: {
                                columns: technicalColumns,
                                rows: technicalRows.map((row) => ({
                                    id: row.id,
                                    data: row.data,
                                })),
                            },
                        },
                    ],
                },
            };
            const result = await evaluationService.createEvaluation(evaluationData);

            setCreatedEvaluationId(result.id);
            toast(`BSJ Evaluation ${evalNumber} created successfully. Assign technical evaluators for Section B.`, 'success');

            // Load users for selection
            try {
                const resp = await fetch(getApiUrl('/api/admin/users'), {
                    headers: getAuthHeadersSync(),
                });
                if (resp.ok) {
                    const users = await resp.json();
                    // Normalize user objects to ensure numeric `id`
                    const normalized = (Array.isArray(users) ? users : [])
                        .map((u: any) => ({
                            id: typeof u.id === 'number' ? u.id : parseInt(String(u.userId ?? u.id), 10),
                            email: String(u.email || ''),
                            name: u.name ?? null,
                            roles: Array.isArray(u.roles) ? u.roles : [],
                        }))
                        .filter((u: any) => Number.isFinite(u.id));
                    setAvailableUsers(normalized);
                }
            } catch {
                // ignore
            }

            setShowAssignModal(true);
        } catch (error: any) {
            console.error('Failed to create evaluation:', error);
            toast(error.message || 'Failed to create evaluation. Please try again.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectedUser = (id: number) => {
        if (!Number.isFinite(id)) return;
        setSelectedUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const toggleSection = (sec: 'A' | 'B' | 'C' | 'D' | 'E') => {
        setSelectedSections((prev) => (prev.includes(sec) ? prev.filter((s) => s !== sec) : [...prev, sec]));
    };

    const handleSendAssignments = async () => {
        if (!createdEvaluationId) return;
        try {
            setLoading(true);
            // Coerce and filter IDs to ensure valid numeric payload
            const baseIds = selectedUserIds.map((v) => (typeof v === 'number' ? v : parseInt(String(v), 10))).filter((n) => Number.isFinite(n));
            const manual = manualRecipient.trim();
            const manualIds: number[] = [];
            const manualEmails: string[] = [];

            if (manual) {
                const numericCandidate = parseInt(manual, 10);
                if (!Number.isNaN(numericCandidate)) {
                    manualIds.push(numericCandidate);
                } else if (manual.includes('@')) {
                    manualEmails.push(manual.toLowerCase());
                }
            }

            const userIds = Array.from(new Set([...baseIds, ...manualIds])).filter((n) => Number.isFinite(n));

            if (userIds.length === 0 && manualEmails.length === 0) {
                toast('Please select at least one valid user or enter an email/ID', 'error');
                return;
            }

            const sectionsWithC = selectedSections.includes('C') ? selectedSections : ([...selectedSections, 'C'] as Array<'A' | 'B' | 'C' | 'D' | 'E'>);

            console.debug('Assigning evaluators', { evaluationId: createdEvaluationId, userIds, userEmails: manualEmails, sections: sectionsWithC });
            await evaluationService.assignEvaluators(createdEvaluationId, {
                userIds,
                userEmails: manualEmails.length > 0 ? manualEmails : undefined,
                sections: sectionsWithC,
            });
            toast('Assignments sent successfully', 'success');
            setShowAssignModal(false);
            setManualRecipient('');
            navigate('/procurement/evaluation');
        } catch (err: any) {
            toast(err?.message || 'Failed to send assignments', 'error');
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

            {/* Combined Request Banner */}
            {combinedRequest && (
                <div className="panel bg-primary/5 border-2 border-primary mb-6">
                    <div className="flex items-start gap-3">
                        <div className="mt-1">
                            <IconChecks className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h6 className="mb-2 font-semibold text-primary">Evaluating Combined Request: {combinedRequest.reference}</h6>
                            <p className="text-sm text-white-dark mb-3">{combinedRequest.description}</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="bg-white dark:bg-gray-800 rounded p-3">
                                    <div className="text-2xl font-bold text-primary">{combinedRequest.lotsCount}</div>
                                    <div className="text-xs text-gray-600">Numbered Lots</div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded p-3">
                                    <div className="text-2xl font-bold text-success">{combinedRequest.totalItems}</div>
                                    <div className="text-xs text-gray-600">Total Items</div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 rounded p-3">
                                    <div className="text-2xl font-bold text-warning">
                                        {combinedRequest.lots[0]?.currency || 'JMD'} {combinedRequest.totalValue.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-gray-600">Total Value</div>
                                </div>
                            </div>
                            <div className="mt-3">
                                <p className="text-sm font-semibold text-primary">Lots to Evaluate:</p>
                                <ul className="mt-2 space-y-1">
                                    {combinedRequest.lots.map((lot: any) => (
                                        <li key={lot.id} className="text-sm text-white-dark">
                                            <span className="font-semibold text-primary">LOT-{lot.lotNumber}:</span> {lot.title} ({lot.items.length} items)
                                        </li>
                                    ))}
                                </ul>
                            </div>
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

            {/* Assign to Evaluators Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60">
                    <div className="panel w-full max-w-3xl overflow-hidden rounded-lg p-0">
                        <div className="flex items-center p-3.5 rounded-t text-primary bg-primary-light dark:bg-primary-dark-light">
                            <span className="ltr:pr-2 rtl:pl-2 flex-1">
                                <strong className="ltr:mr-1 rtl:ml-1 text-lg">Assign Technical Evaluators</strong>
                            </span>
                            <button type="button" className="ltr:ml-auto rtl:mr-auto hover:opacity-80" onClick={() => setShowAssignModal(false)}>
                                <IconX className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="bg-info-light p-3 rounded">
                                <p className="text-sm font-semibold text-info">Section B: Technical Evaluation</p>
                                <p className="text-xs text-white-dark mt-1">
                                    Select evaluators who will complete the technical evaluation tables (eligibility, compliance, and technical criteria). Requester(s) are automatically included and
                                    will always receive Section C to complete.
                                </p>
                            </div>
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1">
                                    <div className="mb-2">
                                        <input
                                            type="text"
                                            placeholder="Search users by name or email"
                                            className="form-input w-full"
                                            value={userSearch}
                                            onChange={(e) => setUserSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="text-xs font-semibold text-gray-600 mb-1 block">Or enter a requester/evaluator email or ID</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="form-input flex-1"
                                                placeholder="name@org.com or 123"
                                                value={manualRecipient}
                                                onChange={(e) => setManualRecipient(e.target.value)}
                                            />
                                        </div>
                                        <p className="text-[11px] text-white-dark mt-1">We will include this recipient even if they are not listed below.</p>
                                    </div>
                                    <div className="max-h-72 overflow-auto border rounded">
                                        {availableUsers
                                            .filter((u) => {
                                                const q = userSearch.toLowerCase();
                                                const hay = `${u.name || ''} ${u.email}`.toLowerCase();
                                                return !q || hay.includes(q);
                                            })
                                            .map((u) => (
                                                <label key={u.id} className="flex items-center gap-3 p-2 border-b last:border-b-0">
                                                    <input type="checkbox" className="form-checkbox" checked={selectedUserIds.includes(u.id)} onChange={() => toggleSelectedUser(u.id)} />
                                                    <div className="flex-1">
                                                        <div className="font-semibold">{u.name || u.email}</div>
                                                        <div className="text-xs text-white-dark">{u.email}</div>
                                                    </div>
                                                </label>
                                            ))}
                                        {availableUsers.length === 0 && <div className="p-3 text-sm text-white-dark">No users found.</div>}
                                    </div>
                                </div>
                                <div className="w-full md:w-60">
                                    <div className="font-semibold mb-2">Assign Sections</div>
                                    <label className="flex items-center gap-2 mb-2 opacity-50 cursor-not-allowed">
                                        <input type="checkbox" className="form-checkbox" disabled />
                                        <span className="text-sm">Section A (Procurement)</span>
                                    </label>
                                    <label className="flex items-center gap-2 mb-2">
                                        <input type="checkbox" className="form-checkbox" checked={selectedSections.includes('B')} onChange={() => toggleSection('B')} />
                                        <span className="text-sm font-semibold">Section B (Technical)</span>
                                    </label>
                                    <label className="flex items-center gap-2 mb-2">
                                        <input type="checkbox" className="form-checkbox" checked={selectedSections.includes('C')} onChange={() => toggleSection('C')} />
                                        <span className="text-sm">Section C (Comments)</span>
                                    </label>
                                    <label className="flex items-center gap-2 mb-2 opacity-50 cursor-not-allowed">
                                        <input type="checkbox" className="form-checkbox" disabled />
                                        <span className="text-sm">Section D (Summary)</span>
                                    </label>
                                    <label className="flex items-center gap-2 mb-2 opacity-50 cursor-not-allowed">
                                        <input type="checkbox" className="form-checkbox" disabled />
                                        <span className="text-sm">Section E (Recommendation)</span>
                                    </label>
                                    <div className="text-xs text-info mt-2">Assigned users can edit their sections</div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button className="btn btn-outline-danger" onClick={() => setShowAssignModal(false)}>
                                    Cancel
                                </button>
                                <button className="btn btn-primary" onClick={handleSendAssignments} disabled={loading || selectedUserIds.length + (manualRecipient.trim() ? 1 : 0) === 0}>
                                    {loading
                                        ? 'Assigning...'
                                        : `Assign to ${selectedUserIds.length + (manualRecipient.trim() ? 1 : 0)} Recipient${
                                              selectedUserIds.length + (manualRecipient.trim() ? 1 : 0) !== 1 ? 's' : ''
                                          }`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Progress Steps */}
            <div className="panel mb-5">
                <div className="mb-5">
                    <div className="flex justify-between items-center">
                        <div className="text-sm font-semibold">
                            Step {currentStep} of {totalSteps}
                        </div>
                        <div className="text-sm text-white-dark">
                            {currentStep === 1 && 'Background Information'}
                            {currentStep === 2 && 'Section A: Procurement Details'}
                            {currentStep === 3 && 'Section B: Eligibility & Compliance'}
                            {currentStep === 4 && 'Section C: Evaluator Assessment'}
                            {currentStep === 5 && 'Sections D & E: Officer Recommendation'}
                        </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                        {[1, 2, 3, 4, 5].map((step) => (
                            <button
                                key={step}
                                type="button"
                                onClick={() => goToStep(step)}
                                className={`flex-1 h-2 rounded-full transition-all ${step < currentStep ? 'bg-success' : step === currentStep ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`}
                                title={`Go to step ${step}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {/* Step 1: BACKGROUND Section */}
                {currentStep === 1 && (
                    <div className="panel">
                        <div className="mb-5">
                            <label htmlFor="evaluationTitle" className="mb-2 block font-semibold text-lg">
                                EVALUATION TITLE: <span className="text-danger">*</span>
                            </label>
                            <input
                                id="evaluationTitle"
                                name="evaluationTitle"
                                type="text"
                                className="form-input"
                                placeholder="e.g., Procurement of Office Supplies for ICT Department"
                                value={formData.evaluationTitle}
                                onChange={handleInputChange}
                            />
                            <p className="text-xs text-gray-500 mt-1">This title will appear as a header on all evaluation pages</p>
                        </div>
                        <div className="mb-5">
                            <label htmlFor="background" className="mb-2 block font-semibold text-lg">
                                BACKGROUND:
                            </label>
                            <textarea
                                id="background"
                                name="background"
                                rows={4}
                                className="form-textarea"
                                placeholder="To arrange for the procurement and provision of..."
                                value={formData.background}
                                onChange={handleInputChange}
                            />
                        </div>
                        <div className="grid gap-5 md:grid-cols-2">
                            <div>
                                <label htmlFor="dateSubmissionConsidered" className="mb-2 block font-semibold">
                                    DATE SUBMISSION WAS CONSIDERED:
                                </label>
                                <input
                                    id="dateSubmissionConsidered"
                                    name="dateSubmissionConsidered"
                                    type="date"
                                    className="form-input"
                                    value={formData.dateSubmissionConsidered}
                                    onChange={handleInputChange}
                                />
                            </div>
                            <div>
                                <label htmlFor="reportCompletionDate" className="mb-2 block font-semibold">
                                    REPORT COMPLETION DATE:
                                </label>
                                <input id="reportCompletionDate" name="reportCompletionDate" type="date" className="form-input" value={formData.reportCompletionDate} onChange={handleInputChange} />
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="mt-6 flex justify-end gap-3">
                            <button type="button" onClick={handleNext} className="btn btn-primary gap-2">
                                Next: Section A
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Section A - To be completed by Assigned Procurement Officer */}
                {currentStep === 2 && (
                    <div className="panel">
                        <div className="mb-5 -m-5 p-5 bg-primary/10 border-l-4 border-primary">
                            <h5 className="text-lg font-bold text-primary">Section A</h5>
                            <p className="text-sm mt-1">Procurement Details - to be completed by the Procurement Officer</p>
                        </div>
                        <div className="space-y-4 p-5">
                            {/* Field 1 */}
                            <div>
                                <label htmlFor="comparableEstimate" className="mb-2 block font-semibold">
                                    1. COMPARABLE ESTIMATE: <span className="text-danger">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                                    <input
                                        id="comparableEstimate"
                                        name="comparableEstimate"
                                        type="text"
                                        className="form-input w-full pl-8"
                                        placeholder="1,395,444"
                                        value={formData.comparableEstimate ? String(formData.comparableEstimate).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                                        onChange={(e) => {
                                            // Just remove commas and store the raw number
                                            const value = e.target.value.replace(/,/g, '');
                                            setFormData({ ...formData, comparableEstimate: value });
                                        }}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Field 2 */}
                            <div>
                                <label htmlFor="fundedBy" className="mb-2 block font-semibold">
                                    2. FUNDED BY:
                                </label>
                                <input id="fundedBy" name="fundedBy" type="text" className="form-input w-full" placeholder="BSJ" value={formData.fundedBy} onChange={handleInputChange} />
                            </div>

                            {/* Field 3 */}
                            <div>
                                <label className="mb-2 block font-semibold">
                                    3. TENDER CLOSING DATE & TIME: <span className="text-danger">*</span>
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

                            {/* Field 4 */}
                            <div>
                                <label className="mb-2 block font-semibold">
                                    4. TENDER OPENING DATE & TIME: <span className="text-danger">*</span>
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

                            {/* Field 4a */}
                            <div className="ml-8">
                                <label className="mb-2 block font-semibold">a. ACTUAL OPENING DATE & TIME:</label>
                                <div className="flex gap-2">
                                    <input id="actualOpeningDate" name="actualOpeningDate" type="date" className="form-input flex-1" value={formData.actualOpeningDate} onChange={handleInputChange} />
                                    <input id="actualOpeningTime" name="actualOpeningTime" type="time" className="form-input w-32" value={formData.actualOpeningTime} onChange={handleInputChange} />
                                </div>
                            </div>

                            {/* Field 5 */}
                            <div>
                                <label className="mb-2 block font-semibold">5. Procurement Method:</label>
                                <div className="space-y-2">
                                    {['International Competitive Bidding', 'National Competitive Bidding', 'Restricted Bidding', 'Single Source', 'Emergency Single Source'].map((method) => (
                                        <label key={method} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                className="form-checkbox"
                                                checked={formData.procurementMethod === method}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setFormData({ ...formData, procurementMethod: method });
                                                    }
                                                }}
                                            />
                                            <span>{method}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Field 6 */}
                            <div>
                                <label className="mb-2 block font-semibold">6. Method of Advertisement:</label>
                                <div className="space-y-2">
                                    {['International Advertisement', 'National Advertisement', 'GOJEP', 'Email'].map((method) => (
                                        <label key={method} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                className="form-checkbox"
                                                checked={formData.advertisementMethods.includes(method)}
                                                onChange={(e) => {
                                                    setFormData({
                                                        ...formData,
                                                        advertisementMethods: e.target.checked ? [...formData.advertisementMethods, method] : formData.advertisementMethods.filter((x) => x !== method),
                                                    });
                                                }}
                                            />
                                            <span>{method}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Field 7 */}
                            <div>
                                <label className="mb-2 block font-semibold">7. Contract Type:</label>
                                <div className="space-y-2">
                                    {['Goods', 'Consulting Services', 'Non-Consulting Services', 'Works'].map((type) => (
                                        <label key={type} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                className="form-checkbox"
                                                checked={formData.contractType === type}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setFormData({ ...formData, contractType: type });
                                                    }
                                                }}
                                            />
                                            <span>{type}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Field 8 */}
                            <div>
                                <label className="mb-2 block font-semibold">8. Bid Security:</label>
                                <div className="flex gap-4">
                                    {['Yes', 'No', 'N/A'].map((opt) => (
                                        <label key={opt} className="flex items-center gap-2">
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

                            {/* Field 9 */}
                            <div>
                                <label className="mb-2 block font-semibold">9. Tender Period:</label>
                                <div className="flex gap-2 items-center mb-3">
                                    <input
                                        id="tenderPeriodStartDate"
                                        name="tenderPeriodStartDate"
                                        type="date"
                                        className="form-input flex-1"
                                        value={formData.tenderPeriodStartDate}
                                        onChange={handleInputChange}
                                    />
                                    <span>to</span>
                                    <input
                                        id="tenderPeriodEndDate"
                                        name="tenderPeriodEndDate"
                                        type="date"
                                        className="form-input flex-1"
                                        value={formData.tenderPeriodEndDate}
                                        onChange={handleInputChange}
                                    />
                                </div>
                                <div className="ml-8">
                                    <label className="mb-1 block font-semibold">a. Number of Days:</label>
                                    <input
                                        id="tenderPeriodDays"
                                        name="tenderPeriodDays"
                                        type="number"
                                        className="form-input w-32"
                                        placeholder="1"
                                        value={formData.tenderPeriodDays}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            {/* Field 10 */}
                            <div>
                                <label className="mb-2 block font-semibold">10. Bid Validity Period:</label>
                                <input
                                    id="bidValidityDays"
                                    name="bidValidityDays"
                                    type="text"
                                    className="form-input w-full"
                                    placeholder="30 Days"
                                    value={formData.bidValidityDays}
                                    onChange={handleInputChange}
                                />
                                <div className="ml-8 mt-3">
                                    <label className="mb-1 block font-semibold">a. Bid Validity Expiration Date:</label>
                                    <input
                                        id="bidValidityExpiration"
                                        name="bidValidityExpiration"
                                        type="date"
                                        className="form-input"
                                        value={formData.bidValidityExpiration}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            {/* Field 11 */}
                            <div>
                                <label className="mb-2 block font-semibold">
                                    11. Number of Bids Requested: <span className="text-danger">*</span>
                                </label>
                                <input
                                    id="numberOfBidsRequested"
                                    name="numberOfBidsRequested"
                                    type="number"
                                    className="form-input w-32"
                                    placeholder="1"
                                    value={formData.numberOfBidsRequested}
                                    onChange={handleInputChange}
                                    required
                                />
                                <div className="ml-8 mt-3">
                                    <label className="mb-1 block font-semibold">a. Number of Bids Received:</label>
                                    <input
                                        id="numberOfBidsReceived"
                                        name="numberOfBidsReceived"
                                        type="number"
                                        className="form-input w-32"
                                        placeholder="1"
                                        value={formData.numberOfBidsReceived || ''}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            {/* Field 12 */}
                            <div>
                                <label className="mb-2 block font-semibold">12. Arithmetic Error Identified:</label>
                                <div className="flex gap-4">
                                    {['Yes', 'No'].map((opt) => (
                                        <label key={opt} className="flex items-center gap-2">
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

                            {/* Field 13 */}
                            <div>
                                <label className="mb-2 block font-semibold">13. Re-tendered:</label>
                                <div className="flex gap-4">
                                    {['Yes', 'No'].map((opt) => (
                                        <label key={opt} className="flex items-center gap-2">
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
                            </div>

                            {/* Field 14 */}
                            {formData.retender === 'Yes' && (
                                <div className="ml-8">
                                    <label className="mb-2 block font-semibold">14. Reason for re-tender:</label>
                                    <div className="space-y-2">
                                        {RETENDER_REASON_OPTIONS.map((option) => (
                                            <label key={option.code} className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    className="form-checkbox"
                                                    checked={formData.retenderReasons.includes(option.code)}
                                                    onChange={(e) => {
                                                        setFormData({
                                                            ...formData,
                                                            retenderReasons: e.target.checked ? [...formData.retenderReasons, option.code] : formData.retenderReasons.filter((x) => x !== option.code),
                                                        });
                                                    }}
                                                />
                                                <span>
                                                    {option.code}. {option.label}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    {formData.retenderReasons.includes('k') && (
                                        <div className="mt-3">
                                            <label htmlFor="retenderOtherReason" className="mb-2 block font-semibold">
                                                Other (please specify):
                                            </label>
                                            <textarea
                                                id="retenderOtherReason"
                                                name="retenderOtherReason"
                                                rows={2}
                                                className="form-textarea"
                                                placeholder="Please describe the other reason for re-tender..."
                                                value={formData.retenderOtherReason}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Field 15 */}
                            <div>
                                <label className="mb-2 block font-semibold">15. Contract Award Criteria:</label>
                                <div className="flex gap-4">
                                    {['Lowest Cost', 'Most Advantageous Bid'].map((criteria) => (
                                        <label key={criteria} className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="awardCriteria"
                                                value={criteria}
                                                checked={formData.awardCriteria === criteria}
                                                onChange={(e) => setFormData({ ...formData, awardCriteria: e.target.value })}
                                            />
                                            <span>{criteria === 'Lowest Cost' ? 'a. Lowest Cost' : 'b. Most Advantageous Bid'}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="mt-6 flex justify-between gap-3">
                            <button type="button" onClick={handlePrevious} className="btn btn-outline-secondary gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Previous: Background
                            </button>
                            <button type="button" onClick={handleNext} className="btn btn-primary gap-2">
                                Next: Section B
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Section B - Eligibility Requirements & Compliance Matrix */}
                {currentStep === 3 && (
                    <div className="panel">
                        <div className="mb-5 -m-5 p-5 bg-info/10 border-l-4 border-info">
                            <h5 className="text-lg font-bold text-info">Section B</h5>
                            <p className="text-sm mt-1">to be drafted by the Assigned Procurement Officer.</p>
                        </div>

                        <div className="space-y-6 p-5">
                            {/* A. Eligibility Requirements - Fully Customizable Table */}
                            <div>
                                <h6 className="text-md font-bold mb-4">A. Eligibility Requirements</h6>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs text-gray-500">Customize columns and rows for eligibility details.</p>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={addEligibilityColumn} className="btn btn-outline-info btn-sm">
                                            + Add Column
                                        </button>
                                        <button type="button" onClick={addEligibilityRow} className="btn btn-outline-primary btn-sm">
                                            + Add Row
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="table-auto w-full border-collapse border border-gray-300 dark:border-gray-600">
                                        <thead>
                                            <tr className="bg-gray-100 dark:bg-gray-800">
                                                {eligibilityColumns.map((col) => (
                                                    <th key={col.id} className="border border-gray-300 dark:border-gray-600 px-2 py-2" style={{ width: col.width }}>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                className="form-input text-sm font-semibold bg-transparent border-0 p-1"
                                                                value={col.name}
                                                                onChange={(e) => updateEligibilityColumnName(col.id, e.target.value)}
                                                                placeholder="Column name"
                                                            />
                                                            {eligibilityColumns.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeEligibilityColumn(col.id)}
                                                                    className="text-danger hover:bg-danger hover:text-white p-1 rounded transition-colors"
                                                                    title="Remove column"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </th>
                                                ))}
                                                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left font-semibold w-24">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {eligibilityRows.map((row) => (
                                                <tr key={row.id}>
                                                    {eligibilityColumns.map((col) => (
                                                        <td key={col.id} className="border border-gray-300 dark:border-gray-600 px-2 py-2">
                                                            <input
                                                                type="text"
                                                                className="form-input w-full text-sm"
                                                                value={row.data[col.id] || ''}
                                                                onChange={(e) => updateEligibilityCell(row.id, col.id, e.target.value)}
                                                                placeholder="Enter value"
                                                            />
                                                        </td>
                                                    ))}
                                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeEligibilityRow(row.id)}
                                                            className="btn btn-outline-danger btn-sm"
                                                            disabled={eligibilityRows.length <= 1}
                                                            title="Remove row"
                                                        >
                                                            Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* B. Compliance Matrix - Fully Customizable Table */}
                            <div>
                                <h6 className="text-md font-bold mb-4">B. Compliance Matrix</h6>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs text-gray-500">Customize columns and rows for compliance tracking.</p>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={addComplianceColumn} className="btn btn-outline-info btn-sm">
                                            + Add Column
                                        </button>
                                        <button type="button" onClick={addComplianceRow} className="btn btn-outline-primary btn-sm">
                                            + Add Row
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="table-auto w-full border-collapse border border-gray-300 dark:border-gray-600">
                                        <thead>
                                            <tr className="bg-gray-100 dark:bg-gray-800">
                                                {complianceColumns.map((col) => (
                                                    <th key={col.id} className="border border-gray-300 dark:border-gray-600 px-2 py-2" style={{ width: col.width }}>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                className="form-input text-sm font-semibold bg-transparent border-0 p-1"
                                                                value={col.name}
                                                                onChange={(e) => updateComplianceColumnName(col.id, e.target.value)}
                                                                placeholder="Column name"
                                                            />
                                                            {complianceColumns.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeComplianceColumn(col.id)}
                                                                    className="text-danger hover:bg-danger hover:text-white p-1 rounded transition-colors"
                                                                    title="Remove column"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </th>
                                                ))}
                                                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left font-semibold w-24">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {complianceRows.map((row) => (
                                                <tr key={row.id}>
                                                    {complianceColumns.map((col) => (
                                                        <td key={col.id} className="border border-gray-300 dark:border-gray-600 px-2 py-2">
                                                            <input
                                                                type="text"
                                                                className="form-input w-full text-sm"
                                                                value={row.data[col.id] || ''}
                                                                onChange={(e) => updateComplianceCell(row.id, col.id, e.target.value)}
                                                                placeholder="Enter value"
                                                            />
                                                        </td>
                                                    ))}
                                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeComplianceRow(row.id)}
                                                            className="btn btn-outline-danger btn-sm"
                                                            disabled={complianceRows.length <= 1}
                                                            title="Remove row"
                                                        >
                                                            Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Technical Evaluation - Fully Customizable Table */}
                            <div>
                                <h6 className="text-md font-bold mb-4">Technical Evaluation</h6>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs text-gray-500">Customize columns and rows to match your evaluation needs.</p>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={addTechnicalColumn} className="btn btn-outline-info btn-sm">
                                            + Add Column
                                        </button>
                                        <button type="button" onClick={addTechnicalRow} className="btn btn-outline-primary btn-sm">
                                            + Add Row
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="table-auto w-full border-collapse border border-gray-300 dark:border-gray-600">
                                        <thead>
                                            <tr className="bg-gray-100 dark:bg-gray-800">
                                                {technicalColumns.map((col) => (
                                                    <th key={col.id} className="border border-gray-300 dark:border-gray-600 px-2 py-2" style={{ width: col.width }}>
                                                        <div className="flex flex-col gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    className="form-input text-sm font-semibold bg-transparent border-0 p-1 flex-1"
                                                                    value={col.name}
                                                                    onChange={(e) => updateColumnName(col.id, e.target.value)}
                                                                    placeholder="Column name"
                                                                />
                                                                {technicalColumns.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeTechnicalColumn(col.id)}
                                                                        className="text-danger hover:bg-danger hover:text-white p-1 rounded transition-colors"
                                                                        title="Remove column"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                        </svg>
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <select
                                                                    className="form-select text-xs py-1 px-2"
                                                                    value={col.cellType || 'text'}
                                                                    onChange={(e) => updateColumnType(col.id, e.target.value as 'text' | 'radio')}
                                                                    title="Cell type"
                                                                >
                                                                    <option value="text">Text</option>
                                                                    <option value="radio">Yes/No</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </th>
                                                ))}
                                                <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 text-left font-semibold w-24">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {technicalRows.map((row) => (
                                                <tr key={row.id}>
                                                    {technicalColumns.map((col) => (
                                                        <td key={col.id} className="border border-gray-300 dark:border-gray-600 px-2 py-2 align-top">
                                                            {col.cellType === 'radio' ? (
                                                                <div className="flex items-center gap-4 justify-center">
                                                                    <label className="flex items-center gap-1 cursor-pointer">
                                                                        <input
                                                                            type="radio"
                                                                            name={`${row.id}-${col.id}`}
                                                                            className="form-radio"
                                                                            checked={row.data[col.id] === 'Yes'}
                                                                            onChange={() => updateTechnicalCell(row.id, col.id, 'Yes')}
                                                                        />
                                                                        <span className="text-sm">Yes</span>
                                                                    </label>
                                                                    <label className="flex items-center gap-1 cursor-pointer">
                                                                        <input
                                                                            type="radio"
                                                                            name={`${row.id}-${col.id}`}
                                                                            className="form-radio"
                                                                            checked={row.data[col.id] === 'No'}
                                                                            onChange={() => updateTechnicalCell(row.id, col.id, 'No')}
                                                                        />
                                                                        <span className="text-sm">No</span>
                                                                    </label>
                                                                </div>
                                                            ) : (
                                                                <textarea
                                                                    className="form-textarea w-full text-sm"
                                                                    rows={2}
                                                                    placeholder="Enter value"
                                                                    value={row.data[col.id] || ''}
                                                                    onChange={(e) => updateTechnicalCell(row.id, col.id, e.target.value)}
                                                                />
                                                            )}
                                                        </td>
                                                    ))}
                                                    <td className="border border-gray-300 dark:border-gray-600 px-2 py-2 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeTechnicalRow(row.id)}
                                                            className="btn btn-outline-danger btn-sm"
                                                            disabled={technicalRows.length <= 1}
                                                            title="Remove row"
                                                        >
                                                            Remove
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="mt-6 flex justify-between gap-3">
                            <button type="button" onClick={handlePrevious} className="btn btn-outline-secondary gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Previous: Section A
                            </button>
                            <button type="button" onClick={handleNext} className="btn btn-primary gap-2">
                                Next: Section C
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 4: Section C - To be completed by the Evaluator */}
                {currentStep === 4 && (
                    <div className="panel">
                        <div className="mb-5 -m-5 p-5 bg-warning/10 border-l-4 border-warning">
                            <h5 className="text-lg font-bold text-warning">Section C</h5>
                            <p className="text-sm mt-1">to be completed by the Evaluator</p>
                        </div>

                        <div className="space-y-5 p-5">
                            {/* Comments/Critical Issues Examined */}
                            <div>
                                <label className="mb-2 block font-semibold">Comments/Critical Issues Examined:</label>
                                <textarea className="form-textarea w-full" rows={8} placeholder="Enter detailed comments and critical issues examined..." />
                            </div>

                            {/* Action Taken */}
                            <div>
                                <label className="mb-2 block font-semibold">Action Taken:</label>
                                <div className="flex gap-6">
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" className="form-checkbox" />
                                        <span>(a) Recommended</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" className="form-checkbox" />
                                        <span>(b) Rejected</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" className="form-checkbox" />
                                        <span>(c) Deferred</span>
                                    </label>
                                </div>
                            </div>

                            {/* If rejected or deferred */}
                            <div>
                                <label className="mb-2 block font-semibold">If rejected or deferred, please give details below:</label>
                                <textarea className="form-textarea w-full" rows={4} placeholder="Provide details if rejected or deferred..." />
                            </div>

                            {/* Recommended Contractor/Supplier */}
                            <div>
                                <label className="mb-2 block font-semibold">Recommended Contractor/Supplier:</label>
                                <input type="text" className="form-input w-full" placeholder="Enter recommended contractor/supplier name" />
                            </div>

                            {/* Recommended Contract Amount */}
                            <div>
                                <label className="mb-2 block font-semibold">Recommended Contract Amount (inclusive of GCT):</label>
                                <input type="number" step="0.01" className="form-input w-full" placeholder="$0.00" />
                            </div>

                            {/* Evaluator's Information */}
                            <div className="grid gap-5 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block font-semibold">Evaluator's Name:</label>
                                    <input type="text" className="form-input w-full" placeholder="Enter evaluator's name" />
                                </div>
                                <div>
                                    <label className="mb-2 block font-semibold">Job Title:</label>
                                    <input type="text" className="form-input w-full" placeholder="Enter job title" />
                                </div>
                            </div>

                            <div className="grid gap-5 md:grid-cols-2">
                                <div>
                                    <label className="mb-2 block font-semibold">Signature:</label>
                                    <input type="text" className="form-input w-full" placeholder="Signature" />
                                </div>
                                <div>
                                    <label className="mb-2 block font-semibold">Date:</label>
                                    <input type="date" className="form-input w-full" />
                                </div>
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="mt-6 flex justify-between gap-3">
                            <button type="button" onClick={handlePrevious} className="btn btn-outline-secondary gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Previous: Section B
                            </button>
                            <button type="button" onClick={handleNext} className="btn btn-primary gap-2">
                                Next: Sections D & E
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 5: Sections D & E - To be completed by the Assigned Procurement Officer */}
                {currentStep === 5 && (
                    <>
                        {/* Section D */}
                        <div className="panel">
                            <div className="mb-5 -m-5 p-5 bg-success/10 border-l-4 border-success">
                                <h5 className="text-lg font-bold text-success">Section D</h5>
                                <p className="text-sm mt-1">Summary of Evaluation - to be completed by the Procurement Officer</p>
                            </div>

                            <div className="space-y-5 p-5">
                                {/* Summary of Evaluation */}
                                <div>
                                    <label className="mb-2 block font-semibold">Summary of Evaluation</label>
                                    <textarea rows={8} className="form-textarea w-full" placeholder="Provide a comprehensive summary of the evaluation process, findings, and conclusions..." />
                                </div>
                            </div>
                        </div>

                        {/* Section E - To be completed by the Assigned Procurement Officer AFTER Section C is completed by Requesters */}
                        <div className="panel">
                            <div className="mb-5 -m-5 p-5 bg-primary/10 border-l-4 border-primary">
                                <h5 className="text-lg font-bold text-primary">Section E</h5>
                                <p className="text-sm mt-1">Final Recommendation - to be completed by the Procurement Officer (after requesters complete Section C)</p>
                            </div>

                            <div className="space-y-5 p-5">
                                {/* Recommendation */}
                                <div>
                                    <label className="mb-2 block font-semibold">Recommendation:</label>
                                    <textarea rows={3} className="form-textarea w-full" placeholder="Based on the foregoing, a recommendation is being made for the award of contract to..." />
                                </div>

                                {/* Prepared By */}
                                <div className="grid gap-5 md:grid-cols-2">
                                    <div>
                                        <label className="mb-2 block font-semibold">Prepared By:</label>
                                        <input type="text" className="form-input w-full" placeholder="Kristina Brown" />
                                    </div>
                                    <div>
                                        <label className="mb-2 block font-semibold">Signature:</label>
                                        <input type="text" className="form-input w-full" placeholder="Signature" />
                                    </div>
                                </div>

                                <div>
                                    <label className="mb-2 block font-semibold">Date:</label>
                                    <input type="date" className="form-input w-full md:w-1/2" />
                                </div>
                            </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="mt-6 flex justify-between gap-3">
                            <button type="button" onClick={handlePrevious} className="btn btn-outline-secondary gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Previous: Section C
                            </button>
                            <div className="flex gap-3">
                                {createdEvaluationId && (
                                    <button type="button" onClick={() => setShowAssignModal(true)} className="btn btn-primary gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                        Assign Evaluators
                                    </button>
                                )}
                                <button type="button" onClick={handleCreateEvaluation} className="btn btn-success gap-2" disabled={loading || !!createdEvaluationId}>
                                    {loading ? (
                                        <>
                                            <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-4 h-4 inline-block align-middle"></span>
                                            <span>Creating...</span>
                                        </>
                                    ) : createdEvaluationId ? (
                                        <>
                                            <IconChecks />
                                            <span>Evaluation Created</span>
                                        </>
                                    ) : (
                                        <>
                                            <IconChecks />
                                            <span>Create Evaluation</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Info Panel - Visible on all steps */}
                <div className="panel bg-info/5 border-2 border-info">
                    <div className="flex items-start gap-3">
                        <div className="mt-1">
                            <svg className="h-6 w-6 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h6 className="mb-2 font-semibold text-info">BSJ Evaluation Report Workflow</h6>
                            <p className="text-sm text-white-dark mb-3">This evaluation form includes all required sections:</p>
                            <ul className="ml-4 list-disc space-y-1 text-sm text-white-dark">
                                <li>
                                    <strong>Section A:</strong> Procurement details, tender information, and award criteria (Procurement Officer)
                                </li>
                                <li>
                                    <strong>Section B:</strong> Eligibility Requirements, Compliance Matrix, and Technical Evaluation (Assigned Evaluators)
                                </li>
                                <li>
                                    <strong>Section C:</strong> Evaluator comments, action taken, and recommendation (Requesters/Evaluators)
                                </li>
                                <li>
                                    <strong>Section D:</strong> Summary of evaluation (Procurement Officer)
                                </li>
                                <li>
                                    <strong>Section E:</strong> Final recommendation (Procurement Officer - available after Section C completion)
                                </li>
                            </ul>
                            <p className="mt-3 text-sm text-info font-semibold">
                                <strong>Workflow:</strong> Officer creates → Evaluators complete B → Requesters complete C → Officer completes D & E
                            </p>
                        </div>
                    </div>
                </div>

                {/* Status Info */}
                <div className="panel bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="badge bg-info/10 text-info border border-info/20 px-3 py-1.5">
                            Creates as: <strong className="ml-1">Pending (Draft)</strong>
                        </span>
                        <span className="text-white-dark">→ In Progress → Committee Review → Completed → Validated</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewEvaluation;
