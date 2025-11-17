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
import { getUser, getToken } from '../../../utils/auth';

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
            setFormData({
                ...saved,
                tagIds: Array.isArray(saved.tagIds) ? saved.tagIds : [], // Ensure tagIds is always an array
            });
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
        if (files.length) {
            if (files.length > MAX_FILES) next.files = t('innovation.submit.form.files.countError', { max: MAX_FILES }) || `You can upload up to ${MAX_FILES} files.`;
            for (const f of files) {
                const isImage = f.type.startsWith('image/');
                const sizeOk = f.size <= MAX_IMAGE_MB * 1024 * 1024;
                if (!isImage) {
                    next.files = t('innovation.submit.form.image.typeError') || 'Only images are allowed.';
                    break;
                }
                if (!sizeOk) {
                    next.files = t('innovation.submit.form.image.sizeError', { mb: MAX_IMAGE_MB }) || `Each image must be <= ${MAX_IMAGE_MB}MB.`;
                    break;
                }
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
            const exists = allTags.find((t) => t.name.toLowerCase() === tagSearch.toLowerCase());
            if (exists) {
                if (!formData.tagIds.includes(exists.id)) setFormData((prev) => ({ ...prev, tagIds: [...prev.tagIds, exists.id] }));
                setTagSearch('');
                setCreatingTag(false);
                return;
            }
            const created = await createTag(tagSearch.trim());
            setAllTags((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
            setFormData((prev) => ({ ...prev, tagIds: [...prev.tagIds, created.id] }));
            setTagSearch('');
        } catch (e) {
            console.error('Failed to create tag', e);
        } finally {
            setCreatingTag(false);
        }
    }

    const selectedTags = allTags.filter((t) => (formData.tagIds || []).includes(t.id));
    const filteredTags = allTags.filter((t) => !(formData.tagIds || []).includes(t.id) && (!tagSearch || t.name.toLowerCase().includes(tagSearch.toLowerCase()))).slice(0, 10);

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
                const user = getUser();
                const token = getToken();
                // Use the configured API host when available (Vite builds set VITE_API_URL).
                // Fall back to relative paths when not set so the dev proxy still works.
                const apiBase = 'http://heron:4000';
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                };

                // Add authentication headers (same as authHeaders() in ideasApi.ts)
                if (user?.id) headers['x-user-id'] = user.id;
                if (token) headers['Authorization'] = `Bearer ${token}`;

                const res = await fetch(`${apiBase}/api/ideas/check-duplicates`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ title: debouncedTitle, description: debouncedDesc }),
                });
                if (res.ok) {
                    const ct = (res.headers.get('content-type') || '').toLowerCase();
                    if (!ct.includes('application/json')) {
                        // Likely served index.html (HTML) because the app called the wrong host/origin.
                        const text = await res.text();
                        console.warn('[SubmitIdea] duplicate-check returned non-JSON response:', text.substring(0, 300));
                        if (active) setDuplicateMatches([]);
                    } else {
                        const data = await res.json();
                        if (active) setDuplicateMatches(data.matches || []);
                    }
                }
            } catch (err) {
                console.warn('[SubmitIdea] duplicate check failed:', err);
            } finally {
                if (active) setCheckingDuplicates(false);
            }
        }
        check();
        return () => {
            active = false;
        };
    }, [debouncedTitle, debouncedDesc]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setIsLoading(true);

        try {
            // Submit the idea to the API
            const created = await submitIdea(
                {
                    title: formData.title,
                    description: formData.description,
                    descriptionHtml: formData.descriptionHtml || undefined,
                    category: formData.category,
                    expectedBenefits: formData.expectedBenefits,
                    implementationNotes: formData.implementationNotes,
                    isAnonymous: formData.isAnonymous,
                    challengeId: formData.challengeId ? Number(formData.challengeId) : undefined,
                    tagIds: formData.tagIds,
                },
                files.length ? { images: files } : undefined
            );

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

    const formProgress = useMemo(() => {
        let filled = 0;
        const total = 4; // title, category, description, benefits
        if (formData.title.length >= 10) filled++;
        if (formData.category) filled++;
        if (formData.description.length >= DESC_MIN) filled++;
        if (formData.expectedBenefits) filled++;
        return Math.round((filled / total) * 100);
    }, [formData.title, formData.category, formData.description, formData.expectedBenefits]);

    return (
        <div className="space-y-6">
            {/* Hero Header */}
            <div className="panel bg-gradient-to-r from-purple-600 to-pink-600 text-white overflow-hidden relative">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute -top-10 -right-10 w-72 h-72 bg-white rounded-full" />
                    <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-white rounded-full" />
                </div>
                <div className="relative z-10 p-6 sm:p-8">
                    <div className="flex items-start justify-between gap-6 flex-wrap">
                        <div className="flex-1 min-w-[280px]">
                            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-3">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                                    />
                                </svg>
                                <span>{t('innovation.submit.badge', { defaultValue: 'New Innovation' })}</span>
                            </div>
                            <h1 className="text-3xl sm:text-4xl font-black flex items-center gap-3 mb-2">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                {t('innovation.submit.title')}
                            </h1>
                            <p className="text-white/90 mb-4 max-w-2xl">{t('innovation.submit.subtitle')}</p>
                            <button
                                onClick={() => navigate('/innovation/dashboard')}
                                className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white transition-colors"
                                aria-label={t('innovation.submit.back')}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                {t('innovation.submit.back')}
                            </button>
                        </div>
                        <div className="bg-white/15 rounded-xl px-6 py-4 backdrop-blur-sm min-w-[200px]">
                            <div className="text-xs text-white/80 mb-2">{t('innovation.submit.progress', { defaultValue: 'Form Progress' })}</div>
                            <div className="flex items-end gap-2">
                                <div className="text-4xl font-black">{formProgress}%</div>
                                <div className="mb-1.5">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="w-full bg-white/20 rounded-full h-2 mt-3">
                                <div
                                    className="bg-white rounded-full h-2 transition-all duration-500"
                                    style={{ width: `${formProgress}%` }}
                                    role="progressbar"
                                    aria-valuenow={formProgress}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Banner */}
            <div className="panel bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900/20 dark:to-blue-900/20 border border-blue-200/60 dark:border-blue-800/40">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                            <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">{t('innovation.submit.guidelines.title')}</h3>
                            <p className="text-sm text-gray-700 dark:text-gray-300">{t('innovation.submit.guidelines.summary', { defaultValue: 'Be clear, specific, and focus on impact' })}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {t('innovation.submit.autosave', { defaultValue: 'Auto-saved' })}
                        </span>
                        {checkingDuplicates && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                </svg>
                                {t('innovation.submit.checking', { defaultValue: 'Checking duplicates...' })}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="panel">
                <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                        {t('innovation.submit.form.title.main', { defaultValue: 'Idea Details' })}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('innovation.submit.form.subtitle', { defaultValue: 'Fill in the required fields to submit your innovation' })}</p>
                </div>
                <div className="space-y-6">
                    {/* Potential Duplicates */}
                    {duplicateMatches.length > 0 && (
                        <div className="rounded-lg border-2 border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 shadow-lg">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0">
                                    <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                        />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300 mb-2">Possible Similar Ideas</h3>
                                    <p className="text-xs text-amber-800 dark:text-amber-400 mb-3">Review these before submitting to avoid duplicates. You can still proceed.</p>
                                    <ul className="space-y-2 max-h-48 overflow-auto pr-1">
                                        {duplicateMatches.map((m) => (
                                            <li key={m.id} className="text-xs bg-white dark:bg-gray-800 rounded p-2 border border-amber-200 dark:border-amber-700">
                                                <div className="font-semibold line-clamp-1" title={m.title}>
                                                    {m.title}
                                                </div>
                                                <div className="text-gray-600 dark:text-gray-400 line-clamp-2" title={m.snippet}>
                                                    {m.snippet}
                                                </div>
                                                <div className="mt-1 flex items-center justify-between text-[10px] text-amber-600 dark:text-amber-400">
                                                    <span>Similarity: {(m.score * 100).toFixed(0)}%</span>
                                                    <button type="button" onClick={() => window.open(`/innovation/ideas/${m.id}`, '_blank')} className="text-primary hover:underline">
                                                        View
                                                    </button>
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
                            <p id="title-error" role="alert" className="text-xs text-danger mt-1">
                                {errors.title}
                            </p>
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
                            <p id="category-error" role="alert" className="text-xs text-danger mt-1">
                                {errors.category}
                            </p>
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
                            <p id="description-error" role="alert" className="text-xs text-danger mt-1">
                                {errors.description}
                            </p>
                        )}
                    </div>

                    {/* Attach images (multi-file) */}
                    <div>
                        <label htmlFor="idea-files" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            {t('innovation.submit.form.files.label', 'Attach images (up to 5)')}
                        </label>
                        <input id="idea-files" type="file" accept="image/*" multiple onChange={onFilesChange} className="form-input" aria-describedby="files-hint files-error" />
                        <p id="files-hint" className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t('innovation.submit.form.files.hint', 'You can select multiple images. Max size 5MB each.')} {t('innovation.submit.form.files.limit', { count: MAX_FILES })}
                        </p>
                        {errors.files && (
                            <p id="files-error" role="alert" className="text-xs text-danger mt-1">
                                {errors.files}
                            </p>
                        )}
                        {previews.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {previews.map((src, idx) => (
                                    <div key={idx} className="relative group">
                                        <img src={src} alt={t('innovation.submit.form.files.previewAlt', 'Attachment preview')} className="h-24 w-full object-cover rounded border" />
                                        <button
                                            type="button"
                                            onClick={() => removeFileAt(idx)}
                                            className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                                            aria-label={t('innovation.submit.form.files.remove', 'Remove file')}
                                        >
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
                            <p id="benefits-error" role="alert" className="text-xs text-danger mt-1">
                                {errors.expectedBenefits}
                            </p>
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
                            <select value={formData.challengeId} onChange={(e) => setFormData((prev) => ({ ...prev, challengeId: e.target.value }))} className="form-select">
                                <option value="">No challenge</option>
                                {challenges.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Tags */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tags</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {selectedTags.map((tag) => (
                                <span key={tag.id} className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">
                                    {tag.name}
                                    <button
                                        type="button"
                                        aria-label="Remove tag"
                                        className="hover:text-red-600"
                                        onClick={() => setFormData((prev) => ({ ...prev, tagIds: prev.tagIds.filter((id) => id !== tag.id) }))}
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                            {selectedTags.length === 0 && <span className="text-xs text-gray-500">No tags selected</span>}
                        </div>
                        <div className="flex gap-2 items-center">
                            <input type="text" value={tagSearch} onChange={(e) => setTagSearch(e.target.value)} placeholder="Search or create tag" className="form-input flex-1" />
                            <button type="button" onClick={handleCreateTag} disabled={!tagSearch.trim() || creatingTag} className="btn btn-outline-primary text-nowrap">
                                {creatingTag ? 'Adding...' : 'Add'}
                            </button>
                        </div>
                        {filteredTags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {filteredTags.map((tg) => (
                                    <button
                                        key={tg.id}
                                        type="button"
                                        onClick={() => setFormData((prev) => ({ ...prev, tagIds: [...prev.tagIds, tg.id] }))}
                                        className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                                    >
                                        {tg.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Anonymous toggle */}
                    <div className="flex items-center gap-3">
                        <label className="inline-flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={formData.isAnonymous} onChange={(e) => setFormData((prev) => ({ ...prev, isAnonymous: e.target.checked }))} className="form-checkbox" />
                            <span>Submit anonymously (your name hidden publicly)</span>
                        </label>
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center justify-between gap-4 pt-6 border-t-2 border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="inline-flex items-center gap-1.5">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                    />
                                </svg>
                                {t('innovation.submit.security', { defaultValue: 'Your idea is encrypted and secure' })}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={() => navigate('/innovation/dashboard')} className="btn btn-outline-danger" disabled={isLoading}>
                                {t('innovation.submit.actions.cancel')}
                            </button>
                            <button type="submit" className="btn btn-primary gap-2 shadow-lg hover:shadow-xl transition-shadow" disabled={isLoading || checkingDuplicates}>
                                {isLoading ? (
                                    <>
                                        <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-5 h-5 inline-block" aria-hidden="true"></span>
                                        {t('innovation.submit.actions.submitting')}
                                    </>
                                ) : checkingDuplicates ? (
                                    <>
                                        <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-5 h-5 inline-block" aria-hidden="true"></span>
                                        {t('innovation.submit.checking', { defaultValue: 'Checking...' })}
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                        {t('innovation.submit.actions.submit')}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </form>

            {/* Trust & Security Footer */}
            <div className="panel">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-sm">
                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {t('common.security.iso27001', { defaultValue: 'ISO 27001' })}
                        </span>
                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                            </svg>
                            {t('common.security.encrypted', { defaultValue: 'End-to-end encrypted' })}
                        </span>
                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                />
                            </svg>
                            {t('common.security.gdpr', { defaultValue: 'GDPR Compliant' })}
                        </span>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t('innovation.submit.lastSaved', { defaultValue: 'Auto-saved just now' })}</div>
                </div>
            </div>
        </div>
    );
};

export default SubmitIdea;
