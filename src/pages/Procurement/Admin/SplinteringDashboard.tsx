import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconEye from '../../../components/Icon/IconEye';
import IconBell from '../../../components/Icon/IconBell';
import IconDollarSignCircle from '../../../components/Icon/IconDollarSignCircle';
import IconChartSquare from '../../../components/Icon/IconChartSquare';
import { getApiUrl } from '../../../utils/api';

interface SplinteringStats {
    totalRequests: number;
    timeFrame: string;
    potentialFlags: {
        highFrequencyVendors: Array<{
            vendor: string;
            requestCount: number;
            totalValue: number;
        }>;
        highFrequencyDepartments: Array<{
            department: string;
            requestCount: number;
            totalValue: number;
        }>;
        highFrequencyUsers: Array<{
            user: string;
            requestCount: number;
            totalValue: number;
        }>;
    };
}

const SplinteringDashboard = () => {
    const dispatch = useDispatch();
    const [stats, setStats] = useState<SplinteringStats | null>(null);
    const [timeFrame, setTimeFrame] = useState('30');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        dispatch(setPageTitle('Splintering Detection Dashboard'));
        loadStats();
    }, [dispatch, timeFrame]);

    const loadStats = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${getApiUrl('api/splintering/splintering-stats')}?timeFrame=${timeFrame}`);
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            // Error handled in UI
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-JM', {
            style: 'currency',
            currency: 'JMD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const getRiskLevel = (requestCount: number): { level: string; color: string } => {
        if (requestCount >= 10) return { level: 'HIGH', color: 'text-red-600' };
        if (requestCount >= 5) return { level: 'MEDIUM', color: 'text-yellow-600' };
        return { level: 'LOW', color: 'text-green-600' };
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <IconChartSquare className="text-primary" />
                        Splintering Detection Dashboard
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">Monitor and analyze procurement patterns for potential splintering</p>
                </div>

                <div className="flex items-center gap-3">
                    <label htmlFor="timeFrame" className="text-sm font-medium">
                        Time Frame:
                    </label>
                    <select id="timeFrame" value={timeFrame} onChange={(e) => setTimeFrame(e.target.value)} className="form-select w-auto">
                        <option value="7">Last 7 days</option>
                        <option value="30">Last 30 days</option>
                        <option value="90">Last 90 days</option>
                        <option value="180">Last 6 months</option>
                        <option value="365">Last year</option>
                    </select>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="panel">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-primary">Total Requests</h3>
                            <p className="text-2xl font-bold">{stats?.totalRequests || 0}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">in {stats?.timeFrame}</p>
                        </div>
                        <IconEye className="text-primary w-12 h-12 opacity-20" />
                    </div>
                </div>

                <div className="panel">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-warning">Vendor Flags</h3>
                            <p className="text-2xl font-bold text-warning">{stats?.potentialFlags.highFrequencyVendors.length || 0}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">high frequency vendors</p>
                        </div>
                        <IconBell className="text-warning w-12 h-12 opacity-20" />
                    </div>
                </div>

                <div className="panel">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-info">Department Flags</h3>
                            <p className="text-2xl font-bold text-info">{stats?.potentialFlags.highFrequencyDepartments.length || 0}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">departments with patterns</p>
                        </div>
                        <IconChartSquare className="text-info w-12 h-12 opacity-20" />
                    </div>
                </div>

                <div className="panel">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-danger">User Flags</h3>
                            <p className="text-2xl font-bold text-danger">{stats?.potentialFlags.highFrequencyUsers.length || 0}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">users with high activity</p>
                        </div>
                        <IconDollarSignCircle className="text-danger w-12 h-12 opacity-20" />
                    </div>
                </div>
            </div>

            {/* High-Risk Vendors */}
            {stats?.potentialFlags.highFrequencyVendors && stats.potentialFlags.highFrequencyVendors.length > 0 && (
                <div className="panel">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <IconBell className="text-warning" />
                        High-Frequency Vendors
                    </h2>
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Vendor</th>
                                    <th>Request Count</th>
                                    <th>Total Value</th>
                                    <th>Risk Level</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.potentialFlags.highFrequencyVendors.map((vendor, index) => {
                                    const risk = getRiskLevel(vendor.requestCount);
                                    return (
                                        <tr key={index}>
                                            <td className="font-semibold">{vendor.vendor}</td>
                                            <td>
                                                <span className="badge badge-outline-primary">{vendor.requestCount}</span>
                                            </td>
                                            <td className="font-mono">{formatCurrency(vendor.totalValue)}</td>
                                            <td>
                                                <span className={`font-semibold ${risk.color}`}>{risk.level}</span>
                                            </td>
                                            <td>
                                                <button className="btn btn-sm btn-outline-primary">Review Details</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* High-Activity Departments */}
            {stats?.potentialFlags.highFrequencyDepartments && stats.potentialFlags.highFrequencyDepartments.length > 0 && (
                <div className="panel">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <IconChartSquare className="text-info" />
                        High-Activity Departments
                    </h2>
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Department</th>
                                    <th>Request Count</th>
                                    <th>Total Value</th>
                                    <th>Risk Level</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.potentialFlags.highFrequencyDepartments.map((dept, index) => {
                                    const risk = getRiskLevel(dept.requestCount);
                                    return (
                                        <tr key={index}>
                                            <td className="font-semibold">{dept.department}</td>
                                            <td>
                                                <span className="badge badge-outline-info">{dept.requestCount}</span>
                                            </td>
                                            <td className="font-mono">{formatCurrency(dept.totalValue)}</td>
                                            <td>
                                                <span className={`font-semibold ${risk.color}`}>{risk.level}</span>
                                            </td>
                                            <td>
                                                <button className="btn btn-sm btn-outline-info">Analyze Pattern</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* High-Activity Users */}
            {stats?.potentialFlags.highFrequencyUsers && stats.potentialFlags.highFrequencyUsers.length > 0 && (
                <div className="panel">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                        <IconDollarSignCircle className="text-danger" />
                        High-Activity Users
                    </h2>
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Request Count</th>
                                    <th>Total Value</th>
                                    <th>Risk Level</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.potentialFlags.highFrequencyUsers.map((user, index) => {
                                    const risk = getRiskLevel(user.requestCount);
                                    return (
                                        <tr key={index}>
                                            <td className="font-semibold">{user.user}</td>
                                            <td>
                                                <span className="badge badge-outline-danger">{user.requestCount}</span>
                                            </td>
                                            <td className="font-mono">{formatCurrency(user.totalValue)}</td>
                                            <td>
                                                <span className={`font-semibold ${risk.color}`}>{risk.level}</span>
                                            </td>
                                            <td>
                                                <button className="btn btn-sm btn-outline-danger">View Profile</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* No Flags Message */}
            {stats && stats.potentialFlags.highFrequencyVendors.length === 0 && stats.potentialFlags.highFrequencyDepartments.length === 0 && stats.potentialFlags.highFrequencyUsers.length === 0 && (
                <div className="panel">
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">✅</div>
                        <h3 className="text-xl font-semibold text-green-600 mb-2">No Splintering Patterns Detected</h3>
                        <p className="text-gray-600 dark:text-gray-400">All procurement activity appears to be within normal parameters for the selected time frame.</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SplinteringDashboard;
