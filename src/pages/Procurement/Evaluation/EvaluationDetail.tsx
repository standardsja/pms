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
                    border: 1px solid #ddd;
                    margin-bottom: 1rem;
                }
                /* Ensure tables fit on page */
                table {
                    font-size: 10pt;
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

                // Procurement officers can always edit sections A, D, and E (their sections)
                if (isProcurement) {
                    sections.add('A');
                    sections.add('D');
                    sections.add('E');
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
    }, [id, isProcurement]);

    // Load available users and all assignments for procurement
    useEffect(() => {
        const loadUsersAndAssignments = async () => {
            if (!isProcurement || !id) return;
            try {
                // Load all assignments for this evaluation
                const allAssignments = await evaluationService.getAllAssignments(parseInt(id));
                setCurrentAssignments(allAssignments || []);

                // Load available users (you may need to add this endpoint)
                // For now, we'll just show the assignment list
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
        } catch (err: any) {
            console.error('Failed to load evaluation:', err);
            setError(err.message || 'Failed to load evaluation');
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

        if (!confirm('Are you sure you want to mark your evaluation as complete? The procurement officer will be notified.')) {
            return;
        }

        try {
            setCompletingAssignment(true);
            await evaluationService.completeAssignment(evaluation.id);
            alert('Your evaluation has been marked as complete. The procurement officer has been notified.');
            // Reload to update assignment status
            loadEvaluation();
            // Reload assignment
            const assignments = await evaluationService.getMyAssignments();
            const forThisEval = assignments.filter((a: any) => String(a.evaluationId) === String(id));
            if (forThisEval.length > 0) {
                setMyAssignment(forThisEval[0]);
            }
        } catch (err: any) {
            alert(err.message || 'Failed to complete assignment');
        } finally {
            setCompletingAssignment(false);
        }
    };

    const handlePrintEvaluation = () => {
        window.print();
    };

    return (
        <div>
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
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Enter user email or numeric ID"
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                            />
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
