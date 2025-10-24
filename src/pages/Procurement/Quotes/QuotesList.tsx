import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconTag from '../../../components/Icon/IconTag';
import IconPlus from '../../../components/Icon/IconPlus';
import IconEye from '../../../components/Icon/IconEye';
import IconCloudDownload from '../../../components/Icon/IconCloudDownload';
import IconDownload from '../../../components/Icon/IconDownload';
import IconX from '../../../components/Icon/IconX';
import IconChartSquare from '../../../components/Icon/IconChartSquare';

const QuotesList = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Quotes Management'));
    });

    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showCompareModal, setShowCompareModal] = useState(false);
    const [selectedRFQ, setSelectedRFQ] = useState('');
    const [selectedQuotes, setSelectedQuotes] = useState<number[]>([]);

    const [quotes] = useState([
        {
            id: 1,
            quoteNumber: 'Q-2024-001',
            rfqNumber: 'RFQ-2024-045',
            supplier: 'ABC Corporation',
            amount: 12500,
            submittedDate: '2024-10-22',
            validUntil: '2024-11-22',
            status: 'Under Review',
            deliveryTime: '14 days',
            paymentTerms: 'Net 30',
            warranty: '1 year',
            score: 85,
        },
        {
            id: 2,
            quoteNumber: 'Q-2024-002',
            rfqNumber: 'RFQ-2024-046',
            supplier: 'XYZ Suppliers Ltd',
            amount: 8900,
            submittedDate: '2024-10-21',
            validUntil: '2024-11-21',
            status: 'Pending Evaluation',
            deliveryTime: '21 days',
            paymentTerms: 'Net 45',
            warranty: '2 years',
            score: 78,
        },
        {
            id: 3,
            quoteNumber: 'Q-2024-003',
            rfqNumber: 'RFQ-2024-047',
            supplier: 'Tech Solutions Inc',
            amount: 15200,
            submittedDate: '2024-10-20',
            validUntil: '2024-11-20',
            status: 'Accepted',
            deliveryTime: '7 days',
            paymentTerms: 'Net 60',
            warranty: '3 years',
            score: 92,
        },
        {
            id: 4,
            quoteNumber: 'Q-2024-004',
            rfqNumber: 'RFQ-2024-048',
            supplier: 'Office Pro Supply',
            amount: 6500,
            submittedDate: '2024-10-19',
            validUntil: '2024-11-19',
            status: 'Rejected',
            deliveryTime: '30 days',
            paymentTerms: 'Advance',
            warranty: '6 months',
            score: 62,
        },
    ]);

    const handleQuoteSelection = (id: number) => {
        setSelectedQuotes((prev) => (prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]));
    };

    const handleCompareQuotes = () => {
        if (selectedQuotes.length < 2) {
            alert('Please select at least 2 quotes to compare');
            return;
        }
        setShowCompareModal(true);
    };

    const comparedQuotes = quotes.filter((q) => selectedQuotes.includes(q.id));

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Accepted':
                return 'bg-success';
            case 'Rejected':
                return 'bg-danger';
            case 'Under Review':
                return 'bg-warning';
            default:
                return 'bg-info';
        }
    };

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Quotes Management</h2>
                    <p className="text-white-dark">Upload, compare, and evaluate supplier quotations</p>
                </div>
                <div className="flex gap-3">
                    {selectedQuotes.length >= 2 && (
                        <button onClick={handleCompareQuotes} className="btn btn-info gap-2">
                            <IconChartSquare />
                            Compare Selected ({selectedQuotes.length})
                        </button>
                    )}
                    <button onClick={() => setShowUploadModal(true)} className="btn btn-success gap-2">
                        <IconCloudDownload />
                        Upload Quote
                    </button>
                    <Link to="/procurement/quotes/new" className="btn btn-primary gap-2">
                        <IconPlus />
                        Manual Entry
                    </Link>
                </div>
            </div>

            {/* Stats */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Total Quotes</div>
                        <IconTag className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-3xl font-bold text-primary">45</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Under Review</div>
                        <IconTag className="h-6 w-6 text-warning" />
                    </div>
                    <div className="text-3xl font-bold text-warning">8</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Accepted</div>
                        <IconTag className="h-6 w-6 text-success" />
                    </div>
                    <div className="text-3xl font-bold text-success">28</div>
                </div>
                <div className="panel">
                    <div className="mb-3 flex items-center justify-between">
                        <div className="text-lg font-semibold">Pending Evaluation</div>
                        <IconTag className="h-6 w-6 text-info" />
                    </div>
                    <div className="text-3xl font-bold text-info">9</div>
                </div>
            </div>

            {/* Quotes Table */}
            <div className="panel">
                <div className="mb-5 flex items-center justify-between">
                    <h5 className="text-lg font-semibold">All Quotes</h5>
                    <input type="text" placeholder="Search quotes..." className="form-input w-auto" />
                </div>
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>
                                    <input
                                        type="checkbox"
                                        className="form-checkbox"
                                        onChange={(e) => setSelectedQuotes(e.target.checked ? quotes.map((q) => q.id) : [])}
                                        checked={selectedQuotes.length === quotes.length}
                                    />
                                </th>
                                <th>Quote #</th>
                                <th>RFQ #</th>
                                <th>Supplier</th>
                                <th>Amount</th>
                                <th>Score</th>
                                <th>Submitted Date</th>
                                <th>Valid Until</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quotes.map((quote) => (
                                <tr key={quote.id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            className="form-checkbox"
                                            checked={selectedQuotes.includes(quote.id)}
                                            onChange={() => handleQuoteSelection(quote.id)}
                                        />
                                    </td>
                                    <td>
                                        <Link to={`/procurement/quotes/${quote.id}`} className="font-semibold text-primary hover:underline">
                                            {quote.quoteNumber}
                                        </Link>
                                    </td>
                                    <td>
                                        <Link to={`/procurement/rfq/${quote.rfqNumber}`} className="text-info hover:underline">
                                            {quote.rfqNumber}
                                        </Link>
                                    </td>
                                    <td>{quote.supplier}</td>
                                    <td className="font-semibold">${quote.amount.toLocaleString()}</td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                                <div
                                                    className={`h-full ${quote.score >= 80 ? 'bg-success' : quote.score >= 60 ? 'bg-warning' : 'bg-danger'}`}
                                                    style={{ width: `${quote.score}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-sm font-semibold">{quote.score}</span>
                                        </div>
                                    </td>
                                    <td>{quote.submittedDate}</td>
                                    <td>{quote.validUntil}</td>
                                    <td>
                                        <span className={`badge ${getStatusBadge(quote.status)}`}>{quote.status}</span>
                                    </td>
                                    <td>
                                        <div className="flex gap-2">
                                            <Link to={`/procurement/quotes/${quote.id}`} className="btn btn-sm btn-outline-primary">
                                                <IconEye className="h-4 w-4" />
                                            </Link>
                                            <button className="btn btn-sm btn-outline-info" title="Download">
                                                <IconDownload className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Upload Quote Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60">
                    <div className="panel w-full max-w-2xl overflow-hidden rounded-lg">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-xl font-semibold">Upload Quote Document</h5>
                            <button onClick={() => setShowUploadModal(false)} className="text-white-dark hover:text-dark">
                                <IconX className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label className="mb-2 block font-semibold">Select RFQ</label>
                                <select className="form-select" value={selectedRFQ} onChange={(e) => setSelectedRFQ(e.target.value)}>
                                    <option value="">Choose RFQ...</option>
                                    <option value="RFQ-2024-045">RFQ-2024-045 - Office Equipment</option>
                                    <option value="RFQ-2024-046">RFQ-2024-046 - IT Hardware</option>
                                    <option value="RFQ-2024-047">RFQ-2024-047 - Facility Maintenance</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block font-semibold">Supplier Name</label>
                                <input type="text" className="form-input" placeholder="Enter supplier name..." />
                            </div>

                            <div>
                                <label className="mb-2 block font-semibold">Upload Quote File</label>
                                <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
                                    <IconCloudDownload className="mx-auto mb-3 h-12 w-12 text-primary" />
                                    <p className="mb-2 font-semibold">Click to upload or drag and drop</p>
                                    <p className="text-xs text-white-dark">PDF, Excel, Word (MAX. 10MB)</p>
                                    <input type="file" className="hidden" accept=".pdf,.xlsx,.xls,.doc,.docx" />
                                    <button className="btn btn-primary mt-4">Browse Files</button>
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="mb-2 block font-semibold">Quote Amount</label>
                                    <input type="number" className="form-input" placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="mb-2 block font-semibold">Valid Until</label>
                                    <input type="date" className="form-input" />
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block font-semibold">Additional Notes</label>
                                <textarea rows={3} className="form-textarea" placeholder="Any special terms or conditions..."></textarea>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button onClick={() => setShowUploadModal(false)} className="btn btn-outline-danger">
                                Cancel
                            </button>
                            <button className="btn btn-success gap-2">
                                <IconCloudDownload />
                                Upload Quote
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Compare Quotes Modal */}
            {showCompareModal && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-4">
                    <div className="panel w-full max-w-6xl overflow-hidden rounded-lg">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-xl font-semibold">Quote Comparison</h5>
                            <button onClick={() => setShowCompareModal(false)} className="text-white-dark hover:text-dark">
                                <IconX className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white-light dark:border-dark">
                                        <th className="px-4 py-3 text-left font-semibold">Criteria</th>
                                        {comparedQuotes.map((quote) => (
                                            <th key={quote.id} className="px-4 py-3 text-center font-semibold">
                                                <div>{quote.supplier}</div>
                                                <div className="text-xs font-normal text-white-dark">{quote.quoteNumber}</div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-white-light dark:border-dark">
                                        <td className="px-4 py-3 font-semibold">Total Amount</td>
                                        {comparedQuotes.map((quote) => (
                                            <td key={quote.id} className="px-4 py-3 text-center font-bold text-primary">
                                                ${quote.amount.toLocaleString()}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="border-b border-white-light dark:border-dark">
                                        <td className="px-4 py-3 font-semibold">Overall Score</td>
                                        {comparedQuotes.map((quote) => (
                                            <td key={quote.id} className="px-4 py-3 text-center">
                                                <span
                                                    className={`inline-block rounded px-3 py-1 font-bold ${
                                                        quote.score >= 80 ? 'bg-success text-white' : quote.score >= 60 ? 'bg-warning text-white' : 'bg-danger text-white'
                                                    }`}
                                                >
                                                    {quote.score}
                                                </span>
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="border-b border-white-light dark:border-dark">
                                        <td className="px-4 py-3 font-semibold">Delivery Time</td>
                                        {comparedQuotes.map((quote) => (
                                            <td key={quote.id} className="px-4 py-3 text-center">
                                                {quote.deliveryTime}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="border-b border-white-light dark:border-dark">
                                        <td className="px-4 py-3 font-semibold">Payment Terms</td>
                                        {comparedQuotes.map((quote) => (
                                            <td key={quote.id} className="px-4 py-3 text-center">
                                                {quote.paymentTerms}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="border-b border-white-light dark:border-dark">
                                        <td className="px-4 py-3 font-semibold">Warranty</td>
                                        {comparedQuotes.map((quote) => (
                                            <td key={quote.id} className="px-4 py-3 text-center">
                                                {quote.warranty}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr className="border-b border-white-light dark:border-dark">
                                        <td className="px-4 py-3 font-semibold">Valid Until</td>
                                        {comparedQuotes.map((quote) => (
                                            <td key={quote.id} className="px-4 py-3 text-center">
                                                {quote.validUntil}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td className="px-4 py-3 font-semibold">Status</td>
                                        {comparedQuotes.map((quote) => (
                                            <td key={quote.id} className="px-4 py-3 text-center">
                                                <span className={`badge ${getStatusBadge(quote.status)}`}>{quote.status}</span>
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-6 flex items-center justify-between border-t border-white-light pt-5 dark:border-dark">
                            <div className="text-sm text-white-dark">
                                Comparing {comparedQuotes.length} quotes • Best Score:{' '}
                                <span className="font-bold text-success">{Math.max(...comparedQuotes.map((q) => q.score))}</span> • Lowest Price:{' '}
                                <span className="font-bold text-primary">${Math.min(...comparedQuotes.map((q) => q.amount)).toLocaleString()}</span>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowCompareModal(false)} className="btn btn-outline-danger">
                                    Close
                                </button>
                                <button className="btn btn-success gap-2">
                                    <IconDownload />
                                    Export to Excel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuotesList;
