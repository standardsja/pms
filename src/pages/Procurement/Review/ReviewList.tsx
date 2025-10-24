import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconChecks from '../../../components/Icon/IconChecks';
import IconEye from '../../../components/Icon/IconEye';

const ReviewList = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Procurement Review'));
    });

    const [reviews] = useState([
        { id: 1, reviewNumber: 'REV-2024-001', evalNumber: 'EVAL-2024-002', description: 'IT Equipment Final Review', recommendedSupplier: 'Tech Solutions Inc', amount: 15200, reviewer: 'John Doe', reviewDate: '2024-10-24', status: 'Pending Approval' },
        { id: 2, reviewNumber: 'REV-2024-002', evalNumber: 'EVAL-2024-001', description: 'Office Supplies Review', recommendedSupplier: 'ABC Corporation', amount: 12500, reviewer: 'Jane Smith', reviewDate: '2024-10-23', status: 'Approved' },
        { id: 3, reviewNumber: 'REV-2024-003', evalNumber: 'EVAL-2024-003', description: 'Furniture Procurement Review', recommendedSupplier: 'Office Pro Supply', amount: 22100, reviewer: 'Mike Johnson', reviewDate: '2024-10-22', status: 'In Review' },
        { id: 4, reviewNumber: 'REV-2024-004', evalNumber: 'EVAL-2024-004', description: 'Cleaning Services Contract', recommendedSupplier: 'Clean Corp Ltd', amount: 8900, reviewer: 'Sarah Williams', reviewDate: '2024-10-21', status: 'Rejected' },
    ]);

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
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Total Reviews</div>
                        <IconChecks className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl font-bold text-primary">28</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">In Review</div>
                        <IconChecks className="h-6 w-6 text-warning" />
                    </div>
                    <div className="text-3xl font-bold text-warning">7</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Approved</div>
                        <IconChecks className="h-6 w-6 text-success" />
                    </div>
                    <div className="text-3xl font-bold text-success">18</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Pending Approval</div>
                        <IconChecks className="h-6 w-6 text-info" />
                    </div>
                    <div className="text-3xl font-bold text-info">3</div>
                </div>
            </div>

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
                            {reviews.map((review) => (
                                <tr key={review.id}>
                                    <td>
                                        <Link to={`/procurement/review/${review.id}`} className="font-semibold text-primary hover:underline">
                                            {review.reviewNumber}
                                        </Link>
                                    </td>
                                    <td>
                                        <Link to={`/procurement/evaluation/${review.evalNumber}`} className="text-info hover:underline">
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
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ReviewList;
