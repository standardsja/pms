import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { setPageTitle } from '@/store/themeConfigSlice';
import IconPlus from '@/components/Icon/IconPlus';
import IconX from '@/components/Icon/IconX';
import Swal from 'sweetalert2';

interface RequestItem {
    itemNo: number;
    stockLevel: string;
    description: string;
    quantity: number;
    unitOfMeasure: string;
    unitCost: number;
    partNumber: string;
}

/**
 * Department codes displayed in the inline editable header.
 * Centralized for maintainability – update here if organizational codes change.
 */
const DEPARTMENT_CODES: readonly string[] = [
    'ICT',
    'OSH',
    'ED10',
    'ED01',
    'ED02',
    'ED12',
    'ED13',
    'ED15',
    'DPU',
    'QEMS',
    'CCSB',
    'CSU',
    'TIC',
    'BDU',
    'HRMD',
    'OFMB',
    'PRO',
    'F&A',
    'SD',
    'S&T',
    'TIS(CE)',
    'EE',
    'ME',
    'NCRA',
    'NCBJ',
];

/** Full month names used for header month selection. */
const MONTHS: readonly string[] = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

/**
 * Header year range logic.
 * BASE defines the first selectable year; SPAN defines how many consecutive years are offered.
 * Example: BASE=2025, SPAN=11 -> 2025..2035 inclusive.
 */
const HEADER_YEAR_BASE = 2025;
const HEADER_YEAR_SPAN = 11; // number of years from base

const RequestForm = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id;
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [estimatedTotal, setEstimatedTotal] = useState(0);
    const [institution, setInstitution] = useState('');
    const [division, setDivision] = useState('');
    const [branchUnit, setBranchUnit] = useState('');
    const [requestedBy, setRequestedBy] = useState('');
    const [budgetActivity, setBudgetActivity] = useState('yes');
    const [email, setEmail] = useState('');
    const [procurementType, setProcurementType] = useState<string[]>([]);
    const [priority, setPriority] = useState('');
    const [items, setItems] = useState<RequestItem[]>([{ itemNo: 1, stockLevel: '', description: '', quantity: 1, unitOfMeasure: '', unitCost: 0, partNumber: '' }]);
    const [commentsJustification, setCommentsJustification] = useState('');
    const [managerName, setManagerName] = useState('');
    const [headName, setHeadName] = useState('');
    const [commitmentNumber, setCommitmentNumber] = useState('');
    const [accountingCode, setAccountingCode] = useState('');
    const [budgetComments, setBudgetComments] = useState('');
    const [budgetOfficerName, setBudgetOfficerName] = useState('');
    const [budgetManagerName, setBudgetManagerName] = useState('');
    const [currency, setCurrency] = useState<'JMD' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CNY' | 'CAD' | 'AUD' | 'CHF' | 'INR' | 'BRL' | 'ZAR' | 'MXN' | 'SEK' | 'NZD' | 'TTD' | 'BBD' | 'XCD'>('JMD');
    const [procurementCaseNumber, setProcurementCaseNumber] = useState('');
    const [receivedBy, setReceivedBy] = useState('');
    const [dateReceived, setDateReceived] = useState('');
    const [actionDate, setActionDate] = useState('');
    const [procurementComments, setProcurementComments] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<Array<{ id: number; filename: string; url: string }>>([]);
    const [headerDeptCode, setHeaderDeptCode] = useState('');
    const [headerMonth, setHeaderMonth] = useState('');
    const [headerYear, setHeaderYear] = useState<number | null>(new Date().getFullYear());
    const [headerSequence, setHeaderSequence] = useState<number | null>(0);
    const paddedSequence = String(headerSequence ?? 0).padStart(3, '0');
    const headerPreview = `[${headerDeptCode || '---'}]/[${headerMonth || '---'}]/[${headerYear || '----'}]/[${paddedSequence}]`;

    const isFormCodeComplete = Boolean(headerDeptCode && headerMonth && headerYear !== null && headerSequence !== null && headerSequence !== undefined);
    // prevent duplicate submissions when network is slow
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [managerApproved, setManagerApproved] = useState(false);
    const [headApproved, setHeadApproved] = useState(false);
    const [procurementApproved, setProcurementApproved] = useState(false);
    const [budgetOfficerApproved, setBudgetOfficerApproved] = useState(false);
    const [budgetManagerApproved, setBudgetManagerApproved] = useState(false);

    // Current user profile (for edit permissions)
    const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const currentUserId = userProfile?.id || userProfile?.userId || null;
    const currentUserName = userProfile?.fullName || userProfile?.name || '';

    // Get user roles to determine if they're Budget Officer or Budget Manager
    const userRoles = (userProfile?.roles || []).map((r: any) => {
        if (typeof r === 'string') return r;
        return r?.role?.name || r?.name || '';
    });

    // Check if user is a budget officer (FINANCE role) vs budget manager
    // For now, we'll use a simple check: if they have FINANCE role, they're a budget officer
    // Budget managers would need a separate role or identification method
    const isBudgetOfficer = userRoles.some((r: string) => r === 'FINANCE' || /finance/i.test(r));

    // Track request metadata to gate editing by stage & assignee
    const [requestMeta, setRequestMeta] = useState<{ status?: string; currentAssigneeId?: number } | null>(null);

    // Determine field permissions strictly by workflow stage + assignee
    const isAssignee = !!(isEditMode && requestMeta?.currentAssigneeId && currentUserId && Number(requestMeta.currentAssigneeId) === Number(currentUserId));
    const canEditManagerFields = !!(isAssignee && requestMeta?.status === 'DEPARTMENT_REVIEW');
    const canEditHodFields = !!(isAssignee && requestMeta?.status === 'HOD_REVIEW');
    const canEditProcurementSection = !!(isAssignee && requestMeta?.status === 'PROCUREMENT_REVIEW');
    const canEditBudgetSection = !!(isAssignee && (requestMeta?.status === 'FINANCE_REVIEW' || requestMeta?.status === 'BUDGET_MANAGER_REVIEW'));

    // Budget Officer can only approve as officer (during FINANCE_REVIEW), Budget Manager can only approve as manager (during BUDGET_MANAGER_REVIEW)
    const canApproveBudgetOfficer = !!(isAssignee && requestMeta?.status === 'FINANCE_REVIEW' && isBudgetOfficer);
    const canApproveBudgetManager = !!(isAssignee && requestMeta?.status === 'BUDGET_MANAGER_REVIEW' && !isBudgetOfficer);
    const canDispatchToVendors = !!(isAssignee && requestMeta?.status === 'FINANCE_APPROVED');

    // Auto-fill manager/HOD/Budget names when they're the assignee and field is empty
    useEffect(() => {
        if (!isEditMode) return;

        const fullName = userProfile?.fullName || userProfile?.name || '';
        if (!fullName) return;

        // Auto-fill manager name if current user is manager assignee and field is empty
        if (canEditManagerFields && !managerName) {
            setManagerName(fullName);
        }

        // Auto-fill HOD name if current user is HOD assignee and field is empty
        if (canEditHodFields && !headName) {
            setHeadName(fullName);
        }

        // Auto-fill budget officer name if current user is budget officer and field is empty
        if (canApproveBudgetOfficer && !budgetOfficerName) {
            setBudgetOfficerName(fullName);
        }

        // Auto-fill budget manager name if current user is budget manager and field is empty
        if (canApproveBudgetManager && !budgetManagerName) {
            setBudgetManagerName(fullName);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [canEditManagerFields, canEditHodFields, canApproveBudgetOfficer, canApproveBudgetManager, isEditMode, userProfile]);

    useEffect(() => {
        dispatch(setPageTitle(isEditMode ? 'Review Procurement Request' : 'New Procurement Request'));
        // Calculate total whenever items change
        const total = items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
        setEstimatedTotal(total);
    }, [dispatch, items, isEditMode]);

    // Prefill requester info when creating a new request
    useEffect(() => {
        if (isEditMode) return;
        try {
            // Prefer new auth_user; fallback to legacy userProfile
            const authRaw = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
            const legacyRaw = localStorage.getItem('userProfile');
            const profile = authRaw ? JSON.parse(authRaw) : legacyRaw ? JSON.parse(legacyRaw) : null;
            if (profile) {
                setRequestedBy(profile.name || profile.fullName || '');
                setEmail(profile.email || '');
                setDivision(profile.department?.name || '');
                // best-effort for branch/unit using dept code
                if (profile.department?.code && !branchUnit) setBranchUnit(profile.department.code);
            }
        } catch {}
    }, [isEditMode]);

    // Fetch existing request data when in edit mode
    useEffect(() => {
        if (!isEditMode || !id) return;

        const fetchRequest = async () => {
            try {
                const resp = await fetch(`http://heron:4000/requests/${id}`);
                if (!resp.ok) throw new Error('Failed to fetch request');

                const request = await resp.json();

                // Pre-fill form with existing data (review mode)
                setFormDate(request.createdAt ? new Date(request.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                // Some fields may not exist in DB yet; provide sensible fallbacks for reviewers
                setInstitution(request.institution || 'Bureau of Standards Jamaica');
                setDivision(request.department?.name || '');
                setBranchUnit(request.branchUnit || request.department?.code || '');
                setRequestedBy(request.requester?.name || '');
                setEmail(request.requester?.email || '');
                // Map database enum priority (URGENT/HIGH/MEDIUM/LOW) to form values (urgent/high/medium/low)
                const priorityValue = request.priority ? request.priority.toLowerCase() : 'medium';
                setPriority(priorityValue);
                if (request.currency) {
                    const validCurrencies = ['JMD', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CAD', 'AUD', 'CHF', 'INR', 'BRL', 'ZAR', 'MXN', 'SEK', 'NZD', 'TTD', 'BBD', 'XCD'];
                    setCurrency(validCurrencies.includes(request.currency) ? (request.currency as any) : 'JMD');
                }
                setCommentsJustification(request.description || '');

                // Load procurement type from JSON field
                try {
                    if (request.procurementType) {
                        if (Array.isArray(request.procurementType)) {
                            setProcurementType(request.procurementType);
                        } else if (typeof request.procurementType === 'string') {
                            setProcurementType(JSON.parse(request.procurementType));
                        }
                    }
                } catch (e) {
                    console.error('Failed to parse procurementType:', e);
                }

                // Pre-fill items
                if (request.items && request.items.length > 0) {
                    setItems(
                        request.items.map((item: any, idx: number) => ({
                            itemNo: idx + 1,
                            stockLevel: item.stockLevel || '',
                            description: item.description || '',
                            quantity: item.quantity || 1,
                            unitOfMeasure: item.unitOfMeasure || '',
                            unitCost: Number(item.unitPrice) || 0,
                            partNumber: item.partNumber || '',
                        }))
                    );
                }

                // Pre-fill manager section (if present)
                setManagerName(request.managerName || '');
                setHeadName(request.headName || '');
                setManagerApproved(!!request.managerApproved);
                setHeadApproved(!!request.headApproved);

                // Pre-fill budget section (if present)
                setCommitmentNumber(request.commitmentNumber || '');
                setAccountingCode(request.accountingCode || '');
                setBudgetComments(request.budgetComments || '');
                setBudgetOfficerName(request.budgetOfficerName || '');
                setBudgetManagerName(request.budgetManagerName || '');

                // Pre-fill procurement section (if present)
                setProcurementCaseNumber(request.procurementCaseNumber || '');
                setReceivedBy(request.receivedBy || '');
                setDateReceived(request.dateReceived || '');
                setActionDate(request.actionDate || '');
                setProcurementComments(request.procurementComments || '');
                setProcurementApproved(!!request.procurementApproved);

                // Load existing attachments (if any)
                if (request.attachments && Array.isArray(request.attachments)) {
                    setExistingAttachments(request.attachments);
                }
                // Load header code values
                setHeaderDeptCode(request.headerDeptCode || request.department?.code || '');
                setHeaderMonth(request.headerMonth || '');
                setHeaderYear(request.headerYear || new Date().getFullYear());
                setHeaderSequence(request.headerSequence ?? 0);

                // Track status and assignee for edit gating
                const assigneeId = request.currentAssignee?.id || request.currentAssigneeId || null;
                setRequestMeta({ status: request.status, currentAssigneeId: assigneeId ? Number(assigneeId) : undefined });
            } catch (err) {
                console.error('Error fetching request:', err);
                Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load request data' });
            }
        };

        fetchRequest();
    }, [id, isEditMode]);

    const addItem = () => {
        const newItemNo = items.length + 1;
        setItems([
            ...items,
            {
                itemNo: newItemNo,
                stockLevel: '',
                description: '',
                quantity: 1,
                unitOfMeasure: '',
                unitCost: 0,
                partNumber: '',
            },
        ]);
    };

    const removeItem = (itemNo: number) => {
        if (items.length > 1) {
            const updatedItems = items.filter((item) => item.itemNo !== itemNo).map((item, index) => ({ ...item, itemNo: index + 1 }));
            setItems(updatedItems);
        }
    };

    const updateItem = (itemNo: number, field: keyof RequestItem, value: string | number) => {
        setItems(items.map((item) => (item.itemNo === itemNo ? { ...item, [field]: value } : item)));
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
            setProcurementType(procurementType.filter((t) => t !== type));
        } else {
            setProcurementType([...procurementType, type]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // guard against double clicks
        if (isSubmitting) return;

        setIsSubmitting(true);

        // read logged-in profile from localStorage
        const raw = localStorage.getItem('userProfile');
        const profile = raw ? JSON.parse(raw) : null;
        const userId = profile?.id || profile?.userId || null;
        const departmentId = profile?.department?.id || profile?.departmentId || null;

        if (!userId) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Unable to determine user. Make sure you are logged in.' });
            return;
        }

        try {
            if (isEditMode && id) {
                // Update existing request (manager/procurement/finance filling their sections)

                // Double-confirmation flow: warn on missing approval, confirm when approving
                if (
                    (requestMeta?.status === 'DEPARTMENT_REVIEW' && managerApproved === false) ||
                    (requestMeta?.status === 'HOD_REVIEW' && headApproved === false) ||
                    (requestMeta?.status === 'PROCUREMENT_REVIEW' && procurementApproved === false) ||
                    (requestMeta?.status === 'FINANCE_REVIEW' && !budgetOfficerApproved) ||
                    (requestMeta?.status === 'BUDGET_MANAGER_REVIEW' && !budgetManagerApproved)
                ) {
                    const confirmMissing = await Swal.fire({
                        icon: 'warning',
                        title: 'Approval not checked',
                        text: 'You have not checked the approval box or filled required fields. Proceed without approving?',
                        showCancelButton: true,
                        confirmButtonText: 'Proceed',
                        cancelButtonText: 'Cancel',
                    });
                    if (!confirmMissing.isConfirmed) {
                        setIsSubmitting(false);
                        return;
                    }
                }

                if (
                    (requestMeta?.status === 'DEPARTMENT_REVIEW' && managerApproved === true) ||
                    (requestMeta?.status === 'HOD_REVIEW' && headApproved === true) ||
                    (requestMeta?.status === 'PROCUREMENT_REVIEW' && procurementApproved === true) ||
                    (requestMeta?.status === 'FINANCE_REVIEW' && budgetOfficerApproved) ||
                    (requestMeta?.status === 'BUDGET_MANAGER_REVIEW' && budgetManagerApproved)
                ) {
                    const confirmApprove = await Swal.fire({
                        icon: 'question',
                        title: 'Confirm approval',
                        text: 'Are you sure you want to approve this requisition?',
                        showCancelButton: true,
                        confirmButtonText: 'Yes, approve',
                        cancelButtonText: 'Not yet',
                    });
                    if (!confirmApprove.isConfirmed) {
                        setIsSubmitting(false);
                        return;
                    }
                }

                const updatePayload = {
                    managerName,
                    headName,
                    managerApproved,
                    headApproved,
                    commitmentNumber,
                    accountingCode,
                    budgetComments,
                    budgetOfficerName,
                    budgetManagerName,
                    // Header code fields
                    headerDeptCode,
                    headerMonth,
                    headerYear,
                    headerSequence,
                    budgetOfficerApproved,
                    budgetManagerApproved,
                    procurementCaseNumber,
                    receivedBy,
                    dateReceived,
                    actionDate,
                    procurementComments,
                    procurementApproved,
                };

                const resp = await fetch(`http://heron:4000/requests/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': String(userId),
                    },
                    body: JSON.stringify(updatePayload),
                });

                if (!resp.ok) {
                    const err = await resp.json().catch(() => ({}));
                    throw new Error(err.error || resp.statusText || 'Update failed');
                }
                // Automatically perform approval action if reviewer checked the approval box
                const isApproving =
                    (requestMeta?.status === 'DEPARTMENT_REVIEW' && managerApproved === true) ||
                    (requestMeta?.status === 'HOD_REVIEW' && headApproved === true) ||
                    (requestMeta?.status === 'PROCUREMENT_REVIEW' && procurementApproved === true) ||
                    (requestMeta?.status === 'FINANCE_REVIEW' && budgetOfficerApproved) ||
                    (requestMeta?.status === 'BUDGET_MANAGER_REVIEW' && budgetManagerApproved);

                if (isApproving) {
                    try {
                        const approveResp = await fetch(`http://heron:4000/requests/${id}/action`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'x-user-id': String(userId) },
                            body: JSON.stringify({ action: 'APPROVE' }),
                        });
                        if (!approveResp.ok) {
                            const err = await approveResp.json().catch(() => ({}));
                            throw new Error(err.error || approveResp.statusText || 'Approval failed');
                        }
                        await approveResp.json();
                        Swal.fire({ icon: 'success', title: 'Request approved', text: 'Request saved and advanced in workflow.' });
                        navigate('/apps/requests');
                    } catch (approveErr: any) {
                        console.error(approveErr);
                        Swal.fire({ icon: 'error', title: 'Saved but approval failed', text: approveErr?.message || String(approveErr) });
                        // Do NOT navigate so user can retry approval without losing context
                    }
                } else {
                    Swal.fire({ icon: 'success', title: 'Request updated', text: 'Your information has been saved' });
                    navigate('/apps/requests');
                }
            } else {
                // Create new request with attachments using FormData
                if (!departmentId) {
                    Swal.fire({ icon: 'error', title: 'Error', text: 'Unable to determine department. Make sure you are logged in.' });
                    return;
                }

                // Validate form code is filled out
                if (!headerDeptCode || !headerMonth || !headerYear || headerSequence === null || headerSequence === undefined) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Form Code Required',
                        text: 'Please fill out all form code fields (Department Code, Month, Year, and Sequence Number) before submitting.',
                    });
                    setIsSubmitting(false);
                    return;
                }

                // Map form priority values to enum (medium -> MEDIUM, high -> HIGH, etc.)
                const priorityMap: Record<string, string> = {
                    urgent: 'URGENT',
                    high: 'HIGH',
                    medium: 'MEDIUM',
                    low: 'LOW',
                };
                const priorityEnum = priority ? priorityMap[priority] || 'MEDIUM' : 'MEDIUM';

                const formData = new FormData();
                formData.append('title', `Request - ${formDate} - ${items.length} item(s)`);
                formData.append('description', commentsJustification || 'Procurement request created from form');
                formData.append('departmentId', String(departmentId));
                formData.append('totalEstimated', String(estimatedTotal));
                formData.append('currency', currency);
                formData.append('priority', priorityEnum);
                if (procurementType.length > 0) {
                    formData.append('procurementType', JSON.stringify(procurementType));
                }

                // Add items as JSON string
                formData.append(
                    'items',
                    JSON.stringify(
                        items.map((it) => ({
                            description: it.description,
                            quantity: it.quantity,
                            unitPrice: it.unitCost,
                            totalPrice: it.quantity * it.unitCost,
                            accountCode: '',
                            stockLevel: it.stockLevel || '',
                            unitOfMeasure: it.unitOfMeasure || '',
                            partNumber: it.partNumber || '',
                        }))
                    )
                );

                // Attach files
                attachments.forEach((file) => {
                    formData.append('attachments', file);
                });
                // Header code fields
                formData.append('headerDeptCode', headerDeptCode || '');
                formData.append('headerMonth', headerMonth || '');
                if (headerYear) formData.append('headerYear', String(headerYear));
                if (headerSequence !== null && headerSequence !== undefined) formData.append('headerSequence', String(headerSequence));

                const resp = await fetch('http://heron:4000/requests', {
                    method: 'POST',
                    headers: {
                        'x-user-id': String(userId),
                    },
                    body: formData,
                });

                if (!resp.ok) {
                    const err = await resp.json().catch(() => ({}));
                    throw new Error(err.error || resp.statusText || 'Request failed');
                }

                const data = await resp.json();

                // Submit the request to department manager for review
                const submitResp = await fetch(`http://heron:4000/requests/${data.id}/submit`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': String(userId),
                    },
                });

                if (!submitResp.ok) {
                    const err = await submitResp.json().catch(() => ({}));
                    console.error('Failed to submit request:', err);
                    // Don't throw - the request was created successfully, just not submitted
                }

                Swal.fire({ icon: 'success', title: 'Request submitted', text: `Reference ${data.reference || data.id} has been sent for review` });
                navigate('/apps/requests');
            }
        } catch (err: any) {
            console.error(err);
            try {
                (await import('sweetalert2')).default.fire({ icon: 'error', title: 'Submission failed', text: err.message || String(err) });
            } catch (e) {
                alert('Submission failed: ' + (err.message || err));
            }
        } finally {
            // re-enable submit button after we finish (or navigate away)
            setIsSubmitting(false);
        }
    };

    const handleDownloadPdf = () => {
        if (!id) return;
        const url = `http://heron:4000/requests/${id}/pdf`;
        // open in a new tab to trigger download
        window.open(url, '_blank');
    };

    const handleSendToVendor = async () => {
        if (!id) return;
        const raw = localStorage.getItem('userProfile');
        const profile = raw ? JSON.parse(raw) : null;
        const userId = profile?.id || profile?.userId || null;
        if (!userId) {
            Swal.fire({ icon: 'error', title: 'Not logged in' });
            return;
        }
        try {
            const resp = await fetch(`http://heron:4000/requests/${id}/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': String(userId) },
                body: JSON.stringify({ action: 'SEND_TO_VENDOR' }),
            });
            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                throw new Error(err.error || resp.statusText || 'Failed to send');
            }
            await resp.json();
            Swal.fire({ icon: 'success', title: 'Marked as sent to vendor' });
            navigate('/apps/requests');
        } catch (err: any) {
            console.error(err);
            Swal.fire({ icon: 'error', title: 'Failed', text: err?.message || String(err) });
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <div className="flex justify-center">
                    <div className="w-full max-w-4xl">
                        <div className="text-center">
                            <h1 className="text-2xl font-semibold">BUREAU OF STANDARDS JAMAICA</h1>
                            <h2 className="text-xl font-semibold mt-1 underline">PROCUREMENT REQUISITION FORM</h2>
                            <div className="text-sm italic text-gray-500 mt-2">This form authorizes the Procurement Unit to act on your behalf.</div>
                            <div className="mt-4 flex justify-center">
                                {/* Inline dropdown controls styled as brackets */}
                                <div className="flex items-center gap-1 text-sm font-semibold">
                                    <span className="inline-flex items-center bg-yellow-600 text-white rounded-sm">
                                        <span className="px-1">[</span>
                                        <select
                                            className="bg-transparent border-0 text-white font-semibold text-sm focus:ring-0 px-1 cursor-pointer"
                                            value={headerDeptCode}
                                            onChange={(e) => setHeaderDeptCode(e.target.value)}
                                            disabled={isEditMode}
                                        >
                                            <option value="">---</option>
                                            {DEPARTMENT_CODES.map((code) => (
                                                <option key={code} value={code}>
                                                    {code}
                                                </option>
                                            ))}
                                        </select>
                                        <span className="px-1">]</span>
                                    </span>
                                    <span className="inline-flex items-center bg-yellow-600 text-white rounded-sm">
                                        <span className="px-1">[</span>
                                        <select
                                            className="bg-transparent border-0 text-white font-semibold text-sm focus:ring-0 px-1 cursor-pointer"
                                            value={headerMonth}
                                            onChange={(e) => setHeaderMonth(e.target.value)}
                                            disabled={isEditMode}
                                        >
                                            <option value="">---</option>
                                            {MONTHS.map((m) => (
                                                <option key={m} value={m}>
                                                    {m}
                                                </option>
                                            ))}
                                        </select>
                                        <span className="px-1">]</span>
                                    </span>
                                    <span className="inline-flex items-center bg-yellow-600 text-white rounded-sm">
                                        <span className="px-1">[</span>
                                        <select
                                            className="bg-transparent border-0 text-white font-semibold text-sm focus:ring-0 px-1 cursor-pointer w-16"
                                            value={headerYear ?? ''}
                                            onChange={(e) => setHeaderYear(e.target.value ? parseInt(e.target.value, 10) : null)}
                                            disabled={isEditMode}
                                        >
                                            <option value="">----</option>
                                            {Array.from({ length: HEADER_YEAR_SPAN }).map((_, i) => {
                                                const year = HEADER_YEAR_BASE + i;
                                                return (
                                                    <option key={year} value={year}>
                                                        {year}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                        <span className="px-1">]</span>
                                    </span>
                                    <span className="inline-flex items-center bg-yellow-600 text-white rounded-sm px-2 py-1">
                                        [
                                        <input
                                            type="number"
                                            min={0}
                                            max={999}
                                            value={headerSequence ?? 0}
                                            onChange={(e) => setHeaderSequence(e.target.value ? parseInt(e.target.value, 10) : 0)}
                                            className="bg-transparent border-0 text-white font-semibold text-sm focus:ring-0 w-10 text-center"
                                            disabled={isEditMode}
                                            readOnly={isEditMode}
                                        />
                                        ]
                                    </span>
                                </div>
                            </div>
                            {!isEditMode && !isFormCodeComplete && (
                                <div className="mt-3 text-sm text-yellow-800 bg-yellow-50 dark:bg-yellow-900/20 rounded p-2">
                                    <strong>Form Code Required:</strong> Please complete Department, Month, Year and Sequence before submitting.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 shadow rounded p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Section I: To be completed by Requestor */}
                    <div className="border-b-2 border-red-500 pb-4">
                        <h3 className="text-lg font-bold text-red-600 mb-4">Section I: To be completed by Requestor</h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Date: {formDate}</label>
                                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="form-input w-full" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Requested by</label>
                                <input
                                    type="text"
                                    className="form-input w-full"
                                    value={requestedBy}
                                    onChange={(e) => setRequestedBy(e.target.value)}
                                    placeholder="Click here to enter text"
                                    readOnly={!isEditMode}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Currency</label>
                                <select
                                    className="form-select w-full"
                                    value={currency}
                                    onChange={(e) =>
                                        setCurrency(
                                            e.target.value as
                                                | 'JMD'
                                                | 'USD'
                                                | 'EUR'
                                                | 'GBP'
                                                | 'JPY'
                                                | 'CNY'
                                                | 'CAD'
                                                | 'AUD'
                                                | 'CHF'
                                                | 'INR'
                                                | 'BRL'
                                                | 'ZAR'
                                                | 'MXN'
                                                | 'SEK'
                                                | 'NZD'
                                                | 'TTD'
                                                | 'BBD'
                                                | 'XCD'
                                        )
                                    }
                                >
                                    <option value="JMD">JMD - Jamaican Dollar</option>
                                    <option value="USD">USD - US Dollar</option>
                                    <option value="EUR">EUR - Euro</option>
                                    <option value="GBP">GBP - British Pound Sterling</option>
                                    <option value="JPY">JPY - Japanese Yen</option>
                                    <option value="CNY">CNY - Chinese Yuan</option>
                                    <option value="CAD">CAD - Canadian Dollar</option>
                                    <option value="AUD">AUD - Australian Dollar</option>
                                    <option value="CHF">CHF - Swiss Franc</option>
                                    <option value="INR">INR - Indian Rupee</option>
                                    <option value="BRL">BRL - Brazilian Real</option>
                                    <option value="ZAR">ZAR - South African Rand</option>
                                    <option value="MXN">MXN - Mexican Peso</option>
                                    <option value="SEK">SEK - Swedish Krona</option>
                                    <option value="NZD">NZD - New Zealand Dollar</option>
                                    <option value="TTD">TTD - Trinidad and Tobago Dollar</option>
                                    <option value="BBD">BBD - Barbados Dollar</option>
                                    <option value="XCD">XCD - East Caribbean Dollar</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Estimated Cost (Total)</label>
                                <div className="flex items-center gap-2">
                                    <span className="font-semibold">{currency} $</span>
                                    <input type="number" value={estimatedTotal} className="form-input flex-1 bg-gray-50 dark:bg-gray-900" step="0.01" readOnly />
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
                                    readOnly={!isEditMode}
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
                                    readOnly={!isEditMode}
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
                                    readOnly={!isEditMode}
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
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input w-full" placeholder="Enter email" readOnly={!isEditMode} required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Procurement Type</label>
                                <div className="flex gap-4 flex-wrap items-center h-[42px]">
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={procurementType.includes('consulting')}
                                            onChange={() => handleProcurementTypeChange('consulting')}
                                            className="form-checkbox opacity-100"
                                            disabled={isEditMode}
                                        />
                                        <span className="text-sm">Consulting Service</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={procurementType.includes('goods')}
                                            onChange={() => handleProcurementTypeChange('goods')}
                                            className="form-checkbox opacity-100"
                                            disabled={isEditMode}
                                        />
                                        <span className="text-sm">Goods</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={procurementType.includes('nonConsulting')}
                                            onChange={() => handleProcurementTypeChange('nonConsulting')}
                                            className="form-checkbox opacity-100"
                                            disabled={isEditMode}
                                        />
                                        <span className="text-sm">Non-Consulting Service</span>
                                    </label>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={procurementType.includes('works')}
                                            onChange={() => handleProcurementTypeChange('works')}
                                            className="form-checkbox opacity-100"
                                            disabled={isEditMode}
                                        />
                                        <span className="text-sm">Works</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Header Code (moved to top – render preview here if not already displayed) */}

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Priority</label>
                            <div className="flex gap-6">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="priority"
                                        value="urgent"
                                        checked={priority === 'urgent'}
                                        onChange={(e) => setPriority(e.target.value)}
                                        className="form-radio"
                                        disabled={isEditMode}
                                    />
                                    <span>Urgent</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="priority"
                                        value="high"
                                        checked={priority === 'high'}
                                        onChange={(e) => setPriority(e.target.value)}
                                        className="form-radio"
                                        disabled={isEditMode}
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
                                        disabled={isEditMode}
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
                                        disabled={isEditMode}
                                    />
                                    <span>Low</span>
                                </label>
                            </div>
                        </div>

                        {/* Items Table */}
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium">Items/Services</label>
                                <button type="button" onClick={addItem} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
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
                                                        <button type="button" onClick={() => removeItem(item.itemNo)} className="text-red-500 hover:text-red-700">
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
                            <label className="block text-sm font-medium mb-2">Comments/Justification(Why is it needed?):</label>
                            <textarea
                                value={commentsJustification}
                                onChange={(e) => setCommentsJustification(e.target.value)}
                                className="form-textarea w-full"
                                rows={3}
                                placeholder="Click or tap here to enter text."
                            />
                        </div>

                        {/* Approved by */}
                        <div className="border-t pt-4">
                            <p className="text-sm font-semibold mb-3">Approved by:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Manager of Division's Name:</label>
                                    <input
                                        type="text"
                                        value={managerName}
                                        onChange={(e) => setManagerName(e.target.value)}
                                        className="form-input w-full mb-3"
                                        placeholder="Enter name of head of department"
                                        disabled={!canEditManagerFields}
                                    />
                                    {canEditManagerFields && (
                                        <label className="mt-1 mb-3 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                                            <input type="checkbox" className="form-checkbox" checked={managerApproved} onChange={(e) => setManagerApproved(e.target.checked)} />I approve this
                                            requisition
                                        </label>
                                    )}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Signature:</label>
                                            <input type="text" className="form-input w-full" placeholder="" disabled={!canEditManagerFields} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Date:</label>
                                            <input type="date" className="form-input w-full" defaultValue={new Date().toISOString().split('T')[0]} disabled={!canEditManagerFields} />
                                        </div>
                                    </div>
                                    {/* Duplicate signature/date removed after refining permissions */}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Head of Division's Name:</label>
                                    <input
                                        type="text"
                                        value={headName}
                                        onChange={(e) => setHeadName(e.target.value)}
                                        className="form-input w-full mb-3"
                                        placeholder="Enter name of head of department"
                                        disabled={!canEditHodFields}
                                    />
                                    {canEditHodFields && (
                                        <label className="mt-1 mb-3 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                                            <input type="checkbox" className="form-checkbox" checked={headApproved} onChange={(e) => setHeadApproved(e.target.checked)} />I approve this requisition
                                        </label>
                                    )}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Signature:</label>
                                            <input type="text" className="form-input w-full" placeholder="" disabled={!canEditHodFields} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Date:</label>
                                            <input type="date" className="form-input w-full" defaultValue={new Date().toISOString().split('T')[0]} disabled={!canEditHodFields} />
                                        </div>
                                    </div>
                                    {/* Duplicate signature/date removed after refining permissions */}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section II: Commitment from Budget */}
                    <div className="border-b-2 border-red-500 pb-4">
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
                                    disabled={!canEditBudgetSection}
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
                                    disabled={!canEditBudgetSection}
                                />
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Comments:</label>
                            <textarea
                                value={budgetComments}
                                onChange={(e) => setBudgetComments(e.target.value)}
                                className="form-textarea w-full"
                                rows={2}
                                placeholder=""
                                disabled={!canEditBudgetSection}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium mb-2">Budget Officer's Name:</label>
                                <input
                                    type="text"
                                    value={budgetOfficerName}
                                    onChange={(e) => setBudgetOfficerName(e.target.value)}
                                    className="form-input w-full mb-3"
                                    placeholder={canApproveBudgetOfficer ? 'Your name will be auto-filled' : ''}
                                    disabled={!canApproveBudgetOfficer}
                                />
                                <div className="mb-3">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={budgetOfficerApproved}
                                            onChange={(e) => setBudgetOfficerApproved(e.target.checked)}
                                            disabled={!canApproveBudgetOfficer}
                                            className="form-checkbox text-success rounded"
                                        />
                                        <span className="ml-2 text-sm font-medium">{budgetOfficerApproved ? '✓ Approved by Budget Officer' : 'Approve as Budget Officer'}</span>
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Signature:</label>
                                        <input type="text" className="form-input w-full" placeholder="" disabled={!canEditBudgetSection} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Date:</label>
                                        <input type="date" className="form-input w-full" defaultValue={new Date().toISOString().split('T')[0]} disabled={!canEditBudgetSection} />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Budget Manager's Name:</label>
                                <input
                                    type="text"
                                    value={budgetManagerName}
                                    onChange={(e) => setBudgetManagerName(e.target.value)}
                                    className="form-input w-full mb-3"
                                    placeholder={canApproveBudgetManager ? 'Your name will be auto-filled' : ''}
                                    disabled={!canApproveBudgetManager}
                                />
                                <div className="mb-3">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={budgetManagerApproved}
                                            onChange={(e) => setBudgetManagerApproved(e.target.checked)}
                                            disabled={!canApproveBudgetManager}
                                            className="form-checkbox text-success rounded"
                                        />
                                        <span className="ml-2 text-sm font-medium">{budgetManagerApproved ? '✓ Approved by Budget Manager' : 'Approve as Budget Manager'}</span>
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Signature:</label>
                                        <input type="text" className="form-input w-full" placeholder="" disabled={!canEditBudgetSection} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Date:</label>
                                        <input type="date" className="form-input w-full" defaultValue={new Date().toISOString().split('T')[0]} disabled={!canEditBudgetSection} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section III: To be completed by Procurement unit */}
                    <div className="pb-4">
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
                                        className="form-input w-full"
                                        placeholder=""
                                        disabled={!canEditProcurementSection}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Procurement Case Number:</label>
                                    <input
                                        type="text"
                                        value={procurementCaseNumber}
                                        onChange={(e) => setProcurementCaseNumber(e.target.value)}
                                        className="form-input w-full"
                                        placeholder=""
                                        disabled={!canEditProcurementSection}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Date Rec'd:</label>
                                    <input
                                        type="date"
                                        value={dateReceived || new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setDateReceived(e.target.value)}
                                        className="form-input w-full"
                                        disabled={!canEditProcurementSection}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Action Date:</label>
                                    <input
                                        type="date"
                                        value={actionDate || new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setActionDate(e.target.value)}
                                        className="form-input w-full"
                                        disabled={!canEditProcurementSection}
                                    />
                                </div>
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium mb-2">Comments:</label>
                                <textarea
                                    value={procurementComments}
                                    onChange={(e) => setProcurementComments(e.target.value)}
                                    className="form-textarea w-full"
                                    rows={2}
                                    placeholder=""
                                    disabled={!canEditProcurementSection}
                                />
                            </div>

                            {canEditProcurementSection && (
                                <div className="mt-4">
                                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                        <input type="checkbox" className="form-checkbox" checked={procurementApproved} onChange={(e) => setProcurementApproved(e.target.checked)} />I approve this
                                        requisition and forward to Finance
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Attachments */}
                    <div className="border-t pt-4">
                        <label className="block text-sm font-medium mb-2">Supporting Documents</label>
                        <div className="space-y-2">
                            <input type="file" onChange={handleFileChange} className="form-input w-full" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" />
                            <p className="text-xs text-gray-500 dark:text-gray-400">Attach quotations, specifications, or other supporting documents (PDF, Word, Excel, Images - Max 10MB per file)</p>

                            {/* Existing attachments from database */}
                            {existingAttachments.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    <p className="text-sm font-medium">Existing attachments:</p>
                                    {existingAttachments.map((file) => (
                                        <div key={file.id} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                                            <button
                                                type="button"
                                                onClick={() => window.open(file.url, '_blank')}
                                                className="text-sm truncate flex-1 text-left text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                                {file.filename}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* New attachments being uploaded */}
                            {attachments.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    <p className="text-sm font-medium">New files to upload:</p>
                                    {attachments.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded">
                                            <span className="text-sm truncate flex-1">{file.name}</span>
                                            <span className="text-xs text-gray-500 mx-2">({(file.size / 1024).toFixed(2)} KB)</span>
                                            <button type="button" onClick={() => removeAttachment(index)} className="text-red-500 hover:text-red-700">
                                                <IconX className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="submit"
                            disabled={isSubmitting || (!isEditMode && !isFormCodeComplete)}
                            className={`px-6 py-2 rounded bg-primary text-white font-medium ${
                                isSubmitting || (!isEditMode && !isFormCodeComplete) ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-95'
                            }`}
                            title={!isEditMode && !isFormCodeComplete ? 'Complete the form code before submitting' : undefined}
                        >
                            {isSubmitting ? (isEditMode ? 'Saving…' : 'Submitting…') : isEditMode ? 'Save Changes' : 'Submit Procurement Request'}
                        </button>
                        {isEditMode && canDispatchToVendors && (
                            <>
                                <button type="button" onClick={handleDownloadPdf} className="px-6 py-2 rounded border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
                                    Download PDF
                                </button>
                                <button type="button" onClick={handleSendToVendor} className="px-6 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700">
                                    Mark as Sent to Vendor
                                </button>
                            </>
                        )}
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
