import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';
import IconChecks from '../../../components/Icon/IconChecks';
import IconEdit from '../../../components/Icon/IconEdit';
import IconTxtFile from '../../../components/Icon/IconTxtFile';
import { getUser } from '../../../utils/auth';
import Swal from 'sweetalert2';
import { evaluationService, type Evaluation, type SectionVerificationStatus } from '../../../services/evaluationService';
import EvaluationForm from '../../../components/EvaluationForm';

/**
 * Format date string (YYYY-MM-DD) to locale date without timezone issues
 * Prevents date picker values from showing as previous day due to UTC conversion
 */
const formatDateSafe = (dateString: string): string => {
    if (!dateString) return '';
    // If it's a date-only string (YYYY-MM-DD), parse it as local date
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString();
    }
    // For full ISO strings with time, use normal parsing
    return new Date(dateString).toLocaleDateString();
};

const EvaluationDetail = () => {
    const dispatch = useDispatch();
    const authLoading = useSelector((state: any) => state.auth.isLoading);
    const authUser = useSelector((state: any) => state.auth.user);
    const navigate = useNavigate();
    const { id } = useParams();

    const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isProcurement, setIsProcurement] = useState(false);
    const [isCommittee, setIsCommittee] = useState(false);
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [sectionData, setSectionData] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [canEditSections, setCanEditSections] = useState<string[]>([]);
    const [structureEditEnabled, setStructureEditEnabled] = useState<boolean>(false);
    const [returnNotes, setReturnNotes] = useState<string>('');
    const [pendingSectionB, setPendingSectionB] = useState<any>(null);

    // Assignment-related state (missing declarations caused ReferenceError 'myAssignment is not defined')
    const [myAssignment, setMyAssignment] = useState<any | null>(null);
    const [currentAssignments, setCurrentAssignments] = useState<any[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('');
    const [selectedAssignSections, setSelectedAssignSections] = useState<string[]>([]);
    const [completingAssignment, setCompletingAssignment] = useState<boolean>(false);
    const [assignmentsRefreshKey, setAssignmentsRefreshKey] = useState(0);

    const toast = (title: string, icon: 'success' | 'error' | 'info' | 'warning' = 'info') =>
        Swal.fire({
            toast: true,
            icon,
            title,
            position: 'top-end',
            timer: 2500,
            showConfirmButton: false,
        });

    // Add print styles
    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `
            @media print {
                /* Hide interactive controls, navigation and topbars */
                button, .btn, nav, .no-print, header, .topbar, .app-header, .header-right, .user-menu {
                    display: none !important;
                }
                /* Hide header logos and icons specifically so they don't appear on PDF */
                header img, header svg, .topbar img, .topbar svg, .header-icons, .topbar-icons {
                    display: none !important;
                }
                /* Hide assignment management panels */
                .panel:has(h6:contains('Assignment')),
                .panel:has(h6:contains('Evaluator Assignments')),
                .panel:has(.btn-primary:contains('Print')) {
                    display: none !important;
                }
                /* Make panels print-friendly */
                .panel {
                    page-break-inside: avoid;
                    border: 1px solid #d9d9d9;
                    margin-bottom: 14px;
                    border-radius: 6px;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                    background: #fff;
                }
                /* Ensure tables fit on page */
                table {
                    font-size: 10pt;
                    width: 100%;
                    border-collapse: collapse;
                }
                table th, table td {
                    border: 1px solid #d9d9d9;
                    padding: 6px 8px;
                }
                table th {
                    background: #f5f7fa;
                    font-weight: 600;
                }
                /* Add page breaks between major sections */
                .panel:has(h5:contains('Section')) {
                    page-break-before: auto;
                }
                /* Footer / signature area for printed evaluations: place on its own final page */
                #print-footer { display: block !important; position: static !important; page-break-before: always; background: white; border-top: 1px solid #ddd; padding: 40px 12px 120px; font-size: 10pt; }
                #print-footer .print-footer-content { max-width: 1000px; margin: 0 auto; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
                #print-footer .doc-control { font-weight: 600; }
                /* Push the signature block lower so there's room to hand-sign */
                #print-footer .signature-block { text-align: right; min-width: 420px; margin-top: 40px; }
                #print-footer .signature-line { margin-bottom: 36px; border-bottom: 1px solid #000; width: 320px; }
                #print-footer .signature-meta { font-size: 9pt; color: #222; display: none; }
                /* Add breathing room below fixed header and center content */
                .evaluation-print-root { margin: 32px auto 24px; padding: 0 12px; max-width: 900px; }
                /* Nudge first panel down slightly */
                .evaluation-print-root .panel:first-of-type { margin-top: 12px; }
                /* Typography refinements */
                .evaluation-print-root h2 { font-size: 18px; margin: 0 0 6px; }
                .evaluation-print-root p { margin: 0 0 6px; font-size: 11pt; }
                .evaluation-print-root .text-sm { font-size: 10pt; }
            }
        `;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    // Determine user roles (procurement/committee) for gating
    useEffect(() => {
        try {
            const u = getUser();
            if (!u) return;
            const roles = (u?.roles || (u?.role ? [u.role] : [])).map((r: any) => {
                const roleName = typeof r === 'string' ? r : r?.name || '';
                return roleName.toUpperCase();
            });
            setIsProcurement(roles.some((role) => role.includes('PROCUREMENT_OFFICER') || role.includes('PROCUREMENT_MANAGER') || role.includes('PROCUREMENT')));
            setIsCommittee(roles.some((role) => role.includes('COMMITTEE') || role.includes('EVALUATION_COMMITTEE')));
        } catch (err) {
            // ignore
        }
    }, []);

    useEffect(() => {
        if (!id || isNaN(parseInt(id))) {
            setError('Invalid evaluation ID');
            setLoading(false);
            return;
        }
        loadEvaluation();
    }, [id]);

    // Load editable sections for current user (assigned sections)
    useEffect(() => {
        const loadAssignments = async () => {
            try {
                const assignments = await evaluationService.getMyAssignments();
                const forThisEval = assignments.filter((a: any) => String(a.evaluationId) === String(id));
                const sections = new Set<string>();
                forThisEval.forEach((a: any) => {
                    const raw = a.sections;
                    const arr = Array.isArray(raw)
                        ? raw
                        : (() => {
                              try {
                                  return JSON.parse(raw || '[]');
                              } catch {
                                  return [];
                              }
                          })();
                    (arr || []).forEach((s: string) => sections.add(String(s).toUpperCase()));
                });

                // Procurement officers can always edit section A (their section)
                if (isProcurement && id) {
                    sections.add('A');

                    // Check if evaluators have completed B/C by getting all assignments for this eval
                    const allAssignments = await evaluationService.getAllAssignments(parseInt(id));

                    // Check if there are assignments for B or C, and if all are submitted
                    const bcAssignments = allAssignments.filter((a: any) => {
                        const assignedSections = Array.isArray(a.sections)
                            ? a.sections
                            : (() => {
                                  try {
                                      return JSON.parse(a.sections || '[]');
                                  } catch {
                                      return [];
                                  }
                              })();
                        return assignedSections.some((s: string) => ['B', 'C'].includes(String(s).toUpperCase()));
                    });

                    // If there are B/C assignments and ALL of them are submitted, grant D/E access
                    const allBCSubmitted = bcAssignments.length > 0 && bcAssignments.every((a: any) => a.status === 'SUBMITTED');

                    // If no B/C assignments exist yet OR all B/C assignments are submitted, allow D/E editing
                    if (bcAssignments.length === 0 || allBCSubmitted) {
                        sections.add('D');
                        sections.add('E');
                    }
                }

                setCanEditSections(Array.from(sections));

                // Store my assignment for complete button
                if (forThisEval.length > 0) {
                    setMyAssignment(forThisEval[0]);
                }
            } catch {
                setCanEditSections([]);
            }
        };
        if (id) loadAssignments();
    }, [id, isProcurement, assignmentsRefreshKey]);

    // Load available users and all assignments for procurement
    useEffect(() => {
        const loadUsersAndAssignments = async () => {
            if (!isProcurement || !id) return;
            try {
                const allAssignments = await evaluationService.getAllAssignments(parseInt(id));
                setCurrentAssignments(allAssignments || []);
                // Disable structure editing if there are any assignments (evaluators have been assigned)
                // This prevents procurement from changing table structure after sending to evaluators
                if (allAssignments && allAssignments.length > 0) {
                    setStructureEditEnabled(false);
                } else {
                    // Only allow structure editing if no evaluators have been assigned yet
                    setStructureEditEnabled(true);
                }
            } catch (err) {
                console.error('Failed to load assignments:', err);
            }
        };
        loadUsersAndAssignments();
    }, [isProcurement, id]);

    if (authLoading || !authUser) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    const loadEvaluation = async () => {
        if (!id) return;
        try {
            setLoading(true);
            setError(null);
            const data = await evaluationService.getEvaluationById(parseInt(id));
            setEvaluation(data);

            // Update the print header with evaluation title
            if (data?.rfqTitle) {
                const printHeader = document.getElementById('global-print-header');
                if (printHeader) {
                    const now = new Date().toLocaleString();
                    printHeader.innerHTML = `
                        <div class="inner">
                            <img src="/assets/images/bsj-logo.png" alt="BSJ" />
                            <div style="font-weight:700;font-size:13px;">BUREAU OF STANDARDS JAMAICA</div>
                            <div style="font-weight:600;font-size:12px;margin-top:4px;">BSJ Evaluation Report | ${data.rfqTitle}</div>
                            <div class="meta"><div style="text-align:left">${now}</div><div style="text-align:center;font-weight:600">SPINX</div><div style="text-align:right">${
                        data.evalNumber || ''
                    }</div></div>
                        </div>
                    `;
                }
            }
        } catch (err: any) {
            console.error('Failed to load evaluation:', err);
            setError(err.message || 'Failed to load evaluation');
            toast(err.message || 'Failed to load evaluation', 'error');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: SectionVerificationStatus) => {
        switch (status) {
            case 'VERIFIED':
                return 'badge bg-success';
            case 'SUBMITTED':
                return 'badge bg-info';
            case 'IN_PROGRESS':
                return 'badge bg-warning';
            case 'RETURNED':
                return 'badge bg-danger';
            default:
                return 'badge bg-secondary';
        }
    };

    const getStatusText = (status: SectionVerificationStatus) => {
        switch (status) {
            case 'VERIFIED':
                return 'Verified';
            case 'SUBMITTED':
                return 'Awaiting Review';
            case 'IN_PROGRESS':
                return 'In Progress';
            case 'RETURNED':
                return 'Returned';
            default:
                return 'Not Started';
        }
    };

    const handleCompleteAssignment = async () => {
        if (!evaluation || !myAssignment) return;

        const confirmResult = await Swal.fire({
            title: 'Mark assignment complete?',
            text: 'The procurement officer will be notified.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, complete',
            cancelButtonText: 'Cancel',
        });

        if (!confirmResult.isConfirmed) return;

        try {
            setCompletingAssignment(true);
            await evaluationService.completeAssignment(evaluation.id);
            toast('Evaluation marked complete', 'success');
            await loadEvaluation();
            const assignments = await evaluationService.getMyAssignments();
            const forThisEval = assignments.filter((a: any) => String(a.evaluationId) === String(id));
            if (forThisEval.length > 0) setMyAssignment(forThisEval[0]);
            // Trigger refresh of editable sections
            setAssignmentsRefreshKey((prev) => prev + 1);
        } catch (err: any) {
            toast(err.message || 'Failed to complete assignment', 'error');
        } finally {
            setCompletingAssignment(false);
        }
    };

    const handlePrintEvaluation = () => {
        window.print();
    };

    const handlePrintFormattedReport = () => {
        if (!evaluation) return;

        // Create a new window for the formatted report
        const reportWindow = window.open('', '_blank');
        if (!reportWindow) return;

        // Build the HTML content
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Evaluation Report - ${evaluation.evalNumber}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: 'Arial', sans-serif;
                        color: #333;
                        line-height: 1.6;
                        background: #f5f5f5;
                    }
                    @page {
                        margin: 20mm;
                        @top-center {
                            content: "Procurement Evaluation Report - ${evaluation.rfqTitle}";
                            font-size: 10px;
                            font-weight: bold;
                            color: #2563eb;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            max-width: 100%;
                        }
                        @bottom-center {
                            content: "Page " counter(page) " of " counter(pages);
                            font-size: 9px;
                            color: #999;
                        }
                    }
                    .page {
                        width: 210mm;
                        height: 297mm;
                        margin: 10mm auto;
                        padding: 20mm;
                        background: white;
                        box-shadow: 0 0 10px rgba(0,0,0,0.1);
                        page-break-after: always;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 3px solid #2563eb;
                        padding-bottom: 15px;
                        margin-bottom: 20px;
                    }
                    .logo {
                        width: 80px;
                        height: auto;
                        margin: 0 auto 10px;
                    }
                    .header h1 {
                        font-size: 18px;
                        color: #1e40af;
                        margin-bottom: 5px;
                    }
                    .header p {
                        font-size: 11px;
                        color: #666;
                        margin: 3px 0;
                    }
                    .section {
                        margin-bottom: 20px;
                    }
                    .section-title {
                        background: #2563eb;
                        color: white;
                        padding: 8px 12px;
                        font-size: 13px;
                        font-weight: bold;
                        margin-bottom: 10px;
                        border-radius: 3px;
                    }
                    .content {
                        padding: 0 10px;
                        font-size: 11px;
                    }
                    .field-row {
                        display: flex;
                        margin-bottom: 8px;
                        gap: 20px;
                    }
                    .field {
                        flex: 1;
                    }
                    .field-label {
                        font-weight: bold;
                        color: #2563eb;
                        font-size: 10px;
                        text-transform: uppercase;
                    }
                    .field-value {
                        color: #333;
                        margin-top: 3px;
                        word-break: break-word;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 10px 0;
                        font-size: 10px;
                    }
                    table th {
                        background: #e0e7ff;
                        border: 1px solid #c7d2fe;
                        padding: 6px;
                        text-align: left;
                        font-weight: bold;
                        color: #1e40af;
                    }
                    table td {
                        border: 1px solid #e5e7eb;
                        padding: 6px;
                    }
                    table tr:nth-child(even) {
                        background: #f9fafb;
                    }
                    .summary-box {
                        background: #f0f4ff;
                        border-left: 4px solid #2563eb;
                        padding: 10px;
                        margin: 10px 0;
                        font-size: 11px;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 30px;
                        font-size: 9px;
                        color: #999;
                        border-top: 1px solid #ddd;
                        padding-top: 10px;
                    }
                    @media print {
                        body {
                            background: white;
                        }
                        .page {
                            margin: 0;
                            box-shadow: none;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="page">
                    <div class="header">
                        <img src="/assets/images/bsj-logo.png" alt="BSJ Logo" class="logo" onerror="this.style.display='none'" />
                        <h1>Bureau of Standards Jamaica</h1>
                        <p>Procurement Evaluation Report - ${evaluation.rfqTitle}</p>
                        <p style="margin-top: 8px; border-top: 1px solid #ddd; padding-top: 8px;">
                            <strong>Report #:</strong> ${evaluation.evalNumber} | 
                            <strong>RFQ #:</strong> ${evaluation.rfqNumber}
                        </p>
                    </div>

                    <!-- Section A: Procurement Information -->
                    <div class="section">
                        <div class="section-title">Section A: Procurement Information</div>
                        <div class="content">
                            <div class="field-row">
                                <div class="field">
                                    <div class="field-label">RFQ Title</div>
                                    <div class="field-value">${evaluation.rfqTitle}</div>
                                </div>
                                <div class="field">
                                    <div class="field-label">Evaluation #</div>
                                    <div class="field-value">${evaluation.evalNumber}</div>
                                </div>
                            </div>
                            ${
                                evaluation.sectionA
                                    ? `
                            <div class="field-row">
                                <div class="field">
                                    <div class="field-label">Procurement Method</div>
                                    <div class="field-value">${evaluation.sectionA.procurementMethod || 'N/A'}</div>
                                </div>
                                <div class="field">
                                    <div class="field-label">Contract Type</div>
                                    <div class="field-value">${evaluation.sectionA.contractType || 'N/A'}</div>
                                </div>
                            </div>
                            <div class="field-row">
                                <div class="field">
                                    <div class="field-label">Comparable Estimate</div>
                                    <div class="field-value">$${evaluation.sectionA.comparableEstimate?.toLocaleString() || '0'}</div>
                                </div>
                                <div class="field">
                                    <div class="field-label">Number of Bids Received</div>
                                    <div class="field-value">${evaluation.sectionA.numberOfBidsReceived || '0'}</div>
                                </div>
                            </div>
                            `
                                    : '<p style="color: #999;">Section A data not yet entered</p>'
                            }
                        </div>
                    </div>

                    <!-- Section B: Bidder Evaluation -->
                    ${
                        evaluation.sectionB && evaluation.sectionB.bidders && evaluation.sectionB.bidders.length > 0
                            ? `
                    <div class="section">
                        <div class="section-title">Section B: Bidder Evaluation</div>
                        <div class="content">
                            ${evaluation.sectionB.bidders
                                .map(
                                    (bidder: any, idx: number) => `
                                <h4 style="margin: 12px 0 8px; color: #2563eb; font-size: 11px;"><strong>Bidder ${idx + 1}: ${bidder.bidderName || 'N/A'}</strong></h4>
                                
                                ${
                                    bidder.eligibilityRequirements && bidder.eligibilityRequirements.rows && bidder.eligibilityRequirements.rows.length > 0
                                        ? `
                                    <h5 style="font-size: 10px; margin: 8px 0 4px; color: #1e40af;">Eligibility Requirements</h5>
                                    <table>
                                        <thead>
                                            <tr>
                                                ${bidder.eligibilityRequirements.columns.map((col: any) => `<th>${col.name}</th>`).join('')}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${bidder.eligibilityRequirements.rows
                                                .map(
                                                    (row: any) => `
                                                <tr>
                                                    ${bidder.eligibilityRequirements.columns
                                                        .map(
                                                            (col: any) => `
                                                        <td>${row.data[col.id] || '-'}</td>
                                                    `
                                                        )
                                                        .join('')}
                                                </tr>
                                            `
                                                )
                                                .join('')}
                                        </tbody>
                                    </table>
                                `
                                        : ''
                                }
                                
                                ${
                                    bidder.complianceMatrix && bidder.complianceMatrix.rows && bidder.complianceMatrix.rows.length > 0
                                        ? `
                                    <h5 style="font-size: 10px; margin: 8px 0 4px; color: #1e40af;">Compliance Matrix</h5>
                                    <table>
                                        <thead>
                                            <tr>
                                                ${bidder.complianceMatrix.columns.map((col: any) => `<th>${col.name}</th>`).join('')}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${bidder.complianceMatrix.rows
                                                .map(
                                                    (row: any) => `
                                                <tr>
                                                    ${bidder.complianceMatrix.columns
                                                        .map(
                                                            (col: any) => `
                                                        <td>${row.data[col.id] || '-'}</td>
                                                    `
                                                        )
                                                        .join('')}
                                                </tr>
                                            `
                                                )
                                                .join('')}
                                        </tbody>
                                    </table>
                                `
                                        : ''
                                }
                                
                                ${
                                    bidder.technicalEvaluation && bidder.technicalEvaluation.rows && bidder.technicalEvaluation.rows.length > 0
                                        ? `
                                    <h5 style="font-size: 10px; margin: 8px 0 4px; color: #1e40af;">Technical Evaluation</h5>
                                    <table>
                                        <thead>
                                            <tr>
                                                ${bidder.technicalEvaluation.columns.map((col: any) => `<th>${col.name}</th>`).join('')}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${bidder.technicalEvaluation.rows
                                                .map(
                                                    (row: any) => `
                                                <tr>
                                                    ${bidder.technicalEvaluation.columns
                                                        .map(
                                                            (col: any) => `
                                                        <td>${row.data[col.id] || '-'}</td>
                                                    `
                                                        )
                                                        .join('')}
                                                </tr>
                                            `
                                                )
                                                .join('')}
                                        </tbody>
                                    </table>
                                `
                                        : ''
                                }
                            `
                                )
                                .join('')}
                        </div>
                    </div>
                    `
                            : ''
                    }

                    <!-- Section C: Evaluation Comments (supports multiple evaluators) -->
                    ${
                        Array.isArray(evaluation.sectionC)
                            ? evaluation.sectionC
                                  .map(
                                      (entry: any, idx: number) => `
                    <div class="section">
                        <div class="section-title">Section C: Evaluation Comments ${entry?.userName ? `– ${entry.userName}` : `#${idx + 1}`}</div>
                        <div class="content">
                            ${
                                entry?.data?.criticalIssues
                                    ? `
                            <div class="field">
                                <div class="field-label">Comments/Critical Issues Examined</div>
                                <div class="field-value" style="white-space: pre-wrap;">${entry.data.criticalIssues}</div>
                            </div>
                            `
                                    : ''
                            }
                            ${
                                entry?.data?.actionTaken
                                    ? `
                            <div class="field">
                                <div class="field-label">Action Taken</div>
                                <div class="field-value">${entry.data.actionTaken}</div>
                            </div>
                            `
                                    : ''
                            }
                            ${
                                entry?.data?.rejectionReason
                                    ? `
                            <div class="field">
                                <div class="field-label">Rejection/Deferral Reason</div>
                                <div class="field-value" style="white-space: pre-wrap;">${entry.data.rejectionReason}</div>
                            </div>
                            `
                                    : ''
                            }
                            ${
                                entry?.data?.recommendedSupplier
                                    ? `
                            <div class="field">
                                <div class="field-label">Recommended Contractor/Supplier</div>
                                <div class="field-value">${entry.data.recommendedSupplier}</div>
                            </div>
                            `
                                    : ''
                            }
                            ${
                                entry?.data?.recommendedAmountInclusiveGCT
                                    ? `
                            <div class="field">
                                <div class="field-label">Recommended Contract Amount (inclusive of GCT)</div>
                                <div class="field-value">$${parseFloat(entry.data.recommendedAmountInclusiveGCT).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </div>
                            `
                                    : ''
                            }
                            ${
                                entry?.data?.evaluatorName
                                    ? `
                            <div class="field">
                                <div class="field-label">Evaluator's Name</div>
                                <div class="field-value">${entry.data.evaluatorName}</div>
                            </div>
                            `
                                    : ''
                            }
                            ${
                                entry?.data?.evaluatorTitle
                                    ? `
                            <div class="field">
                                <div class="field-label">Job Title</div>
                                <div class="field-value">${entry.data.evaluatorTitle}</div>
                            </div>
                            `
                                    : ''
                            }
                            ${
                                entry?.data?.evaluatorSignature
                                    ? `
                            <div class="field">
                                <div class="field-label">Signature</div>
                                <div class="field-value">${entry.data.evaluatorSignature}</div>
                            </div>
                            `
                                    : ''
                            }
                            ${
                                entry?.data?.evaluationDate
                                    ? `
                            <div class="field">
                                <div class="field-label">Date</div>
                                <div class="field-value">${formatDateSafe(entry.data.evaluationDate)}</div>
                            </div>
                            `
                                    : ''
                            }
                        </div>
                    </div>
                    `
                                  )
                                  .join('')
                            : evaluation.sectionC
                            ? `
                    <div class="section">
                        <div class="section-title">Section C: Evaluation Comments</div>
                        <div class="content">
                            ${
                                evaluation.sectionC.criticalIssues
                                    ? `
                            <div class="field">
                                <div class="field-label">Comments/Critical Issues Examined</div>
                                <div class="field-value" style="white-space: pre-wrap;">${evaluation.sectionC.criticalIssues}</div>
                            </div>
                            `
                                    : ''
                            }
                            ${
                                evaluation.sectionC.actionTaken
                                    ? `
                            <div class="field">
                                <div class="field-label">Action Taken</div>
                                <div class="field-value">${evaluation.sectionC.actionTaken}</div>
                            </div>
                            `
                                    : ''
                            }
                            ${
                                evaluation.sectionC.rejectionReason
                                    ? `
                            <div class="field">
                                <div class="field-label">Rejection/Deferral Reason</div>
                                <div class="field-value" style="white-space: pre-wrap;">${evaluation.sectionC.rejectionReason}</div>
                            </div>
                            `
                                    : ''
                            }
                            ${
                                evaluation.sectionC.recommendedSupplier
                                    ? `
                            <div class="field">
                                <div class="field-label">Recommended Contractor/Supplier</div>
                                <div class="field-value">${evaluation.sectionC.recommendedSupplier}</div>
                            </div>
                            `
                                    : ''
                            }
                            ${
                                evaluation.sectionC.recommendedAmountInclusiveGCT
                                    ? `
                            <div class="field">
                                <div class="field-label">Recommended Contract Amount (inclusive of GCT)</div>
                                <div class="field-value">$${parseFloat(evaluation.sectionC.recommendedAmountInclusiveGCT).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}</div>
                            </div>
                            `
                                    : ''
                            }
                            ${
                                evaluation.sectionC.evaluatorName
                                    ? `
                            <div class="field">
                                <div class="field-label">Evaluator's Name</div>
                                <div class="field-value">${evaluation.sectionC.evaluatorName}</div>
                            </div>
                            `
                                    : ''
                            }
                            ${
                                evaluation.sectionC.evaluatorTitle
                                    ? `
                            <div class="field">
                                <div class="field-label">Job Title</div>
                                <div class="field-value">${evaluation.sectionC.evaluatorTitle}</div>
                            </div>
                            `
                                    : ''
                            }
                            ${
                                evaluation.sectionC.evaluatorSignature
                                    ? `
                            <div class="field">
                                <div class="field-label">Signature</div>
                                <div class="field-value">${evaluation.sectionC.evaluatorSignature}</div>
                            </div>
                            `
                                    : ''
                            }
                            ${
                                evaluation.sectionC.evaluationDate
                                    ? `
                            <div class="field">
                                <div class="field-label">Date</div>
                                <div class="field-value">${formatDateSafe(evaluation.sectionC.evaluationDate)}</div>
                            </div>
                            `
                                    : ''
                            }
                        </div>
                    </div>
                    `
                            : ''
                    }

                    <!-- Section D: Summary -->
                    ${
                        evaluation.sectionD?.summary
                            ? `
                    <div class="section">
                        <div class="section-title">Section D: Evaluation Summary</div>
                        <div class="summary-box">
                            ${evaluation.sectionD.summary}
                        </div>
                    </div>
                    `
                            : ''
                    }

                    <!-- Section E: Final Recommendation -->
                    ${
                        evaluation.sectionE?.finalRecommendation
                            ? `
                    <div class="section">
                        <div class="section-title">Section E: Final Recommendation</div>
                        <div class="summary-box">
                            ${evaluation.sectionE.finalRecommendation}
                        </div>
                        ${
                            evaluation.sectionE.preparedBy
                                ? `
                        <div style="margin-top: 15px; text-align: right; font-size: 10px;">
                            <p><strong>Prepared By:</strong> ${evaluation.sectionE.preparedBy}</p>
                            ${evaluation.sectionE.approvalDate ? `<p><strong>Date:</strong> ${formatDateSafe(evaluation.sectionE.approvalDate)}</p>` : ''}
                        </div>
                        `
                                : ''
                        }
                    </div>
                    `
                            : ''
                    }

                    <div class="footer">
                        <p>This is an automatically generated evaluation report from the Procurement Management System (SPINX)</p>
                        <p>Generated on ${new Date().toLocaleString()}</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        reportWindow.document.write(html);
        reportWindow.document.close();

        // Auto-print after content loads
        reportWindow.onload = () => {
            reportWindow.print();
        };
    };

    const handleCompleteEvaluation = async () => {
        if (!evaluation) return;

        // Check if sections D and E are completed
        if (!evaluation.sectionD?.summary || !evaluation.sectionE?.finalRecommendation) {
            toast('Please complete Sections D and E before marking the evaluation as completed', 'warning');
            return;
        }

        const confirmResult = await Swal.fire({
            title: 'Mark evaluation as completed?',
            text: 'This will finalize the evaluation. You can still edit it later if needed.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, complete',
            cancelButtonText: 'Cancel',
        });

        if (!confirmResult.isConfirmed) return;

        try {
            await evaluationService.updateEvaluation(evaluation.id, { status: 'COMPLETED' });
            toast('Evaluation marked as completed', 'success');
            await loadEvaluation();
        } catch (err: any) {
            toast(err.message || 'Failed to complete evaluation', 'error');
        }
    };

    return (
        <div className="evaluation-print-root">
            {/* Page Header with Linked Request Info */}
            {evaluation && (
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold">Evaluation Details</h2>
                        <p className="text-white-dark">
                            {evaluation.evalNumber} • {evaluation.rfqNumber} • {evaluation.rfqTitle}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {(evaluation.requestId || evaluation.combinedRequestId) && (
                            <button
                                onClick={() => {
                                    if (evaluation.requestId) {
                                        navigate(`/apps/requests/edit/${evaluation.requestId}`);
                                    } else if (evaluation.combinedRequestId) {
                                        Swal.fire({
                                            icon: 'info',
                                            title: 'Combined Request',
                                            text: `This evaluation is linked to Combined Request #${evaluation.combinedRequestId}`,
                                            customClass: { popup: 'sweet-alerts' },
                                        });
                                    }
                                }}
                                className="btn btn-success gap-2"
                            >
                                <IconTxtFile />
                                View Request
                            </button>
                        )}
                        <Link to="/procurement/evaluation" className="btn btn-outline-info gap-2">
                            <IconArrowLeft />
                            Back to List
                        </Link>
                    </div>
                </div>
            )}

            {/* Procurement Officer: Show completed assignments */}
            {isProcurement && currentAssignments.length > 0 && (
                <div className="panel mb-4 no-print">
                    <h6 className="font-semibold mb-3">Assignment Status</h6>
                    <div className="space-y-2">
                        {currentAssignments.map((assignment: any) => {
                            const sections = Array.isArray(assignment.sections)
                                ? assignment.sections
                                : (() => {
                                      try {
                                          return JSON.parse(assignment.sections || '[]');
                                      } catch {
                                          return [];
                                      }
                                  })();
                            const isCompleted = assignment.status === 'SUBMITTED';
                            return (
                                <div key={assignment.id} className={`p-3 rounded border ${isCompleted ? 'bg-success-light border-success' : 'bg-warning-light border-warning'}`}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="font-semibold">{assignment.user?.name || assignment.user?.email || `User #${assignment.userId}`}</span>
                                            <span className="text-sm ml-2">(Sections: {sections.join(', ')})</span>
                                        </div>
                                        <span className={`badge ${isCompleted ? 'bg-success' : 'bg-warning'}`}>{isCompleted ? '✓ Completed' : 'In Progress'}</span>
                                    </div>
                                    {isCompleted && assignment.submittedAt && <div className="text-xs text-white-dark mt-1">Submitted: {new Date(assignment.submittedAt).toLocaleString()}</div>}
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-3 p-3 bg-info-light rounded border border-info">
                        <p className="text-sm text-info-dark">
                            <strong>Next Steps:</strong> Complete Sections A, D, and E to finalize the evaluation document.
                        </p>
                    </div>
                </div>
            )}

            {/* Procurement Officer: Assign evaluators (including Section C delegation) */}
            {isProcurement && evaluation && (
                <div className="panel mb-4 no-print">
                    <h6 className="font-semibold mb-3">Assign Evaluator</h6>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block mb-1 text-sm">User Email or ID</label>
                            <input type="text" className="form-input" placeholder="Enter user email or numeric ID" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)} />
                            <p className="text-xs text-gray-500 mt-1">Tip: Officers can delegate Section C to any staff here.</p>
                        </div>
                        <div>
                            <label className="block mb-1 text-sm">Sections</label>
                            <div className="flex gap-2 flex-wrap">
                                {(['A', 'B', 'C', 'D', 'E'] as const).map((sec) => (
                                    <label key={sec} className="flex items-center gap-1">
                                        <input
                                            type="checkbox"
                                            className="form-checkbox"
                                            checked={selectedAssignSections.includes(sec)}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedAssignSections([...selectedAssignSections, sec]);
                                                else setSelectedAssignSections(selectedAssignSections.filter((s) => s !== sec));
                                            }}
                                        />
                                        <span className="text-sm">{sec}</span>
                                    </label>
                                ))}
                            </div>
                            <p className="text-xs text-white-dark mt-1">Common: select B and C for technical + comments.</p>
                        </div>
                        <div className="flex items-end">
                            <button
                                className="btn btn-primary w-full"
                                onClick={async () => {
                                    if (!selectedUserId || selectedAssignSections.length === 0) {
                                        alert('Enter a user and select at least one section');
                                        return;
                                    }
                                    try {
                                        const n = parseInt(selectedUserId);
                                        const isNum = !isNaN(n);
                                        await evaluationService.assignEvaluators(evaluation.id, {
                                            userIds: isNum ? [n] : undefined,
                                            userEmails: !isNum ? [selectedUserId.trim()] : undefined,
                                            sections: selectedAssignSections as Array<'A' | 'B' | 'C' | 'D' | 'E'>,
                                        });
                                        const updated = await evaluationService.getAllAssignments(evaluation.id);
                                        setCurrentAssignments(updated || []);
                                        setSelectedUserId('');
                                        setSelectedAssignSections([]);
                                        alert('Evaluator assigned successfully');
                                        // Trigger refresh of editable sections
                                        setAssignmentsRefreshKey((prev) => prev + 1);
                                    } catch (err: any) {
                                        alert(err?.message || 'Failed to assign evaluator');
                                    }
                                }}
                            >
                                Assign
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Evaluator Complete Assignment Button */}
            {!isProcurement && !isCommittee && myAssignment && myAssignment.status !== 'SUBMITTED' && evaluation && (
                <div className="panel mb-4 bg-success-light border-2 border-success no-print">
                    <div className="flex items-center justify-between">
                        <div>
                            <h6 className="font-semibold text-success mb-1">Your Evaluation Assignment</h6>
                            <p className="text-sm text-white-dark">
                                You are assigned to complete:{' '}
                                <span className="font-semibold">{Array.isArray(myAssignment.sections) ? myAssignment.sections.join(', ') : JSON.parse(myAssignment.sections || '[]').join(', ')}</span>
                            </p>
                        </div>
                        <button type="button" className="btn btn-success gap-2" onClick={handleCompleteAssignment} disabled={completingAssignment}>
                            {completingAssignment ? (
                                <>
                                    <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-4 h-4 inline-block"></span>
                                    Completing...
                                </>
                            ) : (
                                <>
                                    <IconChecks />
                                    Mark Complete & Return to Procurement
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Structure Editing - Procurement Only */}
            {isProcurement && (
                <div className="panel mb-4 p-4 flex items-center justify-between no-print">
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2">
                            <input type="checkbox" className="form-checkbox" checked={structureEditEnabled} onChange={() => setStructureEditEnabled((v) => !v)} />
                            <span className="text-sm">Enable structure editing for Section B</span>
                        </label>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="text" className="form-input w-64" placeholder="Return notes for evaluators" value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} />
                        <button
                            className="btn btn-outline-danger"
                            onClick={async () => {
                                if (!evaluation) return;
                                // First, save any pending Section B structural changes
                                if (pendingSectionB) {
                                    await evaluationService.updateSection(evaluation.id, 'B', pendingSectionB);
                                }
                                // Then return the section with notes
                                const updated = await evaluationService.returnSection(evaluation.id, 'B', returnNotes || 'Table structure has been updated. Please review the changes.');
                                setEvaluation(updated);
                                setReturnNotes('');
                                setStructureEditEnabled(false);
                                setPendingSectionB(null);
                            }}
                        >
                            Return Section B
                        </button>
                    </div>
                </div>
            )}

            {/* Print/Export Button for Procurement */}
            {isProcurement && evaluation && (
                <div className="panel mb-4 bg-gradient-to-r from-primary/10 to-info/10 border-2 border-primary no-print">
                    <div className="flex items-center justify-between">
                        <div>
                            <h6 className="font-semibold text-primary mb-1">Ready to Print?</h6>
                            <p className="text-sm text-white-dark">Print the complete evaluation document with all sections consolidated.</p>
                        </div>
                        <div className="flex gap-2">
                            <button type="button" className="btn btn-primary gap-2" onClick={handlePrintEvaluation}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M6 9V2H18V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    <path
                                        d="M6 18H4C3.46957 18 2.96086 17.7893 2.58579 17.4142C2.21071 17.0391 2 16.5304 2 16V11C2 10.4696 2.21071 9.96086 2.58579 9.58579C2.96086 9.21071 3.46957 9 4 9H20C20.5304 9 21.0391 9.21071 21.4142 9.58579C21.7893 9.96086 22 10.4696 22 11V16C22 16.5304 21.7893 17.0391 21.4142 17.4142C21.0391 17.7893 20.5304 18 20 18H18"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <path d="M18 14H6V22H18V14Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Print/Export Evaluation
                            </button>
                            <button type="button" className="btn btn-info gap-2" onClick={handlePrintFormattedReport}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path
                                        d="M9 12H15M9 16H15M17 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V5C19 3.89543 18.1046 3 17 3Z"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                                Formatted Report
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Procurement Officer: Complete Evaluation */}
            {isProcurement && evaluation && canEditSections.includes('D') && canEditSections.includes('E') && evaluation.status !== 'COMPLETED' && (
                <div className="panel mb-4 bg-gradient-to-r from-success/10 to-primary/10 border-2 border-success no-print">
                    <div className="flex items-center justify-between">
                        <div>
                            <h6 className="font-semibold text-success mb-1">Finalize Evaluation</h6>
                            <p className="text-sm text-white-dark">Mark this evaluation as completed after reviewing all sections and finalizing D & E.</p>
                        </div>
                        <button type="button" className="btn btn-success gap-2" onClick={handleCompleteEvaluation}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            Complete Evaluation
                        </button>
                    </div>
                </div>
            )}

            {/* Full Form UI with gated editability */}
            <EvaluationForm
                mode="edit"
                evaluation={evaluation}
                canEditSections={canEditSections as Array<'A' | 'B' | 'C' | 'D' | 'E'>}
                structureEditableSections={structureEditEnabled ? (['B'] as Array<'A' | 'B' | 'C' | 'D' | 'E'>) : ([] as Array<'A' | 'B' | 'C' | 'D' | 'E'>)}
                onSectionChange={(sec, data) => {
                    if (sec === 'B') {
                        setPendingSectionB(data);
                    }
                }}
                onSaveSection={async (sec, data) => {
                    if (!evaluation) return;
                    if (sec === 'Background') {
                        const updated = await evaluationService.updateEvaluation(evaluation.id, {
                            description: data?.description ?? evaluation.description,
                            dateSubmissionConsidered: data?.dateSubmissionConsidered ?? null,
                            reportCompletionDate: data?.reportCompletionDate ?? null,
                        });
                        setEvaluation(updated);
                        return;
                    }
                    const updated = await evaluationService.updateSection(evaluation.id, sec, data);
                    setEvaluation(updated);
                }}
                onSubmitSection={async (sec) => {
                    if (!evaluation) return;
                    const updated = await evaluationService.submitSection(evaluation.id, sec);
                    setEvaluation(updated);
                }}
                onVerifySection={async (sec, notes) => {
                    if (!evaluation) return;
                    const updated = await evaluationService.verifySection(evaluation.id, sec, notes);
                    setEvaluation(updated);
                }}
                onReturnSection={async (sec, notes) => {
                    if (!evaluation) return;
                    const updated = await evaluationService.returnSection(evaluation.id, sec, notes);
                    setEvaluation(updated);
                }}
            />
        </div>
    );
};

export default EvaluationDetail;
