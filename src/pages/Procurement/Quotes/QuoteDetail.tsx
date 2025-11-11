import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';
import IconDownload from '../../../components/Icon/IconDownload';
import IconPrinter from '../../../components/Icon/IconPrinter';
import IconChecks from '../../../components/Icon/IconChecks';
import IconX from '../../../components/Icon/IconX';
import IconChartSquare from '../../../components/Icon/IconChartSquare';

const QuoteDetail = () => {
    const dispatch = useDispatch();
    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        dispatch(setPageTitle('Quote Details'));
    });

    // Mock data - in real app, fetch based on id
    const quoteData = {
        1: {
            id: 1,
            quoteNumber: 'Q-2024-001',
            rfqNumber: 'RFQ-2024-045',
            rfqTitle: 'Office Equipment Procurement',
            supplier: {
                name: 'ABC Corporation',
                contact: 'John Smith',
                email: 'john.smith@abccorp.com',
                phone: '+1-876-123-4567',
                address: '123 Business Ave, Kingston, Jamaica',
                rating: 4.5,
            },
            amount: 12500,
            currency: 'USD',
            submittedDate: '2024-10-22',
            validUntil: '2024-11-22',
            status: 'Under Review',
            deliveryTime: '14 days',
            deliveryLocation: '456 Main Street, Kingston',
            paymentTerms: 'Net 30',
            warranty: '1 year',
            taxRate: 10,
            score: 85,
            items: [
                { id: 1, description: 'Executive Office Desk', quantity: 10, unitPrice: 450, totalPrice: 4500, specifications: 'Wood finish, 1.5m x 0.8m' },
                { id: 2, description: 'Ergonomic Office Chair', quantity: 25, unitPrice: 200, totalPrice: 5000, specifications: 'Adjustable, mesh back' },
                { id: 3, description: 'Filing Cabinet', quantity: 8, unitPrice: 375, totalPrice: 3000, specifications: '4-drawer, lockable' },
            ],
            notes: 'Bulk discount applied. Free delivery and installation included. Extended warranty available at additional cost.',
            termsAndConditions: 'Payment upon delivery. 30-day return policy. All items covered under manufacturer warranty.',
            attachments: [
                { name: 'Quote_Document.pdf', size: '2.4 MB', uploadedDate: '2024-10-22' },
                { name: 'Product_Catalog.pdf', size: '5.1 MB', uploadedDate: '2024-10-22' },
            ],
            evaluationCriteria: [
                { criterion: 'Price Competitiveness', weight: 40, score: 85, weightedScore: 34 },
                { criterion: 'Delivery Time', weight: 25, score: 80, weightedScore: 20 },
                { criterion: 'Quality & Specifications', weight: 20, score: 90, weightedScore: 18 },
                { criterion: 'Warranty & Support', weight: 15, score: 87, weightedScore: 13 },
            ],
        },
        2: {
            id: 2,
            quoteNumber: 'Q-2024-002',
            rfqNumber: 'RFQ-2024-046',
            rfqTitle: 'IT Hardware Upgrade',
            supplier: {
                name: 'XYZ Suppliers Ltd',
                contact: 'Sarah Johnson',
                email: 'sarah@xyzsuppliers.com',
                phone: '+1-876-234-5678',
                address: '789 Tech Park, Kingston, Jamaica',
                rating: 4.2,
            },
            amount: 8900,
            currency: 'USD',
            submittedDate: '2024-10-21',
            validUntil: '2024-11-21',
            status: 'Pending Evaluation',
            deliveryTime: '21 days',
            deliveryLocation: '456 Main Street, Kingston',
            paymentTerms: 'Net 45',
            warranty: '2 years',
            taxRate: 10,
            score: 78,
            items: [
                { id: 1, description: 'Desktop Computer', quantity: 15, unitPrice: 450, totalPrice: 6750, specifications: 'Intel i5, 16GB RAM, 512GB SSD' },
                { id: 2, description: '24" Monitor', quantity: 15, unitPrice: 143, totalPrice: 2150, specifications: 'Full HD, IPS panel' },
            ],
            notes: 'Installation and setup services included. On-site technical support for 3 months.',
            termsAndConditions: 'Payment net 45 days. 60-day return policy for defective items.',
            attachments: [
                { name: 'Quotation.pdf', size: '1.8 MB', uploadedDate: '2024-10-21' },
            ],
            evaluationCriteria: [
                { criterion: 'Price Competitiveness', weight: 40, score: 72, weightedScore: 28.8 },
                { criterion: 'Delivery Time', weight: 25, score: 75, weightedScore: 18.75 },
                { criterion: 'Quality & Specifications', weight: 20, score: 85, weightedScore: 17 },
                { criterion: 'Warranty & Support', weight: 15, score: 90, weightedScore: 13.5 },
            ],
        },
    };

    const quote = quoteData[parseInt(id || '1') as keyof typeof quoteData] || quoteData[1];

    const subtotal = quote.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = (subtotal * quote.taxRate) / 100;
    const total = subtotal + tax;

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'Accepted':
                return 'badge bg-success';
            case 'Rejected':
                return 'badge bg-danger';
            case 'Under Review':
                return 'badge bg-warning';
            default:
                return 'badge bg-info';
        }
    };

    const handleDownloadPDF = () => {
        // Quote PDF download logic would be implemented here
        alert(`Downloading ${quote.quoteNumber}.pdf`);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleAcceptQuote = () => {
        if (confirm(`Are you sure you want to accept quote ${quote.quoteNumber} from ${quote.supplier.name}?`)) {
            alert('Quote accepted! Proceeding to contract generation.');
            navigate('/procurement/quotes');
        }
    };

    const handleRejectQuote = () => {
        if (confirm(`Are you sure you want to reject quote ${quote.quoteNumber}?`)) {
            alert('Quote rejected.');
            navigate('/procurement/quotes');
        }
    };

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">{quote.quoteNumber}</h2>
                    <p className="text-white-dark">
                        From {quote.supplier.name} • RFQ: <Link to={`/procurement/rfq/${quote.rfqNumber}`} className="text-info hover:underline">{quote.rfqNumber}</Link>
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handlePrint} className="btn btn-outline-secondary gap-2">
                        <IconPrinter className="h-4 w-4" />
                        Print
                    </button>
                    <button onClick={handleDownloadPDF} className="btn btn-info gap-2">
                        <IconDownload className="h-4 w-4" />
                        Download PDF
                    </button>
                    <Link to="/procurement/quotes" className="btn btn-outline-danger gap-2">
                        <IconArrowLeft />
                        Back to List
                    </Link>
                </div>
            </div>

            {/* Status and Key Info */}
            <div className="mb-6 grid gap-6 lg:grid-cols-4">
                <div className="panel">
                    <div className="mb-2 text-white-dark">Status</div>
                    <div className={getStatusBadgeClass(quote.status)}>{quote.status}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-white-dark">Total Amount</div>
                    <div className="text-xl font-bold text-primary">{quote.currency} ${quote.amount.toLocaleString()}</div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-white-dark">Overall Score</div>
                    <div className="flex items-center gap-3">
                        <div className="text-xl font-bold">{quote.score}</div>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            <div
                                className={`h-full ${quote.score >= 80 ? 'bg-success' : quote.score >= 60 ? 'bg-warning' : 'bg-danger'}`}
                                style={{ width: `${quote.score}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
                <div className="panel">
                    <div className="mb-2 text-white-dark">Valid Until</div>
                    <div className="text-xl font-bold text-danger">{quote.validUntil}</div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Supplier Information */}
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">Supplier Information</h5>
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="font-semibold text-white-dark">Company:</div>
                            <div className="col-span-2 font-semibold">{quote.supplier.name}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="font-semibold text-white-dark">Contact Person:</div>
                            <div className="col-span-2">{quote.supplier.contact}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="font-semibold text-white-dark">Email:</div>
                            <div className="col-span-2 text-info">{quote.supplier.email}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="font-semibold text-white-dark">Phone:</div>
                            <div className="col-span-2">{quote.supplier.phone}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="font-semibold text-white-dark">Address:</div>
                            <div className="col-span-2">{quote.supplier.address}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="font-semibold text-white-dark">Rating:</div>
                            <div className="col-span-2 text-warning">★ {quote.supplier.rating} / 5.0</div>
                        </div>
                    </div>
                </div>

                {/* Quote Details */}
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">Quote Details</h5>
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="font-semibold text-white-dark">Quote Number:</div>
                            <div className="col-span-2">{quote.quoteNumber}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="font-semibold text-white-dark">RFQ Reference:</div>
                            <div className="col-span-2">
                                <Link to={`/procurement/rfq/${quote.rfqNumber}`} className="text-info hover:underline">{quote.rfqNumber}</Link>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="font-semibold text-white-dark">Submitted Date:</div>
                            <div className="col-span-2">{quote.submittedDate}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="font-semibold text-white-dark">Valid Until:</div>
                            <div className="col-span-2 font-semibold text-danger">{quote.validUntil}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="font-semibold text-white-dark">Delivery Time:</div>
                            <div className="col-span-2">{quote.deliveryTime}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="font-semibold text-white-dark">Payment Terms:</div>
                            <div className="col-span-2">{quote.paymentTerms}</div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="font-semibold text-white-dark">Warranty:</div>
                            <div className="col-span-2">{quote.warranty}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Line Items */}
            <div className="panel mt-6">
                <h5 className="mb-5 text-lg font-semibold">Quoted Items</h5>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Description</th>
                                <th>Specifications</th>
                                <th>Quantity</th>
                                <th>Unit Price</th>
                                <th className="text-right">Total Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quote.items.map((item, index) => (
                                <tr key={item.id}>
                                    <td>{index + 1}</td>
                                    <td className="font-semibold">{item.description}</td>
                                    <td className="text-white-dark">{item.specifications}</td>
                                    <td>{item.quantity}</td>
                                    <td>${item.unitPrice.toLocaleString()}</td>
                                    <td className="text-right font-semibold">${item.totalPrice.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={5} className="text-right font-semibold">
                                    Subtotal:
                                </td>
                                <td className="text-right font-semibold">${subtotal.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td colSpan={5} className="text-right font-semibold">
                                    Tax ({quote.taxRate}%):
                                </td>
                                <td className="text-right font-semibold">${tax.toLocaleString()}</td>
                            </tr>
                            <tr>
                                <td colSpan={5} className="text-right text-lg font-bold">
                                    Total Amount:
                                </td>
                                <td className="text-right text-lg font-bold text-primary">${total.toLocaleString()}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Evaluation Criteria */}
            <div className="panel mt-6">
                <div className="mb-5 flex items-center gap-2">
                    <IconChartSquare className="h-5 w-5 text-primary" />
                    <h5 className="text-lg font-semibold">Evaluation Criteria & Scoring</h5>
                </div>
                <div className="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th>Criterion</th>
                                <th>Weight (%)</th>
                                <th>Score (0-100)</th>
                                <th>Weighted Score</th>
                                <th>Progress</th>
                            </tr>
                        </thead>
                        <tbody>
                            {quote.evaluationCriteria.map((criteria, index) => (
                                <tr key={index}>
                                    <td className="font-semibold">{criteria.criterion}</td>
                                    <td>{criteria.weight}%</td>
                                    <td>{criteria.score}</td>
                                    <td className="font-semibold">{criteria.weightedScore.toFixed(1)}</td>
                                    <td>
                                        <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                                            <div
                                                className={`h-full ${criteria.score >= 80 ? 'bg-success' : criteria.score >= 60 ? 'bg-warning' : 'bg-danger'}`}
                                                style={{ width: `${criteria.score}%` }}
                                            ></div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={3} className="text-right font-bold">
                                    Overall Score:
                                </td>
                                <td className="font-bold text-primary">{quote.score}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Notes and Terms */}
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">Additional Notes</h5>
                    <p className="text-white-dark">{quote.notes}</p>
                </div>
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">Terms & Conditions</h5>
                    <p className="text-white-dark">{quote.termsAndConditions}</p>
                </div>
            </div>

            {/* Attachments */}
            {quote.attachments && quote.attachments.length > 0 && (
                <div className="panel mt-6">
                    <h5 className="mb-5 text-lg font-semibold">Attachments ({quote.attachments.length})</h5>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {quote.attachments.map((file, index) => (
                            <div key={index} className="flex items-center gap-3 rounded border border-white-light p-4 dark:border-dark">
                                <IconDownload className="h-8 w-8 text-primary" />
                                <div className="flex-1">
                                    <div className="font-semibold">{file.name}</div>
                                    <div className="text-xs text-white-dark">
                                        {file.size} • {file.uploadedDate}
                                    </div>
                                </div>
                                <button className="btn btn-sm btn-outline-primary">
                                    <IconDownload className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            {quote.status === 'Under Review' || quote.status === 'Pending Evaluation' ? (
                <div className="mt-6 flex gap-3">
                    <button onClick={handleAcceptQuote} className="btn btn-success gap-2">
                        <IconChecks className="h-4 w-4" />
                        Accept Quote
                    </button>
                    <button onClick={handleRejectQuote} className="btn btn-danger gap-2">
                        <IconX className="h-4 w-4" />
                        Reject Quote
                    </button>
                    <Link to={`/procurement/evaluation?quote=${quote.id}`} className="btn btn-primary gap-2">
                        <IconChartSquare className="h-4 w-4" />
                        Evaluate Quote
                    </Link>
                </div>
            ) : null}
        </div>
    );
};

export default QuoteDetail;
