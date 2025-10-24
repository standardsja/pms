import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { setPageTitle } from '../../store/themeConfigSlice';
import IconPlus from '../../components/Icon/IconPlus';
import IconEye from '../../components/Icon/IconEye';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

const Requests = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    
    useEffect(() => {
        dispatch(setPageTitle('Requests'));
    }, [dispatch]);

    const [requests] = useState<any>([
        {
            id: 'REQ-001',
            title: 'Purchase Office Chairs',
            requester: 'Alice Johnson',
            department: 'HR',
            status: 'Pending Finance',
            date: '2025-10-20',
            items: [
                { description: 'Ergonomic Office Chair Model XYZ', quantity: 15, unitPrice: 350.00 },
                { description: 'Chair Assembly Service', quantity: 15, unitPrice: 10.00 }
            ],
            totalEstimated: 5400.00,
            fundingSource: 'Operational Budget',
            budgetCode: 'OP-2025-HR-001',
            justification: 'Current chairs are 8+ years old and causing employee back pain complaints. Ergonomic replacements will improve productivity and reduce sick leave.',
            comments: [],
            statusHistory: [
                { status: 'Submitted', date: '2025-10-20', actor: 'Alice Johnson', note: 'Request created' }
            ]
        },
        {
            id: 'REQ-002',
            title: 'Subscription: Design Tool',
            requester: 'Mark Benson',
            department: 'Design',
            status: 'Approved',
            date: '2025-10-14',
            items: [
                { description: 'Figma Professional Plan - Annual License', quantity: 5, unitPrice: 144.00 }
            ],
            totalEstimated: 720.00,
            fundingSource: 'Operational Budget',
            budgetCode: 'OP-2025-DES-003',
            justification: 'Design team needs collaborative design tool for client projects.',
            comments: [
                { actor: 'Finance Officer', date: '2025-10-15', text: 'Budget verified. Approved.' },
                { actor: 'Procurement Officer', date: '2025-10-16', text: 'Vendor contract signed.' }
            ],
            statusHistory: [
                { status: 'Submitted', date: '2025-10-14', actor: 'Mark Benson', note: 'Request created' },
                { status: 'Finance Verified', date: '2025-10-15', actor: 'Finance Officer', note: 'Budget approved' },
                { status: 'Approved', date: '2025-10-16', actor: 'Procurement Officer', note: 'Final approval' }
            ]
        },
        {
            id: 'REQ-003',
            title: 'Laptop Replacement',
            requester: 'Samuel Lee',
            department: 'Engineering',
            status: 'Returned by Finance',
            date: '2025-09-30',
            items: [
                { description: 'MacBook Pro 16" M3 Max', quantity: 1, unitPrice: 3499.00 }
            ],
            totalEstimated: 3499.00,
            fundingSource: 'Capital Budget',
            budgetCode: '',
            justification: 'Current laptop too slow for development work.',
            comments: [
                { actor: 'Finance Officer', date: '2025-10-02', text: 'Please provide budget code for capital purchases and business justification for high-spec model.' }
            ],
            statusHistory: [
                { status: 'Submitted', date: '2025-09-30', actor: 'Samuel Lee', note: 'Request created' },
                { status: 'Returned by Finance', date: '2025-10-02', actor: 'Finance Officer', note: 'Missing budget code' }
            ]
        },
    ]);

    // Simulated current user; replace with real auth when available
    const currentUserName = 'Alice Johnson';
    const showMineByPath = location.pathname.endsWith('/mine');
    const [showMineOnly, setShowMineOnly] = useState<boolean>(showMineByPath);

    useEffect(() => {
        // keep in sync if navigating between /apps/requests and /apps/requests/mine
        setShowMineOnly(showMineByPath);
    }, [showMineByPath]);

    const filteredRequests = useMemo(
        () => (showMineOnly ? requests.filter((r: any) => r.requester === currentUserName) : requests),
        [showMineOnly, requests]
    );

    // View request details modal
    const viewDetails = (req: any) => {
        const safe = (s: string) => {
            const charMap: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
            return s.replace(/[&<>"']/g, (c) => charMap[c]);
        };

        const itemsHtml = req.items.map((item: any, idx: number) => 
            `<tr class="border-t">
                <td class="px-3 py-2 text-left">${idx + 1}</td>
                <td class="px-3 py-2 text-left">${safe(item.description)}</td>
                <td class="px-3 py-2 text-center">${item.quantity}</td>
                <td class="px-3 py-2 text-right">$${item.unitPrice.toFixed(2)}</td>
                <td class="px-3 py-2 text-right font-medium">$${(item.quantity * item.unitPrice).toFixed(2)}</td>
            </tr>`
        ).join('');

        const commentsHtml = req.comments.length > 0 
            ? req.comments.map((c: any) => 
                `<div class="p-3 bg-gray-50 rounded mb-2">
                    <div class="font-medium text-sm">${safe(c.actor)} <span class="text-gray-500 font-normal">on ${c.date}</span></div>
                    <div class="text-sm mt-1">${safe(c.text)}</div>
                </div>`
            ).join('')
            : '<p class="text-gray-500 text-sm">No comments yet.</p>';

        const historyHtml = req.statusHistory.map((h: any) => 
            `<div class="flex justify-between items-start py-2 border-b last:border-0">
                <div>
                    <div class="font-medium text-sm">${safe(h.status)}</div>
                    <div class="text-xs text-gray-500">${safe(h.note)}</div>
                </div>
                <div class="text-xs text-gray-500 text-right">
                    <div>${safe(h.actor)}</div>
                    <div>${h.date}</div>
                </div>
            </div>`
        ).join('');

        MySwal.fire({
            title: `Request Details: ${safe(req.id)}`,
            html: `
                <div class="text-left space-y-4">
                    <div>
                        <h3 class="font-semibold text-lg mb-2">${safe(req.title)}</h3>
                        <div class="grid grid-cols-2 gap-2 text-sm">
                            <div><span class="font-medium">Requester:</span> ${safe(req.requester)}</div>
                            <div><span class="font-medium">Department:</span> ${safe(req.department)}</div>
                            <div><span class="font-medium">Date Submitted:</span> ${req.date}</div>
                            <div><span class="font-medium">Status:</span> ${safe(req.status)}</div>
                        </div>
                    </div>

                    <div>
                        <h4 class="font-semibold mb-2">Budget Information</h4>
                        <div class="text-sm space-y-1">
                            <div><span class="font-medium">Total Amount:</span> <span class="text-lg font-bold text-blue-600">$${req.totalEstimated.toFixed(2)}</span></div>
                            <div><span class="font-medium">Funding Source:</span> ${safe(req.fundingSource || '—')}</div>
                            <div><span class="font-medium">Budget Code:</span> ${safe(req.budgetCode || '—')}</div>
                        </div>
                    </div>

                    <div>
                        <h4 class="font-semibold mb-2">Items/Services</h4>
                        <table class="w-full text-sm border-collapse border">
                            <thead class="bg-gray-100">
                                <tr>
                                    <th class="px-3 py-2 text-left">#</th>
                                    <th class="px-3 py-2 text-left">Description</th>
                                    <th class="px-3 py-2 text-center">Qty</th>
                                    <th class="px-3 py-2 text-right">Unit Price</th>
                                    <th class="px-3 py-2 text-right">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>
                    </div>

                    <div>
                        <h4 class="font-semibold mb-2">Justification</h4>
                        <p class="text-sm bg-gray-50 p-3 rounded">${safe(req.justification)}</p>
                    </div>

                    <div>
                        <h4 class="font-semibold mb-2">Comments & Feedback</h4>
                        ${commentsHtml}
                    </div>

                    <div>
                        <h4 class="font-semibold mb-2">Status History</h4>
                        <div class="text-sm border rounded p-3">
                            ${historyHtml}
                        </div>
                    </div>
                </div>
            `,
            width: '800px',
            showCloseButton: true,
            showConfirmButton: false,
            customClass: {
                popup: 'text-left'
            }
        });
    };

    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold">Requests</h1>
                    <p className="text-sm text-muted-foreground">Manage acquisition and procurement requests</p>
                </div>
                <div>
                    <button
                        className="inline-flex items-center gap-2 px-4 py-2 rounded bg-primary text-white hover:opacity-95"
                        type="button"
                        onClick={() => navigate('/apps/requests/new')}
                    >
                        <IconPlus />
                        New Request
                    </button>
                </div>
            </div>

            {/* Filter controls */}
            <div className="mb-4 flex items-center gap-2">
                <button
                    className={`px-3 py-1.5 rounded border text-sm ${!showMineOnly ? 'bg-primary text-white border-primary' : 'border-gray-300 dark:border-gray-600'}`}
                    onClick={() => {
                        setShowMineOnly(false);
                        if (location.pathname.endsWith('/mine')) navigate('/apps/requests');
                    }}
                    type="button"
                >
                    All Requests
                </button>
                <button
                    className={`px-3 py-1.5 rounded border text-sm ${showMineOnly ? 'bg-primary text-white border-primary' : 'border-gray-300 dark:border-gray-600'}`}
                    onClick={() => {
                        setShowMineOnly(true);
                        if (!location.pathname.endsWith('/mine')) navigate('/apps/requests/mine');
                    }}
                    type="button"
                >
                    My Requests
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 shadow rounded overflow-hidden">
                <table className="min-w-full table-auto">
                    <thead className="bg-slate-50 dark:bg-slate-700 text-sm">
                        <tr>
                            <th className="px-4 py-3 text-left">ID</th>
                            <th className="px-4 py-3 text-left">Title</th>
                            <th className="px-4 py-3 text-left">Requester</th>
                            <th className="px-4 py-3 text-left">Department</th>
                            <th className="px-4 py-3 text-left">Status</th>
                            <th className="px-4 py-3 text-left">Date</th>
                            <th className="px-4 py-3 text-left">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm">
                        {filteredRequests.map((r: any) => {
                            // Status badge colors for quick visual tracking
                            const getStatusBadge = (status: string) => {
                                const statusMap: Record<string, { bg: string; text: string; label: string }> = {
                                    'Pending Finance': { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', label: 'Pending Finance' },
                                    'Finance Verified': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-800 dark:text-blue-300', label: 'Finance Verified' },
                                    'Pending Procurement': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-800 dark:text-purple-300', label: 'Pending Procurement' },
                                    'Approved': { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-800 dark:text-emerald-300', label: 'Approved' },
                                    'Returned by Finance': { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-800 dark:text-rose-300', label: 'Returned' },
                                    'Rejected': { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-800 dark:text-rose-300', label: 'Rejected' },
                                    'Fulfilled': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', label: 'Fulfilled' },
                                };
                                return statusMap[status] || { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300', label: status };
                            };
                            
                            const badge = getStatusBadge(r.status);
                            
                            return (
                                <tr key={r.id} className="border-t last:border-b hover:bg-slate-50 dark:hover:bg-slate-700">
                                    <td className="px-4 py-3 font-medium">{r.id}</td>
                                    <td className="px-4 py-3">{r.title}</td>
                                    <td className="px-4 py-3">{r.requester}</td>
                                    <td className="px-4 py-3">{r.department}</td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
                                            {badge.label}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">{r.date}</td>
                                    <td className="px-4 py-3">
                                        <button
                                            className="p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600"
                                            onClick={() => viewDetails(r)}
                                            title="View Details"
                                        >
                                            <IconEye className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Requests;
