import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import Swal from 'sweetalert2';

const SubmitIdea = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        dispatch(setPageTitle('Submit New Idea'));
    }, [dispatch]);

    const [formData, setFormData] = useState({
        title: '',
        category: '',
        description: '',
        expectedBenefits: '',
        implementationNotes: '',
    });

    const categories = [
        { value: 'PROCESS_IMPROVEMENT', label: 'Process Improvement' },
        { value: 'TECHNOLOGY', label: 'Technology' },
        { value: 'CUSTOMER_SERVICE', label: 'Customer Service' },
        { value: 'SUSTAINABILITY', label: 'Sustainability' },
        { value: 'COST_REDUCTION', label: 'Cost Reduction' },
        { value: 'PRODUCT_INNOVATION', label: 'Product Innovation' },
        { value: 'OTHER', label: 'Other' },
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // TODO: Replace with real API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            Swal.fire({
                icon: 'success',
                title: 'Idea Submitted!',
                text: 'Your innovative idea has been submitted for review. The Innovation Committee will review it soon.',
                confirmButtonText: 'View My Ideas',
            }).then((result) => {
                if (result.isConfirmed) {
                    navigate('/innovation/ideas/mine');
                }
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Submission Failed',
                text: 'There was an error submitting your idea. Please try again.',
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
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back
                </button>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <span className="text-4xl">✨</span>
                        Submit New Idea
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Share your innovative concept with the Innovation Committee
                    </p>
                </div>
            </div>

            {/* Info Banner */}
            <div className="panel bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-2 border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-4">
                    <div className="text-4xl">ℹ️</div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Submission Guidelines</h3>
                        <ul className="text-gray-700 dark:text-gray-300 space-y-1 text-sm">
                            <li>• Provide a clear, descriptive title for your idea</li>
                            <li>• Explain the problem your idea solves</li>
                            <li>• Describe expected benefits (cost savings, efficiency, etc.)</li>
                            <li>• Ideas will be reviewed by the Innovation Committee</li>
                            <li>• Approved ideas become visible for voting by all staff</li>
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
                            Idea Title <span className="text-danger">*</span>
                        </label>
                        <input
                            id="title"
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="form-input"
                            placeholder="e.g., AI-Powered Document Analysis System"
                            required
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Keep it concise and descriptive (max 100 characters)
                        </p>
                    </div>

                    {/* Category */}
                    <div>
                        <label htmlFor="category" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Category <span className="text-danger">*</span>
                        </label>
                        <select
                            id="category"
                            value={formData.category}
                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            className="form-select"
                            required
                        >
                            <option value="">Select a category</option>
                            {categories.map((cat) => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Detailed Description <span className="text-danger">*</span>
                        </label>
                        <textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="form-textarea min-h-[150px]"
                            placeholder="Describe your idea in detail. What problem does it solve? How does it work?"
                            required
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Provide as much detail as possible to help reviewers understand your concept
                        </p>
                    </div>

                    {/* Expected Benefits */}
                    <div>
                        <label htmlFor="expectedBenefits" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Expected Benefits <span className="text-danger">*</span>
                        </label>
                        <textarea
                            id="expectedBenefits"
                            value={formData.expectedBenefits}
                            onChange={(e) => setFormData({ ...formData, expectedBenefits: e.target.value })}
                            className="form-textarea min-h-[100px]"
                            placeholder="What benefits will this idea bring? (e.g., cost savings, time efficiency, improved quality)"
                            required
                        />
                    </div>

                    {/* Implementation Notes */}
                    <div>
                        <label htmlFor="implementationNotes" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Implementation Notes (Optional)
                        </label>
                        <textarea
                            id="implementationNotes"
                            value={formData.implementationNotes}
                            onChange={(e) => setFormData({ ...formData, implementationNotes: e.target.value })}
                            className="form-textarea min-h-[100px]"
                            placeholder="Any thoughts on how this could be implemented? Resources needed? Timeline?"
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
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary gap-2"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <span className="animate-spin border-2 border-white border-l-transparent rounded-full w-5 h-5 inline-block"></span>
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <span className="text-xl">✨</span>
                                    Submit Idea
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
