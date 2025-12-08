import { useEffect, useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { getApiUrl } from '../../../config/api';
import IconLoader from '../../../components/Icon/IconLoader';
import IconSquareCheck from '../../../components/Icon/IconSquareCheck';
import IconAlertCircle from '../../../components/Icon/IconAlertCircle';
import IconTrendingUp from '../../../components/Icon/IconTrendingUp';
import IconTrendingDown from '../../../components/Icon/IconTrendingDown';
import IconSearch from '../../../components/Icon/IconSearch';

interface DepartmentBudget {
    id: string;
    name: string;
    budget: number;
    spent: number;
    pending: number;
    approved: number;
    percentUsed: number;
}

interface FinancialReport {
    period: string;
    totalBudget: number;
    totalSpent: number;
    totalPending: number;
    utilization: number;
    requestCount: number;
    averageValue: number;
}

const FinancialManagement = () => {
    const dispatch = useDispatch();
    const [departmentBudgets, setDepartmentBudgets] = useState<DepartmentBudget[]>([]);
    const [reports, setReports] = useState<FinancialReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPeriod, setSelectedPeriod] = useState('current');
    const [showBudgetForm, setShowBudgetForm] = useState(false);
    const [editingBudget, setEditingBudget] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        budget: 0,
    });

    useEffect(() => {
        dispatch(setPageTitle('Financial Management'));
    }, [dispatch]);

    useEffect(() => {
        loadFinancialData();
    }, []);

    const loadFinancialData = async () => {
        setLoading(true);
        try {
            const [budgetsRes, reportsRes] = await Promise.all([fetch(getApiUrl('/api/departments')).catch(() => null), fetch(getApiUrl('/api/financial/reports')).catch(() => null)]);

            if (budgetsRes?.ok) {
                const data = await budgetsRes.json();
                const depts = Array.isArray(data) ? data : data.data || [];
                setDepartmentBudgets(depts);
            } else {
                setDepartmentBudgets([]);
            }

            if (reportsRes?.ok) {
                const data = await reportsRes.json();
                setReports(Array.isArray(data) ? data : data.data || []);
            } else {
                setReports([]);
            }
        } catch (e: any) {
            console.error('Failed to load financial data:', e.message);
            setDepartmentBudgets([]);
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredBudgets = useMemo(() => {
        return departmentBudgets.filter((budget) => !searchTerm || budget.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [departmentBudgets, searchTerm]);

    const handleEditBudget = (budget: DepartmentBudget) => {
        setEditingBudget(budget.id);
        setFormData({
            name: budget.name,
            budget: budget.budget,
        });
        setShowBudgetForm(true);
    };

    const handleSaveBudget = async () => {
        if (!formData.name || formData.budget <= 0) {
            return;
        }

        try {
            if (editingBudget) {
                setDepartmentBudgets(departmentBudgets.map((b) => (b.id === editingBudget ? { ...b, name: formData.name, budget: formData.budget } : b)));
            }
            setShowBudgetForm(false);
            setEditingBudget(null);
        } catch (e: any) {
            console.error('Failed to save budget:', e.message);
        }
    };

    const currentReport = reports.find((r) => r.period === 'Current Period');

    const getBudgetStatus = (percentUsed: number) => {
        if (percentUsed >= 90) return 'danger';
        if (percentUsed >= 75) return 'warning';
        return 'success';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <IconLoader className="w-12 h-12 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Financial Management</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Budget tracking, spending analysis, and cost reports</p>
            </div>

            {/* Edit Budget Form */}
            {showBudgetForm && (
                <div className="panel bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/40">
                    <h2 className="text-xl font-bold mb-4">Edit Department Budget</h2>
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Department Name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="form-input w-full"
                            disabled
                        />
                        <input
                            type="number"
                            placeholder="Budget Amount"
                            value={formData.budget}
                            onChange={(e) => setFormData({ ...formData, budget: parseFloat(e.target.value) })}
                            className="form-input w-full"
                        />
                        <div className="flex gap-2">
                            <button onClick={handleSaveBudget} className="btn btn-primary">
                                Save Budget
                            </button>
                            <button onClick={() => setShowBudgetForm(false)} className="btn btn-outline">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            {currentReport && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="panel p-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700/40">
                        <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Total Budget</p>
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-2">${(currentReport.totalBudget / 1000000).toFixed(1)}M</p>
                    </div>
                    <div className="panel p-5 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700/40">
                        <p className="text-sm font-semibold text-green-700 dark:text-green-300">Total Spent</p>
                        <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-2">${(currentReport.totalSpent / 1000000).toFixed(2)}M</p>
                    </div>
                    <div className="panel p-5 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-700/40">
                        <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-300">Pending</p>
                        <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-100 mt-2">${(currentReport.totalPending / 1000000).toFixed(2)}M</p>
                    </div>
                    <div className="panel p-5 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700/40">
                        <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">Budget Utilization</p>
                        <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-2">{currentReport.utilization}%</p>
                    </div>
                </div>
            )}

            {/* Reports */}
            <div>
                <h2 className="text-xl font-bold mb-4">Financial Reports</h2>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                                <th className="px-4 py-3 text-left font-semibold">Period</th>
                                <th className="px-4 py-3 text-left font-semibold">Total Budget</th>
                                <th className="px-4 py-3 text-left font-semibold">Total Spent</th>
                                <th className="px-4 py-3 text-left font-semibold">Pending</th>
                                <th className="px-4 py-3 text-left font-semibold">Utilization</th>
                                <th className="px-4 py-3 text-left font-semibold">Requests</th>
                                <th className="px-4 py-3 text-left font-semibold">Avg Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map((report, idx) => (
                                <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/20">
                                    <td className="px-4 py-3 font-semibold">{report.period}</td>
                                    <td className="px-4 py-3">${(report.totalBudget / 1000000).toFixed(1)}M</td>
                                    <td className="px-4 py-3">${(report.totalSpent / 1000000).toFixed(2)}M</td>
                                    <td className="px-4 py-3">${(report.totalPending / 1000000).toFixed(2)}M</td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-500" style={{ width: `${report.utilization}%` }} />
                                            </div>
                                            <span className="font-bold">{report.utilization}%</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">{report.requestCount}</td>
                                    <td className="px-4 py-3">${report.averageValue.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Department Budgets */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">Department Budgets</h2>
                    <div className="relative">
                        <input type="text" placeholder="Search departments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="form-input pl-10" />
                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredBudgets.map((budget) => (
                        <div key={budget.id} className="panel p-5 border-l-4 border-l-blue-500">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-lg">{budget.name}</h3>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">${(budget.budget / 1000).toFixed(0)}K</p>
                                </div>
                                <button onClick={() => handleEditBudget(budget)} className="btn btn-sm btn-outline-primary">
                                    Edit
                                </button>
                            </div>

                            {/* Budget breakdown */}
                            <div className="space-y-3">
                                <div>
                                    <div className="flex items-center justify-between text-sm mb-1">
                                        <span className="text-gray-600 dark:text-gray-400">Spent</span>
                                        <span className="font-semibold">${(budget.spent / 1000).toFixed(0)}K</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-500" style={{ width: `${(budget.spent / budget.budget) * 100}%` }} />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between text-sm mb-1">
                                        <span className="text-gray-600 dark:text-gray-400">Approved (Pending)</span>
                                        <span className="font-semibold">${(budget.approved / 1000).toFixed(0)}K</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-yellow-500" style={{ width: `${(budget.approved / budget.budget) * 100}%` }} />
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between">
                                        <span className="font-semibold">Total Usage</span>
                                        <span className={`badge badge-${getBudgetStatus(budget.percentUsed)}`}>{budget.percentUsed}%</span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Remaining: ${(budget.budget - budget.spent - budget.approved).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FinancialManagement;
