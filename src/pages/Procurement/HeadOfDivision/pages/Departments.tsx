import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../../store/themeConfigSlice';
import { selectUser } from '../../../../store/authSlice';
import IconPlus from '../../../../components/Icon/IconPlus';
import IconSearch from '../../../../components/Icon/IconSearch';
import { getApiUrl, getAuthHeadersSync } from '../../../../utils/api';
import { showError, showInfo } from '../../../../utils/notifications';

interface Department {
    id: string;
    name: string;
    code: string;
    head: string;
    headId?: string;
    budget: number;
    status: string;
    createdAt: string;
    division?: string;
}

const HODDepartments: React.FC = () => {
    const dispatch = useDispatch();
    const user = useSelector(selectUser);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([]);
    const [searchValue, setSearchValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('HOD - Departments'));
        fetchDepartments();

        // Set up real-time polling every 10 seconds
        const interval = setInterval(() => {
            fetchDepartments();
        }, 10000);
        setRefreshInterval(interval);

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [dispatch, user?.id, user?.department_id]);

    const fetchDepartments = async () => {
        setLoading(true);
        try {
            // Use user's department to filter data
            const userDepartment = user?.department_id || user?.department_name || 'all';
            const userId = user?.id;

            // Fetch real-time data from API
            const url = getApiUrl(`/api/v1/departments?division=${encodeURIComponent(String(userDepartment))}&hod=${encodeURIComponent(String(userId || ''))}`);
            const response = await fetch(url, { headers: getAuthHeadersSync() });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            // Filter departments for this HOD
            const filteredData = data.departments || data;
            setDepartments(filteredData);
            setFilteredDepartments(filteredData);
        } catch (error) {
            console.error('Error fetching departments:', error);
            showError('Failed to load departments', error instanceof Error ? error.message : undefined);
            // Fallback to mock data if API unavailable
            const mockData: Department[] = [
                {
                    id: '1',
                    name: 'Finance',
                    code: 'FIN',
                    head: 'John Smith',
                    budget: 500000,
                    status: 'Active',
                    createdAt: '2024-01-15',
                },
                {
                    id: '2',
                    name: 'Procurement',
                    code: 'PROC',
                    head: 'Sarah Johnson',
                    budget: 750000,
                    status: 'Active',
                    createdAt: '2024-01-20',
                },
                {
                    id: '3',
                    name: 'Operations',
                    code: 'OPS',
                    head: 'Michael Chen',
                    budget: 600000,
                    status: 'Active',
                    createdAt: '2024-02-01',
                },
            ];
            setDepartments(mockData);
            setFilteredDepartments(mockData);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (value: string) => {
        setSearchValue(value);
        if (!value) {
            setFilteredDepartments(departments);
        } else {
            const filtered = departments.filter(
                (dept) => dept.name.toLowerCase().includes(value.toLowerCase()) || dept.code.toLowerCase().includes(value.toLowerCase()) || dept.head.toLowerCase().includes(value.toLowerCase())
            );
            setFilteredDepartments(filtered);
        }
    };

    const handleViewDetails = (id: string) => {
        showInfo('Department Details', `View details for department ${id}`);
    };

    return (
        <div>
            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Departments Management</h1>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition">
                    <IconPlus className="w-5 h-5" />
                    Add Department
                </button>
            </div>

            {/* Search and Filter */}
            <div className="mb-6 flex gap-4">
                <div className="flex-1 relative">
                    <IconSearch className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search departments..."
                        value={searchValue}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark dark:border-gray-600 dark:text-white"
                    />
                </div>
            </div>

            {/* Departments Table */}
            <div className="bg-white dark:bg-dark rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : filteredDepartments.length === 0 ? (
                    <div className="flex justify-center items-center h-64">
                        <p className="text-gray-500 dark:text-gray-400">No departments found</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Department Name</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Code</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Department Head</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Budget</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredDepartments.map((dept) => (
                                <tr key={dept.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">{dept.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{dept.code}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{dept.head}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">${dept.budget.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium dark:bg-green-900 dark:text-green-200">{dept.status}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button onClick={() => handleViewDetails(dept.id)} className="text-primary hover:text-primary/80 text-sm font-medium transition">
                                            View Details
                                        </button>
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

export default HODDepartments;
