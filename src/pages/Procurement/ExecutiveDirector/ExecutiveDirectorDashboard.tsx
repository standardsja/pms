import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../../store';
import { setPageTitle } from '../../store/themeConfigSlice';
import ReactApexChart from 'react-apexcharts';
import PerfectScrollbar from 'react-perfect-scrollbar';
import IconDollarSignCircle from '../../components/Icon/IconDollarSignCircle';
import IconFile from '../../components/Icon/IconFile';
import IconChecks from '../../components/Icon/IconChecks';
import IconClock from '../../components/Icon/IconClock';
import IconEye from '../../components/Icon/IconEye';
import IconUser from '../../components/Icon/IconUser';
import IconTrendingUp from '../../components/Icon/IconTrendingUp';
import IconChartSquare from '../../components/Icon/IconChartSquare';
import IconThumbUp from '../../components/Icon/IconThumbUp';
import IconX from '../../components/Icon/IconX';
import IconDownload from '../../components/Icon/IconDownload';
import IconPencil from '../../components/Icon/IconPencil';
import IconLock from '../../components/Icon/IconLock';
import IconCircleCheck from '../../components/Icon/IconCircleCheck';

const ExecutiveDirectorDashboard = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Executive Director Dashboard'));
    });

    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl' ? true : false;

    const [signOffModal, setSignOffModal] = useState(false);
    const [selectedApproval, setSelectedApproval] = useState<any>(null);
    const [digitalSignature, setDigitalSignature] = useState('');
    const [documentModal, setDocumentModal] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<any>(null);

    // Executive-level statistics
    const stats = {
        pendingSignOffs: 6,
        completedApprovals: 89,
        totalBudgetValue: 2500000,
        thisQuarterApprovals: 45,
        avgProcessingTime: 1.2,
        complianceRate: 98.5,
    };

    // High-value procurement items requiring executive sign-off
    const pendingApprovals = [
        {
            id: 1,
            approvalNumber: 'APP-2024-001',
            type: 'Major Contract',
            description: 'Enterprise Software License Renewal',
            requestor: 'IT Department',
            departmentHead: 'Jane Smith',
            amount: 125000,
            submittedDate: '2024-10-25',
            priority: 'High',
            dueDate: '2024-10-30',
            documents: 8,
            budgetCode: 'IT-2024-SW',
            vendor: 'Microsoft Corporation',
            contractPeriod: '3 Years',
            status: 'Pending Executive Approval',
            documentList: [
                { id: 1, name: 'Software License Agreement.pdf', type: 'Contract', size: '2.4 MB', uploadedBy: 'Jane Smith', uploadedDate: '2024-10-25', category: 'Legal' },
                { id: 2, name: 'Budget Justification.docx', type: 'Financial', size: '856 KB', uploadedBy: 'John Doe', uploadedDate: '2024-10-25', category: 'Finance' },
                { id: 3, name: 'Technical Requirements.pdf', type: 'Technical', size: '1.2 MB', uploadedBy: 'Sarah Wilson', uploadedDate: '2024-10-24', category: 'Technical' },
                { id: 4, name: 'Vendor Comparison Analysis.xlsx', type: 'Analysis', size: '945 KB', uploadedBy: 'Mike Johnson', uploadedDate: '2024-10-24', category: 'Analysis' },
                { id: 5, name: 'Risk Assessment.pdf', type: 'Risk', size: '678 KB', uploadedBy: 'Lisa Davis', uploadedDate: '2024-10-23', category: 'Risk Management' },
                { id: 6, name: 'Compliance Checklist.pdf', type: 'Compliance', size: '234 KB', uploadedBy: 'Robert Brown', uploadedDate: '2024-10-23', category: 'Compliance' },
                { id: 7, name: 'Executive Summary.pdf', type: 'Summary', size: '512 KB', uploadedBy: 'Jane Smith', uploadedDate: '2024-10-25', category: 'Executive' },
                { id: 8, name: 'Approval Workflow.png', type: 'Workflow', size: '189 KB', uploadedBy: 'System', uploadedDate: '2024-10-25', category: 'Process' }
            ],
        },
        {
            id: 2,
            approvalNumber: 'APP-2024-002',
            type: 'Capital Expenditure',
            description: 'New Office Equipment & Furniture',
            requestor: 'Facilities Department',
            departmentHead: 'Robert Brown',
            amount: 85000,
            submittedDate: '2024-10-24',
            priority: 'Medium',
            dueDate: '2024-10-29',
            documents: 5,
            budgetCode: 'FAC-2024-CE',
            vendor: 'Office Depot Inc',
            contractPeriod: '1 Year',
            status: 'Pending Executive Approval',
            documentList: [
                { id: 1, name: 'Equipment Purchase Order.pdf', type: 'Purchase Order', size: '1.8 MB', uploadedBy: 'Robert Brown', uploadedDate: '2024-10-24', category: 'Procurement' },
                { id: 2, name: 'Budget Authorization.pdf', type: 'Financial', size: '445 KB', uploadedBy: 'Finance Team', uploadedDate: '2024-10-24', category: 'Finance' },
                { id: 3, name: 'Vendor Quotations.zip', type: 'Quotes', size: '3.2 MB', uploadedBy: 'Procurement Officer', uploadedDate: '2024-10-23', category: 'Vendor' },
                { id: 4, name: 'Space Planning Layout.dwg', type: 'Technical', size: '2.1 MB', uploadedBy: 'Facilities Team', uploadedDate: '2024-10-23', category: 'Technical' },
                { id: 5, name: 'Delivery Schedule.xlsx', type: 'Logistics', size: '234 KB', uploadedBy: 'Logistics Coordinator', uploadedDate: '2024-10-24', category: 'Logistics' }
            ],
        },
        {
            id: 3,
            approvalNumber: 'APP-2024-003',
            type: 'Service Contract',
            description: 'Security Services Annual Contract',
            requestor: 'Security Department',
            departmentHead: 'Mike Johnson',
            amount: 95000,
            submittedDate: '2024-10-26',
            priority: 'High',
            dueDate: '2024-10-31',
            documents: 6,
            budgetCode: 'SEC-2024-SV',
            vendor: 'SecureGuard Solutions',
            contractPeriod: '1 Year',
            status: 'Pending Executive Approval',
            documentList: [
                { id: 1, name: 'Service Level Agreement.pdf', type: 'Contract', size: '1.5 MB', uploadedBy: 'Mike Johnson', uploadedDate: '2024-10-26', category: 'Legal' },
                { id: 2, name: 'Security Assessment Report.pdf', type: 'Assessment', size: '2.8 MB', uploadedBy: 'Security Consultant', uploadedDate: '2024-10-25', category: 'Security' },
                { id: 3, name: 'Insurance Certificate.pdf', type: 'Insurance', size: '567 KB', uploadedBy: 'SecureGuard Solutions', uploadedDate: '2024-10-24', category: 'Insurance' },
                { id: 4, name: 'Background Check Records.zip', type: 'HR', size: '1.9 MB', uploadedBy: 'HR Department', uploadedDate: '2024-10-25', category: 'Human Resources' },
                { id: 5, name: 'Cost Breakdown Analysis.xlsx', type: 'Financial', size: '398 KB', uploadedBy: 'Financial Analyst', uploadedDate: '2024-10-26', category: 'Finance' },
                { id: 6, name: 'Performance Metrics.pdf', type: 'Performance', size: '723 KB', uploadedBy: 'Quality Assurance', uploadedDate: '2024-10-25', category: 'Quality' }
            ],
        },
    ];

    // Recent executive approvals
    const recentSignOffs = [
        {
            id: 1,
            action: 'Approved',
            description: 'Marketing Campaign Management Software',
            amount: 65000,
            signedDate: '2024-10-25',
            vendor: 'HubSpot Inc',
            processing: 'Digital Signature',
        },
        {
            id: 2,
            action: 'Approved',
            description: 'Facility Maintenance Contract',
            amount: 140000,
            signedDate: '2024-10-24',
            vendor: 'FaciliCorp Services',
            processing: 'Digital Signature',
        },
        {
            id: 3,
            action: 'Conditionally Approved',
            description: 'Cloud Infrastructure Upgrade',
            amount: 180000,
            signedDate: '2024-10-23',
            vendor: 'Amazon Web Services',
            processing: 'Digital Signature',
            condition: 'Budget revision required',
        },
    ];

    // Executive approval trends chart
    const approvalTrendsChart = {
        series: [
            {
                name: 'Approved Amount ($000s)',
                data: [125, 180, 95, 220, 165, 240, 195, 275, 210, 190, 155, 145],
            },
            {
                name: 'Number of Approvals',
                data: [8, 12, 6, 15, 11, 18, 14, 20, 16, 13, 10, 9],
            },
        ],
        options: {
            chart: {
                height: 300,
                type: 'line' as const,
                fontFamily: 'Nunito, sans-serif',
                zoom: {
                    enabled: false,
                },
                toolbar: {
                    show: false,
                },
            },
            colors: ['#1b55e2', '#00ab55'],
            dataLabels: {
                enabled: false,
            },
            stroke: {
                show: true,
                curve: 'smooth' as const,
                width: 3,
                lineCap: 'square' as const,
            },
            markers: {
                size: 6,
                colors: ['#1b55e2', '#00ab55'],
                strokeColors: '#fff',
                strokeWidth: 2,
                hover: {
                    size: 8,
                },
            },
            xaxis: {
                categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                axisBorder: {
                    show: false,
                },
                axisTicks: {
                    show: false,
                },
                labels: {
                    offsetX: isRtl ? 2 : 0,
                    offsetY: 5,
                    style: {
                        fontSize: '12px',
                        cssClass: 'apexcharts-xaxis-title',
                    },
                },
            },
            yaxis: [
                {
                    title: {
                        text: 'Amount ($000s)',
                        style: {
                            fontSize: '12px',
                        },
                    },
                    labels: {
                        formatter: (value: number) => {
                            return value.toString();
                        },
                        offsetX: isRtl ? -10 : 0,
                        style: {
                            fontSize: '12px',
                        },
                    },
                },
                {
                    opposite: true,
                    title: {
                        text: 'Number of Approvals',
                        style: {
                            fontSize: '12px',
                        },
                    },
                    labels: {
                        formatter: (value: number) => {
                            return value.toString();
                        },
                        offsetX: isRtl ? 10 : 0,
                        style: {
                            fontSize: '12px',
                        },
                    },
                },
            ],
            grid: {
                borderColor: isDark ? '#191E3A' : '#E0E6ED',
                strokeDashArray: 5,
                xaxis: {
                    lines: {
                        show: true,
                    },
                },
                yaxis: {
                    lines: {
                        show: false,
                    },
                },
                padding: {
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                },
            },
            legend: {
                position: 'top' as const,
                horizontalAlign: 'right' as const,
                fontSize: '16px',
                markers: {
                    width: 10,
                    height: 10,
                    offsetX: -2,
                },
                itemMargin: {
                    horizontal: 10,
                    vertical: 5,
                },
            },
            tooltip: {
                marker: {
                    show: true,
                },
                y: [
                    {
                        title: {
                            formatter: () => 'Amount: $',
                        },
                        formatter: (value: number) => `${value}K`,
                    },
                    {
                        title: {
                            formatter: () => 'Count: ',
                        },
                    },
                ],
            },
        },
    };

    const handleSignOff = (approval: any) => {
        setSelectedApproval(approval);
        setSignOffModal(true);
    };

    const handleViewDocuments = (approval: any) => {
        // Handle view documents action
        setSelectedDocument(approval);
        setDocumentModal(true);
    };

    const submitDigitalSignature = (action: 'approve' | 'reject') => {
        if (!digitalSignature.trim()) {
            alert('Please provide your digital signature/comments');
            return;
        }
        
        // Process approval action
        // Implement digital signature logic
        setSignOffModal(false);
        setSelectedApproval(null);
        setDigitalSignature('');
    };

    const downloadDocument = (document: any) => {
        // Implement document download logic
        // In a real app, this would trigger a file download
        alert(`Downloading ${document.name}...`);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Pending Executive Approval':
                return 'badge-outline-warning';
            case 'Approved':
                return 'badge-outline-success';
            case 'Rejected':
                return 'badge-outline-danger';
            default:
                return 'badge-outline-primary';
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'High':
                return 'badge-outline-danger';
            case 'Medium':
                return 'badge-outline-warning';
            case 'Low':
                return 'badge-outline-info';
            default:
                return 'badge-outline-primary';
        }
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'Major Contract':
                return 'badge-outline-primary';
            case 'Capital Expenditure':
                return 'badge-outline-success';
            case 'Service Contract':
                return 'badge-outline-info';
            default:
                return 'badge-outline-secondary';
        }
    };

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link to="#" className="text-primary hover:underline">
                        Procurement
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Executive Director Dashboard</span>
                </li>
            </ul>

            <div className="pt-5">
                <div className="mb-6 grid gap-6 xl:grid-cols-3">
                    <div className="panel h-full xl:col-span-2">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">Executive Approval Trends</h5>
                        </div>
                        <ReactApexChart options={approvalTrendsChart.options} series={approvalTrendsChart.series} type="line" height={300} />
                    </div>

                    <div className="panel h-full">
                        <div className="mb-5 flex items-center">
                            <h5 className="text-lg font-semibold dark:text-white-light">Executive Metrics</h5>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg bg-warning-light p-4 dark:bg-warning-dark-light">
                                <div>
                                    <h4 className="text-2xl font-bold text-warning">{stats.pendingSignOffs}</h4>
                                    <p className="text-warning">Pending Sign-offs</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning text-white">
                                    <IconPencil />
                                </div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-success-light p-4 dark:bg-success-dark-light">
                                <div>
                                    <h4 className="text-2xl font-bold text-success">{stats.completedApprovals}</h4>
                                    <p className="text-success">Completed This Quarter</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success text-white">
                                    <IconChecks />
                                </div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-primary-light p-4 dark:bg-primary-dark-light">
                                <div>
                                    <h4 className="text-2xl font-bold text-primary">${(stats.totalBudgetValue / 1000000).toFixed(1)}M</h4>
                                    <p className="text-primary">Total Budget Value</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-white">
                                    <IconDollarSignCircle />
                                </div>
                            </div>
                            <div className="flex items-center justify-between rounded-lg bg-info-light p-4 dark:bg-info-dark-light">
                                <div>
                                    <h4 className="text-2xl font-bold text-info">{stats.avgProcessingTime} days</h4>
                                    <p className="text-info">Avg. Processing Time</p>
                                </div>
                                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-info text-white">
                                    <IconClock />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-6 grid gap-6 xl:grid-cols-2">
                    {/* Pending Executive Approvals */}
                    <div className="panel">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">Pending Executive Sign-offs</h5>
                            <Link to="/procurement/approvals" className="font-semibold text-primary hover:underline">
                                View All
                            </Link>
                        </div>
                        <div className="space-y-4">
                            {pendingApprovals.map((approval) => (
                                <div key={approval.id} className="rounded-lg border border-[#e0e6ed] p-4 dark:border-[#253b5c]">
                                    <div className="mb-3 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <h6 className="font-semibold">{approval.approvalNumber}</h6>
                                            <span className={`badge ${getTypeBadge(approval.type)}`}>
                                                {approval.type}
                                            </span>
                                            <span className={`badge ${getPriorityBadge(approval.priority)}`}>
                                                {approval.priority}
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleViewDocuments(approval)}
                                                className="btn btn-outline-info btn-sm"
                                                title="View Documents"
                                            >
                                                <IconEye className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleSignOff(approval)}
                                                className="btn btn-success btn-sm"
                                                title="Sign Off"
                                            >
                                                <IconPencil className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="mb-2 font-medium">{approval.description}</p>
                                    <div className="mb-3 flex items-center justify-between">
                                        <span className="text-lg font-bold text-primary">${approval.amount.toLocaleString()}</span>
                                        <span className="text-sm text-white-dark">Due: {approval.dueDate}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-xs text-white-dark">
                                        <div>
                                            <p><strong>Vendor:</strong> {approval.vendor}</p>
                                            <p><strong>Requestor:</strong> {approval.requestor}</p>
                                        </div>
                                        <div>
                                            <p><strong>Dept. Head:</strong> {approval.departmentHead}</p>
                                            <p><strong>Budget Code:</strong> {approval.budgetCode}</p>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-xs">
                                        <span className="text-white-dark">Contract Period: {approval.contractPeriod}</span>
                                        <span className="flex items-center gap-1 text-white-dark">
                                            <IconFile className="h-3 w-3" />
                                            {approval.documents} documents
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Executive Sign-offs */}
                    <div className="panel">
                        <div className="mb-5 flex items-center justify-between">
                            <h5 className="text-lg font-semibold dark:text-white-light">Recent Executive Sign-offs</h5>
                        </div>
                        <PerfectScrollbar className="relative h-[400px] pr-3 -mr-3">
                            <div className="space-y-4">
                                {recentSignOffs.map((signOff) => (
                                    <div key={signOff.id} className="flex items-start gap-3">
                                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                            signOff.action === 'Approved' ? 'bg-success-light text-success' : 
                                            signOff.action === 'Conditionally Approved' ? 'bg-warning-light text-warning' :
                                            'bg-danger-light text-danger'
                                        }`}>
                                            {signOff.action === 'Approved' || signOff.action === 'Conditionally Approved' ? 
                                                <IconThumbUp className="h-4 w-4" /> : <IconX className="h-4 w-4" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`font-semibold ${
                                                    signOff.action === 'Approved' ? 'text-success' : 
                                                    signOff.action === 'Conditionally Approved' ? 'text-warning' :
                                                    'text-danger'
                                                }`}>
                                                    {signOff.action}
                                                </span>
                                                <span className="flex items-center gap-1 text-xs text-white-dark">
                                                    <IconLock className="h-3 w-3" />
                                                    {signOff.processing}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium">{signOff.description}</p>
                                            <div className="flex items-center gap-2 text-xs text-white-dark">
                                                <span>Vendor: {signOff.vendor}</span>
                                                <span>Amount: ${signOff.amount.toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-white-dark">Signed: {signOff.signedDate}</span>
                                            </div>
                                            {signOff.condition && (
                                                <p className="text-xs text-warning mt-1">Note: {signOff.condition}</p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </PerfectScrollbar>
                    </div>
                </div>
            </div>

            {/* Digital Sign-off Modal */}
            {signOffModal && selectedApproval && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="w-full max-w-3xl rounded-lg bg-white p-6 dark:bg-[#1b2e4b]">
                        <div className="mb-4 flex items-center justify-between">
                            <h4 className="text-lg font-semibold flex items-center gap-2">
                                <IconPencil />
                                Executive Digital Sign-off
                            </h4>
                            <button 
                                onClick={() => setSignOffModal(false)} 
                                className="text-white-dark hover:text-danger"
                                title="Close Modal"
                            >
                                <IconX />
                            </button>
                        </div>
                        
                        <div className="mb-6 rounded-lg border border-[#e0e6ed] p-4 dark:border-[#253b5c]">
                            <div className="mb-4 grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-white-dark">Approval Number</label>
                                    <p className="font-semibold">{selectedApproval.approvalNumber}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-white-dark">Type</label>
                                    <p className="font-semibold">{selectedApproval.type}</p>
                                </div>
                            </div>
                            
                            <div className="mb-4">
                                <label className="text-sm font-medium text-white-dark">Description</label>
                                <p className="font-semibold">{selectedApproval.description}</p>
                            </div>
                            
                            <div className="mb-4 grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-white-dark">Vendor</label>
                                    <p>{selectedApproval.vendor}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-white-dark">Amount</label>
                                    <p className="text-lg font-bold text-primary">${selectedApproval.amount.toLocaleString()}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-white-dark">Contract Period</label>
                                    <p>{selectedApproval.contractPeriod}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-white-dark">Requesting Department</label>
                                    <p>{selectedApproval.requestor}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-white-dark">Department Head Approval</label>
                                    <p className="flex items-center gap-1 text-success">
                                        <IconCircleCheck className="h-4 w-4" />
                                        {selectedApproval.departmentHead}
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mb-6">
                            <label className="mb-2 block text-sm font-medium">Digital Signature & Comments</label>
                            <textarea
                                value={digitalSignature}
                                onChange={(e) => setDigitalSignature(e.target.value)}
                                className="form-textarea resize-none"
                                rows={4}
                                placeholder="Enter your digital signature, comments, or conditions for this approval..."
                            />
                        </div>
                        
                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={() => submitDigitalSignature('approve')}
                                className="btn btn-success"
                                disabled={!digitalSignature.trim()}
                            >
                                <IconChecks className="mr-2" />
                                Approve & Sign
                            </button>
                            <button
                                onClick={() => submitDigitalSignature('reject')}
                                className="btn btn-danger"
                                disabled={!digitalSignature.trim()}
                            >
                                <IconX className="mr-2" />
                                Reject with Comments
                            </button>
                            <button
                                onClick={() => handleViewDocuments(selectedApproval)}
                                className="btn btn-outline-primary"
                            >
                                <IconDownload className="mr-2" />
                                View Documents
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Viewer Modal */}

            {documentModal && selectedDocument && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-75">
                    <div className="w-full max-w-4xl rounded-lg bg-white p-6 dark:bg-[#1b2e4b] max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="mb-4 flex items-center justify-between">
                            <h4 className="text-lg font-semibold flex items-center gap-2">
                                <IconFile />
                                Documents - {selectedDocument.approvalNumber}
                            </h4>
                            <button 
                                onClick={() => setDocumentModal(false)} 
                                className="text-white-dark hover:text-danger"
                                title="Close Modal"
                            >
                                <IconX />
                            </button>
                        </div>
                        
                        <div className="mb-4 rounded-lg border border-[#e0e6ed] p-4 dark:border-[#253b5c]">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <span className="font-medium text-white-dark">Approval:</span>
                                    <p className="font-semibold">{selectedDocument.description}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-white-dark">Vendor:</span>
                                    <p className="font-semibold">{selectedDocument.vendor}</p>
                                </div>
                                <div>
                                    <span className="font-medium text-white-dark">Total Documents:</span>
                                    <p className="font-semibold">{selectedDocument.documents} files</p>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-hidden">
                            <h6 className="mb-3 font-semibold">Document List</h6>
                            <div className="overflow-y-auto max-h-[400px] space-y-3">
                                {selectedDocument.documentList?.map((doc: any) => (
                                    <div key={doc.id} className="flex items-center justify-between rounded-lg border border-[#e0e6ed] p-4 dark:border-[#253b5c] hover:bg-gray-50 dark:hover:bg-gray-800">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary">
                                                <IconFile className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1">
                                                <h6 className="font-semibold text-sm">{doc.name}</h6>
                                                <div className="flex items-center gap-4 text-xs text-white-dark">
                                                    <span>Type: {doc.type}</span>
                                                    <span>Size: {doc.size}</span>
                                                    <span>Category: {doc.category}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-white-dark mt-1">
                                                    <span>Uploaded by: {doc.uploadedBy}</span>
                                                    <span>•</span>
                                                    <span>{doc.uploadedDate}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => downloadDocument(doc)}
                                                className="btn btn-outline-primary btn-sm"
                                                title="Download Document"
                                            >
                                                <IconDownload className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    // In a real app, this would open a document viewer
                                                    alert(`Opening ${doc.name} for preview...`);
                                                }}
                                                className="btn btn-outline-success btn-sm"
                                                title="Preview Document"
                                            >
                                                <IconEye className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="mt-4 flex justify-end gap-2 border-t border-[#e0e6ed] pt-4 dark:border-[#253b5c]">
                            <button
                                onClick={() => {
                                    // In production, this would create a ZIP package of all documents
                                    alert(`Preparing download package for all ${selectedDocument.documents} documents...`);
                                }}
                                className="btn btn-primary"
                            >
                                <IconDownload className="mr-2" />
                                Download All Documents
                            </button>
                            <button
                                onClick={() => setDocumentModal(false)}
                                className="btn btn-outline-secondary"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExecutiveDirectorDashboard;