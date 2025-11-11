import { useEffect, useMemo, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { setPageTitle } from '../../../store/themeConfigSlice';
import Swal from 'sweetalert2';
import { useAutoSave, restoreAutoSave, clearAutoSave } from '../../../utils/useAutoSave';
import { submitIdea, fetchTags, createTag, fetchChallenges } from '../../../utils/ideasApi';
import { useDebounce } from '../../../utils/useDebounce';

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
        descriptionHtml: '',
        expectedBenefits: '',
        implementationNotes: '',
        isAnonymous: false,
        challengeId: '',
        tagIds: [] as number[],
    });

    // Attachments state (multi-file)
    const [imageFile, setImageFile] = useState<File | null>(null); // legacy single image (kept for backward compatibility)
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [duplicateMatches, setDuplicateMatches] = useState<{ id: number; title: string; snippet: string; score: number; submittedAt: string }[]>([]);
    const [checkingDuplicates, setCheckingDuplicates] = useState(false);
    const debouncedTitle = useDebounce(formData.title, 400);
    const debouncedDesc = useDebounce(formData.description, 600);
    const MAX_IMAGE_MB = 5;
    const MAX_FILES = 5;

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
        if (imageFile) {
            const isImage = imageFile.type.startsWith('image/');
            const sizeOk = imageFile.size <= MAX_IMAGE_MB * 1024 * 1024;
            if (!isImage) next.image = t('innovation.submit.form.image.typeError') || 'Please upload a valid image file.';
            if (!sizeOk) next.image = t('innovation.submit.form.image.sizeError', { mb: MAX_IMAGE_MB }) || `Image must be <= ${MAX_IMAGE_MB}MB.`;
        }
        if (files.length) {
            if (files.length > MAX_FILES) next.files = t('innovation.submit.form.files.countError', { max: MAX_FILES }) || `You can upload up to ${MAX_FILES} files.`;
            for (const f of files) {
                const isImage = f.type.startsWith('image/');
                const sizeOk = f.size <= MAX_IMAGE_MB * 1024 * 1024;
                if (!isImage) { next.files = t('innovation.submit.form.image.typeError') || 'Only images are allowed.'; break; }
                if (!sizeOk) { next.files = t('innovation.submit.form.image.sizeError', { mb: MAX_IMAGE_MB }) || `Each image must be <= ${MAX_IMAGE_MB}MB.`; break; }
            }
        }
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    // Tags & Challenges
    const [allTags, setAllTags] = useState<Array<{ id: number; name: string }>>([]);
    const [tagSearch, setTagSearch] = useState('');
    const [creatingTag, setCreatingTag] = useState(false);
    const [challenges, setChallenges] = useState<Array<{ id: number; title: string }>>([]);

    useEffect(() => {
        (async () => {
            try {
                const [tags, chals] = await Promise.all([fetchTags().catch(() => []), fetchChallenges().catch(() => [])]);
                setAllTags(tags);
                setChallenges(chals);
            } catch {}
        })();
    }, []);

    async function handleCreateTag() {
        if (!tagSearch.trim()) return;
        try {
            setCreatingTag(true);
            const exists = allTags.find(t => t.name.toLowerCase() === tagSearch.toLowerCase());
            if (exists) {
                if (!formData.tagIds.includes(exists.id)) setFormData(prev => ({ ...prev, tagIds: [...prev.tagIds, exists.id] }));
                setTagSearch('');
                setCreatingTag(false);
                return;
            }
            const created = await createTag(tagSearch.trim());
            setAllTags(prev => [...prev, created].sort((a,b) => a.name.localeCompare(b.name)));
            setFormData(prev => ({ ...prev, tagIds: [...prev.tagIds, created.id] }));
            setTagSearch('');
        } catch (e) {
            console.error('Failed to create tag', e);
        } finally {
            setCreatingTag(false);
        }
    }

    const selectedTags = allTags.filter(t => formData.tagIds.includes(t.id));
    const filteredTags = allTags.filter(t => !formData.tagIds.includes(t.id) && (!tagSearch || t.name.toLowerCase().includes(tagSearch.toLowerCase()))).slice(0, 10);

    // Duplicate detection auto-trigger
    useEffect(() => {
        let active = true;
        async function check() {
            if (debouncedTitle.length < 10 || debouncedDesc.length < 50) {
                if (active) setDuplicateMatches([]);
                return;
            }
            setCheckingDuplicates(true);
            try {
                const res = await fetch('/api/ideas/check-duplicates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: debouncedTitle, description: debouncedDesc }),
                });
                if (res.ok) {
                    const data = await res.json();
                    if (active) setDuplicateMatches(data.matches || []);
                }
            } catch (err) {
                console.warn('[SubmitIdea] duplicate check failed:', err);
            } finally {
                if (active) setCheckingDuplicates(false);
            }
        }
        check();
        return () => { active = false; };
    }, [debouncedTitle, debouncedDesc]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsLoading(true);

        try {
            // Submit the idea to the API
            const created = await submitIdea({
                title: formData.title,
                description: formData.description,
                descriptionHtml: formData.descriptionHtml || undefined,
                category: formData.category,
                expectedBenefits: formData.expectedBenefits,
                implementationNotes: formData.implementationNotes,
                isAnonymous: formData.isAnonymous,
                challengeId: formData.challengeId ? Number(formData.challengeId) : undefined,
                tagIds: formData.tagIds,
            }, (imageFile || files.length) ? { image: imageFile || undefined, images: files } : undefined);

            // Optimistic event so MyIdeas can reflect immediately
            document.dispatchEvent(new CustomEvent('idea:created', { detail: created }));

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
            setImageFile(null);
            if (imagePreview) URL.revokeObjectURL(imagePreview);
            setImagePreview(null);
            previews.forEach((p) => URL.revokeObjectURL(p));
            setPreviews([]);
            setFiles([]);
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

    const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setImageFile(file);
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
            setImagePreview(null);
        }
        if (file) {
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const onFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files ? Array.from(e.target.files) : [];
        if (!selected.length) return;
        // merge with existing, enforce max
        const merged = [...files, ...selected].slice(0, MAX_FILES);
        setFiles(merged);
        // manage previews
        const newPreviews: string[] = [];
        for (const f of selected.slice(0, Math.max(0, MAX_FILES - previews.length))) {
            newPreviews.push(URL.createObjectURL(f));
        }
        setPreviews((prev) => [...prev, ...newPreviews].slice(0, MAX_FILES));
    };

    const removeFileAt = (idx: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== idx));
        setPreviews((prev) => {
            const copy = [...prev];
            const [removed] = copy.splice(idx, 1);
            if (removed) URL.revokeObjectURL(removed);
            return copy;
        });
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
                    {/* Potential Duplicates */}
                    {duplicateMatches.length > 0 && (
                        <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl" role="img" aria-label="warning">⚠️</span>
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300 mb-2">Possible Similar Ideas</h3>
                                    <p className="text-xs text-amber-800 dark:text-amber-400 mb-3">Review these before submitting to avoid duplicates. You can still proceed.</p>
                                    <ul className="space-y-2 max-h-48 overflow-auto pr-1">
                                        {duplicateMatches.map(m => (
                                            <li key={m.id} className="text-xs bg-white dark:bg-gray-800 rounded p-2 border border-amber-200 dark:border-amber-700">
                                                <div className="font-semibold line-clamp-1" title={m.title}>{m.title}</div>
                                                <div className="text-gray-600 dark:text-gray-400 line-clamp-2" title={m.snippet}>{m.snippet}</div>
                                                <div className="mt-1 flex items-center justify-between text-[10px] text-amber-600 dark:text-amber-400">
                                                    <span>Similarity: {(m.score * 100).toFixed(0)}%</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => window.open(`/innovation/ideas/${m.id}`, '_blank')}
                                                        className="text-primary hover:underline"
                                                    >View</button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
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

                    {/* Description (Rich Text) */}
                    <div>
                        <label htmlFor="descriptionHtml" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            {t('innovation.submit.form.description.label')} <span className="text-danger">{t('innovation.submit.form.required')}</span>
                        </label>
                        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded">
                            <ReactQuill
                                theme="snow"
                                value={formData.descriptionHtml}
                                onChange={(html) => {
                                    // strip tags to maintain plain text for validation/preview
                                    const tmp = document.createElement('div');
                                    tmp.innerHTML = html;
                                    const text = (tmp.textContent || tmp.innerText || '').trim();
                                    setFormData((prev) => ({ ...prev, descriptionHtml: html, description: text }));
                                }}
                                placeholder={t('innovation.submit.form.description.placeholder')}
                            />
                        </div>
                        <p id="description-hint" className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t('innovation.submit.form.description.hint')} • {t('innovation.submit.form.charactersRemaining', { count: descRemaining })}
                        </p>
                        {errors.description && (
                            <p id="description-error" role="alert" className="text-xs text-danger mt-1">{errors.description}</p>
                        )}
                    </div>

                    {/* Optional Image Upload (legacy single) */}
                    <div>
                        <label htmlFor="idea-image" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            {t('innovation.submit.form.image.label', 'Attach an image (optional)')}
                        </label>
                        <input
                            id="idea-image"
                            type="file"
                            accept="image/*"
                            onChange={onImageChange}
                            className="form-input"
                            aria-describedby="image-hint image-error"
                        />
                        <p id="image-hint" className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t('innovation.submit.form.image.hint', 'Max size 5MB. PNG or JPG recommended.')}
                        </p>
                        {errors.image && (
                            <p id="image-error" role="alert" className="text-xs text-danger mt-1">{errors.image}</p>
                        )}
                        {imagePreview && (
                            <div className="mt-3">
                                <img src={imagePreview} alt={t('innovation.submit.form.image.previewAlt', 'Image preview')} className="max-h-48 rounded border" />
                            </div>
                        )}
                    </div>

                    {/* Multi-file Upload */}
                    <div>
                        <label htmlFor="idea-files" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            {t('innovation.submit.form.files.label', 'Attach more images (up to 5)')}
                        </label>
                        <input
                            id="idea-files"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={onFilesChange}
                            className="form-input"
                            aria-describedby="files-hint files-error"
                        />
                        <p id="files-hint" className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t('innovation.submit.form.files.hint', 'You can select multiple images. Max size 5MB each.')} {t('innovation.submit.form.files.limit', { count: MAX_FILES })}
                        </p>
                        {errors.files && (
                            <p id="files-error" role="alert" className="text-xs text-danger mt-1">{errors.files}</p>
                        )}
                        {previews.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {previews.map((src, idx) => (
                                    <div key={idx} className="relative group">
                                        <img src={src} alt={t('innovation.submit.form.files.previewAlt', 'Attachment preview')} className="h-24 w-full object-cover rounded border" />
                                        <button type="button" onClick={() => removeFileAt(idx)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition" aria-label={t('innovation.submit.form.files.remove', 'Remove file')}>
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
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

                    {/* Challenge Selector */}
                    {challenges.length > 0 && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Challenge</label>
                            <select
                                value={formData.challengeId}
                                onChange={(e) => setFormData(prev => ({ ...prev, challengeId: e.target.value }))}
                                className="form-select"
                            >
                                <option value="">No challenge</option>
                                {challenges.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                        </div>
                    )}

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tags</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {selectedTags.map(tag => (
                                <span key={tag.id} className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">
                                    {tag.name}
                                    <button type="button" aria-label="Remove tag" className="hover:text-red-600" onClick={() => setFormData(prev => ({ ...prev, tagIds: prev.tagIds.filter(id => id !== tag.id) }))}>×</button>
                                </span>
                            ))}
                            {selectedTags.length === 0 && <span className="text-xs text-gray-500">No tags selected</span>}
                        </div>
                        <div className="flex gap-2 items-center">
                            <input
                                type="text"
                                value={tagSearch}
                                onChange={(e) => setTagSearch(e.target.value)}
                                placeholder="Search or create tag"
                                className="form-input flex-1"
                            />
                            <button type="button" onClick={handleCreateTag} disabled={!tagSearch.trim() || creatingTag} className="btn btn-outline-primary text-nowrap">
                                {creatingTag ? 'Adding...' : 'Add'}
                            </button>
                        </div>
                        {filteredTags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {filteredTags.map(tg => (
                                    <button
                                        key={tg.id}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, tagIds: [...prev.tagIds, tg.id] }))}
                                        className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >{tg.name}</button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Anonymous toggle */}
                    <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                checked={formData.isAnonymous}
                                onChange={(e) => setFormData(prev => ({ ...prev, isAnonymous: e.target.checked }))}
                                className="form-checkbox"
                            />
                            <span>Submit anonymously (your name hidden publicly)</span>
                        </label>
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
                                    {checkingDuplicates ? 'Checking...' : t('innovation.submit.actions.submit')}
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
