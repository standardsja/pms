import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconChecks from '../../../components/Icon/IconChecks';
import IconEye from '../../../components/Icon/IconEye';
import { getAuthHeaders } from '../../../utils/api';
import { getApiUrl } from '../../../config/api';
import { SkeletonStats, SkeletonTableRow, SkeletonCard } from '../../../components/SkeletonLoading';

const ReviewList = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Procurement Review'));
    });

    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        inReview: 0,
        approved: 0,
        pending: 0,
    });

    useEffect(() => {
        loadReviews();
    }, []);

    const loadReviews = async () => {
        try {
            setLoading(true);
            const headers = await getAuthHeaders();

            // Fetch evaluations with PROCUREMENT_REVIEW status
            const res = await fetch(getApiUrl('/api/evaluations?status=PROCUREMENT_REVIEW,COMPLETED'), {
                headers,
            });

            if (!res.ok) throw new Error('Failed to fetch reviews');
            const data = await res.json();

            const evaluations = data.data || data || [];

            // Transform evaluations to review format
            const reviewsData = evaluations.map((evaluation: any) => ({
                id: evaluation.id,
                reviewNumber: evaluation.evaluationNumber || `REV-${evaluation.id}`,
                evalId: evaluation.id,
                evalNumber: evaluation.evaluationNumber || `EVAL-${evaluation.id}`,
                description: evaluation.rfq?.title || evaluation.title || 'N/A',
                recommendedSupplier: evaluation.recommendedSupplier || 'TBD',
                amount: evaluation.recommendedAmount || 0,
                reviewer: evaluation.evaluatedBy?.name || 'Unknown',
                reviewDate: evaluation.evaluatedAt ? new Date(evaluation.evaluatedAt).toLocaleDateString() : 'N/A',
                status: evaluation.status === 'COMPLETED' ? 'Approved' : evaluation.status === 'PROCUREMENT_REVIEW' ? 'Pending Approval' : 'In Review',
            }));

            setReviews(reviewsData);

            // Calculate stats
            setStats({
                total: reviewsData.length,
                inReview: reviewsData.filter((r: any) => r.status === 'In Review').length,
                approved: reviewsData.filter((r: any) => r.status === 'Approved').length,
                pending: reviewsData.filter((r: any) => r.status === 'Pending Approval').length,
            });
        } catch (error) {
            console.error('Failed to fetch reviews:', error);
            setReviews([]);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Approved':
                return 'bg-success';
            case 'Rejected':
                return 'bg-danger';
            case 'In Review':
                return 'bg-warning';
            case 'Pending Approval':
                return 'bg-info';
            default:
                return 'bg-secondary';
        }
    };

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-bold">Procurement Review</h2>
                <p className="text-white-dark">Final procurement reviews and recommendations</p>
            </div>

            {/* Stats */}
            {loading ? (
                <SkeletonStats count={4} />
            ) : (
                <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="panel">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-lg font-semibold">Total Reviews</div>
                            <IconChecks className="h-6 w-6 text-primary" />
                        </div>
                        <div className="text-3xl font-bold text-primary">{stats.total}</div>
                    </div>
                    <div className="panel">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-lg font-semibold">In Review</div>
                            <IconChecks className="h-6 w-6 text-warning" />
                        </div>
                        <div className="text-3xl font-bold text-warning">{stats.inReview}</div>
                    </div>
                    <div className="panel">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-lg font-semibold">Approved</div>
                            <IconChecks className="h-6 w-6 text-success" />
                        </div>
                        <div className="text-3xl font-bold text-success">{stats.approved}</div>
                    </div>
                    <div className="panel">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-lg font-semibold">Pending Approval</div>
                            <IconChecks className="h-6 w-6 text-info" />
                        </div>
                        <div className="text-3xl font-bold text-info">{stats.pending}</div>
                    </div>
                </div>
            )}

            {/* Reviews Table */}
            <div className="panel">
                <div className="mb-5 flex items-center justify-between">
                    <h5 className="text-lg font-semibold">All Procurement Reviews</h5>
                    <input type="text" placeholder="Search reviews..." className="form-input w-auto" />
                </div>
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>Review #</th>
                                <th>Evaluation #</th>
                                <th>Description</th>
                                <th>Recommended Supplier</th>
                                <th>Amount</th>
                                <th>Reviewer</th>
                                <th>Review Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <>
                                    <SkeletonTableRow columns={9} />
                                    <SkeletonTableRow columns={9} />
                                    <SkeletonTableRow columns={9} />
                                    <SkeletonTableRow columns={9} />
                                    <SkeletonTableRow columns={9} />
                                </>
                            ) : reviews.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="text-center py-8 text-white-dark">
                                        No reviews found
                                    </td>
                                </tr>
                            ) : (
                                reviews.map((review) => (
                                    <tr key={review.id}>
                                        <td>
                                            <Link to={`/procurement/review/${review.id}`} className="font-semibold text-primary hover:underline">
                                                {review.reviewNumber}
                                            </Link>
                                        </td>
                                        <td>
                                            <Link to={`/procurement/evaluation/${review.evalId}`} className="text-info hover:underline">
                                                {review.evalNumber}
                                            </Link>
                                        </td>
                                        <td>{review.description}</td>
                                        <td className="font-semibold">{review.recommendedSupplier}</td>
                                        <td className="font-bold text-success">${review.amount.toLocaleString()}</td>
                                        <td>{review.reviewer}</td>
                                        <td>{review.reviewDate}</td>
                                        <td>
                                            <span className={`badge ${getStatusBadge(review.status)}`}>{review.status}</span>
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
                                                <Link to={`/procurement/review/${review.id}`} className="btn btn-sm btn-outline-primary">
                                                    <IconEye className="h-4 w-4" />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ReviewList;
