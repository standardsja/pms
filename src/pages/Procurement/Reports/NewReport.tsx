import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';

const NewReport = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        dispatch(setPageTitle('Generate Report'));
    });

    const template = searchParams.get('template');

    // Template mapping
    const templates: Record<string, { name: string; description: string }> = {
        monthly: { name: 'Monthly Summary', description: 'Comprehensive monthly procurement overview' },
        supplier: { name: 'Supplier Performance', description: 'Detailed supplier metrics and analysis' },
        budget: { name: 'Budget Analysis', description: 'Budget vs actual spend comparison' },
        rfq: { name: 'RFQ Performance', description: 'RFQ cycle times and efficiency' },
        savings: { name: 'Cost Savings', description: 'Cost reduction and savings analysis' },
        compliance: { name: 'Compliance Report', description: 'Procurement compliance metrics' },
    };

    const selectedTemplate = template && templates[template] ? templates[template] : null;

    const [reportName, setReportName] = useState(selectedTemplate?.name || '');
    const [reportType, setReportType] = useState(template || 'custom');
    const [period, setPeriod] = useState('current-month');
    const [format, setFormat] = useState('pdf');
    const [includeCharts, setIncludeCharts] = useState(true);
    const [includeDetails, setIncludeDetails] = useState(true);

    const [modal, setModal] = useState<{ open: boolean; title: string; message: string }>(
        { open: false, title: '', message: '' }
    );

    const openModal = (title: string, message: string) => setModal({ open: true, title, message });
    const closeModal = () => setModal({ open: false, title: '', message: '' });

    const handleGenerate = () => {
        if (!reportName.trim()) {
            openModal('Missing Information', 'Please enter a report name.');
            return;
        }
        openModal('Report Generated', `${reportName} has been generated successfully and is ready for download.`);
        setTimeout(() => {
            closeModal();
            navigate('/procurement/reports');
        }, 1500);
    };

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Generate Report</h2>
                    <p className="text-white-dark">Configure and generate custom procurement reports</p>
                </div>
                <Link to="/procurement/reports" className="btn btn-outline-danger gap-2">
                    <IconArrowLeft />
                    Back to Reports
                </Link>
            </div>

            {selectedTemplate && (
                <div className="panel mb-6 border-l-4 border-primary">
                    <div className="mb-2 font-semibold text-primary">Template Selected</div>
                    <div className="text-lg font-bold">{selectedTemplate.name}</div>
                    <div className="text-sm text-white-dark">{selectedTemplate.description}</div>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">Report Configuration</h5>
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1 block text-white-dark">Report Name</label>
                            <input className="form-input" placeholder="e.g. October 2024 Summary" value={reportName} onChange={(e) => setReportName(e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-white-dark">Report Type</label>
                            <select className="form-select" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                                <option value="custom">Custom Report</option>
                                <option value="monthly">Monthly Summary</option>
                                <option value="supplier">Supplier Performance</option>
                                <option value="budget">Budget Analysis</option>
                                <option value="rfq">RFQ Performance</option>
                                <option value="savings">Cost Savings</option>
                                <option value="compliance">Compliance Report</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-white-dark">Period</label>
                            <select className="form-select" value={period} onChange={(e) => setPeriod(e.target.value)}>
                                <option value="current-month">Current Month</option>
                                <option value="last-month">Last Month</option>
                                <option value="current-quarter">Current Quarter</option>
                                <option value="last-quarter">Last Quarter</option>
                                <option value="current-year">Current Year</option>
                                <option value="last-year">Last Year</option>
                                <option value="custom">Custom Range</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-white-dark">Output Format</label>
                            <select className="form-select" value={format} onChange={(e) => setFormat(e.target.value)}>
                                <option value="pdf">PDF</option>
                                <option value="excel">Excel</option>
                                <option value="csv">CSV</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">Report Options</h5>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-white-dark">Include Charts & Graphs</label>
                            <input type="checkbox" className="form-checkbox" checked={includeCharts} onChange={(e) => setIncludeCharts(e.target.checked)} />
                        </div>
                        <div className="flex items-center justify-between">
                            <label className="text-white-dark">Include Detailed Breakdowns</label>
                            <input type="checkbox" className="form-checkbox" checked={includeDetails} onChange={(e) => setIncludeDetails(e.target.checked)} />
                        </div>
                        <div className="mt-6 rounded-lg border border-white-light p-4 dark:border-white/10">
                            <h6 className="mb-2 font-semibold">Report Preview</h6>
                            <div className="space-y-2 text-sm text-white-dark">
                                <div>Name: <span className="font-semibold text-black dark:text-white">{reportName || 'Not specified'}</span></div>
                                <div>Type: <span className="font-semibold text-black dark:text-white">{reportType}</span></div>
                                <div>Period: <span className="font-semibold text-black dark:text-white">{period}</span></div>
                                <div>Format: <span className="font-semibold text-black dark:text-white">{format.toUpperCase()}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
                <button className="btn btn-primary" onClick={handleGenerate}>Generate Report</button>
                <button className="btn btn-outline-secondary" onClick={() => navigate('/procurement/reports')}>Cancel</button>
            </div>

            {modal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
                        <div className="mb-3 text-lg font-semibold text-primary">{modal.title}</div>
                        <div className="text-white-dark">{modal.message}</div>
                        <div className="mt-5 text-right">
                            <button className="btn btn-primary" onClick={closeModal}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NewReport;
