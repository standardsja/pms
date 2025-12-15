import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconFile from '../../../components/Icon/IconFile';
import IconDownload from '../../../components/Icon/IconDownload';

interface ProcurementForm {
    id: string;
    code: string;
    name: string;
    description: string;
    category: string;
    minValue?: string;
    maxValue?: string;
    createdDate: string;
    fileUrl?: string;
}

const FORMS: ProcurementForm[] = [
    {
        id: 'hoe-approval-form',
        code: 'PRO_70_F_12/00',
        name: "Head of Entity's Approval Form",
        description: 'Contracts valued at 1¢ up to $2,999k (Goods, Services & Works)',
        category: 'Approval Forms',
        minValue: '1¢',
        maxValue: '$2,999k',
        createdDate: 'Aug 01, 2025',
    },
];

export default function FormSelection() {
    const dispatch = useDispatch();
    const [forms, setForms] = useState<ProcurementForm[]>(FORMS);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    useEffect(() => {
        dispatch(setPageTitle('Procurement Forms'));
    }, [dispatch]);

    const categories = ['All', ...new Set(forms.map((f) => f.category))];
    const filteredForms = selectedCategory === 'All' ? forms : forms.filter((f) => f.category === selectedCategory);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Procurement Forms</h1>
                <p className="text-gray-600 dark:text-gray-400">Select and download the required procurement forms for your transactions</p>
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 mb-6">
                {categories.map((cat) => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            selectedCategory === cat ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Forms Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredForms.map((form) => (
                    <Link
                        key={form.id}
                        to={`/procurement/forms/${form.id}`}
                        className="group block p-6 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-lg hover:border-primary dark:hover:border-primary transition-all"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <IconFile className="w-5 h-5 text-primary" />
                                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{form.category}</span>
                                </div>
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white group-hover:text-primary transition-colors">{form.name}</h3>
                            </div>
                        </div>

                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{form.description}</p>

                        {form.minValue && form.maxValue && (
                            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                    <span className="font-semibold">Value Range: </span>
                                    {form.minValue} to {form.maxValue}
                                </p>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-xs text-gray-500 dark:text-gray-400">{form.code}</span>
                            <div className="flex items-center gap-2 text-primary group-hover:gap-3 transition-all">
                                <span className="text-sm font-semibold">View Form</span>
                                <IconDownload className="w-4 h-4" />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {filteredForms.length === 0 && (
                <div className="text-center py-12">
                    <IconFile className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 text-lg">No forms found in this category</p>
                </div>
            )}
        </div>
    );
}
