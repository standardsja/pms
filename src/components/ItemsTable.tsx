/**
 * ItemsTable Component - Reusable table for managing procurement request items
 * 
 * Features:
 * - Add/remove items dynamically
 * - Inline validation with error display
 * - Auto-calculates estimated total
 * - Accessible with ARIA attributes
 */
import React from 'react';
import IconPlus from './Icon/IconPlus';
import IconX from './Icon/IconX';

export interface RequestItem {
    id: string;
    stockLevel: string;
    description: string;
    quantity: number;
    unitOfMeasure: string;
    unitCost: number;
    partNumber: string;
}

interface ItemsTableProps {
    items: RequestItem[];
    errors: Record<string, string>;
    onAddItem: () => void;
    onRemoveItem: (id: string) => void;
    onUpdateItem: (id: string, field: keyof RequestItem, value: any) => void;
}

const ItemsTable: React.FC<ItemsTableProps> = ({ items, errors, onAddItem, onRemoveItem, onUpdateItem }) => {
    return (
        <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium">Items/Services</label>
                <button
                    type="button"
                    onClick={onAddItem}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                    <IconPlus className="w-4 h-4" />
                    Add Item
                </button>
            </div>

            <div className="overflow-x-auto border border-gray-300 dark:border-gray-600 rounded">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium">Item No.</th>
                            <th className="px-3 py-2 text-left text-xs font-medium">Stock Level</th>
                            <th className="px-3 py-2 text-left text-xs font-medium">Description of Works/Goods/Services</th>
                            <th className="px-3 py-2 text-left text-xs font-medium">Quantity</th>
                            <th className="px-3 py-2 text-left text-xs font-medium">Unit of Measure</th>
                            <th className="px-3 py-2 text-left text-xs font-medium">Unit Cost</th>
                            <th className="px-3 py-2 text-left text-xs font-medium">Part Number</th>
                            <th className="px-3 py-2 text-center text-xs font-medium">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {items.map((item, index) => (
                            <tr key={item.id}>
                                <td className="px-3 py-2 text-center">{index + 1}</td>
                                <td className="px-3 py-2">
                                    <input
                                        type="text"
                                        value={item.stockLevel}
                                        onChange={(e) => onUpdateItem(item.id, 'stockLevel', e.target.value)}
                                        className="form-input w-full"
                                    />
                                </td>
                                <td className="px-3 py-2">
                                    <textarea
                                        value={item.description}
                                        onChange={(e) => onUpdateItem(item.id, 'description', e.target.value)}
                                        className="form-textarea w-full"
                                        rows={2}
                                        placeholder="Provide detailed specifications"
                                        required
                                        aria-invalid={!!errors[`item_${index}_description`]}
                                    />
                                    {errors[`item_${index}_description`] && (
                                        <p role="alert" className="text-red-500 text-xs mt-1">
                                            {errors[`item_${index}_description`]}
                                        </p>
                                    )}
                                </td>
                                <td className="px-3 py-2">
                                    <input
                                        type="number"
                                        value={item.quantity}
                                        onChange={(e) => onUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                        className="form-input w-full"
                                        min="1"
                                        required
                                        aria-invalid={!!errors[`item_${index}_quantity`]}
                                    />
                                    {errors[`item_${index}_quantity`] && (
                                        <p role="alert" className="text-red-500 text-xs mt-1">
                                            {errors[`item_${index}_quantity`]}
                                        </p>
                                    )}
                                </td>
                                <td className="px-3 py-2">
                                    <input
                                        type="text"
                                        value={item.unitOfMeasure}
                                        onChange={(e) => onUpdateItem(item.id, 'unitOfMeasure', e.target.value)}
                                        className="form-input w-full"
                                        placeholder="e.g., Each, Box, Kg"
                                    />
                                </td>
                                <td className="px-3 py-2">
                                    <input
                                        type="number"
                                        value={item.unitCost}
                                        onChange={(e) => onUpdateItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                                        className="form-input w-full"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                    />
                                </td>
                                <td className="px-3 py-2">
                                    <input
                                        type="text"
                                        value={item.partNumber}
                                        onChange={(e) => onUpdateItem(item.id, 'partNumber', e.target.value)}
                                        className="form-input w-full"
                                        placeholder="Optional"
                                    />
                                </td>
                                <td className="px-3 py-2 text-center">
                                    {items.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => onRemoveItem(item.id)}
                                            className="text-red-500 hover:text-red-700"
                                            aria-label="Remove item"
                                        >
                                            <IconX className="w-4 h-4" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ItemsTable;
