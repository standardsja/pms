import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { DEFAULT_SPLINTERING_RULES, type SplinteringRule } from '../../../utils/splinteringDetection';
import { showSuccess, showError } from '../../../utils/notifications';
import IconSettings from '../../../components/Icon/IconSettings';
import IconEdit from '../../../components/Icon/IconEdit';
import IconTrash from '../../../components/Icon/IconTrash';
import IconPlus from '../../../components/Icon/IconPlus';
import Swal from 'sweetalert2';

const SplinteringManagement = () => {
    const dispatch = useDispatch();
    const [rules, setRules] = useState<SplinteringRule[]>(DEFAULT_SPLINTERING_RULES);
    const [isLoading, setIsLoading] = useState(false);
    const [editingRule, setEditingRule] = useState<SplinteringRule | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    useEffect(() => {
        dispatch(setPageTitle('Anti-Splintering Management'));
        loadRules();
    }, [dispatch]);

    const loadRules = async () => {
        setIsLoading(true);
        try {
            // In a real app, this would fetch from backend
            // For now, use default rules from localStorage or defaults
            const savedRules = localStorage.getItem('splintering_rules');
            if (savedRules) {
                setRules(JSON.parse(savedRules));
            }
        } catch (error) {
            console.error('Failed to load splintering rules:', error);
            showError('Failed to load rules', 'Using default configuration');
        } finally {
            setIsLoading(false);
        }
    };

    const saveRule = async (rule: SplinteringRule) => {
        try {
            const updatedRules = editingRule ? rules.map((r) => (r.id === rule.id ? rule : r)) : [...rules, rule];

            // Save to localStorage (in real app, save to backend)
            localStorage.setItem('splintering_rules', JSON.stringify(updatedRules));
            setRules(updatedRules);

            showSuccess(editingRule ? 'Rule updated successfully' : 'Rule created successfully');
            setEditingRule(null);
            setShowAddModal(false);
        } catch (error) {
            console.error('Failed to save rule:', error);
            showError('Failed to save rule', 'Please try again');
        }
    };

    const deleteRule = async (ruleId: string) => {
        const result = await Swal.fire({
            title: 'Delete Splintering Rule?',
            text: 'This action cannot be undone',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            confirmButtonText: 'Yes, delete it',
        });

        if (result.isConfirmed) {
            const updatedRules = rules.filter((r) => r.id !== ruleId);
            localStorage.setItem('splintering_rules', JSON.stringify(updatedRules));
            setRules(updatedRules);
            showSuccess('Rule deleted successfully');
        }
    };

    const toggleRuleEnabled = (ruleId: string) => {
        const updatedRules = rules.map((rule) => (rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule));
        localStorage.setItem('splintering_rules', JSON.stringify(updatedRules));
        setRules(updatedRules);
    };

    const RuleForm = ({ rule, onSave, onCancel }: { rule?: SplinteringRule; onSave: (rule: SplinteringRule) => void; onCancel: () => void }) => {
        const [formData, setFormData] = useState<SplinteringRule>(
            rule || {
                id: `rule-${Date.now()}`,
                name: '',
                description: '',
                thresholdAmount: 25000,
                timeWindowDays: 90,
                enabled: true,
            }
        );

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-lg">
                    <h3 className="text-lg font-semibold mb-4">{rule ? 'Edit' : 'Add'} Splintering Rule</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Rule Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Vendor Spending Threshold"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Description</label>
                            <textarea
                                className="form-textarea"
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Describe what this rule checks for"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Threshold Amount (JMD)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.thresholdAmount}
                                onChange={(e) => setFormData({ ...formData, thresholdAmount: Number(e.target.value) })}
                                min="0"
                                step="1000"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Time Window (Days)</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.timeWindowDays}
                                onChange={(e) => setFormData({ ...formData, timeWindowDays: Number(e.target.value) })}
                                min="1"
                                max="365"
                            />
                        </div>

                        <div className="flex items-center">
                            <input type="checkbox" className="form-checkbox" checked={formData.enabled} onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })} />
                            <label className="ml-2 text-sm">Enable this rule</label>
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                        <button onClick={onCancel} className="btn btn-outline-secondary">
                            Cancel
                        </button>
                        <button onClick={() => onSave(formData)} className="btn btn-primary" disabled={!formData.name || !formData.description}>
                            {rule ? 'Update' : 'Create'} Rule
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-JM', {
            style: 'currency',
            currency: 'JMD',
        }).format(amount);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <IconSettings className="text-primary" />
                        Anti-Splintering Management
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">Configure rules to detect and prevent procurement splintering</p>
                </div>
                <button onClick={() => setShowAddModal(true)} className="btn btn-primary flex items-center gap-2">
                    <IconPlus />
                    Add Rule
                </button>
            </div>

            {/* Info Panel */}
            <div className="panel">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">🛡️ What is Procurement Splintering?</h3>
                    <p className="text-blue-700 dark:text-blue-300 text-sm mb-2">
                        Splintering is the practice of artificially breaking down large procurement requirements into smaller purchases to avoid:
                    </p>
                    <ul className="list-disc list-inside text-blue-700 dark:text-blue-300 text-sm space-y-1">
                        <li>Competitive bidding requirements</li>
                        <li>Higher approval authority thresholds</li>
                        <li>More stringent procurement procedures</li>
                        <li>Public transparency requirements</li>
                    </ul>
                </div>
            </div>

            {/* Rules Table */}
            <div className="panel">
                <div className="table-responsive">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Rule Name</th>
                                <th>Description</th>
                                <th>Threshold</th>
                                <th>Time Window</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rules.map((rule) => (
                                <tr key={rule.id}>
                                    <td>
                                        <label className="w-12 h-6 relative">
                                            <input
                                                type="checkbox"
                                                className="custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer peer"
                                                checked={rule.enabled}
                                                onChange={() => toggleRuleEnabled(rule.id)}
                                            />
                                            <span className="bg-[#ebedf2] dark:bg-dark block h-full rounded-full before:absolute before:left-1 before:bg-white  before:bottom-1 before:w-4 before:h-4 before:rounded-full before:transition-all before:duration-300 peer-checked:before:left-7 peer-checked:bg-primary"></span>
                                        </label>
                                    </td>
                                    <td className="font-semibold">{rule.name}</td>
                                    <td className="text-sm">{rule.description}</td>
                                    <td className="font-mono text-sm">{formatCurrency(rule.thresholdAmount)}</td>
                                    <td>{rule.timeWindowDays} days</td>
                                    <td>
                                        <div className="flex justify-center space-x-2">
                                            <button onClick={() => setEditingRule(rule)} className="text-blue-600 hover:text-blue-800" title="Edit rule">
                                                <IconEdit />
                                            </button>
                                            <button onClick={() => deleteRule(rule.id)} className="text-red-600 hover:text-red-800" title="Delete rule">
                                                <IconTrash />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="panel">
                    <div className="text-center">
                        <h3 className="text-2xl font-bold text-primary">{rules.filter((r) => r.enabled).length}</h3>
                        <p className="text-gray-600 dark:text-gray-400">Active Rules</p>
                    </div>
                </div>

                <div className="panel">
                    <div className="text-center">
                        <h3 className="text-2xl font-bold text-success">{formatCurrency(Math.min(...rules.map((r) => r.thresholdAmount)))}</h3>
                        <p className="text-gray-600 dark:text-gray-400">Lowest Threshold</p>
                    </div>
                </div>

                <div className="panel">
                    <div className="text-center">
                        <h3 className="text-2xl font-bold text-warning">{Math.max(...rules.map((r) => r.timeWindowDays))} days</h3>
                        <p className="text-gray-600 dark:text-gray-400">Longest Time Window</p>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showAddModal && <RuleForm onSave={saveRule} onCancel={() => setShowAddModal(false)} />}

            {editingRule && <RuleForm rule={editingRule} onSave={saveRule} onCancel={() => setEditingRule(null)} />}
        </div>
    );
};

export default SplinteringManagement;
