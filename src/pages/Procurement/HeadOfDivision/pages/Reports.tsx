import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../../store/themeConfigSlice';
import { selectUser } from '../../../../store/authSlice';
import IconPlus from '../../../../components/Icon/IconPlus';
import IconSearch from '../../../../components/Icon/IconSearch';
import IconDownload from '../../../../components/Icon/IconDownload';
import { getApiUrl, getAuthHeadersSync } from '../../../../utils/api';
import { showError, showInfo, showSuccess } from '../../../../utils/notifications';

interface Report {
    id: string;
    title: string;
    type: string;
    generatedBy: string;
    generatedById?: string;
    period: string;
    status: string;
    createdAt: string;
    division?: string;
    fileUrl?: string;
}

const HODReports: React.FC = () => {
    const dispatch = useDispatch();
    const user = useSelector(selectUser);
    const [reports, setReports] = useState<Report[]>([]);
    const [filteredReports, setFilteredReports] = useState<Report[]>([]);
    const [searchValue, setSearchValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('HOD - Reports'));
        fetchReports();

        // Set up real-time polling every 20 seconds
        const interval = setInterval(() => {
            fetchReports();
        }, 20000);
        setRefreshInterval(interval);

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [dispatch, user?.id, user?.department_id]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            // Fetch reports for the HOD's division/department
            const userDepartment = user?.department_id || user?.department_name || 'all';
            const hodId = user?.id;

            const url = getApiUrl(
                `/api/v1/reports?division=${encodeURIComponent(String(userDepartment))}&hod=${encodeURIComponent(String(hodId || ''))}&status=${encodeURIComponent('Completed,In Progress')}`
            );
            const response = await fetch(url, { headers: getAuthHeadersSync() });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const reportData = data.reports || data;

            // Sort by creation date (newest first)
            const sortedReports = Array.isArray(reportData) ? reportData.sort((a: Report, b: Report) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];

            setReports(sortedReports);
            setFilteredReports(sortedReports);
        } catch (error) {
            console.error('Error fetching reports:', error);
            showError('Failed to load reports', error instanceof Error ? error.message : undefined);
            // Fallback to mock data
            const mockData: Report[] = [
                {
                    id: '1',
                    title: 'Procurement Summary - Q4 2024',
                    type: 'Procurement Summary',
                    generatedBy: 'John Smith',
                    period: 'Q4 2024',
                    status: 'Completed',
                    createdAt: '2024-12-01',
                    fileUrl: '/reports/procurement-q4-2024.pdf',
                },
                {
                    id: '2',
                    title: 'Budget Utilization Report - December 2024',
                    type: 'Budget Report',
                    generatedBy: 'Sarah Johnson',
                    period: 'December 2024',
                    status: 'Completed',
                    createdAt: '2024-12-05',
                    fileUrl: '/reports/budget-dec-2024.pdf',
                },
                {
                    id: '3',
                    title: 'Department Performance Analysis',
                    type: 'Performance Report',
                    generatedBy: 'Michael Chen',
                    period: 'November - December 2024',
                    status: 'In Progress',
                    createdAt: '2024-12-06',
                },
                {
                    id: '4',
                    title: 'Supplier Performance Metrics',
                    type: 'Supplier Report',
                    generatedBy: 'Alice Johnson',
                    period: 'Q4 2024',
                    status: 'Completed',
                    createdAt: '2024-12-02',
                    fileUrl: '/reports/supplier-q4-2024.pdf',
                },
            ];
            setReports(mockData);
            setFilteredReports(mockData);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (value: string) => {
        setSearchValue(value);
        if (!value) {
            setFilteredReports(reports);
        } else {
            const filtered = reports.filter(
                (report) =>
                    report.title.toLowerCase().includes(value.toLowerCase()) || report.type.toLowerCase().includes(value.toLowerCase()) || report.period.toLowerCase().includes(value.toLowerCase())
            );
            setFilteredReports(filtered);
        }
    };

    const handleDownload = (id: string) => {
        showSuccess('Downloading', `Report ${id}`);
    };

    const handleViewDetails = (id: string) => {
        showInfo('Report Details', `View details for report ${id}`);
    };

    const handleGenerateReport = () => {
        showInfo('Generate Report', 'Select report type and period');
    };

    return (
        <div>
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Reports</h1>
                <button onClick={handleGenerateReport} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition">
                    <IconPlus className="w-5 h-5" />
                    Generate Report
                </button>
            </div>

            {/* Search and Filter */}
            <div className="mb-6 flex gap-4">
                <div className="flex-1 relative">
                    <IconSearch className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search reports..."
                        value={searchValue}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark dark:border-gray-600 dark:text-white"
                    />
                </div>
            </div>

            {/* Reports Table */}
            <div className="bg-white dark:bg-dark rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : filteredReports.length === 0 ? (
                    <div className="flex justify-center items-center h-64">
                        <p className="text-gray-500 dark:text-gray-400">No reports found</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Report Title</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Type</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Period</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Generated By</th>
                                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredReports.map((report) => (
                                <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">{report.title}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{report.type}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{report.period}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                report.status === 'Completed'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                    : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                            }`}
                                        >
                                            {report.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{report.generatedBy}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex gap-2 justify-center">
                                            <button onClick={() => handleViewDetails(report.id)} className="text-primary hover:text-primary/80 text-sm font-medium transition">
                                                View
                                            </button>
                                            {report.status === 'Completed' && (
                                                <button onClick={() => handleDownload(report.id)} className="text-primary hover:text-primary/80 text-sm font-medium transition" title="Download">
                                                    <IconDownload className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default HODReports;
