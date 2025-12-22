import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { IRootState } from '../../../store';
import IconPlus from '../../../components/Icon/IconPlus';
import IconEye from '../../../components/Icon/IconEye';
import IconX from '../../../components/Icon/IconX';
import IconCircleCheck from '../../../components/Icon/IconCircleCheck';
import { getApiUrl } from '../../../config/api';
import { Request } from '../../../types/request.types';
import { getStatusBadge } from '../../../utils/statusBadges';
import {
    CombinableRequest,
    CombineRequestsConfig,
    validateRequestCombination,
    generateCombinePreview,
    consolidateItems,
    checkCombinePermissions,
    formatCombineSummary,
    DEFAULT_COMBINE_CONFIG,
} from '../../../utils/requestCombining';

const CombineRequests = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user, token: reduxToken } = useSelector((state: IRootState) => state.auth);

    useEffect(() => {
        dispatch(setPageTitle('Combine Requests'));
    }, [dispatch]);

    const [requests, setRequests] = useState<CombinableRequest[]>([]);
    const [selectedRequests, setSelectedRequests] = useState<CombinableRequest[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showCombineModal, setShowCombineModal] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [combinedRequests, setCombinedRequests] = useState<any[]>([]);
    const [showExisting, setShowExisting] = useState(false);

    // UI-only enhancements: local filters/search (enterprise UX without backend changes)
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filterPriority, setFilterPriority] = useState<string>('ALL');
    const [filterStatus, setFilterStatus] = useState<string>('ALL');
    const [filterDepartment, setFilterDepartment] = useState<string>('ALL');

    // Track initial load to show skeletons elegantly
    const [initialLoad, setInitialLoad] = useState(true);

    // Combine configuration state
    const [config, setConfig] = useState<CombineRequestsConfig>({
        combinedTitle: '',
        combinedDescription: '',
        retainOriginalReferences: true,
        consolidateItems: true,
        newPriority: 'MEDIUM',
        targetDepartment: user?.department_name || '',
        justification: '',
    });

    // Load combinable requests
    useEffect(() => {
        const fetchRequests = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Get token and userId from multiple sources
                const token = reduxToken || sessionStorage.getItem('token') || localStorage.getItem('token') || sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');

                const userId = user?.id?.toString() || sessionStorage.getItem('userId') || localStorage.getItem('userId');

                // Fetch combinable requests
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                };

                if (token && token !== 'null') {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                if (userId && userId !== 'null') {
                    headers['x-user-id'] = userId;
                }
                const response = await fetch(getApiUrl('/api/requests/combinable?combinable=true'), {
                    headers,
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch combinable requests');
                }

                const data = await response.json();
                // Filter to only include requests that can be combined
                const combinableStatuses = ['DRAFT', 'SUBMITTED', 'DEPARTMENT_REVIEW', 'PROCUREMENT_REVIEW'];
                const filteredRequests = data.filter((req: any) => combinableStatuses.includes(req.status));

                // Ensure all fields are properly formatted for React rendering
                const formattedRequests = filteredRequests.map((req: any) => ({
                    ...req,
                    department: typeof req.department === 'object' ? req.department?.name || 'Unknown' : req.department || 'Unknown',
                    requestedBy: typeof req.requestedBy === 'object' ? req.requestedBy?.full_name || 'Unknown' : req.requestedBy || 'Unknown',
                }));

                setRequests(formattedRequests);

                // Also fetch existing combined requests
                const combinedResponse = await fetch(getApiUrl('/api/requests/combinable'), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'x-user-id': userId || '',
                        'Content-Type': 'application/json',
                    },
                });

                if (combinedResponse.ok) {
                    const combinedData = await combinedResponse.json();
                    setCombinedRequests(combinedData);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load requests');
            } finally {
                setIsLoading(false);
                setInitialLoad(false);
            }
        };

        fetchRequests();
    }, []);

    // Check permissions for current user
    const permissions = useMemo(() => {
        if (!user) return { canCombine: false, requiresApproval: false, reasons: ['Not authenticated'] };

        // Get user roles - handle different possible role structures
        const userRoles = user.roles || [];
        const userDepartment = user.department_name || '';
        return checkCombinePermissions(userRoles, userDepartment, selectedRequests);
    }, [user, selectedRequests]);

    // Validation and preview
    const validation = useMemo(() => validateRequestCombination(selectedRequests), [selectedRequests]);

    const preview = useMemo(() => (selectedRequests.length >= 2 ? generateCombinePreview(selectedRequests, config) : null), [selectedRequests, config]);

    // Derived filtered requests (pure UI layer)
    const filteredRequests = useMemo(() => {
        let data = [...requests];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            data = data.filter((r) => [r.reference, r.title, r.department, r.requestedBy].some((field) => field?.toLowerCase().includes(q)));
        }
        if (filterPriority !== 'ALL') data = data.filter((r) => r.priority === filterPriority);
        if (filterStatus !== 'ALL') data = data.filter((r) => r.status === filterStatus);
        if (filterDepartment !== 'ALL') data = data.filter((r) => r.department === filterDepartment);
        return data;
    }, [requests, searchQuery, filterPriority, filterStatus, filterDepartment]);

    const distinctDepartments = useMemo(() => {
        const setDep = new Set<string>();
        requests.forEach((r) => r.department && setDep.add(r.department));
        return Array.from(setDep).sort();
    }, [requests]);

    const toggleRequestSelection = (request: CombinableRequest) => {
        setSelectedRequests((prev) => {
            const isSelected = prev.some((r) => r.id === request.id);
            if (isSelected) {
                return prev.filter((r) => r.id !== request.id);
            } else {
                return [...prev, request];
            }
        });
    };

    const handleSelectAll = () => {
        if (selectedRequests.length === requests.length) {
            setSelectedRequests([]);
        } else {
            setSelectedRequests([...requests]);
        }
    };

    const handleCombineClick = () => {
        if (!validation.isValid) {
            Swal.fire({
                title: 'Cannot Combine Requests',
                html: `<ul style="text-align: left;">${validation.errors.map((e) => `<li>${e}</li>`).join('')}</ul>`,
                icon: 'error',
            });
            return;
        }

        if (!permissions.canCombine) {
            Swal.fire({
                title: 'Permission Denied',
                html: `<ul style="text-align: left;">${permissions.reasons.map((r) => `<li>${r}</li>`).join('')}</ul>`,
                icon: 'warning',
            });
            return;
        }

        // Auto-generate title and description if empty
        if (!config.combinedTitle) {
            setConfig((prev) => ({
                ...prev,
                combinedTitle: `Combined Request - ${selectedRequests.map((r) => r.reference).join(', ')}`,
            }));
        }

        if (!config.combinedDescription) {
            setConfig((prev) => ({
                ...prev,
                combinedDescription: `Consolidated procurement request combining ${selectedRequests.length} related requests for improved efficiency and cost savings.`,
            }));
        }

        setShowCombineModal(true);
    };

    const handleCombineSubmit = async () => {
        if (!validation.isValid || !permissions.canCombine) return;

        try {
            setIsLoading(true);

            // Show confirmation with preview
            const summary = formatCombineSummary(selectedRequests, preview!);
            const confirmResult = await Swal.fire({
                title: 'Confirm Request Combination',
                html: `<pre style="text-align: left; font-size: 12px; background: #f5f5f5; padding: 10px; border-radius: 4px;">${summary}</pre>`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: permissions.requiresApproval ? 'Submit for Approval' : 'Combine Requests',
                confirmButtonColor: '#3085d6',
            });

            if (!confirmResult.isConfirmed) return;

            // Prepare combined request data
            const combinedItems = config.consolidateItems ? consolidateItems(selectedRequests) : selectedRequests.flatMap((req) => req.items);

            // Explicitly construct the payload with correct field names expected by backend
            const combinedRequestData = {
                title: preview!.combinedRequest.title || config.combinedTitle,
                description: preview!.combinedRequest.description || config.combinedDescription,
                totalEstimated: preview!.combinedRequest.totalEstimated,
                currency: preview!.combinedRequest.currency,
                priority: preview!.combinedRequest.priority || config.newPriority,
                targetDepartment: preview!.combinedRequest.department || config.targetDepartment,
                items: combinedItems,
                originalRequestIds: selectedRequests.map((r) => r.id),
                combinationConfig: config,
                requiresApproval: permissions.requiresApproval,
            };

            console.log('[COMBINE] Sending request data:', combinedRequestData);

            const token = reduxToken || localStorage.getItem('token');
            const userId = user?.id ? String(user.id) : localStorage.getItem('userId');

            if (!token && !userId) {
                throw new Error('You are not authenticated. Please log in again.');
            }

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };

            if (token) headers.Authorization = `Bearer ${token}`;
            if (userId) headers['x-user-id'] = userId;

            const response = await fetch(getApiUrl('/api/requests/combine'), {
                method: 'POST',
                headers,
                body: JSON.stringify(combinedRequestData),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('[COMBINE] Server error response:', errorData);
                throw new Error(errorData.message || errorData.error || 'Failed to combine requests');
            }

            const result = await response.json();

            await Swal.fire({
                title: 'Success!',
                text: `${result.combinedRequest.lotsCount} requests combined into ${result.combinedRequest.lotsCount} numbered lots`,
                icon: 'success',
            });

            // Navigate to combined request detail view
            navigate(`/apps/requests/combined/${result.combinedRequest.id}`);
        } catch (err) {
            await Swal.fire({
                title: 'Error',
                text: err instanceof Error ? err.message : 'Failed to combine requests',
                icon: 'error',
            });
        } finally {
            setIsLoading(false);
            setShowCombineModal(false);
        }
    };

    return (
        <main className="space-y-6">
            {/* Page Header */}
            <section className="rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-primary p-6 text-white shadow">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-semibold tracking-tight drop-shadow-sm">Request Combination</h1>
                        <p className="text-white/90 text-sm leading-relaxed max-w-2xl">
                            Strategically consolidate related procurement requests to optimize spend, reduce administrative overhead, and streamline approvals.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <div className="bg-white/10 backdrop-blur rounded-lg px-4 py-3 min-w-[140px]">
                            <div className="text-xs uppercase tracking-wide text-white/70">Combinable</div>
                            <div className="text-xl font-bold">{requests.length}</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-lg px-4 py-3 min-w-[140px]">
                            <div className="text-xs uppercase tracking-wide text-white/70">Selected</div>
                            <div className="text-xl font-bold">{selectedRequests.length}</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur rounded-lg px-4 py-3 min-w-[140px]">
                            <div className="text-xs uppercase tracking-wide text-white/70">Combined</div>
                            <div className="text-xl font-bold">{combinedRequests.length}</div>
                        </div>
                        {/* Removed Permissions metric box per request */}
                    </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                    {combinedRequests.length > 0 && (
                        <button
                            type="button"
                            aria-label={showExisting ? 'Hide existing combined requests' : 'Show existing combined requests'}
                            className="btn bg-white text-indigo-600 hover:bg-indigo-50 border border-white/40 gap-2 shadow-sm"
                            onClick={() => setShowExisting(!showExisting)}
                        >
                            <IconEye className="w-5 h-5" />
                            {showExisting ? 'Hide Combined' : 'Show Combined'} ({combinedRequests.length})
                        </button>
                    )}
                    <button
                        type="button"
                        aria-label="Select all combinable requests"
                        className="btn bg-white text-indigo-600 hover:bg-indigo-50 border border-white/40 gap-2 shadow-sm"
                        onClick={handleSelectAll}
                    >
                        {selectedRequests.length === requests.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <button
                        type="button"
                        aria-label="Combine selected requests"
                        className="btn bg-white text-indigo-600 hover:bg-indigo-50 border border-white/40 gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleCombineClick}
                        disabled={selectedRequests.length < 2 || !validation.isValid || !permissions.canCombine}
                    >
                        <IconPlus className="w-5 h-5" />
                        Combine ({selectedRequests.length})
                    </button>
                </div>
            </section>

            {/* Filters */}
            <section className="panel border-t-4 border-primary">
                <div className="panel-header flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <h2 className="text-lg font-semibold">Filter & Refine</h2>
                    <div className="text-xs text-gray-500">Refine visible requests before combining. Filters are client-side only.</div>
                </div>
                <div className="panel-body grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1">
                        <label className="text-xs font-medium tracking-wide text-gray-600">Search</label>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Reference, title, department, user..."
                            className="form-input"
                            aria-label="Search requests"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium tracking-wide text-gray-600">Priority</label>
                        <select className="form-select" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} aria-label="Filter by priority">
                            <option value="ALL">All</option>
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium tracking-wide text-gray-600">Status</label>
                        <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} aria-label="Filter by status">
                            <option value="ALL">All</option>
                            <option value="DRAFT">Draft</option>
                            <option value="SUBMITTED">Submitted</option>
                            <option value="DEPARTMENT_REVIEW">Department Review</option>
                            <option value="PROCUREMENT_REVIEW">Procurement Review</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-medium tracking-wide text-gray-600">Department</label>
                        <select className="form-select" value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} aria-label="Filter by department">
                            <option value="ALL">All</option>
                            {distinctDepartments.map((dep) => (
                                <option key={dep} value={dep}>
                                    {dep}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </section>

            {error && (
                <div className="alert alert-danger mb-5">
                    <strong>Error:</strong> {error}
                </div>
            )}

            {!permissions.canCombine && user && (
                <div className="alert alert-warning mb-5">
                    <strong>Limited Access:</strong> {permissions.reasons.join(', ')}
                </div>
            )}

            {/* Existing Combined Requests */}
            {showExisting && combinedRequests.length > 0 && (
                <div className="panel overflow-hidden">
                    <div className="panel-header flex items-center justify-between">
                        <h5 className="font-semibold text-lg">Existing Combined Requests</h5>
                        <div className="text-xs text-gray-500">
                            {combinedRequests.length} combined request{combinedRequests.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                    <div className="table-responsive">
                        <table className="table-hover">
                            <thead className="bg-gray-50 dark:bg-slate-700">
                                <tr>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Reference</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Title</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Lots</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Created</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Created By</th>
                                    <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {combinedRequests.map((combined: any) => (
                                    <tr key={combined.id} className="border-t hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="px-4 py-4">
                                            <span className="text-sm font-semibold text-primary">{combined.reference}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 max-w-md">{combined.title}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-info text-white whitespace-nowrap">
                                                {combined.lotsCount || 0} Lots
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{new Date(combined.createdAt).toLocaleDateString()}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{combined.createdBy?.full_name || 'Unknown'}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 shadow-sm transition-all"
                                                onClick={() => navigate(`/apps/requests/combined/${combined.id}`)}
                                                aria-label="View combined request details"
                                            >
                                                <IconEye className="w-4 h-4" />
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Validation Messages */}
            {selectedRequests.length >= 2 && (
                <div className="mb-5 space-y-2">
                    {validation.errors.length > 0 && (
                        <div className="alert alert-danger">
                            <strong>Errors:</strong>
                            <ul className="mt-2 ml-4">
                                {validation.errors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {validation.warnings.length > 0 && (
                        <div className="alert alert-warning">
                            <strong>Warnings:</strong>
                            <ul className="mt-2 ml-4">
                                {validation.warnings.map((warning, index) => (
                                    <li key={index}>{warning}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {validation.recommendations.length > 0 && (
                        <div className="alert alert-info">
                            <strong>Recommendations:</strong>
                            <ul className="mt-2 ml-4">
                                {validation.recommendations.map((rec, index) => (
                                    <li key={index}>{rec}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* Requests Table */}
            <div className="panel overflow-hidden">
                <div className="panel-header flex items-center justify-between">
                    <h5 className="font-semibold text-lg">Combinable Requests</h5>
                    <div className="text-xs text-gray-500">
                        Showing {filteredRequests.length} of {requests.length}
                    </div>
                </div>
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>
                                    <input type="checkbox" checked={selectedRequests.length === requests.length && requests.length > 0} onChange={handleSelectAll} />
                                </th>
                                <th>Reference</th>
                                <th>Title</th>
                                <th>Department</th>
                                <th>Requested By</th>
                                <th>Total</th>
                                <th>Priority</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {initialLoad &&
                                isLoading &&
                                [...Array(5)].map((_, i) => (
                                    <tr key={i}>
                                        <td colSpan={10} className="py-3">
                                            <div className="h-4 w-full animate-pulse bg-gray-200 rounded" />
                                        </td>
                                    </tr>
                                ))}
                            {!isLoading && filteredRequests.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="text-center py-6 text-sm text-gray-500">
                                        No requests match current filters
                                    </td>
                                </tr>
                            )}
                            {!isLoading &&
                                filteredRequests.map((request) => {
                                    const isSelected = selectedRequests.some((r) => r.id === request.id);
                                    return (
                                        <tr key={request.id} className={isSelected ? 'bg-primary/10' : ''}>
                                            <td>
                                                <input type="checkbox" checked={isSelected} onChange={() => toggleRequestSelection(request)} />
                                            </td>
                                            <td className="font-semibold text-primary">{request.reference}</td>
                                            <td>{request.title}</td>
                                            <td>{request.department}</td>
                                            <td>{request.requestedBy}</td>
                                            <td>
                                                {request.currency} {(request.totalEstimated || 0).toLocaleString()}
                                            </td>
                                            <td>
                                                {(() => {
                                                    const cls =
                                                        request.priority === 'URGENT'
                                                            ? 'bg-danger text-white'
                                                            : request.priority === 'HIGH'
                                                            ? 'bg-warning text-gray-900'
                                                            : request.priority === 'MEDIUM'
                                                            ? 'bg-info text-white'
                                                            : 'bg-secondary text-white';
                                                    return (
                                                        <span
                                                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wide ${cls}`}
                                                            aria-label={`Priority ${request.priority}`}
                                                        >
                                                            {request.priority}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td>
                                                {(() => {
                                                    const statusBadge = getStatusBadge(request.status);
                                                    return (
                                                        <span
                                                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold uppercase tracking-wide whitespace-nowrap ${statusBadge.bg} ${statusBadge.text}`}
                                                            aria-label={`Status ${statusBadge.label}`}
                                                        >
                                                            {statusBadge.label}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => navigate('/apps/requests')}>
                                                    <IconEye className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Preview Panel */}
            {preview && selectedRequests.length >= 2 && (
                <div className="panel mt-5">
                    <div className="panel-header">
                        <h5 className="font-semibold text-lg">Combination Preview</h5>
                    </div>
                    <div className="panel-body">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="bg-primary/10 p-4 rounded">
                                <div className="text-2xl font-bold text-primary">${(preview.totalValue || 0).toLocaleString()}</div>
                                <div className="text-sm text-gray-600">Total Value</div>
                            </div>
                            <div className="bg-success/10 p-4 rounded">
                                <div className="text-2xl font-bold text-success">{preview.itemCount}</div>
                                <div className="text-sm text-gray-600">Total Items</div>
                            </div>
                            <div className="bg-info/10 p-4 rounded">
                                <div className="text-2xl font-bold text-info">{preview.departmentCount}</div>
                                <div className="text-sm text-gray-600">Departments</div>
                            </div>
                        </div>

                        {preview.estimatedSavings && preview.estimatedSavings > 0 && (
                            <div className="bg-warning/10 p-3 rounded mb-4">
                                <strong>Estimated Savings:</strong> ${(preview.estimatedSavings || 0).toLocaleString()}
                                <span className="text-sm text-gray-600 ml-2">(from bulk purchasing)</span>
                            </div>
                        )}

                        <div className="text-sm text-gray-600">
                            <strong>Original Requests:</strong> {preview.originalReferences.join(', ')}
                        </div>
                    </div>
                </div>
            )}

            {/* Combine Configuration Modal */}
            {showCombineModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h3 className="text-lg font-semibold">Configure Combined Request</h3>
                            <button type="button" className="text-gray-400 hover:text-gray-600" onClick={() => setShowCombineModal(false)}>
                                <IconX className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div>
                                <label className="form-label">Combined Request Title *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={config.combinedTitle}
                                    onChange={(e) => setConfig((prev) => ({ ...prev, combinedTitle: e.target.value }))}
                                    placeholder="Enter title for combined request"
                                />
                            </div>

                            <div>
                                <label className="form-label">Description *</label>
                                <textarea
                                    className="form-textarea"
                                    rows={3}
                                    value={config.combinedDescription}
                                    onChange={(e) => setConfig((prev) => ({ ...prev, combinedDescription: e.target.value }))}
                                    placeholder="Describe the purpose of combining these requests"
                                />
                            </div>

                            <div>
                                <label className="form-label">Justification *</label>
                                <textarea
                                    className="form-textarea"
                                    rows={2}
                                    value={config.justification}
                                    onChange={(e) => setConfig((prev) => ({ ...prev, justification: e.target.value }))}
                                    placeholder="Explain why these requests should be combined"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="form-label">Priority</label>
                                    <select className="form-select" value={config.newPriority} onChange={(e) => setConfig((prev) => ({ ...prev, newPriority: e.target.value as any }))}>
                                        <option value="LOW">Low</option>
                                        <option value="MEDIUM">Medium</option>
                                        <option value="HIGH">High</option>
                                        <option value="URGENT">Urgent</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="form-label">Target Department</label>
                                    <input type="text" className="form-input" value={config.targetDepartment} onChange={(e) => setConfig((prev) => ({ ...prev, targetDepartment: e.target.value }))} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={config.retainOriginalReferences}
                                        onChange={(e) => setConfig((prev) => ({ ...prev, retainOriginalReferences: e.target.checked }))}
                                        className="mr-2"
                                    />
                                    Retain original request references in description
                                </label>

                                <label className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={config.consolidateItems}
                                        onChange={(e) => setConfig((prev) => ({ ...prev, consolidateItems: e.target.checked }))}
                                        className="mr-2"
                                    />
                                    Consolidate similar items (recommended)
                                </label>
                            </div>

                            {permissions.requiresApproval && (
                                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3">
                                    <div className="text-sm text-yellow-800">
                                        <strong>Note:</strong> This combination requires additional approval due to cross-departmental or high-value nature.
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
                            <button type="button" className="btn btn-outline-danger" onClick={() => setShowCombineModal(false)}>
                                Cancel
                            </button>
                            <button type="button" className="btn btn-primary" onClick={handleCombineSubmit} disabled={!config.combinedTitle || !config.combinedDescription || !config.justification}>
                                <IconCircleCheck className="w-5 h-5 mr-2" />
                                {permissions.requiresApproval ? 'Submit for Approval' : 'Combine Requests'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};

export default CombineRequests;
