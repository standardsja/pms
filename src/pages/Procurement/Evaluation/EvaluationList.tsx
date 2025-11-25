import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconClipboardText from '../../../components/Icon/IconClipboardText';
import IconPlus from '../../../components/Icon/IconPlus';
import IconEye from '../../../components/Icon/IconEye';
import IconFile from '../../../components/Icon/IconFile';
import IconUsersGroup from '../../../components/Icon/IconUsersGroup';
import IconEdit from '../../../components/Icon/IconEdit';
import { useTranslation } from 'react-i18next';
import { evaluationService, type Evaluation, type EvaluationStatus } from '../../../services/evaluationService';
import { getUser } from '../../../utils/auth';

type DisplayStatus = 'Pending' | 'In Progress' | 'Committee Review' | 'Completed' | 'Validated' | 'Rejected';

const statusMap: Record<EvaluationStatus, DisplayStatus> = {
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    COMMITTEE_REVIEW: 'Committee Review',
    COMPLETED: 'Completed',
    VALIDATED: 'Validated',
    REJECTED: 'Rejected',
};

const EvaluationList = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<DisplayStatus | 'ALL'>('ALL');
    const [dueBefore, setDueBefore] = useState<string>('');
    const [dueAfter, setDueAfter] = useState<string>('');
    const [isCommittee, setIsCommittee] = useState(false);
    const [isProcurement, setIsProcurement] = useState(false);

    useEffect(() => {
        dispatch(setPageTitle(t('evaluation.pageTitle', 'BSJ Evaluation Reports')));
    }, [dispatch, t]);

    // Check user role
    useEffect(() => {
        const u = getUser();
        if (u) {
            const roles = (u?.roles || (u?.role ? [u.role] : [])).map((r) => r.toUpperCase());
            const hasCommitteeRole = roles.some((role) => role.includes('COMMITTEE') || role.includes('EVALUATION_COMMITTEE'));
            const hasProcurementRole = roles.some((role) => role.includes('PROCUREMENT_OFFICER') || role.includes('PROCUREMENT_MANAGER') || role.includes('PROCUREMENT'));
            setIsCommittee(hasCommitteeRole);
            setIsProcurement(hasProcurementRole);
        }
    }, []);

    // Fetch evaluations from backend
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

    const filteredEvaluations = useMemo(() => {
        return evaluations.filter((e) => {
            const displayStatus = statusMap[e.status];
            if (statusFilter !== 'ALL' && displayStatus !== statusFilter) return false;
            if (search) {
                const haystack = `${e.evalNumber} ${e.rfqNumber} ${e.rfqTitle} ${e.evaluator || ''} ${e.description || ''}`.toLowerCase();
                if (!haystack.includes(search.toLowerCase())) return false;
            }
            if (dueBefore && e.dueDate && new Date(e.dueDate) > new Date(dueBefore)) return false;
            if (dueAfter && e.dueDate && new Date(e.dueDate) < new Date(dueAfter)) return false;
            return true;
        });
    }, [evaluations, search, statusFilter, dueBefore, dueAfter]);

    const stats = useMemo(() => {
        const base = { total: evaluations.length, pending: 0, inProgress: 0, committeeReview: 0, completed: 0, validated: 0, rejected: 0 };
        for (const e of evaluations) {
            if (e.status === 'PENDING') base.pending++;
            else if (e.status === 'IN_PROGRESS') base.inProgress++;
            else if (e.status === 'COMMITTEE_REVIEW') base.committeeReview++;
            else if (e.status === 'COMPLETED') base.completed++;
            else if (e.status === 'VALIDATED') base.validated++;
            else if (e.status === 'REJECTED') base.rejected++;
        }
        return base;
    }, [evaluations]);

    const hasNewSubmissions = (e: Evaluation) => {
        if (!e) return false;
        try {
            return e.sectionAStatus === 'SUBMITTED' || e.sectionBStatus === 'SUBMITTED' || e.sectionCStatus === 'SUBMITTED' || e.sectionDStatus === 'SUBMITTED' || e.sectionEStatus === 'SUBMITTED';
        } catch {
            return false;
        }
    };

    const hasReturnedSections = (e: Evaluation) => {
        if (!e) return false;
        try {
            return e.sectionAStatus === 'RETURNED' || e.sectionBStatus === 'RETURNED' || e.sectionCStatus === 'RETURNED' || e.sectionDStatus === 'RETURNED' || e.sectionEStatus === 'RETURNED';
        } catch {
            return false;
        }
    };

    const handleViewDetails = (evaluationId: number) => {
        navigate(`/procurement/evaluation/${evaluationId}`);
    };

    const getStatusBadge = (status: EvaluationStatus) => {
        switch (status) {
            case 'COMPLETED':
                return 'bg-success';
            case 'VALIDATED':
                return 'bg-primary';
            case 'COMMITTEE_REVIEW':
                return 'bg-success';
            case 'IN_PROGRESS':
                return 'bg-warning';
            case 'PENDING':
                return 'bg-info';
            case 'REJECTED':
                return 'bg-danger';
            default:
                return 'bg-secondary';
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-lg">Loading evaluations...</div>
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
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">{t('evaluation.heading', 'BSJ Evaluation Reports')}</h2>
                    <p className="text-white-dark">{t('evaluation.subheading', 'Create and manage BSJ procurement evaluation reports with committee workflow')}</p>
                </div>
                <div className="flex gap-2">
                    {isCommittee && (
                        <Link to="/evaluation/committee/dashboard" className="btn btn-info gap-2">
                            <IconUsersGroup />
                            Committee Dashboard
                        </Link>
                    )}
                    <Link to="/procurement/evaluation/new" className="btn btn-primary gap-2">
                        <IconPlus />
                        {t('evaluation.actions.new', 'Create BSJ Evaluation')}
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">{t('evaluation.stats.total', 'Total')}</div>
                        <IconClipboardText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl font-bold text-primary">{stats.total}</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">{t('evaluation.stats.pending', 'Pending')}</div>
                        <IconClipboardText className="h-6 w-6 text-info" />
                    </div>
                    <div className="text-3xl font-bold text-info">{stats.pending}</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">{t('evaluation.stats.inProgress', 'In Progress')}</div>
                        <IconClipboardText className="h-6 w-6 text-warning" />
                    </div>
                    <div className="text-3xl font-bold text-warning">{stats.inProgress}</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Committee Review</div>
                        <IconClipboardText className="h-6 w-6 text-warning" />
                    </div>
                    <div className="text-3xl font-bold text-warning">{stats.committeeReview}</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">{t('evaluation.stats.completed', 'Completed')}</div>
                        <IconClipboardText className="h-6 w-6 text-success" />
                    </div>
                    <div className="text-3xl font-bold text-success">{stats.completed}</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">{t('evaluation.stats.validated', 'Validated')}</div>
                        <IconClipboardText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl font-bold text-primary">{stats.validated}</div>
                </div>
            </div>

            {/* Evaluations Table */}
            <div className="panel">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                    <h5 className="text-lg font-semibold">{t('evaluation.table.title', 'All Evaluations')}</h5>
                    <div className="flex flex-wrap gap-2 items-center">
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('evaluation.table.search', 'Search evaluations...')} className="form-input w-44" />
                        <select className="form-select w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as DisplayStatus | 'ALL')}>
                            <option value="ALL">{t('evaluation.filters.all', 'All Statuses')}</option>
                            <option value="Pending">{t('evaluation.status.pending', 'Pending')}</option>
                            <option value="In Progress">{t('evaluation.status.inProgress', 'In Progress')}</option>
                            <option value="Committee Review">Committee Review</option>
                            <option value="Completed">{t('evaluation.status.completed', 'Completed')}</option>
                            <option value="Validated">{t('evaluation.status.validated', 'Validated')}</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                        <input type="date" className="form-input w-36" value={dueAfter} onChange={(e) => setDueAfter(e.target.value)} placeholder={t('evaluation.filters.dueAfter', 'Due After')} />
                        <input type="date" className="form-input w-36" value={dueBefore} onChange={(e) => setDueBefore(e.target.value)} placeholder={t('evaluation.filters.dueBefore', 'Due Before')} />
                    </div>
                </div>

                {filteredEvaluations.length === 0 ? (
                    <div className="text-center py-8 text-white-dark">No evaluations found. {evaluations.length === 0 && 'Create your first evaluation to get started.'}</div>
                ) : (
                    <div className="table-responsive">
                        <table className="table-hover">
                            <thead>
                                <tr>
                                    <th>{t('evaluation.col.evalNumber', 'Evaluation #')}</th>
                                    <th>{t('evaluation.col.rfqNumber', 'RFQ #')}</th>
                                    <th>{t('evaluation.col.description', 'Description')}</th>
                                    <th>{t('evaluation.col.evaluator', 'Evaluator')}</th>
                                    <th>{t('evaluation.col.dueDate', 'Due Date')}</th>
                                    <th>{t('evaluation.col.status', 'Status')}</th>
                                    <th>{t('evaluation.col.actions', 'Actions')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEvaluations.map((evaluation) => (
                                    <tr key={evaluation.id}>
                                        <td>
                                            <button onClick={() => handleViewDetails(evaluation.id)} className="font-semibold text-primary hover:underline bg-transparent border-0 p-0 cursor-pointer">
                                                {evaluation.evalNumber}
                                            </button>
                                        </td>
                                        <td>
                                            <span className="text-info">{evaluation.rfqNumber}</span>
                                        </td>
                                        <td>
                                            <div className="max-w-xs truncate" title={evaluation.rfqTitle}>
                                                {evaluation.rfqTitle}
                                            </div>
                                            {evaluation.description && <div className="text-xs text-white-dark truncate">{evaluation.description}</div>}
                                        </td>
                                        <td>{evaluation.evaluator || evaluation.creator.name || '-'}</td>
                                        <td>{formatDate(evaluation.dueDate)}</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <span className={`badge ${getStatusBadge(evaluation.status)}`}>{statusMap[evaluation.status]}</span>
                                                {isCommittee && hasNewSubmissions(evaluation) && <span className="badge bg-info">New</span>}
                                                {isProcurement && hasReturnedSections(evaluation) && <span className="badge bg-warning">Returned</span>}
                                                {isProcurement && evaluation.status === 'COMPLETED' && <span className="badge bg-success animate-pulse">✓ Verified</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleViewDetails(evaluation.id)}
                                                    className="btn btn-sm btn-outline-primary"
                                                    title={t('evaluation.actions.viewDetails', 'View Details')}
                                                >
                                                    <IconEye className="h-4 w-4" />
                                                </button>
                                                {/* Edit button for Procurement when sections are returned */}
                                                {isProcurement && hasReturnedSections(evaluation) && (
                                                    <Link to={`/procurement/evaluation/${evaluation.id}/edit`} className="btn btn-sm btn-outline-warning" title="Edit Returned Sections">
                                                        <IconEdit className="h-4 w-4" />
                                                    </Link>
                                                )}
                                                {isCommittee && (
                                                    <Link to={`/evaluation/${evaluation.id}/committee`} className="btn btn-sm btn-outline-info" title="Committee Verification">
                                                        <IconUsersGroup className="h-4 w-4" />
                                                    </Link>
                                                )}
                                                {(evaluation.status === 'COMPLETED' || evaluation.status === 'VALIDATED') && (
                                                    <button className="btn btn-sm btn-success" title={t('evaluation.actions.generateReport', 'Download Report')}>
                                                        <IconFile className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EvaluationList;
