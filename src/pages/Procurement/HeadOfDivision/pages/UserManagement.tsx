import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../../store/themeConfigSlice';
import { selectUser } from '../../../../store/authSlice';
import IconPlus from '../../../../components/Icon/IconPlus';
import IconSearch from '../../../../components/Icon/IconSearch';
import { getApiUrl, getAuthHeadersSync } from '../../../../utils/api';
import { showConfirm, showError, showInfo, showSuccess } from '../../../../utils/notifications';

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    department: string;
    status: string;
    createdAt: string;
    lastActive?: string;
}

const HODUserManagement: React.FC = () => {
    const dispatch = useDispatch();
    const currentUser = useSelector(selectUser);
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [searchValue, setSearchValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

    useEffect(() => {
        dispatch(setPageTitle('HOD - User Management'));
        fetchUsers();

        // Set up real-time polling every 15 seconds
        const interval = setInterval(() => {
            fetchUsers();
        }, 15000);
        setRefreshInterval(interval);

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [dispatch, currentUser?.id, currentUser?.department_id]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // Get users in the same department as the HOD
            const userDepartment = currentUser?.department_id || currentUser?.department_name || 'all';
            const hodId = currentUser?.id;

            const url = getApiUrl(`/api/v1/users?department=${encodeURIComponent(String(userDepartment))}&excludeRole=HEAD_OF_DIVISION&hod=${encodeURIComponent(String(hodId || ''))}`);
            const response = await fetch(url, { headers: getAuthHeadersSync() });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const userData = data.users || data;

            setUsers(userData);
            setFilteredUsers(userData);
        } catch (error) {
            console.error('Error fetching users:', error);
            showError('Failed to load users', error instanceof Error ? error.message : undefined);
            // Fallback to mock data
            const mockData: User[] = [
                {
                    id: '1',
                    name: 'Alice Johnson',
                    email: 'alice.johnson@example.com',
                    role: 'Department Manager',
                    department: 'Finance',
                    status: 'Active',
                    createdAt: '2024-01-15',
                    lastActive: new Date(Date.now() - 3600000).toISOString(),
                },
                {
                    id: '2',
                    name: 'Bob Smith',
                    email: 'bob.smith@example.com',
                    role: 'Procurement Officer',
                    department: 'Procurement',
                    status: 'Active',
                    createdAt: '2024-01-20',
                    lastActive: new Date(Date.now() - 1800000).toISOString(),
                },
                {
                    id: '3',
                    name: 'Carol White',
                    email: 'carol.white@example.com',
                    role: 'Finance Manager',
                    department: 'Finance',
                    status: 'Inactive',
                    createdAt: '2024-02-01',
                    lastActive: new Date(Date.now() - 86400000).toISOString(),
                },
                {
                    id: '4',
                    name: 'David Brown',
                    email: 'david.brown@example.com',
                    role: 'Requester',
                    department: 'Operations',
                    status: 'Active',
                    createdAt: '2024-02-10',
                    lastActive: new Date(Date.now() - 600000).toISOString(),
                },
            ];
            setUsers(mockData);
            setFilteredUsers(mockData);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (value: string) => {
        setSearchValue(value);
        if (!value) {
            setFilteredUsers(users);
        } else {
            const filtered = users.filter(
                (user) => user.name.toLowerCase().includes(value.toLowerCase()) || user.email.toLowerCase().includes(value.toLowerCase()) || user.role.toLowerCase().includes(value.toLowerCase())
            );
            setFilteredUsers(filtered);
        }
    };

    const handleEditUser = (id: string) => {
        showInfo('Edit User', `Edit user ${id}`);
    };

    const handleDeactivateUser = (id: string) => {
        showConfirm('Deactivate User?', 'This action cannot be easily reversed.').then((res) => {
            if (res.isConfirmed) {
                showSuccess('User deactivated');
            }
        });
    };

    return (
        <div>
            {/* Dual Role Warning */}
            <div className="mb-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 text-amber-800 dark:text-amber-200">
                <p className="font-semibold mb-1">⚠️ Dual Role Warning</p>
                <p className="text-sm">Assigning multiple roles to the same user can affect dashboard routing and sidebar visibility. Higher-priority roles take precedence.</p>
                <p className="text-xs italic mt-1">Known conflict: REQUESTER + DEPARTMENT_MANAGER will only show Department Manager interface.</p>
            </div>

            {/* Page Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">User Management</h1>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition">
                    <IconPlus className="w-5 h-5" />
                    Add User
                </button>
            </div>

            {/* Search and Filter */}
            <div className="mb-6 flex gap-4">
                <div className="flex-1 relative">
                    <IconSearch className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search users by name, email, or role..."
                        value={searchValue}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark dark:border-gray-600 dark:text-white"
                    />
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-dark rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="flex justify-center items-center h-64">
                        <p className="text-gray-500 dark:text-gray-400">No users found</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Name</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Email</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Role</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Department</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">{user.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{user.email}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{user.role}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{user.department}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                                                user.status === 'Active'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                            }`}
                                        >
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex gap-2 justify-center">
                                            <button onClick={() => handleEditUser(user.id)} className="text-primary hover:text-primary/80 text-sm font-medium transition">
                                                Edit
                                            </button>
                                            <button onClick={() => handleDeactivateUser(user.id)} className="text-red-500 hover:text-red-700 text-sm font-medium transition">
                                                Deactivate
                                            </button>
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

export default HODUserManagement;
