import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconClipboardText from '../../../components/Icon/IconClipboardText';
import IconPlus from '../../../components/Icon/IconPlus';
import IconEye from '../../../components/Icon/IconEye';
import IconFile from '../../../components/Icon/IconFile';
import IconChecks from '../../../components/Icon/IconChecks';
import IconUsersGroup from '../../../components/Icon/IconUsersGroup';
import IconEdit from '../../../components/Icon/IconEdit';
import IconSearch from '../../../components/Icon/IconSearch';
import IconX from '../../../components/Icon/IconX';
import IconRefresh from '../../../components/Icon/IconRefresh';
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
    const [isExecutive, setIsExecutive] = useState(false);

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
            const hasExecutiveRole = roles.some((role) => role.includes('EXECUTIVE_DIRECTOR'));
            setIsCommittee(hasCommitteeRole);
            setIsProcurement(hasProcurementRole);
            setIsExecutive(hasExecutiveRole);
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

    const hasStartedEditing = (e: Evaluation) => {
        if (!e) return false;
        try {
            const statuses = [e.sectionAStatus, e.sectionBStatus, e.sectionCStatus, e.sectionDStatus, e.sectionEStatus];
            const anyInProgress = statuses.some((s) => s === 'IN_PROGRESS');
            const anySubmitted = statuses.some((s) => s === 'SUBMITTED');
            const anyReturned = statuses.some((s) => s === 'RETURNED');
            return e.status === 'IN_PROGRESS' && anyInProgress && !anySubmitted && !anyReturned;
        } catch {
            return false;
        }
    };

    const handleViewDetails = (evaluationId: number) => {
        navigate(`/procurement/evaluation/${evaluationId}`);
    };

    const handleValidate = async (evaluationId: number) => {
        try {
            setLoading(true);
            const updated = await evaluationService.validateEvaluation(evaluationId);
            setEvaluations((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        } catch (err: any) {
            setError(err.message || 'Failed to validate evaluation');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: EvaluationStatus) => {
        switch (status) {
            case 'COMPLETED':
                return 'bg-success';
            case 'VALIDATED':
                return 'bg-primary';
            case 'COMMITTEE_REVIEW':
                return 'bg-warning';
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
        <div className="space-y-6">
            {/* Page Header */}
            <div className="panel bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 text-white">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm shadow-lg">
                            <IconClipboardText className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">{t('evaluation.heading', 'BSJ Evaluation Reports')}</h1>
                            <p className="text-sm text-white/90 mt-1">{t('evaluation.subheading', 'Professional procurement evaluation management with committee workflow')}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={loadEvaluations} className="btn bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 gap-2">
                            <IconRefresh className="h-4 w-4" />
                            Refresh
                        </button>
                        {isCommittee && (
                            <Link to="/evaluation/committee/dashboard" className="btn bg-white text-indigo-600 hover:bg-white/90 gap-2 shadow-lg">
                                <IconUsersGroup className="h-4 w-4" />
                                Committee Dashboard
                            </Link>
                        )}
                        <Link to="/procurement/evaluation/new" className="btn bg-white text-blue-600 hover:bg-white/90 gap-2 shadow-lg">
                            <IconPlus className="h-4 w-4" />
                            {t('evaluation.actions.new', 'Create New Evaluation')}
                        </Link>
                    </div>
                </div>
            </div>

            {/* Stats Dashboard */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <div className="panel bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-l-4 border-slate-500">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase">{t('evaluation.stats.total', 'Total')}</div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-500/20">
                            <IconClipboardText className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-slate-700 dark:text-slate-300">{stats.total}</div>
                    <p className="text-xs text-slate-500 mt-1">All evaluations</p>
                </div>
                <div className="panel bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase">{t('evaluation.stats.pending', 'Pending')}</div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20">
                            <IconClipboardText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{stats.pending}</div>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Awaiting start</p>
                </div>
                <div className="panel bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-l-4 border-amber-500">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase">{t('evaluation.stats.inProgress', 'In Progress')}</div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20">
                            <IconEdit className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">{stats.inProgress}</div>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Being drafted</p>
                </div>
                <div className="panel bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-l-4 border-orange-500">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-orange-600 dark:text-orange-400 uppercase">Committee Review</div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20">
                            <IconUsersGroup className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-orange-700 dark:text-orange-300">{stats.committeeReview}</div>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Under review</p>
                </div>
                <div className="panel bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-l-4 border-green-500">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-green-600 dark:text-green-400 uppercase">{t('evaluation.stats.completed', 'Completed')}</div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                            <IconChecks className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-green-700 dark:text-green-300">{stats.completed}</div>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">Verified</p>
                </div>
                <div className="panel bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase">{t('evaluation.stats.validated', 'Validated')}</div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20">
                            <IconFile className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                    </div>
                    <div className="text-3xl font-bold text-purple-700 dark:text-purple-300">{stats.validated}</div>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">Executive approved</p>
                </div>
            </div>

            {/* Evaluations Table */}
            <div className="panel">
                <div className="mb-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                                <IconClipboardText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h5 className="text-xl font-bold">{t('evaluation.table.title', 'All Evaluations')}</h5>
                                <p className="text-xs text-white-dark">
                                    {filteredEvaluations.length} of {evaluations.length} evaluations
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-[200px]">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder={t('evaluation.table.search', 'Search by eval #, RFQ #, title, evaluator...')}
                                className="form-input pl-10 pr-10"
                            />
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            {search && (
                                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <IconX className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <select className="form-select min-w-[160px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as DisplayStatus | 'ALL')}>
                            <option value="ALL">{t('evaluation.filters.all', 'All Statuses')}</option>
                            <option value="Pending">{t('evaluation.status.pending', 'Pending')}</option>
                            <option value="In Progress">{t('evaluation.status.inProgress', 'In Progress')}</option>
                            <option value="Committee Review">Committee Review</option>
                            <option value="Completed">{t('evaluation.status.completed', 'Completed')}</option>
                            <option value="Validated">{t('evaluation.status.validated', 'Validated')}</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                        <div className="flex gap-2 items-center">
                            <label className="text-xs text-white-dark whitespace-nowrap">Due:</label>
                            <input type="date" className="form-input w-36 text-sm" value={dueAfter} onChange={(e) => setDueAfter(e.target.value)} title="Due After" />
                            <span className="text-white-dark">to</span>
                            <input type="date" className="form-input w-36 text-sm" value={dueBefore} onChange={(e) => setDueBefore(e.target.value)} title="Due Before" />
                        </div>
                    </div>
                </div>

                {filteredEvaluations.length === 0 ? (
                    <div className="text-center py-16">
                        <svg className="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                        <p className="font-semibold text-lg text-gray-700 dark:text-gray-300">
                            {search || statusFilter !== 'ALL' || dueBefore || dueAfter ? 'No evaluations match your filters' : 'No evaluations found'}
                        </p>
                        <p className="text-sm text-white-dark mt-1">{evaluations.length === 0 ? 'Create your first evaluation to get started.' : 'Try adjusting your search or filters.'}</p>
                        {(search || statusFilter !== 'ALL' || dueBefore || dueAfter) && (
                            <button
                                onClick={() => {
                                    setSearch('');
                                    setStatusFilter('ALL');
                                    setDueBefore('');
                                    setDueAfter('');
                                }}
                                className="btn btn-primary btn-sm mt-4"
                            >
                                Clear All Filters
                            </button>
                        )}
                    </div>
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
                                                {isCommittee && hasNewSubmissions(evaluation) && (
                                                    <span className="badge bg-info" title="Submitted sections awaiting committee review">
                                                        New
                                                    </span>
                                                )}
                                                {isProcurement && hasReturnedSections(evaluation) && (
                                                    <span className="badge bg-warning" title="Sections returned by committee; needs updates">
                                                        Returned
                                                    </span>
                                                )}
                                                {hasStartedEditing(evaluation) && (
                                                    <span className="badge bg-secondary" title="First edits saved; not yet submitted">
                                                        Edited
                                                    </span>
                                                )}
                                                {isProcurement && evaluation.status === 'COMPLETED' && (
                                                    <span className="badge bg-success animate-pulse" title="All sections verified; evaluation completed">
                                                        ✓ Verified
                                                    </span>
                                                )}
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
                                                {isExecutive && evaluation.status === 'COMPLETED' && (
                                                    <button onClick={() => handleValidate(evaluation.id)} className="btn btn-sm btn-primary" title="Validate Evaluation">
                                                        <IconChecks className="h-4 w-4" />
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
