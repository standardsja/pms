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
    const { user } = useSelector((state: IRootState) => state.auth);

    useEffect(() => {
        dispatch(setPageTitle('Combine Requests'));
    }, [dispatch]);

    const [requests, setRequests] = useState<CombinableRequest[]>([]);
    const [selectedRequests, setSelectedRequests] = useState<CombinableRequest[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showCombineModal, setShowCombineModal] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
                const response = await fetch(getApiUrl('/api/requests/combine?combinable=true'), {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
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
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load requests');
            } finally {
                setIsLoading(false);
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

        // Debug log to see what we're working with
        console.log('User roles:', userRoles, 'Department:', userDepartment, 'Selected requests:', selectedRequests.length);

        return checkCombinePermissions(userRoles, userDepartment, selectedRequests);
    }, [user, selectedRequests]);

    // Validation and preview
    const validation = useMemo(() => validateRequestCombination(selectedRequests), [selectedRequests]);

    const preview = useMemo(() => (selectedRequests.length >= 2 ? generateCombinePreview(selectedRequests, config) : null), [selectedRequests, config]);

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

            const combinedRequestData = {
                ...preview!.combinedRequest,
                items: combinedItems,
                originalRequestIds: selectedRequests.map((r) => r.id),
                combinationConfig: config,
                requiresApproval: permissions.requiresApproval,
            };

            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            const response = await fetch(getApiUrl('/api/requests/combine'), {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(combinedRequestData),
            });

            if (!response.ok) {
                throw new Error('Failed to combine requests');
            }

            const result = await response.json();

            await Swal.fire({
                title: 'Success!',
                text: permissions.requiresApproval ? 'Combined request submitted for approval' : 'Requests successfully combined',
                icon: 'success',
            });

            // Navigate back to requests list
            navigate('/apps/requests');
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

    if (isLoading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <h2 className="text-xl">Combine Requests</h2>
                <div className="flex gap-2">
                    <button type="button" className="btn btn-secondary gap-2" onClick={handleSelectAll}>
                        {selectedRequests.length === requests.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <button type="button" className="btn btn-primary gap-2" onClick={handleCombineClick} disabled={selectedRequests.length < 2 || !validation.isValid || !permissions.canCombine}>
                        <IconPlus className="w-5 h-5" />
                        Combine Selected ({selectedRequests.length})
                    </button>
                </div>
            </div>

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
            <div className="datatables">
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
                        {requests.length === 0 ? (
                            <tr>
                                <td colSpan={10} className="text-center py-4">
                                    No combinable requests found
                                </td>
                            </tr>
                        ) : (
                            requests.map((request) => {
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
                                            <span
                                                className={`badge ${
                                                    request.priority === 'URGENT'
                                                        ? 'badge-danger'
                                                        : request.priority === 'HIGH'
                                                        ? 'badge-warning'
                                                        : request.priority === 'MEDIUM'
                                                        ? 'badge-info'
                                                        : 'badge-secondary'
                                                }`}
                                            >
                                                {request.priority}
                                            </span>
                                        </td>
                                        <td>
                                            {(() => {
                                                const statusBadge = getStatusBadge(request.status);
                                                return <span className={`badge px-2 py-1 rounded-full text-sm font-medium ${statusBadge.bg} ${statusBadge.text}`}>{statusBadge.label}</span>;
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
                            })
                        )}
                    </tbody>
                </table>
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

                        <div className="flex items-center justify-end gap-2 p-4 border-t">
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
        </div>
    );
};

export default CombineRequests;
