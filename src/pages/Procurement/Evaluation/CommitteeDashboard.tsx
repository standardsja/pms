import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconClipboardText from '../../../components/Icon/IconClipboardText';
import IconEye from '../../../components/Icon/IconEye';
import IconChecks from '../../../components/Icon/IconChecks';
import IconX from '../../../components/Icon/IconX';
import IconClock from '../../../components/Icon/IconClock';
import { useTranslation } from 'react-i18next';
import { evaluationService, type Evaluation, type SectionVerificationStatus } from '../../../services/evaluationService';
import { getUser } from '../../../utils/auth';

type SectionId = 'A' | 'B' | 'C' | 'D' | 'E';

interface SectionTask {
    evaluationId: number;
    evalNumber: string;
    rfqNumber: string;
    rfqTitle: string;
    section: SectionId;
    status: SectionVerificationStatus;
    submittedAt?: string;
    creator: string;
    dueDate?: string;
}

const CommitteeDashboard = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'VERIFIED' | 'RETURNED'>('SUBMITTED');

    useEffect(() => {
        dispatch(setPageTitle('Evaluation Committee Dashboard'));
    }, [dispatch]);

    // Role guard
    useEffect(() => {
        const u = getUser();
        if (!u) {
            navigate('/procurement/evaluation');
            return;
        }
        const roles = (u?.roles || (u?.role ? [u.role] : [])).map((r) => r.toUpperCase());
        const isCommittee = roles.some((role) => role.includes('COMMITTEE') || role.includes('EVALUATION_COMMITTEE'));
        if (!isCommittee) {
            navigate('/evaluation/committee/dashboard');
        }
    }, [navigate]);

    useEffect(() => {
        loadEvaluations();
    }, []);

    const loadEvaluations = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await evaluationService.getEvaluations();
            setEvaluations(data);
        } catch (err: any) {
            console.error('Failed to load evaluations:', err);
            setError(err.message || 'Failed to load evaluations');
        } finally {
            setLoading(false);
        }
    };

    // Extract all section tasks from evaluations
    const allSectionTasks = useMemo(() => {
        const tasks: SectionTask[] = [];
        const sections: SectionId[] = ['A', 'B', 'C', 'D', 'E'];

        for (const evaluation of evaluations) {
            for (const section of sections) {
                const status = evaluation[`section${section}Status` as keyof Evaluation] as SectionVerificationStatus;
                const verifiedAt = evaluation[`section${section}VerifiedAt` as keyof Evaluation] as string | undefined;

                // Only show sections that have some activity or are submitted
                if (status && status !== 'NOT_STARTED') {
                    tasks.push({
                        evaluationId: evaluation.id,
                        evalNumber: evaluation.evalNumber,
                        rfqNumber: evaluation.rfqNumber,
                        rfqTitle: evaluation.rfqTitle,
                        section,
                        status,
                        submittedAt: verifiedAt,
                        creator: evaluation.creator.name || evaluation.evaluator || '-',
                        dueDate: evaluation.dueDate,
                    });
                }
            }
        }

        return tasks;
    }, [evaluations]);

    // Filter tasks based on status
    const filteredTasks = useMemo(() => {
        if (statusFilter === 'ALL') return allSectionTasks;
        return allSectionTasks.filter((task) => task.status === statusFilter);
    }, [allSectionTasks, statusFilter]);

    // Statistics
    const stats = useMemo(() => {
        const base = {
            totalPending: 0,
            submitted: 0,
            verified: 0,
            returned: 0,
        };

        for (const task of allSectionTasks) {
            if (task.status === 'SUBMITTED') {
                base.submitted++;
                base.totalPending++;
            } else if (task.status === 'VERIFIED') {
                base.verified++;
            } else if (task.status === 'RETURNED') {
                base.returned++;
                base.totalPending++;
            }
        }

        return base;
    }, [allSectionTasks]);

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
                return status;
        }
    };

    const getSectionTitle = (section: SectionId) => {
        const titles = {
            A: 'Procurement Details',
            B: 'Eligibility & Compliance',
            C: 'Evaluator Comments',
            D: 'Summary',
            E: 'Officer Recommendation',
        };
        return titles[section];
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    };

    const handleReviewSection = (evaluationId: number) => {
        navigate(`/evaluation/${evaluationId}/committee`);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading committee dashboard...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="panel">
                <div className="text-center py-8">
                    <div className="text-danger mb-4">⚠️ {error}</div>
                    <button onClick={loadEvaluations} className="btn btn-primary">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Evaluation Committee Dashboard</h2>
                    <p className="text-white-dark">Review and verify evaluation sections submitted for committee approval</p>
                </div>
            </div>

            {/* Stats */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Pending Review</div>
                        <IconClock className="h-6 w-6 text-warning" />
                    </div>
                    <div className="text-3xl font-bold text-warning">{stats.totalPending}</div>
                    <div className="mt-2 text-xs text-white-dark">Sections awaiting action</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Submitted</div>
                        <IconClipboardText className="h-6 w-6 text-info" />
                    </div>
                    <div className="text-3xl font-bold text-info">{stats.submitted}</div>
                    <div className="mt-2 text-xs text-white-dark">Ready for verification</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Verified</div>
                        <IconChecks className="h-6 w-6 text-success" />
                    </div>
                    <div className="text-3xl font-bold text-success">{stats.verified}</div>
                    <div className="mt-2 text-xs text-white-dark">Approved sections</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Returned</div>
                        <IconX className="h-6 w-6 text-danger" />
                    </div>
                    <div className="text-3xl font-bold text-danger">{stats.returned}</div>
                    <div className="mt-2 text-xs text-white-dark">Needs revision</div>
                </div>
            </div>

            {/* Section Tasks Table */}
            <div className="panel">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                    <h5 className="text-lg font-semibold">Section Review Queue</h5>
                    <div className="flex gap-2">
                        <button onClick={() => setStatusFilter('SUBMITTED')} className={`btn btn-sm ${statusFilter === 'SUBMITTED' ? 'btn-info' : 'btn-outline-info'}`}>
                            Submitted ({stats.submitted})
                        </button>
                        <button onClick={() => setStatusFilter('RETURNED')} className={`btn btn-sm ${statusFilter === 'RETURNED' ? 'btn-danger' : 'btn-outline-danger'}`}>
                            Returned ({stats.returned})
                        </button>
                        <button onClick={() => setStatusFilter('VERIFIED')} className={`btn btn-sm ${statusFilter === 'VERIFIED' ? 'btn-success' : 'btn-outline-success'}`}>
                            Verified ({stats.verified})
                        </button>
                        <button onClick={() => setStatusFilter('ALL')} className={`btn btn-sm ${statusFilter === 'ALL' ? 'btn-secondary' : 'btn-outline-secondary'}`}>
                            All ({allSectionTasks.length})
                        </button>
                    </div>
                </div>

                {filteredTasks.length === 0 ? (
                    <div className="text-center py-8 text-white-dark">
                        {statusFilter === 'SUBMITTED' ? (
                            <>
                                <IconChecks className="h-16 w-16 mx-auto mb-4 text-success opacity-50" />
                                <p className="text-lg font-semibold mb-2">No sections awaiting review</p>
                                <p>All submitted sections have been processed.</p>
                            </>
                        ) : (
                            <p>No sections found with status: {statusFilter}</p>
                        )}
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="table-hover">
                            <thead>
                                <tr>
                                    <th>Evaluation</th>
                                    <th>RFQ</th>
                                    <th>Section</th>
                                    <th>Creator</th>
                                    <th>Status</th>
                                    <th>Due Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTasks.map((task, index) => (
                                    <tr key={`${task.evaluationId}-${task.section}-${index}`}>
                                        <td>
                                            <button
                                                onClick={() => handleReviewSection(task.evaluationId)}
                                                className="font-semibold text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer"
                                            >
                                                {task.evalNumber}
                                            </button>
                                        </td>
                                        <td>
                                            <span className="text-info">{task.rfqNumber}</span>
                                            <div className="text-xs text-white-dark truncate max-w-xs">{task.rfqTitle}</div>
                                        </td>
                                        <td>
                                            <div className="font-semibold">Section {task.section}</div>
                                            <div className="text-xs text-white-dark">{getSectionTitle(task.section)}</div>
                                        </td>
                                        <td>{task.creator}</td>
                                        <td>
                                            <span className={getStatusBadge(task.status)}>{getStatusText(task.status)}</span>
                                        </td>
                                        <td>{formatDate(task.dueDate)}</td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleReviewSection(task.evaluationId)} className="btn btn-sm btn-primary" title="Review & Verify">
                                                    <IconEye className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Help Section */}
            <div className="mt-6 panel bg-info/5 border-2 border-info">
                <div className="flex items-start gap-3">
                    <IconClipboardText className="h-6 w-6 text-info flex-shrink-0 mt-1" />
                    <div>
                        <h6 className="font-semibold text-info mb-2">Committee Workflow Guide</h6>
                        <ul className="space-y-1 text-sm text-white-dark">
                            <li>
                                • <strong>Submitted:</strong> Sections ready for your review and verification
                            </li>
                            <li>
                                • <strong>Verify:</strong> Approve the section to unlock the next section for the creator
                            </li>
                            <li>
                                • <strong>Return:</strong> Send back with notes if changes are needed
                            </li>
                            <li>
                                • <strong>Sequential:</strong> Each section must be verified before the next can be submitted
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommitteeDashboard;
