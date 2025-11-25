import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconUsersGroup from '../../../components/Icon/IconUsersGroup';
import IconUser from '../../../components/Icon/IconUser';
import IconSearch from '../../../components/Icon/IconSearch';
import IconRefresh from '../../../components/Icon/IconRefresh';
import IconX from '../../../components/Icon/IconX';
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
    const [allRequests, setAllRequests] = useState<Req[]>([]);
    const [filteredRequests, setFilteredRequests] = useState<Req[]>([]);
    const [filteredOfficers, setFilteredOfficers] = useState<ProcurementOfficer[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<number | null>(preselectedRequestId ? parseInt(preselectedRequestId) : null);
    const [selectedOfficer, setSelectedOfficer] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [requestSearch, setRequestSearch] = useState('');
    const [officerSearch, setOfficerSearch] = useState('');
    const [sortBy, setSortBy] = useState<'workload' | 'name'>('workload');
    const [viewingOfficerRequests, setViewingOfficerRequests] = useState<number | null>(null);
    const [isProcurementManager, setIsProcurementManager] = useState<boolean>(false);
    const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    const currentUserId = userProfile?.id || userProfile?.userId || null;

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

                // detect if current user is a procurement manager
                const roles = (userProfile?.roles || []).map((r: any) => {
                    if (typeof r === 'string') return r;
                    return r?.role?.name || r?.name || '';
                });
                setIsProcurementManager(roles.includes('PROCUREMENT_MANAGER') || roles.includes('Procurement Manager') || roles.includes('PROCUREMENT'));

                // Fetch requests at PROCUREMENT_REVIEW status
                const requestsRes = await fetch(`${apiUrl}/requests`, {
                    headers: {
                        'x-user-id': String(currentUserId || ''),
                    },
                });
                if (!requestsRes.ok) throw new Error('Failed to fetch requests');
                const requestsData = await requestsRes.json();
                const procurementRequests = Array.isArray(requestsData) ? requestsData.filter((r: any) => r && r.status === 'PROCUREMENT_REVIEW') : [];
                // keep full list
                setAllRequests(procurementRequests);
                // For procurement managers, show ALL procurement requests (they should see everything and delegate)
                if (userProfile && (roles.includes('PROCUREMENT_MANAGER') || roles.includes('Procurement Manager') || roles.includes('PROCUREMENT'))) {
                    setRequests(procurementRequests);
                } else {
                    // normal view: show unassigned requests
                    setRequests(procurementRequests.filter((r: any) => !r.currentAssigneeId));
                }
            } catch (err: any) {
                console.error('Error fetching data:', err);
                setError(err.message || 'Failed to load data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [apiUrl]);

    // Filter and sort requests
    useEffect(() => {
        let filtered = [...requests];
        if (requestSearch) {
            const search = requestSearch.toLowerCase();
            filtered = filtered.filter(
                (r) =>
                    r.reference.toLowerCase().includes(search) ||
                    r.title.toLowerCase().includes(search) ||
                    r.requester.name.toLowerCase().includes(search) ||
                    r.department.name.toLowerCase().includes(search)
            );
        }
        setFilteredRequests(filtered);
    }, [requests, requestSearch]);

    // requests currently assigned to an officer being viewed
    const officerRequests = viewingOfficerRequests !== null && allRequests.length > 0 ? allRequests.filter((r) => r.currentAssigneeId === viewingOfficerRequests) : [];

    const displayRequests = viewingOfficerRequests !== null ? officerRequests : filteredRequests;
    const displayTitle =
        viewingOfficerRequests !== null
            ? `Requests assigned to ${officers.find((o) => o.id === viewingOfficerRequests)?.name || 'Officer'}`
            : isProcurementManager
            ? 'Manager Inbox'
            : 'Unassigned Requests';

    const handleOfficerClick = (officerId: number) => {
        // If already viewing this officer, toggle off
        if (viewingOfficerRequests === officerId) {
            setViewingOfficerRequests(null);
            setSelectedRequest(null);
            setSelectedOfficer(null);
            return;
        }

        // If a request is already selected (from viewing an officer), clicking another officer will trigger reassignment
        if (viewingOfficerRequests && selectedRequest) {
            // if clicked the same officer, ignore
            if (officerId === viewingOfficerRequests) return;
            // perform reassignment flow directly
            handleAssign(officerId, selectedRequest);
            return;
        }

        // Otherwise, start viewing this officer's requests
        setViewingOfficerRequests(officerId);
        setSelectedRequest(null);
        setSelectedOfficer(officerId);
    };

    // Filter and sort officers
    useEffect(() => {
        let filtered = [...officers];
        if (officerSearch) {
            const search = officerSearch.toLowerCase();
            filtered = filtered.filter((o) => o.name.toLowerCase().includes(search) || o.email.toLowerCase().includes(search));
        }
        // Sort officers
        if (sortBy === 'workload') {
            filtered.sort((a, b) => a.assignedCount - b.assignedCount);
        } else {
            filtered.sort((a, b) => a.name.localeCompare(b.name));
        }
        setFilteredOfficers(filtered);
    }, [officers, officerSearch, sortBy]);

    const handleAssign = async (overrideOfficer?: number, overrideRequest?: number) => {
        const assigneeId = overrideOfficer ?? selectedOfficer;
        const reqId = overrideRequest ?? selectedRequest;

        if (!reqId || !assigneeId) {
            MySwal.fire({
                icon: 'warning',
                title: 'Selection Required',
                text: 'Please select both a request and an officer.',
            });
            return;
        }

        // request may be in allRequests (when reassigning) or in unassigned requests
        const request = allRequests.find((r) => r.id === reqId) || requests.find((r) => r.id === reqId);
        const officer = officers.find((o) => o.id === assigneeId);

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

                const res = await fetch(`${apiUrl}/requests/${reqId}/assign`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-user-id': String(currentUserId || ''),
                    },
                    body: JSON.stringify({
                        assigneeId: assigneeId,
                    }),
                });

                if (!res.ok) {
                    const error = await res.json().catch(() => ({}));
                    throw new Error(error.message || 'Failed to assign request');
                }

                // Remove assigned request from unassigned list (no-op in reassignment view)

                setRequests((prev) => prev.filter((r) => r.id !== reqId));
                // Update full list
                setAllRequests((prev) => prev.map((r) => (r.id === reqId ? { ...r, currentAssigneeId: assigneeId } : r)));

                const previousAssigneeId = request.currentAssigneeId;
                // Clear selections
                setSelectedRequest(null);
                setSelectedOfficer(null);
                setViewingOfficerRequests(null);

                // Update officer workloads: increment new assignee, decrement previous assignee if exists
                setOfficers((prev) =>
                    prev.map((o) => {
                        if (o.id === assigneeId) return { ...o, assignedCount: o.assignedCount + 1 };
                        if (previousAssigneeId && o.id === previousAssigneeId && previousAssigneeId !== assigneeId) return { ...o, assignedCount: Math.max(0, o.assignedCount - 1) };
                        return o;
                    })
                );

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

    // Lookup selected request from full list first (includes assigned requests), fallback to unassigned requests
    const selectedRequestData = allRequests.find((r) => r.id === selectedRequest) || requests.find((r) => r.id === selectedRequest);

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="panel bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                            <IconUsersGroup className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold">Assign Requests to Officers</h1>
                            <p className="text-sm text-white/90 mt-0.5">Intelligent workload distribution & real-time assignment management</p>
                        </div>
                    </div>
                    <button onClick={() => window.location.reload()} className="btn bg-white/20 backdrop-blur-sm border-white/30 text-white hover:bg-white/30 gap-2">
                        <IconRefresh className="h-4 w-4" />
                        Refresh Data
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="panel bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Unassigned Requests</p>
                            <p className="text-3xl font-bold text-blue-700 dark:text-blue-300 mt-1">{requests.length}</p>
                        </div>
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/20">
                            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                        </div>
                    </div>
                </div>
                <div className="panel bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Available Officers</p>
                            <p className="text-3xl font-bold text-purple-700 dark:text-purple-300 mt-1">{officers.length}</p>
                        </div>
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-500/20">
                            <IconUser className="h-8 w-8 text-purple-600" />
                        </div>
                    </div>
                </div>
                <div className="panel bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-green-600 dark:text-green-400">Avg. Workload</p>
                            <p className="text-3xl font-bold text-green-700 dark:text-green-300 mt-1">
                                {officers.length > 0 ? (officers.reduce((sum, o) => sum + o.assignedCount, 0) / officers.length).toFixed(1) : '0'}
                            </p>
                        </div>
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Requests Column */}
                <div className="panel">
                    <div className="mb-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                    />
                                </svg>
                                {displayTitle}
                            </h2>
                            <span className="badge bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1">
                                {displayRequests.length} of {viewingOfficerRequests !== null ? officerRequests.length : requests.length}
                            </span>
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search by reference, title, requester, or department..."
                                value={requestSearch}
                                onChange={(e) => setRequestSearch(e.target.value)}
                                className="form-input pl-10 pr-10"
                            />
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            {requestSearch && (
                                <button onClick={() => setRequestSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <IconX className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    </div>

                    {displayRequests.length === 0 ? (
                        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                            <svg className="w-20 h-20 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                            <p className="font-semibold text-lg">
                                {requestSearch ? 'No matching requests' : viewingOfficerRequests !== null ? 'No requests assigned to this officer' : 'No unassigned requests'}
                            </p>
                            <p className="text-sm mt-1">
                                {requestSearch
                                    ? 'Try adjusting your search criteria'
                                    : viewingOfficerRequests !== null
                                    ? 'This officer has no assigned requests'
                                    : 'All requests have been assigned to officers'}
                            </p>
                            {requestSearch && (
                                <button onClick={() => setRequestSearch('')} className="btn btn-primary btn-sm mt-3">
                                    Clear Search
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                            {displayRequests.map((req) => {
                                const deptCode = req.headerDeptCode || req.department.code || '---';
                                const month = req.headerMonth || '---';
                                const year = req.headerYear || '----';
                                const sequence = req.headerSequence !== undefined && req.headerSequence !== null ? String(req.headerSequence).padStart(3, '0') : '000';
                                const formCode = `[${deptCode}]/[${month}]/[${year}]/[${sequence}]`;
                                const isSelected = selectedRequest === req.id;

                                return (
                                    <div
                                        key={req.id}
                                        onClick={() => {
                                            setSelectedRequest(req.id);
                                            // when viewing an officer's requests, set selectedOfficer to that officer if not already
                                            if (viewingOfficerRequests !== null) setSelectedOfficer(viewingOfficerRequests);
                                        }}
                                        className={`group relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                                            isSelected
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md scale-[1.01]'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                                        }`}
                                    >
                                        {/* Selection Indicator */}
                                        {isSelected && (
                                            <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 shadow-lg">
                                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </div>
                                        )}
                                        <div className="space-y-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded">
                                                            {formCode}
                                                        </span>
                                                    </div>
                                                    <p className="font-semibold text-gray-900 dark:text-white line-clamp-2">{req.title}</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                                                <div className="flex items-center gap-1.5">
                                                    <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                                                        />
                                                    </svg>
                                                    <span className="text-gray-600 dark:text-gray-400 truncate">{req.department.code}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    <span className="text-gray-600 dark:text-gray-400 truncate">{req.requester.name}</span>
                                                </div>
                                                <div className="col-span-2 flex items-center gap-1.5 mt-1 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                    <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                        />
                                                    </svg>
                                                    <span className="font-semibold text-green-600 dark:text-green-400">
                                                        {req.currency} ${(Number(req.totalEstimated) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </span>
                                                    {req.currentAssigneeId && (
                                                        <span className="ml-3 inline-flex items-center gap-2 text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                                            <svg className="w-3 h-3 text-gray-600" viewBox="0 0 8 8" fill="currentColor">
                                                                <circle cx="4" cy="4" r="4" />
                                                            </svg>
                                                            <span className="text-gray-700 dark:text-gray-300">
                                                                Assigned to: {currentUserId && Number(req.currentAssigneeId) === Number(currentUserId) ? 'You (Manager)' : officers.find((o) => o.id === req.currentAssigneeId)?.name || 'Officer'}
                                                            </span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Officers Column */}
                <div className="panel">
                    <div className="mb-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <IconUser className="w-5 h-5 text-purple-500" />
                                Procurement Officers
                            </h2>
                            <span className="badge bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1">
                                {filteredOfficers.length} of {officers.length}
                            </span>
                        </div>
                        <div className="space-y-2">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={officerSearch}
                                    onChange={(e) => setOfficerSearch(e.target.value)}
                                    className="form-input pl-10 pr-10"
                                />
                                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                {officerSearch && (
                                    <button onClick={() => setOfficerSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                        <IconX className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Sort by:</label>
                                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'workload' | 'name')} className="form-select text-xs py-1">
                                    <option value="workload">Workload (Low to High)</option>
                                    <option value="name">Name (A-Z)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {filteredOfficers.length === 0 ? (
                        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                            <IconUser className="w-20 h-20 mx-auto mb-4 text-gray-300" />
                            <p className="font-semibold text-lg">{officerSearch ? 'No matching officers' : 'No procurement officers found'}</p>
                            <p className="text-sm mt-1">{officerSearch ? 'Try adjusting your search criteria' : 'Add users with PROCUREMENT role'}</p>
                            {officerSearch && (
                                <button onClick={() => setOfficerSearch('')} className="btn btn-primary btn-sm mt-3">
                                    Clear Search
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                            {filteredOfficers.map((officer) => {
                                const isSelected = selectedOfficer === officer.id;
                                const workloadLevel = officer.assignedCount === 0 ? 'none' : officer.assignedCount < 5 ? 'light' : officer.assignedCount < 10 ? 'moderate' : 'heavy';
                                const workloadColors = {
                                    none: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300',
                                    light: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300',
                                    moderate: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300',
                                    heavy: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300',
                                };
                                const workloadLabels = {
                                    none: 'Available',
                                    light: 'Light Load',
                                    moderate: 'Moderate Load',
                                    heavy: 'Heavy Load',
                                };

                                return (
                                    <div
                                        key={officer.id}
                                        onClick={() => handleOfficerClick(officer.id)}
                                        className={`group relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                                            isSelected
                                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-md scale-[1.01]'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-sm'
                                        }`}
                                    >
                                        {/* Selection Indicator */}
                                        {isSelected && (
                                            <div className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 shadow-lg">
                                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </div>
                                        )}
                                        <div className="space-y-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                                                        <IconUser className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-gray-900 dark:text-white truncate">{officer.name}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{officer.email}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">Workload:</span>
                                                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded border ${workloadColors[workloadLevel]}`}>
                                                        <span className="font-bold">{officer.assignedCount}</span>
                                                        <span>request{officer.assignedCount !== 1 ? 's' : ''}</span>
                                                    </span>
                                                </div>
                                                <span className={`text-xs font-medium px-2 py-0.5 rounded ${workloadColors[workloadLevel]}`}>{workloadLabels[workloadLevel]}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Assignment Summary and Action */}
            {selectedRequest && selectedOfficer ? (
                <div className="panel bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 dark:from-blue-900/10 dark:via-purple-900/10 dark:to-blue-900/10 border-2 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Ready to Assign</h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Review the assignment details below and confirm</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="panel bg-white dark:bg-slate-800 border-l-4 border-blue-500">
                            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase mb-2">Selected Request</p>
                            {selectedRequestData && (
                                <div className="space-y-1">
                                    <p className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400">{selectedRequestData.reference}</p>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">{selectedRequestData.title}</p>
                                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                                        <span className="text-xs text-gray-500">{selectedRequestData.department.code}</span>
                                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                                            {selectedRequestData.currency} ${(Number(selectedRequestData.totalEstimated) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="panel bg-white dark:bg-slate-800 border-l-4 border-purple-500">
                            <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase mb-2">Assigned To</p>
                            {officers.find((o) => o.id === selectedOfficer) && (
                                <div className="space-y-1">
                                    <p className="font-semibold text-gray-900 dark:text-white">{officers.find((o) => o.id === selectedOfficer)?.name}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{officers.find((o) => o.id === selectedOfficer)?.email}</p>
                                    <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                                        <span className="text-xs text-gray-500">
                                            Current: <span className="font-semibold">{officers.find((o) => o.id === selectedOfficer)?.assignedCount} requests</span> →{' '}
                                            <span className="font-semibold text-purple-600">{(officers.find((o) => o.id === selectedOfficer)?.assignedCount || 0) + 1} after assignment</span>
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => handleAssign()}
                            className="flex-1 btn bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 shadow-lg hover:from-blue-700 hover:to-purple-700 gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Confirm Assignment
                        </button>
                        <button
                            onClick={() => {
                                setSelectedRequest(null);
                                setSelectedOfficer(null);
                            }}
                            className="btn btn-outline-secondary gap-2"
                        >
                            <IconX className="h-4 w-4" />
                            Clear Selection
                        </button>
                    </div>
                </div>
            ) : (
                <div className="panel text-center py-12">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                        />
                    </svg>
                    <p className="font-semibold text-gray-700 dark:text-gray-300">Select Request & Officer</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Choose one request and one officer to proceed with assignment</p>
                </div>
            )}
        </div>
    );
};

export default AssignRequests;
