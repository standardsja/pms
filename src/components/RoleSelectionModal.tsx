/**
 * Role Selection Modal Component
 * Allows users to request a specific role for a module
 */

import React, { useState, useEffect } from 'react';
import IconX from './Icon/IconX';
import IconCircleCheck from './Icon/IconCircleCheck';
import IconInfoTriangle from './Icon/IconInfoTriangle';
import IconLoader from './Icon/IconLoader';

interface RoleSelectionModalProps {
    isOpen: boolean;
    moduleName: string;
    moduleDisplay: string;
    onClose: () => void;
    onSubmit: (data: { role: string; departmentId?: number; reason?: string }) => Promise<void>;
    departments?: Array<{
        id: number;
        name: string;
    }>;
}

const ROLE_OPTIONS = [
    {
        value: 'PROCUREMENT_OFFICER',
        label: 'Procurement Officer',
        description: 'Review and process procurement requests',
    },
    {
        value: 'PROCUREMENT_MANAGER',
        label: 'Procurement Manager',
        description: 'Oversee procurement processes and officers',
    },
    {
        value: 'FINANCE_OFFICER',
        label: 'Finance Officer',
        description: 'Handle payment processing and financial approvals',
    },
    {
        value: 'DEPARTMENT_HEAD',
        label: 'Department Head',
        description: 'Approve requests from your department',
    },
];

export const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({ isOpen, moduleName, moduleDisplay, onClose, onSubmit, departments = [] }) => {
    const [selectedRole, setSelectedRole] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!selectedRole) {
            setError('Please select a role');
            return;
        }

        setLoading(true);

        try {
            await onSubmit({
                role: selectedRole,
                departmentId: selectedDepartment ? parseInt(selectedDepartment) : undefined,
                reason: reason || undefined,
            });

            setSuccess(true);
            setSelectedRole('');
            setSelectedDepartment('');
            setReason('');

            // Auto-close after 2 seconds
            setTimeout(() => {
                onClose();
                setSuccess(false);
            }, 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit role request');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-gray-900">Request Role Access</h2>
                    <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-gray-600">
                        <IconX className="h-6 w-6" />
                    </button>
                </div>

                {/* Module info */}
                <div className="mb-6 rounded-lg bg-blue-50 p-4">
                    <p className="text-sm text-gray-600">You are requesting access to:</p>
                    <p className="mt-1 text-lg font-semibold text-blue-900">{moduleDisplay}</p>
                </div>

                {/* Success message */}
                {success && (
                    <div className="mb-6 flex items-center gap-3 rounded-lg bg-green-50 p-4">
                        <IconCircleCheck className="h-5 w-5 text-green-600" />
                        <div>
                            <p className="font-semibold text-green-900">Request submitted!</p>
                            <p className="text-sm text-green-700">An administrator will review your request shortly.</p>
                        </div>
                    </div>
                )}

                {/* Error message */}
                {error && (
                    <div className="mb-6 flex items-center gap-3 rounded-lg bg-red-50 p-4">
                        <IconInfoTriangle className="h-5 w-5 text-red-600" />
                        <div>
                            <p className="font-semibold text-red-900">Error</p>
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                )}

                {!success && (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Role Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Select Role *</label>
                            <div className="space-y-2">
                                {ROLE_OPTIONS.map((role) => (
                                    <label key={role.value} className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50 transition">
                                        <input
                                            type="radio"
                                            name="role"
                                            value={role.value}
                                            checked={selectedRole === role.value}
                                            onChange={(e) => setSelectedRole(e.target.value)}
                                            disabled={loading}
                                            className="mt-1"
                                        />
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">{role.label}</p>
                                            <p className="text-xs text-gray-500">{role.description}</p>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Department Selection (optional) */}
                        {departments.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Department (Optional)</label>
                                <select
                                    value={selectedDepartment}
                                    onChange={(e) => setSelectedDepartment(e.target.value)}
                                    disabled={loading}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="">-- Select Department --</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Reason textarea */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Why do you need this role? (Optional)</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                disabled={loading}
                                placeholder="Briefly explain why you need access to this role..."
                                rows={3}
                                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={loading}
                                className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-center font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !selectedRole}
                                className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-center font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <>
                                        <IconLoader className="h-4 w-4 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    'Request Access'
                                )}
                            </button>
                        </div>

                        {/* Info text */}
                        <p className="text-xs text-gray-500 text-center">An administrator will review and approve or reject your request within 24 hours.</p>
                    </form>
                )}
            </div>
        </div>
    );
};

export default RoleSelectionModal;
