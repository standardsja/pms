import React, { useEffect, useState } from 'react';
import Select, { type StylesConfig } from 'react-select';
import { useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { setPageTitle } from '@/store/themeConfigSlice';
import IconPlus from '@/components/Icon/IconPlus';
import IconX from '@/components/Icon/IconX';
import Swal from 'sweetalert2';
import { getApiUrl } from '../../../config/api';

/**
 * Format a number to include thousand separators (commas)
 */
const formatNumberWithCommas = (value: number | string): string => {
    if (typeof value === 'string' && value === '') return '';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (Number.isNaN(num)) return '';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Parse a number string (removes commas) while allowing flexible input
 */
const parseNumberInput = (value: string): number => {
    if (!value) return 0;
    const cleanValue = value.replace(/,/g, '');
    const parsed = parseFloat(cleanValue);
    return Number.isNaN(parsed) ? 0 : parsed;
};

interface RequestItem {
    itemNo: number;
    stockLevel: string;
    description: string;
    quantity: number;
    unitOfMeasure: string;
    unitCost: number;
    partNumber: string;
    accountCode?: string | null;
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
    'M&T',
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
    // Shared compact styles for header dropdowns to preserve the yellow bracket look
    const headerSelectStyles: StylesConfig<{ value: string | number; label: string }, false> = {
        control: (base, state) => ({
            ...base,
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            boxShadow: 'none',
            minHeight: 24,
            height: 24,
            cursor: state.isDisabled ? 'not-allowed' : 'pointer',
        }),
        valueContainer: (base) => ({
            ...base,
            padding: '0 6px',
        }),
        singleValue: (base) => ({
            ...base,
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.875rem',
            lineHeight: '1.25rem',
        }),
        placeholder: (base) => ({
            ...base,
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.875rem',
        }),
        input: (base) => ({
            ...base,
            color: '#fff',
        }),
        dropdownIndicator: (base) => ({
            ...base,
            color: '#fff',
            padding: 0,
        }),
        indicatorSeparator: () => ({ display: 'none' }),
        menu: (base) => ({
            ...base,
            backgroundColor: '#fff',
            border: '1px solid #e0e6ed',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            borderRadius: 6,
            zIndex: 10000,
        }),
        menuList: (base) => ({
            ...base,
            padding: 0,
            maxHeight: 200,
        }),
        option: (base, state) => ({
            ...base,
            fontSize: '0.875rem',
            padding: '6px 10px',
            backgroundColor: state.isSelected ? '#f6f6f6' : state.isFocused ? '#f6f6f6' : 'transparent',
            color: '#000',
        }),
        menuPortal: (base) => ({ ...base, zIndex: 10000 }),
    };
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
    const [unitCostDisplay, setUnitCostDisplay] = useState<{ [key: number]: string }>({});
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
    const [financeOfficers, setFinanceOfficers] = useState<Array<{ id: number; name: string; email: string; assignedCount: number }>>([]);
    const [selectedFinanceOfficerId, setSelectedFinanceOfficerId] = useState<number | null>(null);
    const [isReassigningOfficer, setIsReassigningOfficer] = useState(false);
    const [headerDeptCode, setHeaderDeptCode] = useState('');
    const [headerMonth, setHeaderMonth] = useState('');
    const [headerYear, setHeaderYear] = useState<number | null>(new Date().getFullYear());
    const [headerSequence, setHeaderSequence] = useState<string>('000');
    const headerPreview = `[${headerDeptCode || '---'}]/[${headerMonth || '---'}]/[${headerYear || '----'}]/[${headerSequence}]`;

    const isFormCodeComplete = Boolean(headerDeptCode && headerMonth && headerYear !== null && headerSequence && headerSequence !== '000');
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

    // Procurement role check for starting evaluations
    const isProcurementRole = userRoles.some((r: string) => r === 'PROCUREMENT_OFFICER' || r === 'PROCUREMENT_MANAGER' || /procurement/i.test(r));

    // Check if user is a budget officer (FINANCE role) vs budget manager
    // For now, we'll use a simple check: if they have FINANCE role, they're a budget officer
    // Budget managers would need a separate role or identification method
    const isBudgetOfficer = userRoles.some((r: string) => r === 'FINANCE' || /finance/i.test(r));
    const isBudgetManager = userRoles.some((r: string) => r === 'BUDGET_MANAGER' || /budget.*manager/i.test(r));

    // Check if user has manager privileges (can override splintering warnings)
    const hasManagerRole = userRoles.some((r: string) => r === 'PROCUREMENT_MANAGER' || r === 'DEPT_MANAGER' || r === 'MANAGER' || r === 'EXECUTIVE' || /manager/i.test(r));

    // Track request metadata to gate editing by stage & assignee
    const [requestMeta, setRequestMeta] = useState<{ status?: string; currentAssigneeId?: number } | null>(null);
    // Track the original requester id so returned drafts can be resubmitted by the requester
    const [requestRequesterId, setRequestRequesterId] = useState<number | null>(null);

    // Rejection modal state
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectionNote, setRejectionNote] = useState('');
    const [isRejecting, setIsRejecting] = useState(false);

    // Request actions/messages
    const [requestActions, setRequestActions] = useState<Array<{ id: number; action: string; comment: string | null; performedBy: { name: string } | null; createdAt: string }>>([]);
    const [showMessagesPanel, setShowMessagesPanel] = useState(false);
    const [messages, setMessages] = useState<string[]>([]);

    // Determine field permissions strictly by workflow stage + assignee
    const isAssignee = !!(isEditMode && requestMeta?.currentAssigneeId && currentUserId && Number(requestMeta.currentAssigneeId) === Number(currentUserId));
    const canEditManagerFields = !!(isAssignee && requestMeta?.status === 'DEPARTMENT_REVIEW');
    const canEditHodFields = !!(isAssignee && requestMeta?.status === 'HOD_REVIEW');
    const canEditProcurementSection = !!(isAssignee && (requestMeta?.status === 'PROCUREMENT_REVIEW' || requestMeta?.status === 'FINANCE_APPROVED'));
    const canEditBudgetSection = !!(isAssignee && (requestMeta?.status === 'FINANCE_REVIEW' || requestMeta?.status === 'BUDGET_MANAGER_REVIEW'));

    // Budget Officer can only approve as officer (during FINANCE_REVIEW), Budget Manager can only approve as manager (during BUDGET_MANAGER_REVIEW)
    const canApproveBudgetOfficer = !!(isAssignee && requestMeta?.status === 'FINANCE_REVIEW' && isBudgetOfficer);
    const canApproveBudgetManager = !!(isAssignee && requestMeta?.status === 'BUDGET_MANAGER_REVIEW' && !isBudgetOfficer);
    const canDispatchToVendors = !!(isAssignee && requestMeta?.status === 'FINANCE_APPROVED');

    // Load available finance officers if user is Budget Manager and request is in FINANCE_REVIEW
    useEffect(() => {
        if (!isEditMode || !isBudgetManager || requestMeta?.status !== 'FINANCE_REVIEW') return;

        const fetchFinanceOfficers = async () => {
            try {
                const resp = await fetch(getApiUrl('/api/finance-officers'), {
                    headers: { 'x-user-id': String(currentUserId) },
                });
                if (resp.ok) {
                    const officers = await resp.json();
                    setFinanceOfficers(officers);
                    // Pre-select current assignee if available
                    if (requestMeta?.currentAssigneeId) {
                        setSelectedFinanceOfficerId(requestMeta.currentAssigneeId);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch finance officers:', err);
            }
        };

        fetchFinanceOfficers();
    }, [isEditMode, isBudgetManager, requestMeta?.status, requestMeta?.currentAssigneeId, currentUserId]);

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
                setInstitution('Bureau of Standards Jamaica'); // Default institution
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
                const resp = await fetch(getApiUrl(`/api/requests/${id}`));
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
                setHeaderSequence(String(request.headerSequence ?? 0).padStart(3, '0'));

                // Track status and assignee for edit gating
                const assigneeId = request.currentAssignee?.id || request.currentAssigneeId || null;
                setRequestMeta({ status: request.status, currentAssigneeId: assigneeId ? Number(assigneeId) : undefined });
                // Track requester id so the requester can resubmit returned drafts even if currentAssignee wasn't populated
                const requesterId = request.requester?.id || request.requesterId || null;
                setRequestRequesterId(requesterId ? Number(requesterId) : null);
            } catch (err) {
                console.error('Error fetching request:', err);
                Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load request data' });
            }
        };

        fetchRequest();
    }, [id, isEditMode]);

    // Fetch request actions/messages when in edit mode
    useEffect(() => {
        if (isEditMode && id) {
            fetchRequestActions();
        }
    }, [isEditMode, id]);

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

    // Remove an existing attachment (stored in DB)
    const removeExistingAttachment = async (attachmentId: number) => {
        if (!id) return;
        const raw = localStorage.getItem('userProfile');
        const profile = raw ? JSON.parse(raw) : null;
        const userId = profile?.id || profile?.userId || null;
        if (!userId) {
            Swal.fire({ icon: 'error', title: 'Not logged in' });
            return;
        }

        const confirm = await Swal.fire({
            icon: 'warning',
            title: 'Delete attachment?',
            text: 'This will permanently remove the attachment from the request.',
            showCancelButton: true,
            confirmButtonText: 'Delete',
        });
        if (!confirm.isConfirmed) return;

        try {
            const resp = await fetch(getApiUrl(`/api/requests/${id}/attachments/${attachmentId}`), {
                method: 'DELETE',
                headers: { 'x-user-id': String(userId) },
            });
            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                throw new Error(err.message || resp.statusText || 'Failed to delete attachment');
            }
            setExistingAttachments(existingAttachments.filter((a) => a.id !== attachmentId));
            Swal.fire({ icon: 'success', title: 'Deleted', text: 'Attachment removed' });
        } catch (err: any) {
            console.error('Failed to delete attachment', err);
            Swal.fire({ icon: 'error', title: 'Delete failed', text: err?.message || String(err) });
        }
    };

    // Fetch request actions/messages
    const fetchRequestActions = async () => {
        if (!isEditMode || !id) return;
        try {
            const response = await fetch(getApiUrl(`/api/requests/${id}/actions`), {
                headers: { 'x-user-id': String(currentUserId) },
            });
            if (response.ok) {
                const result = await response.json();
                setRequestActions(result.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch request actions:', err);
        }
    };

    // Handle rejection
    const handleReject = async () => {
        if (!rejectionNote.trim()) {
            Swal.fire({ icon: 'error', title: 'Note Required', text: 'Please provide a reason for rejection.' });
            return;
        }

        setIsRejecting(true);
        try {
            const response = await fetch(getApiUrl(`/api/requests/${id}/reject`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': String(currentUserId),
                },
                body: JSON.stringify({ note: rejectionNote }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to reject request');
            }

            const respData = await response.json();
            
            // Close the rejection modal
            setShowRejectModal(false);
            
            // Update local state to reflect the rejection
            // This creates an optimistic UI update so the user sees it immediately
            const newRejectionAction = {
                id: Date.now(), // Temporary ID
                action: 'RETURN',
                comment: rejectionNote,
                performedBy: { name: 'You' },
                createdAt: new Date().toISOString(),
            };
            
            // Clear the note and add the new rejection to the front of the actions list
            setRejectionNote('');
            setRequestActions(prev => [newRejectionAction, ...prev]);
            
            // Open the messages panel to show the rejection
            setShowMessagesPanel(true);
            
            // Show success message
            Swal.fire({
                icon: 'success',
                title: 'Rejected!',
                text: 'The request has been rejected and returned to the requester. The rejection is now visible in the Messages panel.',
                confirmButtonText: 'OK'
            });
        } catch (err: any) {
            console.error('Rejection failed:', err);
            Swal.fire({ icon: 'error', title: 'Rejection Failed', text: err.message || 'An error occurred' });
        } finally {
            setIsRejecting(false);
        }
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
                    headerYear: headerYear ? Number(headerYear) : null,
                    headerSequence: headerSequence ? Number(headerSequence) : null,
                    budgetOfficerApproved,
                    budgetManagerApproved,
                    procurementCaseNumber,
                    receivedBy,
                    dateReceived,
                    actionDate,
                    procurementComments,
                    procurementApproved,
                };
                // Determine if this save is also an approval action (reviewer checked approve boxes)
                const isApproving =
                    (requestMeta?.status === 'DEPARTMENT_REVIEW' && managerApproved === true) ||
                    (requestMeta?.status === 'HOD_REVIEW' && headApproved === true) ||
                    (requestMeta?.status === 'PROCUREMENT_REVIEW' && procurementApproved === true) ||
                    (requestMeta?.status === 'FINANCE_REVIEW' && budgetOfficerApproved) ||
                    (requestMeta?.status === 'BUDGET_MANAGER_REVIEW' && budgetManagerApproved);

                // If the current operation is a requester saving a DRAFT (not approving), include
                // the main requester-editable fields (description, items, totals) so changes persist.
                const isRequesterSavingDraft = requestMeta?.status === 'DRAFT' && !isApproving;
                if (isRequesterSavingDraft) {
                    const itemsPayload = items.map((it) => ({
                        description: it.description || '',
                        quantity: Number(it.quantity || 0),
                        unitPrice: Number(it.unitCost || 0),
                        totalPrice: Number((it.quantity || 0) * (it.unitCost || 0)),
                        accountCode: it['accountCode'] || null,
                        stockLevel: it.stockLevel || null,
                        unitOfMeasure: it.unitOfMeasure || null,
                        partNumber: it.partNumber || null,
                    }));

                    // Prisma nested write to replace items: delete existing then create new
                    (updatePayload as any).description = commentsJustification;
                    (updatePayload as any).items = { deleteMany: {}, create: itemsPayload };
                    (updatePayload as any).totalEstimated = estimatedTotal;
                    (updatePayload as any).currency = currency;
                    (updatePayload as any).priority = priority ? priority.toUpperCase() : undefined;
                    if (procurementType && procurementType.length > 0) (updatePayload as any).procurementType = JSON.stringify(procurementType);

                    // If there are new files selected for upload, send them first to the attachments endpoint
                    if (attachments.length > 0 && id) {
                        try {
                            const fd = new FormData();
                            attachments.forEach((f) => fd.append('attachments', f));
                            const uploadResp = await fetch(getApiUrl(`/api/requests/${id}/attachments`), {
                                method: 'POST',
                                headers: { 'x-user-id': String(userId) },
                                body: fd,
                            });
                            if (!uploadResp.ok) {
                                const err = await uploadResp.json().catch(() => ({}));
                                throw new Error(err.message || uploadResp.statusText || 'Attachment upload failed');
                            }
                            // Parse created attachment records and merge into existingAttachments so UI updates immediately
                            const created = await uploadResp.json().catch(() => []);
                            if (Array.isArray(created) && created.length > 0) {
                                setExistingAttachments((prev) => [...(prev || []), ...created]);
                            }
                            // Clear the new attachments list after successful upload so we don't reupload them
                            setAttachments([]);
                        } catch (uploadErr: any) {
                            console.error('Attachment upload failed', uploadErr);
                            Swal.fire({ icon: 'error', title: 'Upload failed', text: uploadErr?.message || String(uploadErr) });
                            setIsSubmitting(false);
                            return;
                        }
                    }
                }

                // Debug: log the full payload before sending
                console.log('[RequestForm] Full updatePayload:', updatePayload);
                console.log('[RequestForm] canEditProcurementSection:', canEditProcurementSection);
                console.log('[RequestForm] Current request status:', requestMeta?.status);
                console.log('[RequestForm] isAssignee:', isAssignee);

                const resp = await fetch(getApiUrl(`/api/requests/${id}`), {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': String(userId),
                    },
                    body: JSON.stringify(updatePayload),
                });

                // Debug log - show what was sent
                console.log('[RequestForm] PUT payload dates:', {
                    dateReceived: updatePayload.dateReceived,
                    actionDate: updatePayload.actionDate,
                    receivedBy: updatePayload.receivedBy,
                    procurementCaseNumber: updatePayload.procurementCaseNumber,
                });
                // Automatically perform approval action if reviewer checked the approval box

                if (isApproving) {
                    try {
                        const approveResp = await fetch(getApiUrl(`/api/requests/${id}/action`), {
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
                    // If this is a returned draft and the current user is the original requester,
                    // offer to resubmit the request now (preserving the same form code fields).
                    const requesterId = requestRequesterId;
                    const isRequesterEditingDraft = requestMeta?.status === 'DRAFT' && requesterId && Number(requesterId) === Number(userId);

                    if (isRequesterEditingDraft) {
                        const confirmResubmit = await Swal.fire({
                            icon: 'question',
                            title: 'Save and resubmit?',
                            text: 'This request was returned and is currently a draft. Do you want to save your changes and resubmit it for review now?',
                            showCancelButton: true,
                            confirmButtonText: 'Save & Resubmit',
                            cancelButtonText: 'Save Only',
                        });

                        if (confirmResubmit.isConfirmed) {
                            try {
                                const submitResp = await fetch(getApiUrl(`/api/requests/${id}/submit`), {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'x-user-id': String(userId),
                                    },
                                    body: JSON.stringify({}),
                                });

                                if (submitResp.status === 409) {
                                    // Splintering detected — show details and allow override (manager only)
                                    const body = await submitResp.json().catch(() => ({}));
                                    const details = body?.details || body;
                                    const msg = `Suspicious split purchases detected within the last ${details?.windowDays || ''} days. Combined total: ${details?.combined || ''} (threshold ${
                                        details?.threshold || ''
                                    }).`;

                                    if (!hasManagerRole) {
                                        // Non-managers cannot override
                                        await Swal.fire({
                                            icon: 'warning',
                                            title: 'Potential Splintering Detected',
                                            text: `${msg} This request cannot be submitted and requires manager review. Please contact your department manager or procurement manager.`,
                                            confirmButtonText: 'OK',
                                        });
                                        setIsSubmitting(false);
                                        return;
                                    }

                                    const overrideConfirm = await Swal.fire({
                                        icon: 'warning',
                                        title: 'Potential Splintering Detected',
                                        html: `
                                            <p>${msg}</p>
                                            <p class="mt-3 text-sm text-gray-600">
                                                <strong>Manager Override:</strong> You have permission to proceed, but this action will be logged for audit purposes.
                                            </p>
                                        `,
                                        showCancelButton: true,
                                        confirmButtonText: 'Proceed & Log Override',
                                        cancelButtonText: 'Cancel',
                                        confirmButtonColor: '#d33',
                                    });
                                    if (!overrideConfirm.isConfirmed) {
                                        setIsSubmitting(false);
                                        return;
                                    }

                                    // Resend with override flag
                                    const overrideResp = await fetch(getApiUrl(`/api/requests/${id}/submit`), {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'x-user-id': String(userId),
                                        },
                                        body: JSON.stringify({ overrideSplinter: true }),
                                    });
                                    if (!overrideResp.ok) {
                                        const err = await overrideResp.json().catch(() => ({}));
                                        throw new Error(err.message || err.error || overrideResp.statusText || 'Resubmit failed after override');
                                    }
                                } else {
                                    if (!submitResp.ok) {
                                        const err = await submitResp.json().catch(() => ({}));
                                        throw new Error(err.error || submitResp.statusText || 'Resubmit failed');
                                    }
                                }

                                Swal.fire({ icon: 'success', title: 'Request resubmitted', text: 'Your request has been sent for review.' });
                                navigate('/apps/requests');
                            } catch (submitErr: any) {
                                console.error('Resubmit after save failed', submitErr);
                                Swal.fire({ icon: 'error', title: 'Resubmit failed', text: submitErr?.message || String(submitErr) });
                                // Do NOT navigate so user can try resubmitting again
                                setIsSubmitting(false);
                                return;
                            }
                        } else {
                            Swal.fire({ icon: 'success', title: 'Request updated', text: 'Your information has been saved' });
                            navigate('/apps/requests');
                        }
                    } else {
                        Swal.fire({ icon: 'success', title: 'Request updated', text: 'Your information has been saved' });
                        navigate('/apps/requests');
                    }
                }
            } else {
                // Create new request with attachments using FormData
                if (!departmentId) {
                    Swal.fire({ icon: 'error', title: 'Error', text: 'Unable to determine department. Make sure you are logged in.' });
                    return;
                }

                // Validate form code is filled out
                if (!headerDeptCode || !headerMonth || !headerYear || !headerSequence || headerSequence === '000') {
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

                // Generate title using form code
                const formCodeTitle = `${headerDeptCode}/${headerMonth}/${headerYear}/${headerSequence}`;

                const formData = new FormData();
                formData.append('title', formCodeTitle);
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
                formData.append('headerSequence', headerSequence);

                const resp = await fetch(getApiUrl('/api/requests'), {
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
                const submitResp = await fetch(getApiUrl(`/api/requests/${data.id}/submit`), {
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
        const url = getApiUrl(`/api/requests/${id}/pdf`);
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
            const resp = await fetch(getApiUrl(`/api/requests/${id}/action`), {
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

    const handleReassignFinanceOfficer = async () => {
        if (!id || !selectedFinanceOfficerId) return;

        const raw = localStorage.getItem('userProfile');
        const profile = raw ? JSON.parse(raw) : null;
        const userId = profile?.id || profile?.userId || null;
        if (!userId) {
            Swal.fire({ icon: 'error', title: 'Not logged in' });
            return;
        }

        const confirm = await Swal.fire({
            icon: 'question',
            title: 'Reassign Finance Officer',
            text: 'Are you sure you want to reassign this request to the selected finance officer?',
            showCancelButton: true,
            confirmButtonText: 'Yes, reassign',
        });
        if (!confirm.isConfirmed) return;

        try {
            setIsReassigningOfficer(true);
            const resp = await fetch(getApiUrl(`/api/requests/${id}/assign-finance-officer`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': String(userId) },
                body: JSON.stringify({ financeOfficerId: selectedFinanceOfficerId }),
            });

            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                throw new Error(err.message || resp.statusText || 'Failed to reassign');
            }

            Swal.fire({ icon: 'success', title: 'Reassigned', text: 'Finance officer has been reassigned successfully.' });
            // Refresh the page to show updated assignment
            window.location.reload();
        } catch (err: any) {
            console.error('Reassign failed', err);
            Swal.fire({ icon: 'error', title: 'Failed to reassign', text: err?.message || String(err) });
        } finally {
            setIsReassigningOfficer(false);
        }
    };

    const handleResubmit = async () => {
        if (!id) return;
        const raw = localStorage.getItem('userProfile');
        const profile = raw ? JSON.parse(raw) : null;
        const userId = profile?.id || profile?.userId || null;
        if (!userId) {
            Swal.fire({ icon: 'error', title: 'Not logged in' });
            return;
        }

        const confirm = await Swal.fire({
            icon: 'question',
            title: 'Resubmit request',
            text: 'Send this returned request back into the approval workflow?',
            showCancelButton: true,
            confirmButtonText: 'Resubmit',
        });
        if (!confirm.isConfirmed) return;

        try {
            setIsSubmitting(true);
            const resp = await fetch(getApiUrl(`/api/requests/${id}/submit`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-user-id': String(userId) },
                body: JSON.stringify({}),
            });

            if (resp.status === 409) {
                const body = await resp.json().catch(() => ({}));
                const details = body?.details || body;
                const msg = `Suspicious split purchases detected within the last ${details?.windowDays || ''} days. Combined total: ${details?.combined || ''} (threshold ${
                    details?.threshold || ''
                }).`;

                if (!hasManagerRole) {
                    // Non-managers cannot override
                    await Swal.fire({
                        icon: 'warning',
                        title: 'Potential Splintering Detected',
                        text: `${msg} This request cannot be submitted and requires manager review. Please contact your department manager or procurement manager.`,
                        confirmButtonText: 'OK',
                    });
                    setIsSubmitting(false);
                    return;
                }

                const overrideConfirm = await Swal.fire({
                    icon: 'warning',
                    title: 'Potential Splintering Detected',
                    html: `
                        <p>${msg}</p>
                        <p class="mt-3 text-sm text-gray-600">
                            <strong>Manager Override:</strong> You have permission to proceed, but this action will be logged for audit purposes.
                        </p>
                    `,
                    showCancelButton: true,
                    confirmButtonText: 'Proceed & Log Override',
                    cancelButtonText: 'Cancel',
                    confirmButtonColor: '#d33',
                });
                if (!overrideConfirm.isConfirmed) {
                    setIsSubmitting(false);
                    return;
                }

                const overrideResp = await fetch(getApiUrl(`/api/requests/${id}/submit`), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-user-id': String(userId) },
                    body: JSON.stringify({ overrideSplinter: true }),
                });
                if (!overrideResp.ok) {
                    const err = await overrideResp.json().catch(() => ({}));
                    throw new Error(err.message || overrideResp.statusText || 'Failed to resubmit (override)');
                }

                Swal.fire({ icon: 'success', title: 'Resubmitted', text: 'Your request has been sent for review.' });
                navigate('/apps/requests');
                return;
            }

            if (!resp.ok) {
                const err = await resp.json().catch(() => ({}));
                throw new Error(err.message || resp.statusText || 'Failed to resubmit');
            }
            Swal.fire({ icon: 'success', title: 'Resubmitted', text: 'Your request has been sent for review.' });
            navigate('/apps/requests');
        } catch (err: any) {
            console.error('Resubmit failed', err);
            Swal.fire({ icon: 'error', title: 'Failed to resubmit', text: err?.message || String(err) });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <div className="flex justify-center">
                    <div className="w-full max-w-4xl">
                        <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center w-full mb-2">
                                <img
                                    src="/assets/images/bsj-logo.png"
                                    alt="Bureau of Standards Jamaica Logo"
                                    className="h-12 w-auto mr-4 print:h-10 print:mr-2"
                                    style={{ maxWidth: '120px', objectFit: 'contain' }}
                                />
                                <div className="flex flex-col items-start">
                                    <h1 className="text-2xl font-semibold">BUREAU OF STANDARDS JAMAICA</h1>
                                    <h2 className="text-xl font-semibold mt-1 underline">PROCUREMENT REQUISITION FORM</h2>
                                </div>
                            </div>
                            <div className="text-sm italic text-gray-500 mt-2">This form authorizes the Procurement Unit to act on your behalf.</div>
                            <div className="mt-4 flex justify-center">
                                {/* Inline dropdown controls styled as brackets */}
                                <div className="flex items-center gap-1 text-sm font-semibold">
                                    <span className="inline-flex items-center bg-yellow-600 text-white rounded-sm">
                                        <span className="px-1">[</span>
                                        {(() => {
                                            const deptOptions: { value: string; label: string }[] = DEPARTMENT_CODES.map((code) => ({ value: code, label: code }));
                                            const deptValue = headerDeptCode ? { value: headerDeptCode, label: headerDeptCode } : null;
                                            return (
                                                <Select
                                                    className="min-w-[5.5rem]"
                                                    styles={headerSelectStyles}
                                                    menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                                                    menuPosition="fixed"
                                                    isSearchable={false}
                                                    isDisabled={isEditMode}
                                                    options={[{ value: '', label: '---' }, ...deptOptions]}
                                                    value={deptValue || { value: '', label: '---' }}
                                                    onChange={(opt) => setHeaderDeptCode((opt && 'value' in opt ? opt.value : '') || '')}
                                                />
                                            );
                                        })()}
                                        <span className="px-1">]</span>
                                    </span>
                                    <span className="inline-flex items-center bg-yellow-600 text-white rounded-sm">
                                        <span className="px-1">[</span>
                                        {(() => {
                                            const monthOptions: { value: string; label: string }[] = MONTHS.map((m) => ({ value: m, label: m }));
                                            const monthValue = headerMonth ? { value: headerMonth, label: headerMonth } : null;
                                            return (
                                                <Select
                                                    className="min-w-[8rem]"
                                                    styles={headerSelectStyles}
                                                    menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                                                    menuPosition="fixed"
                                                    isSearchable={false}
                                                    isDisabled={isEditMode}
                                                    options={[{ value: '', label: '---' }, ...monthOptions]}
                                                    value={monthValue || { value: '', label: '---' }}
                                                    onChange={(opt) => setHeaderMonth((opt && 'value' in opt ? opt.value : '') || '')}
                                                />
                                            );
                                        })()}
                                        <span className="px-1">]</span>
                                    </span>
                                    <span className="inline-flex items-center bg-yellow-600 text-white rounded-sm">
                                        <span className="px-1">[</span>
                                        {(() => {
                                            const yearOptions: { value: number; label: string }[] = Array.from({ length: HEADER_YEAR_SPAN }).map((_, i) => {
                                                const year = HEADER_YEAR_BASE + i;
                                                return { value: year, label: String(year) };
                                            });
                                            const yearValue = headerYear !== null ? { value: headerYear as number, label: String(headerYear) } : null;
                                            return (
                                                <Select
                                                    className="min-w-[5rem]"
                                                    styles={headerSelectStyles}
                                                    menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                                                    menuPosition="fixed"
                                                    isSearchable={false}
                                                    isDisabled={isEditMode}
                                                    options={[{ value: NaN, label: '----' }, ...yearOptions]}
                                                    value={yearValue || { value: NaN, label: '----' }}
                                                    onChange={(opt) => setHeaderYear(opt && 'value' in opt && typeof opt.value === 'number' && !Number.isNaN(opt.value) ? opt.value : null)}
                                                />
                                            );
                                        })()}
                                        <span className="px-1">]</span>
                                    </span>
                                    <span className="inline-flex items-center bg-yellow-600 text-white rounded-sm px-2 py-1">
                                        [
                                        <input
                                            type="text"
                                            value={headerSequence}
                                            onChange={(e) => {
                                                setHeaderSequence(e.target.value);
                                            }}
                                            className="bg-transparent border-0 text-white font-semibold text-sm focus:ring-0 w-10 text-center"
                                            disabled={isEditMode}
                                            placeholder="0"
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
                                <input type="date" value={formDate} disabled className="form-input w-full bg-gray-100" />
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
                                    <input type="text" value={formatNumberWithCommas(estimatedTotal)} className="form-input flex-1 bg-gray-50 dark:bg-gray-900" readOnly />
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
                                <label className="block text-sm font-medium mb-2">
                                    Procurement Type
                                    {!isEditMode && procurementType.length === 0 && <span className="ml-2 inline-block px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full">Required</span>}
                                </label>
                                <div
                                    className={`flex gap-4 flex-wrap items-center h-[42px] transition-all ${
                                        !isEditMode && procurementType.length === 0 ? 'ring-2 ring-amber-300 ring-opacity-50 rounded p-2' : ''
                                    }`}
                                >
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
                            <label className="block text-sm font-medium mb-2">
                                Priority
                                {!isEditMode && !priority && <span className="ml-2 inline-block px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full">Required</span>}
                            </label>
                            <div className={`flex gap-6 transition-all ${!isEditMode && !priority ? 'ring-2 ring-amber-300 ring-opacity-50 rounded p-2' : ''}`}>
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
                                                        type="text"
                                                        value={unitCostDisplay[item.itemNo] !== undefined ? unitCostDisplay[item.itemNo] : formatNumberWithCommas(item.unitCost)}
                                                        onChange={(e) => {
                                                            setUnitCostDisplay({ ...unitCostDisplay, [item.itemNo]: e.target.value });
                                                            updateItem(item.itemNo, 'unitCost', parseNumberInput(e.target.value));
                                                        }}
                                                        onBlur={(e) => {
                                                            const parsed = parseNumberInput(e.target.value);
                                                            setUnitCostDisplay({ ...unitCostDisplay, [item.itemNo]: formatNumberWithCommas(parsed) });
                                                            updateItem(item.itemNo, 'unitCost', parsed);
                                                        }}
                                                        onFocus={() => {
                                                            setUnitCostDisplay({ ...unitCostDisplay, [item.itemNo]: item.unitCost.toString() });
                                                        }}
                                                        className="form-input w-full"
                                                        placeholder="0.00"
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
                                    <label className="block text-sm font-medium mb-2">
                                        Manager of Division's Name:
                                        {canEditManagerFields && !managerName && <span className="ml-2 inline-block px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full">Required</span>}
                                    </label>
                                    <input
                                        type="text"
                                        value={managerName}
                                        onChange={(e) => setManagerName(e.target.value)}
                                        className={`form-input w-full mb-3 transition-all ${
                                            canEditManagerFields && !managerName ? 'ring-2 ring-amber-300 ring-opacity-50 focus:ring-amber-400 focus:ring-opacity-100' : ''
                                        }`}
                                        placeholder="Enter name of head of department"
                                        disabled={!canEditManagerFields}
                                    />
                                    {canEditManagerFields && (
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                                                <input type="checkbox" className="form-checkbox" checked={managerApproved} onChange={(e) => setManagerApproved(e.target.checked)} />I approve this
                                                requisition
                                            </label>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Date Approved:</label>
                                                <input type="date" className="form-input w-full" defaultValue={new Date().toISOString().split('T')[0]} />
                                            </div>
                                            <div className="flex gap-2 mt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowRejectModal(true)}
                                                    className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition"
                                                >
                                                    Reject Request
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowMessagesPanel(true)}
                                                    className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition"
                                                >
                                                    View Messages
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Head of Division's Name:
                                        {canEditHodFields && !headName && <span className="ml-2 inline-block px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full">Required</span>}
                                    </label>
                                    <input
                                        type="text"
                                        value={headName}
                                        onChange={(e) => setHeadName(e.target.value)}
                                        className={`form-input w-full mb-3 transition-all ${
                                            canEditHodFields && !headName ? 'ring-2 ring-amber-300 ring-opacity-50 focus:ring-amber-400 focus:ring-opacity-100' : ''
                                        }`}
                                        placeholder="Enter name of head of department"
                                        disabled={!canEditHodFields}
                                    />
                                    {canEditHodFields && (
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                                                <input type="checkbox" className="form-checkbox" checked={headApproved} onChange={(e) => setHeadApproved(e.target.checked)} />I approve this requisition
                                            </label>
                                            <div>
                                                <label className="block text-xs text-gray-500 mb-1">Date Approved:</label>
                                                <input type="date" className="form-input w-full" defaultValue={new Date().toISOString().split('T')[0]} />
                                            </div>
                                            <div className="flex gap-2 mt-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowRejectModal(true)}
                                                    className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition"
                                                >
                                                    Reject Request
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowMessagesPanel(true)}
                                                    className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition"
                                                >
                                                    View Messages
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section II: Commitment from Budget */}
                    <div className="border-b-2 border-red-500 pb-4">
                        <h3 className="text-lg font-bold text-red-600 mb-4">Section II: Commitment from Budget</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Commitment Number:
                                    {canEditBudgetSection && !commitmentNumber && <span className="ml-2 inline-block px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full">Required</span>}
                                </label>
                                <input
                                    type="text"
                                    value={commitmentNumber}
                                    onChange={(e) => setCommitmentNumber(e.target.value)}
                                    className={`form-input w-full transition-all ${
                                        canEditBudgetSection && !commitmentNumber ? 'ring-2 ring-amber-300 ring-opacity-50 focus:ring-amber-400 focus:ring-opacity-100' : ''
                                    }`}
                                    placeholder=""
                                    disabled={!canEditBudgetSection}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    General Ledger Code:
                                    {canEditBudgetSection && !accountingCode && <span className="ml-2 inline-block px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full">Required</span>}
                                </label>
                                <input
                                    type="text"
                                    value={accountingCode}
                                    onChange={(e) => setAccountingCode(e.target.value)}
                                    className={`form-input w-full transition-all ${
                                        canEditBudgetSection && !accountingCode ? 'ring-2 ring-amber-300 ring-opacity-50 focus:ring-amber-400 focus:ring-opacity-100' : ''
                                    }`}
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
                                <label className="block text-sm font-medium mb-2">
                                    Chief Accountant:
                                    {canApproveBudgetOfficer && !budgetOfficerName && <span className="ml-2 inline-block px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full">Required</span>}
                                </label>
                                <input
                                    type="text"
                                    value={budgetOfficerName}
                                    onChange={(e) => setBudgetOfficerName(e.target.value)}
                                    className={`form-input w-full mb-3 transition-all ${
                                        canApproveBudgetOfficer && !budgetOfficerName ? 'ring-2 ring-amber-300 ring-opacity-50 focus:ring-amber-400 focus:ring-opacity-100' : ''
                                    }`}
                                    placeholder={canApproveBudgetOfficer ? 'Your name will be auto-filled' : ''}
                                    disabled={!canApproveBudgetOfficer}
                                />
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                                        <input
                                            type="checkbox"
                                            checked={budgetOfficerApproved}
                                            onChange={(e) => setBudgetOfficerApproved(e.target.checked)}
                                            disabled={!canApproveBudgetOfficer}
                                            className="form-checkbox text-success rounded"
                                        />
                                        <span className="ml-2 text-sm font-medium">{budgetOfficerApproved ? '✓ Approved by Chief Accountant' : 'Approve as Chief Accountant'}</span>
                                    </label>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Date Approved:</label>
                                        <input type="date" className="form-input w-full" defaultValue={new Date().toISOString().split('T')[0]} disabled={!canApproveBudgetOfficer} />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Finance Director:
                                    {canApproveBudgetManager && !budgetManagerName && <span className="ml-2 inline-block px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full">Required</span>}
                                </label>
                                <input
                                    type="text"
                                    value={budgetManagerName}
                                    onChange={(e) => setBudgetManagerName(e.target.value)}
                                    className={`form-input w-full mb-3 transition-all ${
                                        canApproveBudgetManager && !budgetManagerName ? 'ring-2 ring-amber-300 ring-opacity-50 focus:ring-amber-400 focus:ring-opacity-100' : ''
                                    }`}
                                    placeholder={canApproveBudgetManager ? 'Your name will be auto-filled' : ''}
                                    disabled={!canApproveBudgetManager}
                                />
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                                        <input
                                            type="checkbox"
                                            checked={budgetManagerApproved}
                                            onChange={(e) => setBudgetManagerApproved(e.target.checked)}
                                            disabled={!canApproveBudgetManager}
                                            className="form-checkbox text-success rounded"
                                        />
                                        <span className="ml-2 text-sm font-medium">{budgetManagerApproved ? '✓ Approved by Finance Director' : 'Approve as Finance Director'}</span>
                                    </label>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Date Approved:</label>
                                        <input type="date" className="form-input w-full" defaultValue={new Date().toISOString().split('T')[0]} disabled={!canApproveBudgetManager} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Budget Manager: Finance Officer Assignment Panel */}
                        {isEditMode && isBudgetManager && requestMeta?.status === 'FINANCE_REVIEW' && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 p-4 rounded mt-4">
                                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">Assign Finance Officer</h4>
                                <p className="text-xs text-blue-800 dark:text-blue-200 mb-3">
                                    As Budget Manager, you can reassign this request to a different finance officer to manage their workload.
                                </p>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Select Finance Officer:</label>
                                        <select
                                            value={selectedFinanceOfficerId || ''}
                                            onChange={(e) => setSelectedFinanceOfficerId(e.target.value ? parseInt(e.target.value, 10) : null)}
                                            className="form-select w-full"
                                        >
                                            <option value="">-- Choose a finance officer --</option>
                                            {financeOfficers.map((officer) => (
                                                <option key={officer.id} value={officer.id}>
                                                    {officer.name} ({officer.email}) - {officer.assignedCount} assigned
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleReassignFinanceOfficer}
                                        disabled={isReassigningOfficer || !selectedFinanceOfficerId}
                                        className={`px-4 py-2 rounded text-white font-medium ${
                                            isReassigningOfficer || !selectedFinanceOfficerId ? 'opacity-60 cursor-not-allowed bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                                        }`}
                                    >
                                        {isReassigningOfficer ? 'Reassigning…' : 'Reassign Finance Officer'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section III: To be completed by Procurement unit */}
                    <div className="pb-4">
                        <h3 className="text-lg font-bold text-red-600 mb-4">Section III: To be completed by Procurement unit</h3>

                        <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded mb-4">
                            <p className="text-center font-semibold mb-3">For Procurement office use only.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Rec'd By:
                                        {canEditProcurementSection && !receivedBy && <span className="ml-2 inline-block px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full">Required</span>}
                                    </label>
                                    <input
                                        type="text"
                                        value={receivedBy}
                                        onChange={(e) => setReceivedBy(e.target.value)}
                                        className={`form-input w-full transition-all ${
                                            canEditProcurementSection && !receivedBy ? 'ring-2 ring-amber-300 ring-opacity-50 focus:ring-amber-400 focus:ring-opacity-100' : ''
                                        }`}
                                        placeholder=""
                                        disabled={!canEditProcurementSection}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Procurement Case Number:
                                        {canEditProcurementSection && !procurementCaseNumber && (
                                            <span className="ml-2 inline-block px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full">Required</span>
                                        )}
                                    </label>
                                    <input
                                        type="text"
                                        value={procurementCaseNumber}
                                        onChange={(e) => setProcurementCaseNumber(e.target.value)}
                                        className={`form-input w-full transition-all ${
                                            canEditProcurementSection && !procurementCaseNumber ? 'ring-2 ring-amber-300 ring-opacity-50 focus:ring-amber-400 focus:ring-opacity-100' : ''
                                        }`}
                                        placeholder=""
                                        disabled={!canEditProcurementSection}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Date Rec'd:
                                        {canEditProcurementSection && !dateReceived && <span className="ml-2 inline-block px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full">Required</span>}
                                    </label>
                                    <input
                                        type="date"
                                        value={dateReceived || ''}
                                        onChange={(e) => setDateReceived(e.target.value)}
                                        className={`form-input w-full transition-all ${
                                            canEditProcurementSection && !dateReceived ? 'ring-2 ring-amber-300 ring-opacity-50 focus:ring-amber-400 focus:ring-opacity-100' : ''
                                        }`}
                                        disabled={!canEditProcurementSection}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Action Date:
                                        {canEditProcurementSection && !actionDate && <span className="ml-2 inline-block px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full">Required</span>}
                                    </label>
                                    <input
                                        type="date"
                                        value={actionDate || ''}
                                        onChange={(e) => setActionDate(e.target.value)}
                                        className={`form-input w-full transition-all ${
                                            canEditProcurementSection && !actionDate ? 'ring-2 ring-amber-300 ring-opacity-50 focus:ring-amber-400 focus:ring-opacity-100' : ''
                                        }`}
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
                            disabled={isSubmitting || (!isEditMode && (!isFormCodeComplete || headerSequence === '000'))}
                            className={`px-6 py-2 rounded bg-primary text-white font-medium ${
                                isSubmitting || (!isEditMode && (!isFormCodeComplete || headerSequence === '000')) ? 'opacity-60 cursor-not-allowed' : 'hover:opacity-95'
                            }`}
                            title={!isEditMode && (!isFormCodeComplete || headerSequence === '000') ? 'Complete the form code before submitting' : undefined}
                        >
                            {isSubmitting ? (isEditMode ? 'Saving…' : 'Submitting…') : isEditMode ? 'Save Changes' : 'Submit Procurement Request'}
                        </button>
                        {/* Procurement-only: Start Evaluation for this request */}
                        {isEditMode && isProcurementRole && (
                            <button type="button" onClick={() => navigate(`/procurement/evaluation/new?requestId=${id}`)} className="px-6 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700">
                                Start Evaluation
                            </button>
                        )}
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
                        {/* If this is an existing request returned to the requester (DRAFT), show a Resubmit button */}
                        {isEditMode && requestMeta?.status === 'DRAFT' && (Number(requestMeta.currentAssigneeId) === Number(currentUserId) || Number(requestRequesterId) === Number(currentUserId)) && (
                            <button
                                type="button"
                                onClick={handleResubmit}
                                disabled={isSubmitting}
                                className={`px-6 py-2 rounded bg-primary-600 text-white ${isSubmitting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-primary-700'}`}
                            >
                                {isSubmitting ? 'Resubmitting…' : 'Resubmit for Review'}
                            </button>
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

            {/* Rejection Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-bold mb-4">Reject Request</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Please provide a reason for rejecting this request. The requester will be notified and can resubmit.</p>
                        <textarea className="form-textarea w-full mb-4" rows={4} placeholder="Enter rejection reason..." value={rejectionNote} onChange={(e) => setRejectionNote(e.target.value)} />
                        <div className="flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectionNote('');
                                }}
                                className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </button>
                            <button type="button" onClick={handleReject} disabled={isRejecting} className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">
                                {isRejecting ? 'Rejecting...' : 'Reject Request'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Messages/Activity Panel */}
            {showMessagesPanel && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Request Activity & Messages</h3>
                            <button type="button" onClick={() => setShowMessagesPanel(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                                <IconX />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1">
                            {requestActions.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-8">No activity yet</p>
                            ) : (
                                <div className="space-y-3">
                                    {requestActions.map((action) => (
                                        <div key={action.id} className="border border-gray-200 dark:border-gray-700 rounded p-3">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-semibold text-sm">
                                                    {action.action === 'RETURN'
                                                        ? '↩️ Returned'
                                                        : action.action === 'APPROVE'
                                                        ? '✅ Approved'
                                                        : action.action === 'SUBMIT'
                                                        ? '📤 Submitted'
                                                        : action.action === 'ASSIGN'
                                                        ? '👤 Assigned'
                                                        : action.action === 'COMMENT'
                                                        ? '💬 Comment'
                                                        : action.action === 'EDIT_BUDGET'
                                                        ? '💰 Budget Edited'
                                                        : action.action === 'SEND_TO_VENDOR'
                                                        ? '🚚 Sent to Vendor'
                                                        : action.action}
                                                </span>
                                                <span className="text-xs text-gray-500">{new Date(action.createdAt).toLocaleString()}</span>
                                            </div>
                                            {action.performedBy && <p className="text-sm text-gray-600 dark:text-gray-400">By: {action.performedBy.name}</p>}
                                            {action.comment && <p className="text-sm mt-2 bg-gray-50 dark:bg-gray-900 p-2 rounded">{action.comment}</p>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RequestForm;
