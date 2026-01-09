import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { getApiUrl } from '../../../config/api';
import { getToken } from '../../../utils/auth';
import Swal from 'sweetalert2';
import IconBarChart from '../../../components/Icon/IconBarChart';
import IconEye from '../../../components/Icon/IconEye';
import IconChecks from '../../../components/Icon/IconChecks';
import IconX from '../../../components/Icon/IconX';
import IconDownload from '../../../components/Icon/IconDownload';
import IconClock from '../../../components/Icon/IconClock';
import IconDollarSignCircle from '../../../components/Icon/IconDollarSignCircle';
import IconCircleCheck from '../../../components/Icon/IconCircleCheck';
import IconThumbUp from '../../../components/Icon/IconThumbUp';

const ExecutiveDirectorReports = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Executive Director - Strategic Reports'));
    });

    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [reviewModal, setReviewModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState<any>(null);
    const [executiveComments, setExecutiveComments] = useState('');
    const [reportViewModal, setReportViewModal] = useState(false);
    const [executiveReports, setExecutiveReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const apiUrl = getApiUrl();
            const token = getToken();

            const response = await fetch(`${apiUrl}/requests`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) throw new Error('Failed to fetch reports');

            const data = await response.json();
            setExecutiveReports(data);
        } catch (error) {
            console.error('Error fetching reports:', error);
            Swal.fire('Error', 'Failed to load reports', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Filter reports based on status
    const filteredReports = executiveReports.filter((report: any) => {
        if (filter === 'all') return true;
        if (filter === 'pending') return report.status === 'EXECUTIVE_REVIEW';
        if (filter === 'approved') return report.status === 'FINANCE_APPROVED';
        if (filter === 'rejected') return report.status === 'REJECTED';
        return true;
    });

    // Statistics - calculated from actual database data
    const stats = {
        total: executiveReports.length,
        pending: executiveReports.filter((r: any) => r.status === 'EXECUTIVE_REVIEW').length,
        approved: executiveReports.filter((r: any) => r.status === 'FINANCE_APPROVED').length,
        rejected: executiveReports.filter((r: any) => r.status === 'REJECTED').length,
        totalValue: executiveReports.reduce((sum: number, r: any) => sum + (r.totalEstimated || 0), 0),
    };

    const handleReviewReport = (report: any) => {
        setSelectedReport(report);
        setReviewModal(true);
        setExecutiveComments('');
    };

    const handleViewReport = (report: any) => {
        setSelectedReport(report);
        setReportViewModal(true);
    };

    const submitExecutiveReview = async (decision: 'approve' | 'reject') => {
        if (!executiveComments.trim()) {
            Swal.fire('Error', 'Please provide executive comments', 'error');
            return;
        }

        try {
            const apiUrl = getApiUrl();
            const token = getToken();

            const response = await fetch(`${apiUrl}/requests/${selectedReport?.id}/action`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    action: decision === 'approve' ? 'APPROVE' : 'REJECT',
                    comments: executiveComments,
                }),
            });

            if (!response.ok) throw new Error('Failed to process review');

            await Swal.fire('Success', `Report ${decision}d successfully`, 'success');
            setReviewModal(false);
            setSelectedReport(null);
            setExecutiveComments('');

            // Refresh reports list
            fetchReports();
        } catch (error) {
            console.error('Error processing review:', error);
            Swal.fire('Error', 'Failed to process review', 'error');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'EXECUTIVE_REVIEW':
            case 'Pending Executive Review':
                return 'badge-outline-warning';
            case 'FINANCE_APPROVED':
            case 'Approved by Executive':
                return 'badge-outline-success';
            case 'REJECTED':
            case 'Rejected by Executive':
                return 'badge-outline-danger';
            default:
                return 'badge-outline-primary';
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'Critical':
                return 'badge-outline-danger';
            case 'High':
                return 'badge-outline-warning';
            case 'Medium':
                return 'badge-outline-info';
            case 'Low':
                return 'badge-outline-success';
            default:
                return 'badge-outline-primary';
        }
    };

    if (loading) {
        return (
            <div className="panel">
                <div className="mb-5 flex items-center justify-between">
                    <h5 className="text-lg font-semibold">Executive Strategic Reports</h5>
                </div>
                <div className="text-center py-10">Loading reports...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="panel">
                <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <h5 className="text-lg font-semibold">Strategic Reports</h5>
                    <div className="flex gap-3">
                        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="form-select">
                            <option value="all">All Status</option>
                            <option value="EXECUTIVE_REVIEW">Pending</option>
                            <option value="FINANCE_APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                        </select>
                    </div>
                </div>

                {filteredReports.length === 0 ? (
                    <div className="text-center py-10">No reports found</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="px-4 py-3 text-left font-semibold">Title</th>
                                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                                    <th className="px-4 py-3 text-left font-semibold">Value</th>
                                    <th className="px-4 py-3 text-center font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredReports.map((report: any) => (
                                    <tr key={report.id} className="border-b border-gray-200 dark:border-gray-700">
                                        <td className="px-4 py-3">{report.title}</td>
                                        <td className="px-4 py-3">
                                            <span className={`badge ${getStatusBadge(report.status)}`}>{report.status}</span>
                                        </td>
                                        <td className="px-4 py-3 font-semibold">${(report.totalEstimated || 0).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleViewReport(report)} className="btn-xs btn-info" title="View Report">
                                                    <IconEye />
                                                </button>
                                                {report.status === 'EXECUTIVE_REVIEW' && (
                                                    <button onClick={() => handleReviewReport(report)} className="btn-xs btn-warning" title="Review">
                                                        <IconChecks />
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

            {/* Review Modal */}
            {reviewModal && selectedReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="panel w-full max-w-2xl space-y-4">
                        <div className="mb-4 flex items-center justify-between">
                            <h5 className="text-lg font-semibold">Executive Review</h5>
                            <button onClick={() => setReviewModal(false)} className="text-gray-400 hover:text-gray-600">
                                <IconX />
                            </button>
                        </div>

                        <div className="space-y-3 border-y border-gray-200 py-4 dark:border-gray-700">
                            <div>
                                <label className="block text-sm font-semibold">Report</label>
                                <p className="text-gray-600 dark:text-gray-400">{selectedReport.title}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold">Value</label>
                                <p className="text-gray-600 dark:text-gray-400">${(selectedReport.totalEstimated || 0).toLocaleString()}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold">Executive Comments</label>
                                <textarea
                                    value={executiveComments}
                                    onChange={(e) => setExecutiveComments(e.target.value)}
                                    placeholder="Enter your executive comments..."
                                    rows={5}
                                    className="form-textarea"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button onClick={() => setReviewModal(false)} className="btn btn-outline">
                                Cancel
                            </button>
                            <button onClick={() => submitExecutiveReview('reject')} className="btn btn-danger">
                                Reject
                            </button>
                            <button onClick={() => submitExecutiveReview('approve')} className="btn btn-success">
                                Approve
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Report Modal */}
            {reportViewModal && selectedReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="panel w-full max-w-3xl max-h-[90vh] space-y-4 overflow-y-auto">
                        <div className="mb-4 flex items-center justify-between">
                            <h5 className="text-lg font-semibold">Report Details</h5>
                            <button onClick={() => setReportViewModal(false)} className="text-gray-400 hover:text-gray-600">
                                <IconX />
                            </button>
                        </div>

                        <div className="space-y-4 border-y border-gray-200 py-4 dark:border-gray-700">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold">Type</label>
                                    <p className="text-gray-600 dark:text-gray-400">{selectedReport.procurementType || 'Report'}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold">Status</label>
                                    <span className={`badge ${getStatusBadge(selectedReport.status)}`}>{selectedReport.status}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold">Title</label>
                                <p className="text-gray-600 dark:text-gray-400">{selectedReport.title}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold">Description</label>
                                <p className="text-gray-600 dark:text-gray-400">{selectedReport.description}</p>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button onClick={() => setReportViewModal(false)} className="btn btn-outline">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExecutiveDirectorReports;
