import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconX from '../../../components/Icon/IconX';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';
import IconChecks from '../../../components/Icon/IconChecks';
import IconPlus from '../../../components/Icon/IconPlus';
import IconTrashLines from '../../../components/Icon/IconTrashLines';
import IconInfoCircle from '../../../components/Icon/IconInfoCircle';
import { getUser } from '../../../utils/auth';
import { useTranslation } from 'react-i18next';
import { evaluationService } from '../../../services/evaluationService';

const NewEvaluationComplete = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { t } = useTranslation();

    useEffect(() => {
        dispatch(setPageTitle('Create BSJ Evaluation Report'));
    }, [dispatch]);

    // Role guard
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
        // Check if user is Evaluation Committee member
        const isEvalCommittee = roles.some((role) => role.includes('EVALUATION_COMMITTEE'));
        setIsCommittee(isEvalCommittee);
    }, [navigate]);

    const [currentTab, setCurrentTab] = useState<'A' | 'B' | 'C' | 'D' | 'E'>('A');
    const [showSuccessAlert, setShowSuccessAlert] = useState(false);
    const [showErrorAlert, setShowErrorAlert] = useState(false);
    const [alertMessage, setAlertMessage] = useState('');
    const [errorFields, setErrorFields] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [isCommittee, setIsCommittee] = useState(false);

    // Section A: Procurement Details
    const [sectionA, setSectionA] = useState({
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
        contractType: 'Goods',
        bidSecurity: 'No',
        tenderPeriodStartDate: '',
        tenderPeriodEndDate: '',
        tenderPeriodDays: '',
        bidValidityDays: '30',
        numberOfBidsRequested: '',
        arithmeticErrorIdentified: 'No',
        retender: 'No',
        awardCriteria: 'Most Advantageous Bid',
    });

    // Section B: Bidders and Compliance
    const [sectionB, setSectionB] = useState({
        bidders: [
            {
                id: 1,
                name: '',
                bidAmount: '',
                eligibilityMet: true,
                complianceNotes: '',
                technicalScore: '',
                specifications: '',
            },
        ],
    });

    // Section C: Evaluator Comments
    const [sectionC, setSectionC] = useState({
        evaluatorComments: '',
        actionTaken: 'Recommended' as 'Recommended' | 'Rejected' | 'Deferred',
        rejectionReason: '',
        deferralReason: '',
        evaluatorName: '',
        evaluatorSignature: '',
        evaluatorDate: new Date().toISOString().split('T')[0],
    });

    // Section D: Summary
    const [sectionD, setSectionD] = useState({
        totalBidsReceived: '',
        responsiveBids: '',
        nonResponsiveBids: '',
        lowestBidAmount: '',
        lowestBidder: '',
        recommendedBidAmount: '',
        recommendedBidder: '',
        savingsAmount: '',
        savingsPercentage: '',
        evaluationSummary: '',
        keyFindings: '',
        risksIdentified: '',
    });

    // Section E: Procurement Officer Recommendation
    const [sectionE, setSectionE] = useState({
        recommendation: '',
        justification: '',
        budgetAvailability: 'Yes' as 'Yes' | 'No',
        budgetSource: '',
        contractDuration: '',
        deliveryTerms: '',
        paymentTerms: '',
        specialConditions: '',
        procurementOfficerName: '',
        procurementOfficerSignature: '',
        procurementOfficerDate: new Date().toISOString().split('T')[0],
    });

    const handleSectionAChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSectionA({ ...sectionA, [name]: value });
    };

    const handleSectionCChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSectionC({ ...sectionC, [name]: value });
    };

    const handleSectionDChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setSectionD({ ...sectionD, [name]: value });
    };

    const handleSectionEChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSectionE({ ...sectionE, [name]: value });
    };

    const addBidder = () => {
        setSectionB({
            ...sectionB,
            bidders: [
                ...sectionB.bidders,
                {
                    id: sectionB.bidders.length + 1,
                    name: '',
                    bidAmount: '',
                    eligibilityMet: true,
                    complianceNotes: '',
                    technicalScore: '',
                    specifications: '',
                },
            ],
        });
    };

    const removeBidder = (id: number) => {
        setSectionB({
            ...sectionB,
            bidders: sectionB.bidders.filter((b) => b.id !== id),
        });
    };

    const updateBidder = (id: number, field: string, value: any) => {
        setSectionB({
            ...sectionB,
            bidders: sectionB.bidders.map((b) => (b.id === id ? { ...b, [field]: value } : b)),
        });
    };

    const handleCreateEvaluation = async () => {
        const missingFields: string[] = [];

        // Validate Section A
        if (!sectionA.rfqNumber) missingFields.push('RFQ Number');
        if (!sectionA.rfqTitle) missingFields.push('RFQ Title');
        if (!sectionA.comparableEstimate) missingFields.push('Comparable Estimate');

        // Validate Section B
        if (sectionB.bidders.length === 0) missingFields.push('At least one bidder');
        const invalidBidders = sectionB.bidders.filter((b) => !b.name || !b.bidAmount);
        if (invalidBidders.length > 0) missingFields.push('All bidder names and amounts');

        // Validate Section C (committee only)
        if (isCommittee) {
            if (!sectionC.evaluatorComments) missingFields.push('Evaluator Comments');
            if (!sectionC.evaluatorName) missingFields.push('Evaluator Name');
        }

        // Validate Section D
        if (!sectionD.evaluationSummary) missingFields.push('Evaluation Summary');

        // Validate Section E
        if (!sectionE.recommendation) missingFields.push('Final Recommendation');
        if (!sectionE.procurementOfficerName) missingFields.push('Procurement Officer Name');

        if (missingFields.length > 0) {
            setErrorFields(missingFields);
            setShowErrorAlert(true);
            setTimeout(() => setShowErrorAlert(false), 5000);
            return;
        }

        try {
            setLoading(true);

            const evalNumber = `PRO_70_F_14/${String(Date.now()).slice(-5)}`;

            const safeParseFloat = (value: string): number => {
                if (!value || value.trim() === '') return 0;
                const parsed = parseFloat(value);
                return isNaN(parsed) ? 0 : parsed;
            };

            const safeParseInt = (value: string): number => {
                if (!value || value.trim() === '') return 0;
                const parsed = parseInt(value);
                return isNaN(parsed) ? 0 : parsed;
            };

            const evaluationData: any = {
                evalNumber,
                rfqNumber: sectionA.rfqNumber,
                rfqTitle: sectionA.rfqTitle,
                description: sectionA.description,
                evaluator: sectionC.evaluatorName,
                sectionA: {
                    comparableEstimate: safeParseFloat(sectionA.comparableEstimate),
                    fundedBy: sectionA.fundedBy,
                    tenderClosingDate: sectionA.tenderClosingDate,
                    tenderClosingTime: sectionA.tenderClosingTime,
                    tenderOpeningDate: sectionA.tenderOpeningDate,
                    tenderOpeningTime: sectionA.tenderOpeningTime,
                    actualOpeningDate: sectionA.actualOpeningDate,
                    actualOpeningTime: sectionA.actualOpeningTime,
                    procurementMethod:
                        sectionA.procurementMethod === 'National Competitive Bidding'
                            ? 'NATIONAL_COMPETITIVE_BIDDING'
                            : sectionA.procurementMethod === 'International Competitive Bidding'
                            ? 'INTERNATIONAL_COMPETITIVE_BIDDING'
                            : 'OTHER',
                    contractType: sectionA.contractType === 'Goods' ? 'GOODS' : sectionA.contractType === 'Services' ? 'SERVICES' : 'WORKS',
                    bidSecurity: sectionA.bidSecurity,
                    tenderPeriodStartDate: sectionA.tenderPeriodStartDate,
                    tenderPeriodEndDate: sectionA.tenderPeriodEndDate,
                    tenderPeriodDays: safeParseInt(sectionA.tenderPeriodDays),
                    bidValidityDays: safeParseInt(sectionA.bidValidityDays),
                    numberOfBidsRequested: safeParseInt(sectionA.numberOfBidsRequested),
                    arithmeticErrorIdentified: sectionA.arithmeticErrorIdentified === 'Yes',
                    retender: sectionA.retender === 'Yes',
                    awardCriteria: sectionA.awardCriteria === 'Lowest Cost' ? 'LOWEST_COST' : 'MOST_ADVANTAGEOUS_BID',
                },
                sectionB: {
                    bidders: sectionB.bidders.map((b) => ({
                        name: b.name,
                        bidAmount: safeParseFloat(b.bidAmount),
                        eligibilityMet: b.eligibilityMet,
                        complianceNotes: b.complianceNotes,
                        technicalScore: safeParseFloat(b.technicalScore),
                        specifications: b.specifications,
                    })),
                },
                ...(isCommittee
                    ? {
                          sectionC: {
                              evaluatorComments: sectionC.evaluatorComments,
                              actionTaken: sectionC.actionTaken,
                              rejectionReason: sectionC.actionTaken === 'Rejected' ? sectionC.rejectionReason : undefined,
                              deferralReason: sectionC.actionTaken === 'Deferred' ? sectionC.deferralReason : undefined,
                              evaluatorName: sectionC.evaluatorName,
                              evaluatorDate: sectionC.evaluatorDate,
                          },
                      }
                    : {}),
                sectionD: {
                    totalBidsReceived: safeParseInt(sectionD.totalBidsReceived),
                    responsiveBids: safeParseInt(sectionD.responsiveBids),
                    nonResponsiveBids: safeParseInt(sectionD.nonResponsiveBids),
                    lowestBidAmount: safeParseFloat(sectionD.lowestBidAmount),
                    lowestBidder: sectionD.lowestBidder,
                    recommendedBidAmount: safeParseFloat(sectionD.recommendedBidAmount),
                    recommendedBidder: sectionD.recommendedBidder,
                    savingsAmount: safeParseFloat(sectionD.savingsAmount),
                    savingsPercentage: safeParseFloat(sectionD.savingsPercentage),
                    evaluationSummary: sectionD.evaluationSummary,
                    keyFindings: sectionD.keyFindings,
                    risksIdentified: sectionD.risksIdentified,
                },
                sectionE: {
                    recommendation: sectionE.recommendation,
                    justification: sectionE.justification,
                    budgetAvailability: sectionE.budgetAvailability === 'Yes',
                    budgetSource: sectionE.budgetSource,
                    contractDuration: sectionE.contractDuration,
                    deliveryTerms: sectionE.deliveryTerms,
                    paymentTerms: sectionE.paymentTerms,
                    specialConditions: sectionE.specialConditions,
                    procurementOfficerName: sectionE.procurementOfficerName,
                    procurementOfficerDate: sectionE.procurementOfficerDate,
                },
            };

            console.log('Creating evaluation with all sections:', evaluationData);

            const result = await evaluationService.createEvaluation({ ...evaluationData, submitToCommittee: false });

            setAlertMessage(`BSJ Evaluation ${evalNumber} created. You can submit to the Evaluation Committee when ready.`);
            setShowSuccessAlert(true);

            setTimeout(() => {
                setShowSuccessAlert(false);
                navigate('/procurement/evaluation');
            }, 2000);
        } catch (error: any) {
            console.error('Failed to create evaluation:', error);
            setErrorFields([error.message || 'Failed to create evaluation. Please try again.']);
            setShowErrorAlert(true);
            setTimeout(() => setShowErrorAlert(false), 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAndSubmit = async () => {
        const missingFields: string[] = [];

        // Validate Section A
        if (!sectionA.rfqNumber) missingFields.push('RFQ Number');
        if (!sectionA.rfqTitle) missingFields.push('RFQ Title');
        if (!sectionA.comparableEstimate) missingFields.push('Comparable Estimate');

        // Validate Section B
        if (sectionB.bidders.length === 0) missingFields.push('At least one bidder');
        const invalidBidders = sectionB.bidders.filter((b) => !b.name || !b.bidAmount);
        if (invalidBidders.length > 0) missingFields.push('All bidder names and amounts');

        // Section C is committee-only; do not validate here

        // Validate Section D
        if (!sectionD.evaluationSummary) missingFields.push('Evaluation Summary');

        // Validate Section E
        if (!sectionE.recommendation) missingFields.push('Final Recommendation');
        if (!sectionE.procurementOfficerName) missingFields.push('Procurement Officer Name');

        if (missingFields.length > 0) {
            setErrorFields(missingFields);
            setShowErrorAlert(true);
            setTimeout(() => setShowErrorAlert(false), 5000);
            return;
        }

        try {
            setLoading(true);

            const evalNumber = `PRO_70_F_14/${String(Date.now()).slice(-5)}`;

            const safeParseFloat = (value: string): number => {
                if (!value || value.trim() === '') return 0;
                const parsed = parseFloat(value);
                return isNaN(parsed) ? 0 : parsed;
            };

            const safeParseInt = (value: string): number => {
                if (!value || value.trim() === '') return 0;
                const parsed = parseInt(value);
                return isNaN(parsed) ? 0 : parsed;
            };

            const evaluationData: any = {
                evalNumber,
                rfqNumber: sectionA.rfqNumber,
                rfqTitle: sectionA.rfqTitle,
                description: sectionA.description,
                evaluator: sectionC.evaluatorName,
                sectionA: {
                    comparableEstimate: safeParseFloat(sectionA.comparableEstimate),
                    fundedBy: sectionA.fundedBy,
                    tenderClosingDate: sectionA.tenderClosingDate,
                    tenderClosingTime: sectionA.tenderClosingTime,
                    tenderOpeningDate: sectionA.tenderOpeningDate,
                    tenderOpeningTime: sectionA.tenderOpeningTime,
                    actualOpeningDate: sectionA.actualOpeningDate,
                    actualOpeningTime: sectionA.actualOpeningTime,
                    procurementMethod:
                        sectionA.procurementMethod === 'National Competitive Bidding'
                            ? 'NATIONAL_COMPETITIVE_BIDDING'
                            : sectionA.procurementMethod === 'International Competitive Bidding'
                            ? 'INTERNATIONAL_COMPETITIVE_BIDDING'
                            : 'OTHER',
                    contractType: sectionA.contractType === 'Goods' ? 'GOODS' : sectionA.contractType === 'Services' ? 'SERVICES' : 'WORKS',
                    bidSecurity: sectionA.bidSecurity,
                    tenderPeriodStartDate: sectionA.tenderPeriodStartDate,
                    tenderPeriodEndDate: sectionA.tenderPeriodEndDate,
                    tenderPeriodDays: safeParseInt(sectionA.tenderPeriodDays),
                    bidValidityDays: safeParseInt(sectionA.bidValidityDays),
                    numberOfBidsRequested: safeParseInt(sectionA.numberOfBidsRequested),
                    arithmeticErrorIdentified: sectionA.arithmeticErrorIdentified === 'Yes',
                    retender: sectionA.retender === 'Yes',
                    awardCriteria: sectionA.awardCriteria === 'Lowest Cost' ? 'LOWEST_COST' : 'MOST_ADVANTAGEOUS_BID',
                },
                sectionB: {
                    bidders: sectionB.bidders.map((b) => ({
                        name: b.name,
                        bidAmount: safeParseFloat(b.bidAmount),
                        eligibilityMet: b.eligibilityMet,
                        complianceNotes: b.complianceNotes,
                        technicalScore: safeParseFloat(b.technicalScore),
                        specifications: b.specifications,
                    })),
                },
                ...(isCommittee
                    ? {
                          sectionC: {
                              evaluatorComments: sectionC.evaluatorComments,
                              actionTaken: sectionC.actionTaken,
                              rejectionReason: sectionC.actionTaken === 'Rejected' ? sectionC.rejectionReason : undefined,
                              deferralReason: sectionC.actionTaken === 'Deferred' ? sectionC.deferralReason : undefined,
                              evaluatorName: sectionC.evaluatorName,
                              evaluatorDate: sectionC.evaluatorDate,
                          },
                      }
                    : {}),
                sectionD: {
                    totalBidsReceived: safeParseInt(sectionD.totalBidsReceived),
                    responsiveBids: safeParseInt(sectionD.responsiveBids),
                    nonResponsiveBids: safeParseInt(sectionD.nonResponsiveBids),
                    lowestBidAmount: safeParseFloat(sectionD.lowestBidAmount),
                    lowestBidder: sectionD.lowestBidder,
                    recommendedBidAmount: safeParseFloat(sectionD.recommendedBidAmount),
                    recommendedBidder: sectionD.recommendedBidder,
                    savingsAmount: safeParseFloat(sectionD.savingsAmount),
                    savingsPercentage: safeParseFloat(sectionD.savingsPercentage),
                    evaluationSummary: sectionD.evaluationSummary,
                    keyFindings: sectionD.keyFindings,
                    risksIdentified: sectionD.risksIdentified,
                },
                sectionE: {
                    recommendation: sectionE.recommendation,
                    justification: sectionE.justification,
                    budgetAvailability: sectionE.budgetAvailability === 'Yes',
                    budgetSource: sectionE.budgetSource,
                    contractDuration: sectionE.contractDuration,
                    deliveryTerms: sectionE.deliveryTerms,
                    paymentTerms: sectionE.paymentTerms,
                    specialConditions: sectionE.specialConditions,
                    procurementOfficerName: sectionE.procurementOfficerName,
                    procurementOfficerDate: sectionE.procurementOfficerDate,
                },
            };

            const result = await evaluationService.createEvaluation({ ...evaluationData, submitToCommittee: true });

            setAlertMessage(`BSJ Evaluation ${evalNumber} created and submitted to the Evaluation Committee for review!`);
            setShowSuccessAlert(true);

            setTimeout(() => {
                setShowSuccessAlert(false);
                navigate('/procurement/evaluation');
            }, 2000);
        } catch (error: any) {
            console.error('Failed to create and submit evaluation:', error);
            setErrorFields([error.message || 'Failed to create and submit evaluation. Please try again.']);
            setShowErrorAlert(true);
            setTimeout(() => setShowErrorAlert(false), 5000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Section with Gradient */}
            <div className="panel border-0 overflow-hidden bg-gradient-to-r from-[#4361ee]/10 via-[#4361ee]/5 to-transparent dark:from-[#4361ee]/20 dark:via-[#4361ee]/10">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white shadow-lg">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path
                                        d="M9 6L15 6M9 10L15 10M9 14L12 14M5 3C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V8L16 3H5Z"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-primary">Create BSJ Evaluation Report</h2>
                                <p className="text-sm text-white-dark flex items-center gap-2">
                                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary"></span>
                                    Bureau of Standards Jamaica - Official Form PRO_70_F_14/00
                                </p>
                            </div>
                        </div>
                    </div>
                    <Link to="/procurement/evaluation" className="btn btn-outline-danger gap-2 shrink-0">
                        <IconArrowLeft className="h-4 w-4" />
                        Back to List
                    </Link>
                </div>
            </div>

            {/* Success Alert */}
            {showSuccessAlert && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="panel w-full max-w-lg shadow-2xl animate-[scaleUp_0.3s_ease-in-out]">
                        <div className="flex items-center gap-3 p-5 text-success bg-success-light dark:bg-success-dark-light rounded-lg">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success text-white">
                                <IconChecks className="h-6 w-6" />
                            </div>
                            <div className="flex-1">
                                <h5 className="text-lg font-bold text-success">Success!</h5>
                                <p className="text-sm">{alertMessage}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Alert */}
            {showErrorAlert && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="panel w-full max-w-lg shadow-2xl animate-[scaleUp_0.3s_ease-in-out]">
                        <div className="space-y-3 p-5">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-danger text-white">
                                        <IconX className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h5 className="text-lg font-bold text-danger">Validation Error</h5>
                                        <p className="text-sm text-white-dark">Please complete the following required fields:</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setShowErrorAlert(false)} className="btn btn-outline-danger btn-sm shrink-0">
                                    <IconX className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="rounded-lg bg-danger-light p-4 dark:bg-danger-dark-light">
                                <ul className="space-y-2">
                                    {errorFields.map((field, index) => (
                                        <li key={index} className="flex items-center gap-2 text-sm">
                                            <span className="h-1.5 w-1.5 rounded-full bg-danger"></span>
                                            {field}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Navigation - Modern Design */}
            <div className="panel !p-0 border-0 overflow-hidden shadow-lg">
                <div className="flex overflow-x-auto bg-white dark:bg-[#0e1726]">
                    {[
                        { id: 'A', title: 'Procurement Details', icon: '📋' },
                        { id: 'B', title: 'Bidders & Compliance', icon: '👥' },
                        { id: 'C', title: 'Evaluator Comments', icon: '💬' },
                        { id: 'D', title: 'Summary', icon: '📊' },
                        { id: 'E', title: 'Final Recommendation', icon: '✅' },
                    ].map((section) => (
                        <button
                            key={section.id}
                            onClick={() => setCurrentTab(section.id as any)}
                            className={`relative flex-1 min-w-[180px] px-6 py-5 text-center transition-all duration-300 ${
                                currentTab === section.id ? 'bg-primary text-white shadow-lg' : 'bg-white dark:bg-[#0e1726] text-white-dark hover:bg-primary/10 dark:hover:bg-primary/20'
                            }`}
                        >
                            <div className="flex flex-col items-center gap-2">
                                <span className="text-2xl">{section.icon}</span>
                                <div className="space-y-1">
                                    <div className="text-xs font-semibold opacity-75">Section {section.id}</div>
                                    <div className="text-sm font-bold">{section.title}</div>
                                </div>
                            </div>
                            {currentTab === section.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-white"></div>}
                        </button>
                    ))}
                </div>
            </div>

            {/* Section A: Procurement Details */}
            {currentTab === 'A' && (
                <div className="space-y-6 animate-[fadeIn_0.3s_ease-in-out]">
                    <div className="panel border-l-4 border-primary">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <h5 className="text-lg font-bold text-primary">Basic Information</h5>
                                <p className="text-xs text-white-dark mt-1">Core procurement identification details</p>
                            </div>
                            <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-1.5 text-primary">
                                <IconInfoCircle className="h-4 w-4" />
                                <span className="text-xs font-semibold">Required Fields</span>
                            </div>
                        </div>
                        <div className="grid gap-5 md:grid-cols-2">
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
                                    value={sectionA.rfqNumber}
                                    onChange={handleSectionAChange}
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
                                    placeholder="Procurement of Office Furniture"
                                    value={sectionA.rfqTitle}
                                    onChange={handleSectionAChange}
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
                                    rows={3}
                                    className="form-textarea"
                                    placeholder="Brief description of the procurement..."
                                    value={sectionA.description}
                                    onChange={handleSectionAChange}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="panel border-l-4 border-success">
                        <div className="mb-5">
                            <h5 className="text-lg font-bold text-success">Financial Information</h5>
                            <p className="text-xs text-white-dark mt-1">Budget and funding details</p>
                        </div>
                        <div className="grid gap-5 md:grid-cols-2">
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
                                    value={sectionA.comparableEstimate}
                                    onChange={handleSectionAChange}
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="fundedBy" className="mb-2 block font-semibold">
                                    Funded By
                                </label>
                                <input id="fundedBy" name="fundedBy" type="text" className="form-input" placeholder="BSJ" value={sectionA.fundedBy} onChange={handleSectionAChange} />
                            </div>
                        </div>
                    </div>

                    <div className="panel border-l-4 border-info">
                        <div className="mb-5">
                            <h5 className="text-lg font-bold text-info">Tender Schedule</h5>
                            <p className="text-xs text-white-dark mt-1">Important dates and timelines</p>
                        </div>
                        <div className="grid gap-5 md:grid-cols-2">
                            <div>
                                <label htmlFor="tenderClosingDate" className="mb-2 block font-semibold">
                                    Tender Closing Date
                                </label>
                                <input id="tenderClosingDate" name="tenderClosingDate" type="date" className="form-input" value={sectionA.tenderClosingDate} onChange={handleSectionAChange} />
                            </div>
                            <div>
                                <label htmlFor="tenderClosingTime" className="mb-2 block font-semibold">
                                    Tender Closing Time
                                </label>
                                <input id="tenderClosingTime" name="tenderClosingTime" type="time" className="form-input" value={sectionA.tenderClosingTime} onChange={handleSectionAChange} />
                            </div>
                            <div>
                                <label htmlFor="tenderOpeningDate" className="mb-2 block font-semibold">
                                    Tender Opening Date
                                </label>
                                <input id="tenderOpeningDate" name="tenderOpeningDate" type="date" className="form-input" value={sectionA.tenderOpeningDate} onChange={handleSectionAChange} />
                            </div>
                            <div>
                                <label htmlFor="tenderOpeningTime" className="mb-2 block font-semibold">
                                    Tender Opening Time
                                </label>
                                <input id="tenderOpeningTime" name="tenderOpeningTime" type="time" className="form-input" value={sectionA.tenderOpeningTime} onChange={handleSectionAChange} />
                            </div>
                        </div>
                    </div>

                    <div className="panel border-l-4 border-warning">
                        <div className="mb-5">
                            <h5 className="text-lg font-bold text-warning">Procurement Method & Type</h5>
                            <p className="text-xs text-white-dark mt-1">Contract specifications and requirements</p>
                        </div>
                        <div className="grid gap-5 md:grid-cols-2">
                            <div>
                                <label htmlFor="procurementMethod" className="mb-2 block font-semibold">
                                    Procurement Method
                                </label>
                                <select id="procurementMethod" name="procurementMethod" className="form-select" value={sectionA.procurementMethod} onChange={handleSectionAChange}>
                                    <option value="National Competitive Bidding">National Competitive Bidding</option>
                                    <option value="International Competitive Bidding">International Competitive Bidding</option>
                                    <option value="Request for Quotation">Request for Quotation</option>
                                    <option value="Direct Procurement">Direct Procurement</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="contractType" className="mb-2 block font-semibold">
                                    Contract Type
                                </label>
                                <select id="contractType" name="contractType" className="form-select" value={sectionA.contractType} onChange={handleSectionAChange}>
                                    <option value="Goods">Goods</option>
                                    <option value="Services">Services</option>
                                    <option value="Works">Works</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="bidSecurity" className="mb-2 block font-semibold">
                                    Bid Security Required
                                </label>
                                <select id="bidSecurity" name="bidSecurity" className="form-select" value={sectionA.bidSecurity} onChange={handleSectionAChange}>
                                    <option value="Yes">Yes</option>
                                    <option value="No">No</option>
                                    <option value="N/A">N/A</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="bidValidityDays" className="mb-2 block font-semibold">
                                    Bid Validity (Days)
                                </label>
                                <input
                                    id="bidValidityDays"
                                    name="bidValidityDays"
                                    type="number"
                                    className="form-input"
                                    placeholder="30"
                                    value={sectionA.bidValidityDays}
                                    onChange={handleSectionAChange}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Section B: Bidders and Compliance */}
            {currentTab === 'B' && (
                <div className="space-y-6 animate-[fadeIn_0.3s_ease-in-out]">
                    <div className="panel border-l-4 border-primary">
                        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                            <div>
                                <h5 className="text-lg font-bold text-primary">Eligibility Requirements & Compliance Matrix</h5>
                                <p className="text-xs text-white-dark mt-1">Add and evaluate all bidders</p>
                            </div>
                            <button onClick={addBidder} className="btn btn-primary gap-2 shadow-lg">
                                <IconPlus className="h-4 w-4" />
                                Add Bidder
                            </button>
                        </div>

                        <div className="space-y-4">
                            {sectionB.bidders.map((bidder, index) => (
                                <div
                                    key={bidder.id}
                                    className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-5 bg-white-light dark:bg-[#1b2e4b] hover:border-primary transition-all duration-300"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-bold text-lg">{index + 1}</div>
                                            <div>
                                                <h6 className="font-bold text-base">Bidder #{index + 1}</h6>
                                                <p className="text-xs text-white-dark">Complete all required information</p>
                                            </div>
                                        </div>
                                        {sectionB.bidders.length > 1 && (
                                            <button onClick={() => removeBidder(bidder.id)} className="btn btn-danger btn-sm gap-2">
                                                <IconTrashLines className="h-4 w-4" />
                                                Remove
                                            </button>
                                        )}
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block font-semibold">
                                                Bidder Name <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Company Name"
                                                value={bidder.name}
                                                onChange={(e) => updateBidder(bidder.id, 'name', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block font-semibold">
                                                Bid Amount (JMD) <span className="text-danger">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-input"
                                                placeholder="0.00"
                                                value={bidder.bidAmount}
                                                onChange={(e) => updateBidder(bidder.id, 'bidAmount', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block font-semibold">Technical Score (Committee Use)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-input bg-gray-100 dark:bg-gray-700"
                                                placeholder="0.00"
                                                value={bidder.technicalScore}
                                                onChange={(e) => updateBidder(bidder.id, 'technicalScore', e.target.value)}
                                                disabled
                                                title="This field will be filled by the Evaluation Committee"
                                            />
                                        </div>
                                        <div>
                                            <label className="mb-2 block font-semibold">Eligibility Met</label>
                                            <select
                                                className="form-select"
                                                value={bidder.eligibilityMet ? 'Yes' : 'No'}
                                                onChange={(e) => updateBidder(bidder.id, 'eligibilityMet', e.target.value === 'Yes')}
                                            >
                                                <option value="Yes">Yes</option>
                                                <option value="No">No</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="mb-2 block font-semibold">Specifications & Quantities Review</label>
                                            <textarea
                                                rows={3}
                                                className="form-textarea"
                                                placeholder="Technical evaluation details, specifications compliance, quantities review..."
                                                value={bidder.specifications}
                                                onChange={(e) => updateBidder(bidder.id, 'specifications', e.target.value)}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="mb-2 block font-semibold">Compliance Notes (Committee Use)</label>
                                            <textarea
                                                rows={2}
                                                className="form-textarea bg-gray-100 dark:bg-gray-700"
                                                placeholder="Committee compliance assessment notes..."
                                                value={bidder.complianceNotes}
                                                onChange={(e) => updateBidder(bidder.id, 'complianceNotes', e.target.value)}
                                                disabled
                                                title="This field will be filled by the Evaluation Committee"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Section C: Evaluator Comments */}
            {currentTab === 'C' && (
                <div className="space-y-6 animate-[fadeIn_0.3s_ease-in-out]">
                    {!isCommittee && (
                        <div className="panel bg-warning-light border-l-4 border-warning">
                            <div className="flex items-center gap-3">
                                <IconInfoCircle className="h-5 w-5 text-warning" />
                                <div>
                                    <h6 className="font-bold text-warning">Committee Members Only</h6>
                                    <p className="text-sm text-white-dark">Section C can only be edited by Evaluation Committee members. Procurement officers cannot modify this section.</p>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="panel border-l-4 border-warning">
                        <div className="mb-5">
                            <h5 className="text-lg font-bold text-warning">Evaluator Comments & Recommendations</h5>
                            <p className="text-xs text-white-dark mt-1">Provide detailed evaluation and action taken</p>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="evaluatorComments" className="mb-2 block font-semibold">
                                    Evaluator Comments <span className="text-danger">*</span>
                                </label>
                                <textarea
                                    id="evaluatorComments"
                                    name="evaluatorComments"
                                    rows={6}
                                    className="form-textarea"
                                    placeholder="Detailed evaluator comments, observations, and findings..."
                                    value={sectionC.evaluatorComments}
                                    onChange={handleSectionCChange}
                                    disabled={!isCommittee}
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="actionTaken" className="mb-2 block font-semibold">
                                    Action Taken <span className="text-danger">*</span>
                                </label>
                                <select id="actionTaken" name="actionTaken" className="form-select" value={sectionC.actionTaken} onChange={handleSectionCChange} disabled={!isCommittee} required>
                                    <option value="Recommended">Recommended</option>
                                    <option value="Rejected">Rejected</option>
                                    <option value="Deferred">Deferred</option>
                                </select>
                            </div>

                            {sectionC.actionTaken === 'Rejected' && (
                                <div>
                                    <label htmlFor="rejectionReason" className="mb-2 block font-semibold">
                                        Reason for Rejection <span className="text-danger">*</span>
                                    </label>
                                    <textarea
                                        id="rejectionReason"
                                        name="rejectionReason"
                                        rows={4}
                                        className="form-textarea"
                                        placeholder="Detailed reason for rejection..."
                                        value={sectionC.rejectionReason}
                                        onChange={handleSectionCChange}
                                        disabled={!isCommittee}
                                        required
                                    />
                                </div>
                            )}

                            {sectionC.actionTaken === 'Deferred' && (
                                <div>
                                    <label htmlFor="deferralReason" className="mb-2 block font-semibold">
                                        Reason for Deferral <span className="text-danger">*</span>
                                    </label>
                                    <textarea
                                        id="deferralReason"
                                        name="deferralReason"
                                        rows={4}
                                        className="form-textarea"
                                        placeholder="Detailed reason for deferral..."
                                        value={sectionC.deferralReason}
                                        onChange={handleSectionCChange}
                                        disabled={!isCommittee}
                                        required
                                    />
                                </div>
                            )}

                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label htmlFor="evaluatorName" className="mb-2 block font-semibold">
                                        Evaluator Name <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        id="evaluatorName"
                                        name="evaluatorName"
                                        type="text"
                                        className="form-input"
                                        placeholder="Full Name"
                                        value={sectionC.evaluatorName}
                                        onChange={handleSectionCChange}
                                        disabled={!isCommittee}
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="evaluatorDate" className="mb-2 block font-semibold">
                                        Date <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        id="evaluatorDate"
                                        name="evaluatorDate"
                                        type="date"
                                        className="form-input"
                                        value={sectionC.evaluatorDate}
                                        onChange={handleSectionCChange}
                                        disabled={!isCommittee}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Section D: Summary */}
            {currentTab === 'D' && (
                <div className="space-y-6 animate-[fadeIn_0.3s_ease-in-out]">
                    <div className="panel border-l-4 border-info">
                        <div className="mb-5">
                            <h5 className="text-lg font-bold text-info">Summary of Evaluation Findings</h5>
                            <p className="text-xs text-white-dark mt-1">Comprehensive evaluation summary and analysis</p>
                        </div>
                        <div className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-3">
                                <div>
                                    <label htmlFor="totalBidsReceived" className="mb-2 block font-semibold">
                                        Total Bids Received
                                    </label>
                                    <input
                                        id="totalBidsReceived"
                                        name="totalBidsReceived"
                                        type="number"
                                        className="form-input"
                                        placeholder="0"
                                        value={sectionD.totalBidsReceived}
                                        onChange={handleSectionDChange}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="responsiveBids" className="mb-2 block font-semibold">
                                        Responsive Bids
                                    </label>
                                    <input
                                        id="responsiveBids"
                                        name="responsiveBids"
                                        type="number"
                                        className="form-input"
                                        placeholder="0"
                                        value={sectionD.responsiveBids}
                                        onChange={handleSectionDChange}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="nonResponsiveBids" className="mb-2 block font-semibold">
                                        Non-Responsive Bids
                                    </label>
                                    <input
                                        id="nonResponsiveBids"
                                        name="nonResponsiveBids"
                                        type="number"
                                        className="form-input"
                                        placeholder="0"
                                        value={sectionD.nonResponsiveBids}
                                        onChange={handleSectionDChange}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label htmlFor="lowestBidder" className="mb-2 block font-semibold">
                                        Lowest Bidder
                                    </label>
                                    <input
                                        id="lowestBidder"
                                        name="lowestBidder"
                                        type="text"
                                        className="form-input"
                                        placeholder="Company Name"
                                        value={sectionD.lowestBidder}
                                        onChange={handleSectionDChange}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="lowestBidAmount" className="mb-2 block font-semibold">
                                        Lowest Bid Amount (JMD)
                                    </label>
                                    <input
                                        id="lowestBidAmount"
                                        name="lowestBidAmount"
                                        type="number"
                                        step="0.01"
                                        className="form-input"
                                        placeholder="0.00"
                                        value={sectionD.lowestBidAmount}
                                        onChange={handleSectionDChange}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="recommendedBidder" className="mb-2 block font-semibold">
                                        Recommended Bidder
                                    </label>
                                    <input
                                        id="recommendedBidder"
                                        name="recommendedBidder"
                                        type="text"
                                        className="form-input"
                                        placeholder="Company Name"
                                        value={sectionD.recommendedBidder}
                                        onChange={handleSectionDChange}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="recommendedBidAmount" className="mb-2 block font-semibold">
                                        Recommended Bid Amount (JMD)
                                    </label>
                                    <input
                                        id="recommendedBidAmount"
                                        name="recommendedBidAmount"
                                        type="number"
                                        step="0.01"
                                        className="form-input"
                                        placeholder="0.00"
                                        value={sectionD.recommendedBidAmount}
                                        onChange={handleSectionDChange}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="savingsAmount" className="mb-2 block font-semibold">
                                        Savings Amount (JMD)
                                    </label>
                                    <input
                                        id="savingsAmount"
                                        name="savingsAmount"
                                        type="number"
                                        step="0.01"
                                        className="form-input"
                                        placeholder="0.00"
                                        value={sectionD.savingsAmount}
                                        onChange={handleSectionDChange}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="savingsPercentage" className="mb-2 block font-semibold">
                                        Savings Percentage (%)
                                    </label>
                                    <input
                                        id="savingsPercentage"
                                        name="savingsPercentage"
                                        type="number"
                                        step="0.01"
                                        className="form-input"
                                        placeholder="0.00"
                                        value={sectionD.savingsPercentage}
                                        onChange={handleSectionDChange}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="evaluationSummary" className="mb-2 block font-semibold">
                                    Evaluation Summary <span className="text-danger">*</span>
                                </label>
                                <textarea
                                    id="evaluationSummary"
                                    name="evaluationSummary"
                                    rows={5}
                                    className="form-textarea"
                                    placeholder="Comprehensive summary of the evaluation process and findings..."
                                    value={sectionD.evaluationSummary}
                                    onChange={handleSectionDChange}
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="keyFindings" className="mb-2 block font-semibold">
                                    Key Findings
                                </label>
                                <textarea
                                    id="keyFindings"
                                    name="keyFindings"
                                    rows={4}
                                    className="form-textarea"
                                    placeholder="Important findings from the evaluation..."
                                    value={sectionD.keyFindings}
                                    onChange={handleSectionDChange}
                                />
                            </div>

                            <div>
                                <label htmlFor="risksIdentified" className="mb-2 block font-semibold">
                                    Risks Identified
                                </label>
                                <textarea
                                    id="risksIdentified"
                                    name="risksIdentified"
                                    rows={4}
                                    className="form-textarea"
                                    placeholder="Potential risks or concerns identified during evaluation..."
                                    value={sectionD.risksIdentified}
                                    onChange={handleSectionDChange}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Section E: Final Recommendation */}
            {currentTab === 'E' && (
                <div className="space-y-6 animate-[fadeIn_0.3s_ease-in-out]">
                    <div className="panel border-l-4 border-success">
                        <div className="mb-5">
                            <h5 className="text-lg font-bold text-success">Final Recommendation by Procurement Officer</h5>
                            <p className="text-xs text-white-dark mt-1">Official procurement recommendation and approval details</p>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="recommendation" className="mb-2 block font-semibold">
                                    Recommendation <span className="text-danger">*</span>
                                </label>
                                <textarea
                                    id="recommendation"
                                    name="recommendation"
                                    rows={5}
                                    className="form-textarea"
                                    placeholder="Final recommendation for contract award..."
                                    value={sectionE.recommendation}
                                    onChange={handleSectionEChange}
                                    required
                                />
                            </div>

                            <div>
                                <label htmlFor="justification" className="mb-2 block font-semibold">
                                    Justification
                                </label>
                                <textarea
                                    id="justification"
                                    name="justification"
                                    rows={4}
                                    className="form-textarea"
                                    placeholder="Justification for the recommendation..."
                                    value={sectionE.justification}
                                    onChange={handleSectionEChange}
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label htmlFor="budgetAvailability" className="mb-2 block font-semibold">
                                        Budget Availability
                                    </label>
                                    <select id="budgetAvailability" name="budgetAvailability" className="form-select" value={sectionE.budgetAvailability} onChange={handleSectionEChange}>
                                        <option value="Yes">Yes</option>
                                        <option value="No">No</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="budgetSource" className="mb-2 block font-semibold">
                                        Budget Source
                                    </label>
                                    <input
                                        id="budgetSource"
                                        name="budgetSource"
                                        type="text"
                                        className="form-input"
                                        placeholder="Budget line item or source"
                                        value={sectionE.budgetSource}
                                        onChange={handleSectionEChange}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="contractDuration" className="mb-2 block font-semibold">
                                        Contract Duration
                                    </label>
                                    <input
                                        id="contractDuration"
                                        name="contractDuration"
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g., 12 months"
                                        value={sectionE.contractDuration}
                                        onChange={handleSectionEChange}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="deliveryTerms" className="mb-2 block font-semibold">
                                        Delivery Terms
                                    </label>
                                    <input
                                        id="deliveryTerms"
                                        name="deliveryTerms"
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g., 30 days after PO"
                                        value={sectionE.deliveryTerms}
                                        onChange={handleSectionEChange}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="paymentTerms" className="mb-2 block font-semibold">
                                    Payment Terms
                                </label>
                                <textarea
                                    id="paymentTerms"
                                    name="paymentTerms"
                                    rows={3}
                                    className="form-textarea"
                                    placeholder="Payment schedule and conditions..."
                                    value={sectionE.paymentTerms}
                                    onChange={handleSectionEChange}
                                />
                            </div>

                            <div>
                                <label htmlFor="specialConditions" className="mb-2 block font-semibold">
                                    Special Conditions
                                </label>
                                <textarea
                                    id="specialConditions"
                                    name="specialConditions"
                                    rows={3}
                                    className="form-textarea"
                                    placeholder="Any special conditions or requirements..."
                                    value={sectionE.specialConditions}
                                    onChange={handleSectionEChange}
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div>
                                    <label htmlFor="procurementOfficerName" className="mb-2 block font-semibold">
                                        Procurement Officer Name <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        id="procurementOfficerName"
                                        name="procurementOfficerName"
                                        type="text"
                                        className="form-input"
                                        placeholder="Full Name"
                                        value={sectionE.procurementOfficerName}
                                        onChange={handleSectionEChange}
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="procurementOfficerDate" className="mb-2 block font-semibold">
                                        Date <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        id="procurementOfficerDate"
                                        name="procurementOfficerDate"
                                        type="date"
                                        className="form-input"
                                        value={sectionE.procurementOfficerDate}
                                        onChange={handleSectionEChange}
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Footer - Sticky */}
            <div className="panel sticky bottom-4 z-10 border-t-4 border-primary shadow-2xl">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/20 text-warning">
                            <IconInfoCircle className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">Committee Review Fields</p>
                            <p className="text-xs text-white-dark">Gray background fields will be completed during committee verification</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Link to="/procurement/evaluation" className="btn btn-outline-secondary gap-2">
                            <IconX className="h-4 w-4" />
                            Cancel
                        </Link>
                        <button onClick={handleCreateEvaluation} className="btn btn-warning gap-2 shadow-lg" disabled={loading}>
                            {loading ? (
                                <>
                                    <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-4 h-4 inline-block"></span>
                                    <span>Saving Draft...</span>
                                </>
                            ) : (
                                <>
                                    <IconChecks className="h-5 w-5" />
                                    <span>Save Draft</span>
                                </>
                            )}
                        </button>
                        <button onClick={handleCreateAndSubmit} className="btn btn-success gap-2 shadow-lg" disabled={loading}>
                            {loading ? (
                                <>
                                    <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-4 h-4 inline-block"></span>
                                    <span>Submitting to Committee...</span>
                                </>
                            ) : (
                                <>
                                    <IconChecks className="h-5 w-5" />
                                    <span>Create & Submit to Committee</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NewEvaluationComplete;
