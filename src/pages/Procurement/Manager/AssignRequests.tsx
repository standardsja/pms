import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconUsersGroup from '../../../components/Icon/IconUsersGroup';
import IconUser from '../../../components/Icon/IconUser';
import { getStatusBadge } from '../../../utils/statusBadges';

const MySwal = withReactContent(Swal);

interface ProcurementOfficer {
    id: number;
    name: string;
    email: string;
    assignedCount: number;
}

interface Req {
    id: number;
    reference: string;
    title: string;
    requester: { name: string };
    department: { name: string; code: string };
    totalEstimated: number | null;
    currency: string;
    status: string;
    headerDeptCode?: string;
    headerMonth?: string;
    headerYear?: number;
    headerSequence?: number;
    currentAssigneeId?: number | null;
}

const AssignRequests = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const preselectedRequestId = searchParams.get('requestId');

    const [officers, setOfficers] = useState<ProcurementOfficer[]>([]);
    const [requests, setRequests] = useState<Req[]>([]);
    const [allRequests, setAllRequests] = useState<Req[]>([]); // Store all procurement requests
    const [selectedRequest, setSelectedRequest] = useState<number | null>(preselectedRequestId ? parseInt(preselectedRequestId) : null);
    const [selectedOfficer, setSelectedOfficer] = useState<number | null>(null);
    const [viewingOfficerRequests, setViewingOfficerRequests] = useState<number | null>(null); // Track which officer's requests we're viewing
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const apiUrl = window.location.hostname === 'localhost' ? 'http://localhost:4000' : `http://${window.location.hostname}:4000`;

    useEffect(() => {
        dispatch(setPageTitle('Assign Requests'));
    }, [dispatch]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);

            try {
                const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
                const currentUserId = userProfile?.id || userProfile?.userId || null;

                // Fetch procurement officers
                const officersRes = await fetch(`${apiUrl}/users/procurement-officers`, {
                    headers: {
                        'x-user-id': String(currentUserId || ''),
                    },
                });
                if (!officersRes.ok) throw new Error('Failed to fetch procurement officers');
                const officersData = await officersRes.json();
                setOfficers(officersData);

                // Fetch requests at PROCUREMENT_REVIEW status
                const requestsRes = await fetch(`${apiUrl}/requests`, {
                    headers: {
                        'x-user-id': String(currentUserId || ''),
                    },
                });
                if (!requestsRes.ok) throw new Error('Failed to fetch requests');
                const requestsData = await requestsRes.json();
                const procurementRequests = Array.isArray(requestsData) ? requestsData.filter((r: any) => r && r.status === 'PROCUREMENT_REVIEW') : [];

                // Store all procurement requests
                setAllRequests(procurementRequests);

                // Only show unassigned requests in the main list
                const unassignedRequests = procurementRequests.filter((r: any) => !r.currentAssigneeId);
                setRequests(unassignedRequests);
            } catch (err: any) {
                console.error('Error fetching data:', err);
                setError(err.message || 'Failed to load data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [apiUrl]);

    const handleAssign = async () => {
        if (!selectedRequest || !selectedOfficer) {
            MySwal.fire({
                icon: 'warning',
                title: 'Selection Required',
                text: 'Please select both a request and an officer.',
            });
            return;
        }

        const request = requests.find((r) => r.id === selectedRequest);
        const officer = officers.find((o) => o.id === selectedOfficer);

        if (!request || !officer) return;

        const result = await MySwal.fire({
            title: 'Confirm Assignment',
            html: `
                <div style="text-align: left; margin-bottom: 16px;">
                    <div style="background: #f9fafb; padding: 12px; border-radius: 4px; margin-bottom: 12px;">
                        <p style="margin: 4px 0;"><strong>Request:</strong> ${request.reference}</p>
                        <p style="margin: 4px 0;"><strong>Title:</strong> ${request.title}</p>
                        <p style="margin: 4px 0;"><strong>Department:</strong> ${request.department.name}</p>
                        <p style="margin: 4px 0;"><strong>Amount:</strong> ${request.currency} $${(Number(request.totalEstimated) || 0).toFixed(2)}</p>
                    </div>
                    <div style="background: #eff6ff; padding: 12px; border-radius: 4px;">
                        <p style="margin: 4px 0;"><strong>Assign to:</strong> ${officer.name}</p>
                        <p style="margin: 4px 0; color: #6b7280;"><strong>Email:</strong> ${officer.email}</p>
                        <p style="margin: 4px 0; color: #6b7280;"><strong>Current workload:</strong> ${officer.assignedCount} request(s)</p>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Assign Request',
            confirmButtonColor: '#3b82f6',
            cancelButtonText: 'Cancel',
        });

        if (result.isConfirmed) {
            try {
                const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
                const currentUserId = userProfile?.id || userProfile?.userId || null;

                const res = await fetch(`${apiUrl}/requests/${selectedRequest}/assign`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': String(currentUserId || ''),
                    },
                    body: JSON.stringify({
                        assigneeId: selectedOfficer,
                    }),
                });

                if (!res.ok) {
                    const error = await res.json().catch(() => ({}));
                    throw new Error(error.message || 'Failed to assign request');
                }

                // Remove assigned request from list
                setRequests((prev) => prev.filter((r) => r.id !== selectedRequest));

                // Update allRequests to reflect the assignment
                setAllRequests((prev) => prev.map((r) => (r.id === selectedRequest ? { ...r, currentAssigneeId: selectedOfficer } : r)));

                setSelectedRequest(null);
                setSelectedOfficer(null);

                // Update officer's assigned count
                setOfficers((prev) => prev.map((o) => (o.id === selectedOfficer ? { ...o, assignedCount: o.assignedCount + 1 } : o)));

                MySwal.fire({
                    icon: 'success',
                    title: 'Request Assigned',
                    text: `The request has been assigned to ${officer.name}.`,
                    timer: 2000,
                    showConfirmButton: false,
                });
            } catch (err: any) {
                console.error('Error assigning request:', err);
                MySwal.fire({
                    icon: 'error',
                    title: 'Assignment Failed',
                    text: err.message || 'Failed to assign the request. Please try again.',
                });
            }
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4">
                    <p className="text-red-800 dark:text-red-200">Error: {error}</p>
                </div>
            </div>
        );
    }

    const selectedRequestData = requests.find((r) => r.id === selectedRequest) || allRequests.find((r) => r.id === selectedRequest);

    // Get requests for the currently viewed officer
    const officerRequests = viewingOfficerRequests ? allRequests.filter((r) => r.currentAssigneeId === viewingOfficerRequests) : [];

    const handleOfficerClick = (officerId: number) => {
        if (viewingOfficerRequests === officerId) {
            // If clicking the same officer, toggle off
            setViewingOfficerRequests(null);
            setSelectedOfficer(null);
            setSelectedRequest(null);
        } else if (viewingOfficerRequests && selectedRequest) {
            // If we're viewing an officer's requests and have a request selected,
            // clicking another officer means we want to reassign to them
            setSelectedOfficer(officerId);
        } else {
            // View this officer's requests
            setViewingOfficerRequests(officerId);
            setSelectedOfficer(officerId);
            setSelectedRequest(null);
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold flex items-center gap-2">
                    <IconUsersGroup className="w-7 h-7" />
                    Assign Requests to Officers
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Select a request and assign it to a procurement officer for processing.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Requests Column */}
                <div className="bg-white dark:bg-slate-800 shadow rounded p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center justify-between">
                        <span>{viewingOfficerRequests ? `Requests for ${officers.find((o) => o.id === viewingOfficerRequests)?.name}` : 'Unassigned Requests'}</span>
                        <span className="text-sm font-normal text-gray-500">{viewingOfficerRequests ? `${officerRequests.length} assigned` : `${requests.length} total`}</span>
                    </h2>

                    {viewingOfficerRequests && (
                        <>
                            <button
                                onClick={() => {
                                    setViewingOfficerRequests(null);
                                    setSelectedRequest(null);
                                }}
                                className="mb-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                            >
                                ← Back to Unassigned Requests
                            </button>
                            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded text-sm text-blue-800 dark:text-blue-200">
                                <strong>To reassign:</strong> Select a request below, then click on a different officer on the right →
                            </div>
                        </>
                    )}

                    {(viewingOfficerRequests ? officerRequests : requests).length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                            <p className="font-medium">{viewingOfficerRequests ? 'No requests assigned to this officer' : 'No unassigned requests'}</p>
                            <p className="text-sm mt-1">{viewingOfficerRequests ? 'This officer has no active requests' : 'All requests have been assigned to officers'}</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                            {(viewingOfficerRequests ? officerRequests : requests).map((req) => {
                                const deptCode = req.headerDeptCode || req.department.code || '---';
                                const month = req.headerMonth || '---';
                                const year = req.headerYear || '----';
                                const sequence = req.headerSequence !== undefined && req.headerSequence !== null ? String(req.headerSequence).padStart(3, '0') : '000';
                                const formCode = `[${deptCode}]/[${month}]/[${year}]/[${sequence}]`;
                                const isSelected = selectedRequest === req.id;

                                return (
                                    <div
                                        key={req.id}
                                        onClick={() => setSelectedRequest(req.id)}
                                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                            isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <p className="font-semibold text-blue-600 dark:text-blue-400">{formCode}</p>
                                                <p className="font-medium text-sm mt-1">{req.title}</p>
                                            </div>
                                            {isSelected && (
                                                <div className="ml-2">
                                                    <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                            <p>
                                                <strong>Dept:</strong> {req.department.code}
                                            </p>
                                            <p>
                                                <strong>Requester:</strong> {req.requester.name}
                                            </p>
                                            <p>
                                                <strong>Amount:</strong> {req.currency} ${(Number(req.totalEstimated) || 0).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Officers Column */}
                <div className="bg-white dark:bg-slate-800 shadow rounded p-6">
                    <h2 className="text-lg font-semibold mb-4 flex items-center justify-between">
                        <span>Procurement Officers</span>
                        <span className="text-sm font-normal text-gray-500">{officers.length} available</span>
                    </h2>

                    {officers.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <IconUser className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                            <p className="font-medium">No procurement officers found</p>
                            <p className="text-sm mt-1">Add users with PROCUREMENT role</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                            {officers.map((officer) => {
                                const isSelected = selectedOfficer === officer.id;
                                const workloadColor =
                                    officer.assignedCount === 0
                                        ? 'text-green-600 dark:text-green-400'
                                        : officer.assignedCount < 5
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : officer.assignedCount < 10
                                        ? 'text-yellow-600 dark:text-yellow-400'
                                        : 'text-red-600 dark:text-red-400';

                                return (
                                    <div
                                        key={officer.id}
                                        onClick={() => handleOfficerClick(officer.id)}
                                        className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                            viewingOfficerRequests === officer.id
                                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 ring-2 ring-purple-300'
                                                : isSelected
                                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <IconUser className="w-5 h-5 text-gray-500" />
                                                    <p className="font-semibold">{officer.name}</p>
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-gray-400">{officer.email}</p>
                                                <div className="mt-2 flex items-center gap-2">
                                                    <span className="text-xs text-gray-500">Current workload:</span>
                                                    <span className={`text-sm font-semibold ${workloadColor}`}>{officer.assignedCount} request(s)</span>
                                                </div>
                                                {viewingOfficerRequests === officer.id && (
                                                    <div className="mt-2 text-xs text-purple-600 dark:text-purple-400 font-medium">← Viewing this officer's requests</div>
                                                )}
                                            </div>
                                            {isSelected && viewingOfficerRequests !== officer.id && (
                                                <div className="ml-2">
                                                    <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Assignment Summary and Action Button */}
            {selectedRequest && selectedOfficer && !viewingOfficerRequests && (
                <div className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-4">Assignment Summary</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Selected Request:</p>
                            {selectedRequestData && (
                                <div className="bg-white dark:bg-slate-800 p-4 rounded border border-gray-200 dark:border-gray-700">
                                    <p className="font-semibold text-blue-600 dark:text-blue-400">{selectedRequestData.reference}</p>
                                    <p className="text-sm mt-1">{selectedRequestData.title}</p>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {selectedRequestData.currency} ${(Number(selectedRequestData.totalEstimated) || 0).toFixed(2)}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Assigned To:</p>
                            {officers.find((o) => o.id === selectedOfficer) && (
                                <div className="bg-white dark:bg-slate-800 p-4 rounded border border-gray-200 dark:border-gray-700">
                                    <p className="font-semibold">{officers.find((o) => o.id === selectedOfficer)?.name}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{officers.find((o) => o.id === selectedOfficer)?.email}</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleAssign} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                            {viewingOfficerRequests ? 'Reassign Request' : 'Assign Request'}
                        </button>
                        <button
                            onClick={() => {
                                setSelectedRequest(null);
                                setSelectedOfficer(null);
                                setViewingOfficerRequests(null);
                            }}
                            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            Clear Selection
                        </button>
                    </div>
                </div>
            )}

            {/* Reassignment Mode - Show when viewing an officer's requests */}
            {viewingOfficerRequests && selectedRequest && selectedOfficer && selectedOfficer !== viewingOfficerRequests && (
                <div className="mt-6 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-2 border-orange-200 dark:border-orange-800 rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-2 text-orange-900 dark:text-orange-200">Reassign Request</h3>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mb-4">
                        Moving request from <strong>{officers.find((o) => o.id === viewingOfficerRequests)?.name}</strong> to <strong>{officers.find((o) => o.id === selectedOfficer)?.name}</strong>
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Selected Request:</p>
                            {selectedRequestData && (
                                <div className="bg-white dark:bg-slate-800 p-4 rounded border border-gray-200 dark:border-gray-700">
                                    <p className="font-semibold text-blue-600 dark:text-blue-400">
                                        {selectedRequestData.headerDeptCode
                                            ? `[${selectedRequestData.headerDeptCode}]/[${selectedRequestData.headerMonth}]/[${selectedRequestData.headerYear}]/[${String(
                                                  selectedRequestData.headerSequence
                                              ).padStart(3, '0')}]`
                                            : selectedRequestData.reference}
                                    </p>
                                    <p className="text-sm mt-1">{selectedRequestData.title}</p>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {selectedRequestData.currency} ${(Number(selectedRequestData.totalEstimated) || 0).toFixed(2)}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Reassign To:</p>
                            {officers.find((o) => o.id === selectedOfficer) && (
                                <div className="bg-white dark:bg-slate-800 p-4 rounded border border-gray-200 dark:border-gray-700">
                                    <p className="font-semibold">{officers.find((o) => o.id === selectedOfficer)?.name}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{officers.find((o) => o.id === selectedOfficer)?.email}</p>
                                    <p className="text-xs text-gray-500 mt-2">Current workload: {officers.find((o) => o.id === selectedOfficer)?.assignedCount} request(s)</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleAssign} className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors">
                            Confirm Reassignment
                        </button>
                        <button
                            onClick={() => {
                                setSelectedRequest(null);
                                setSelectedOfficer(viewingOfficerRequests);
                            }}
                            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {!selectedRequest && !selectedOfficer && !viewingOfficerRequests && (
                <div className="mt-6 text-center py-8 text-gray-500 dark:text-gray-400">
                    <p className="text-sm">Select a request and an officer to proceed with assignment</p>
                </div>
            )}
        </div>
    );
};

export default AssignRequests;
