import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { setPageTitle } from '../../../store/themeConfigSlice';
import Swal from 'sweetalert2';
import { useAutoSave, restoreAutoSave, clearAutoSave } from '../../../utils/useAutoSave';
import { submitIdea } from '../../../utils/ideasApi';

const SubmitIdea = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        dispatch(setPageTitle(t('innovation.submit.title')));
    }, [dispatch, t]);

    const [formData, setFormData] = useState({
        title: '',
        category: '',
        description: '',
        expectedBenefits: '',
        implementationNotes: '',
    });

    const categories = [
        { value: 'PROCESS_IMPROVEMENT', label: t('innovation.categories.PROCESS_IMPROVEMENT') },
        { value: 'TECHNOLOGY', label: t('innovation.categories.TECHNOLOGY') },
        { value: 'CUSTOMER_SERVICE', label: t('innovation.categories.CUSTOMER_SERVICE') },
        { value: 'SUSTAINABILITY', label: t('innovation.categories.SUSTAINABILITY') },
        { value: 'COST_REDUCTION', label: t('innovation.categories.COST_REDUCTION') },
        { value: 'PRODUCT_INNOVATION', label: t('innovation.categories.PRODUCT_INNOVATION') },
        { value: 'OTHER', label: t('innovation.categories.OTHER') },
    ];

    // Restore draft on mount
    useEffect(() => {
        const saved = restoreAutoSave<typeof formData>('ideaDraft');
        if (saved) {
            setFormData(saved);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Auto-save draft periodically
    useAutoSave('ideaDraft', formData, 10000);

    // Simple inline validation
    const [errors, setErrors] = useState<{ [k: string]: string }>({});
    const TITLE_MAX = 100;
    const DESC_MIN = 50;
    const DESC_MAX = 1000;
    const titleRemaining = useMemo(() => Math.max(0, TITLE_MAX - formData.title.length), [formData.title]);
    const descRemaining = useMemo(() => Math.max(0, DESC_MAX - formData.description.length), [formData.description]);

    const validate = () => {
        const next: { [k: string]: string } = {};
        if (!formData.title || formData.title.length < 10 || formData.title.length > TITLE_MAX) {
            next.title = t('innovation.submit.form.title.error');
        }
        if (!formData.category) {
            next.category = t('innovation.submit.form.category.error');
        }
        if (!formData.description || formData.description.length < DESC_MIN) {
            next.description = t('innovation.submit.form.description.error');
        }
        if (!formData.expectedBenefits) {
            next.expectedBenefits = t('innovation.submit.form.benefits.error');
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsLoading(true);

        try {
            // Submit the idea to the API
            await submitIdea({
                title: formData.title,
                description: formData.description,
                category: formData.category,
                expectedBenefits: formData.expectedBenefits,
                implementationNotes: formData.implementationNotes,
            });

            Swal.fire({
                icon: 'success',
                title: t('innovation.submit.success.title'),
                text: t('innovation.submit.success.message'),
                confirmButtonText: t('innovation.submit.success.action'),
            }).then((result) => {
                if (result.isConfirmed) {
                    navigate('/innovation/ideas/mine');
                }
            });
            clearAutoSave('ideaDraft');
        } catch (error) {
            console.error('Error submitting idea:', error);
            Swal.fire({
                icon: 'error',
                title: t('innovation.submit.error.title'),
                text: error instanceof Error ? error.message : t('innovation.submit.error.message'),
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/innovation/dashboard')}
                    className="btn btn-outline-primary"
                    aria-label={t('innovation.submit.back')}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {t('innovation.submit.back')}
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <span className="text-4xl" role="img" aria-hidden="true">✨</span>
                        {t('innovation.submit.title')}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {t('innovation.submit.subtitle')}
                    </p>
                </div>
            </div>

            {/* Info Banner */}
            <div className="panel bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-4">
                    <div className="text-4xl" role="img" aria-hidden="true">ℹ️</div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('innovation.submit.guidelines.title')}</h3>
                        <ul className="text-gray-700 dark:text-gray-300 space-y-1 text-sm" aria-label={t('innovation.submit.guidelines.title')}>
                            {(t('innovation.submit.guidelines.items', { returnObjects: true }) as string[]).map((item, idx) => (
                                <li key={idx}>• {item}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="panel">
                <div className="space-y-6">
                    {/* Title */}
                    <div>
                        <label htmlFor="title" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            {t('innovation.submit.form.title.label')} <span className="text-danger">{t('innovation.submit.form.required')}</span>
                        </label>
                        <input
                            id="title"
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="form-input"
                            placeholder={t('innovation.submit.form.title.placeholder')}
                            aria-invalid={!!errors.title}
                            aria-describedby="title-error title-hint"
                        />
                        <p id="title-hint" className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t('innovation.submit.form.title.hint')} • {t('innovation.submit.form.charactersRemaining', { count: titleRemaining })}
                        </p>
                        {errors.title && (
                            <p id="title-error" role="alert" className="text-xs text-danger mt-1">{errors.title}</p>
                        )}
                    </div>

                    {/* Category */}
                    <div>
                        <label htmlFor="category" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            {t('innovation.submit.form.category.label')} <span className="text-danger">{t('innovation.submit.form.required')}</span>
                        </label>
                        <select
                            id="category"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="form-select"
                            aria-invalid={!!errors.category}
                            aria-describedby="category-error"
                        >
                            <option value="">{t('innovation.submit.form.category.placeholder')}</option>
                            {categories.map((cat) => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                        {errors.category && (
                            <p id="category-error" role="alert" className="text-xs text-danger mt-1">{errors.category}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            {t('innovation.submit.form.description.label')} <span className="text-danger">{t('innovation.submit.form.required')}</span>
                        </label>
                        <textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="form-textarea min-h-[150px]"
                            placeholder={t('innovation.submit.form.description.placeholder')}
                            aria-invalid={!!errors.description}
                            aria-describedby="description-error description-hint"
                        />
                        <p id="description-hint" className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t('innovation.submit.form.description.hint')} • {t('innovation.submit.form.charactersRemaining', { count: descRemaining })}
                        </p>
                        {errors.description && (
                            <p id="description-error" role="alert" className="text-xs text-danger mt-1">{errors.description}</p>
                        )}
                    </div>

                    {/* Expected Benefits */}
                    <div>
                        <label htmlFor="expectedBenefits" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            {t('innovation.submit.form.benefits.label')} <span className="text-danger">{t('innovation.submit.form.required')}</span>
                        </label>
                        <textarea
                            id="expectedBenefits"
                            value={formData.expectedBenefits}
                            onChange={(e) => setFormData({ ...formData, expectedBenefits: e.target.value })}
                            className="form-textarea min-h-[100px]"
                            placeholder={t('innovation.submit.form.benefits.placeholder')}
                            aria-invalid={!!errors.expectedBenefits}
                            aria-describedby="benefits-error"
                        />
                        {errors.expectedBenefits && (
                            <p id="benefits-error" role="alert" className="text-xs text-danger mt-1">{errors.expectedBenefits}</p>
                        )}
                    </div>

                    {/* Implementation Notes */}
                    <div>
                        <label htmlFor="implementationNotes" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            {t('innovation.submit.form.implementation.label')}
                        </label>
                        <textarea
                            id="implementationNotes"
                            value={formData.implementationNotes}
                            onChange={(e) => setFormData({ ...formData, implementationNotes: e.target.value })}
                            className="form-textarea min-h-[100px]"
                            placeholder={t('innovation.submit.form.implementation.placeholder')}
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            type="button"
                            onClick={() => navigate('/innovation/dashboard')}
                            className="btn btn-outline-danger"
                            disabled={isLoading}
                        >
                            {t('innovation.submit.actions.cancel')}
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary gap-2"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-5 h-5 inline-block"></span>
                                    {t('innovation.submit.actions.submitting')}
                                </>
                            ) : (
                                <>
                                    <span className="text-xl" role="img" aria-hidden="true">✨</span>
                                    {t('innovation.submit.actions.submit')}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default SubmitIdea;
