import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../../../store';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconChecks from '../../../components/Icon/IconChecks';
import IconX from '../../../components/Icon/IconX';
import IconEye from '../../../components/Icon/IconEye';
import IconClock from '../../../components/Icon/IconClock';
import IconDollarSignCircle from '../../../components/Icon/IconDollarSignCircle';
import IconFile from '../../../components/Icon/IconFile';
import IconDownload from '../../../components/Icon/IconDownload';
import IconPencil from '../../../components/Icon/IconPencil';
import IconCircleCheck from '../../../components/Icon/IconCircleCheck';
import IconSearch from '../../../components/Icon/IconSearch';

const ExecutiveApprovals = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Executive Approvals'));
    });

    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [signOffModal, setSignOffModal] = useState(false);
    const [selectedApproval, setSelectedApproval] = useState<any>(null);
    const [digitalSignature, setDigitalSignature] = useState('');
    const [documentModal, setDocumentModal] = useState(false);
    const [selectedDocument, setSelectedDocument] = useState<any>(null);

    // Executive-level approvals requiring sign-off
    const executiveApprovals = [
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
            justification: 'Critical for business operations and productivity',
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
            justification: 'Required for new office expansion and employee accommodation',
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
            justification: 'Essential for maintaining facility security and compliance requirements',
            documentList: [
                { id: 1, name: 'Service Level Agreement.pdf', type: 'Contract', size: '1.5 MB', uploadedBy: 'Mike Johnson', uploadedDate: '2024-10-26', category: 'Legal' },
                { id: 2, name: 'Security Assessment Report.pdf', type: 'Assessment', size: '2.8 MB', uploadedBy: 'Security Consultant', uploadedDate: '2024-10-25', category: 'Security' },
                { id: 3, name: 'Insurance Certificate.pdf', type: 'Insurance', size: '567 KB', uploadedBy: 'SecureGuard Solutions', uploadedDate: '2024-10-24', category: 'Insurance' },
                { id: 4, name: 'Background Check Records.zip', type: 'HR', size: '1.9 MB', uploadedBy: 'HR Department', uploadedDate: '2024-10-25', category: 'Human Resources' },
                { id: 5, name: 'Cost Breakdown Analysis.xlsx', type: 'Financial', size: '398 KB', uploadedBy: 'Financial Analyst', uploadedDate: '2024-10-26', category: 'Finance' },
                { id: 6, name: 'Performance Metrics.pdf', type: 'Performance', size: '723 KB', uploadedBy: 'Quality Assurance', uploadedDate: '2024-10-25', category: 'Quality' }
            ],
        },
        {
            id: 4,
            approvalNumber: 'APP-2024-004',
            type: 'Major Contract',
            description: 'Cloud Infrastructure Upgrade',
            requestor: 'IT Department',
            departmentHead: 'Jane Smith',
            amount: 180000,
            submittedDate: '2024-10-23',
            priority: 'High',
            dueDate: '2024-11-01',
            documents: 7,
            budgetCode: 'IT-2024-INFRA',
            vendor: 'Amazon Web Services',
            contractPeriod: '2 Years',
            status: 'Under Review',
            justification: 'Scalability and performance improvements for business growth',
            documentList: [
                { id: 1, name: 'AWS Service Agreement.pdf', type: 'Contract', size: '3.1 MB', uploadedBy: 'Jane Smith', uploadedDate: '2024-10-23', category: 'Legal' },
                { id: 2, name: 'Migration Plan.docx', type: 'Technical', size: '1.8 MB', uploadedBy: 'IT Architecture Team', uploadedDate: '2024-10-23', category: 'Technical' },
                { id: 3, name: 'Cost-Benefit Analysis.xlsx', type: 'Financial', size: '967 KB', uploadedBy: 'Financial Analyst', uploadedDate: '2024-10-22', category: 'Finance' },
                { id: 4, name: 'Security Compliance Report.pdf', type: 'Security', size: '1.4 MB', uploadedBy: 'Security Team', uploadedDate: '2024-10-22', category: 'Security' },
                { id: 5, name: 'Implementation Timeline.pdf', type: 'Planning', size: '445 KB', uploadedBy: 'Project Manager', uploadedDate: '2024-10-23', category: 'Project Management' },
                { id: 6, name: 'Disaster Recovery Plan.pdf', type: 'DR', size: '876 KB', uploadedBy: 'IT Operations', uploadedDate: '2024-10-22', category: 'Operations' },
                { id: 7, name: 'Executive Briefing.pptx', type: 'Presentation', size: '2.3 MB', uploadedBy: 'Jane Smith', uploadedDate: '2024-10-23', category: 'Executive' }
            ],
        },
        {
            id: 5,
            approvalNumber: 'APP-2024-005',
            type: 'Capital Expenditure',
            description: 'Manufacturing Equipment Purchase',
            requestor: 'Operations Department',
            departmentHead: 'David Wilson',
            amount: 250000,
            submittedDate: '2024-10-22',
            priority: 'Medium',
            dueDate: '2024-11-05',
            documents: 9,
            budgetCode: 'OPS-2024-EQUIP',
            vendor: 'Industrial Solutions Inc',
            contractPeriod: '5 Years',
            status: 'Conditionally Approved',
            justification: 'Increase production capacity and efficiency to meet growing demand',
            documentList: [
                { id: 1, name: 'Equipment Specifications.pdf', type: 'Technical', size: '4.2 MB', uploadedBy: 'Engineering Team', uploadedDate: '2024-10-22', category: 'Technical' },
                { id: 2, name: 'Financial Impact Analysis.xlsx', type: 'Financial', size: '1.1 MB', uploadedBy: 'Finance Controller', uploadedDate: '2024-10-21', category: 'Finance' },
                { id: 3, name: 'Vendor Evaluation Matrix.pdf', type: 'Evaluation', size: '567 KB', uploadedBy: 'Procurement Team', uploadedDate: '2024-10-20', category: 'Vendor' },
                { id: 4, name: 'Installation Requirements.docx', type: 'Technical', size: '789 KB', uploadedBy: 'Facilities Team', uploadedDate: '2024-10-21', category: 'Facilities' },
                { id: 5, name: 'Training Program Outline.pdf', type: 'Training', size: '345 KB', uploadedBy: 'HR Department', uploadedDate: '2024-10-21', category: 'Training' },
                { id: 6, name: 'Maintenance Contract.pdf', type: 'Contract', size: '1.8 MB', uploadedBy: 'Operations Manager', uploadedDate: '2024-10-22', category: 'Maintenance' },
                { id: 7, name: 'ROI Projections.xlsx', type: 'Financial', size: '654 KB', uploadedBy: 'Business Analyst', uploadedDate: '2024-10-21', category: 'Analysis' },
                { id: 8, name: 'Environmental Impact Study.pdf', type: 'Environmental', size: '2.1 MB', uploadedBy: 'Environmental Consultant', uploadedDate: '2024-10-20', category: 'Environmental' },
                { id: 9, name: 'Board Presentation.pptx', type: 'Presentation', size: '3.4 MB', uploadedBy: 'David Wilson', uploadedDate: '2024-10-22', category: 'Executive' }
            ],
        },
    ];

    // Filter approvals based on selected filter and search term
    const filteredApprovals = executiveApprovals.filter(approval => {
        const matchesFilter = filter === 'all' || approval.status.toLowerCase().includes(filter.toLowerCase()) || approval.type.toLowerCase().includes(filter.toLowerCase());
        const matchesSearch = approval.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             approval.approvalNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             approval.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             approval.requestor.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    // Statistics
    const stats = {
        total: executiveApprovals.length,
        pending: executiveApprovals.filter(a => a.status === 'Pending Executive Approval').length,
        underReview: executiveApprovals.filter(a => a.status === 'Under Review').length,
        conditionallyApproved: executiveApprovals.filter(a => a.status === 'Conditionally Approved').length,
        totalValue: executiveApprovals.reduce((sum, a) => sum + a.amount, 0),
    };

    const handleSignOff = (approval: any) => {
        setSelectedApproval(approval);
        setSignOffModal(true);
    };

    const handleViewDocuments = (approval: any) => {
        setSelectedDocument(approval);
        setDocumentModal(true);
    };

    const submitDigitalSignature = (action: 'approve' | 'reject' | 'conditional') => {
        if (!digitalSignature.trim()) {
            alert('Please provide your digital signature/comments');
            return;
        }
        
        console.log(`${action} approval:`, selectedApproval, 'Signature:', digitalSignature);
        // Implement digital signature logic here
        alert(`Approval ${action}ed successfully with digital signature`);
        setSignOffModal(false);
        setSelectedApproval(null);
        setDigitalSignature('');
    };

    const downloadDocument = (document: any) => {
        console.log('Downloading document:', document.name);
        alert(`Downloading ${document.name}...`);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Pending Executive Approval':
                return 'badge-outline-warning';
            case 'Under Review':
                return 'badge-outline-info';
            case 'Conditionally Approved':
                return 'badge-outline-secondary';
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
                    <span>Executive Approvals</span>
                </li>
            </ul>

            <div className="pt-5">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">Executive Approvals</h2>
                        <p className="text-white-dark">High-value procurement items requiring executive sign-off</p>
                    </div>
                    <div className="flex gap-2">
                        <Link to="/procurement/executive-director-dashboard" className="btn btn-outline-primary">
                            <IconEye className="mr-2" />
                            Dashboard View
                        </Link>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="panel">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-lg font-semibold">Total Approvals</div>
                            <IconFile className="h-6 w-6 text-primary" />
                        </div>
                        <div className="text-3xl font-bold text-primary">{stats.total}</div>
                    </div>
                    <div className="panel">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-lg font-semibold">Pending</div>
                            <IconClock className="h-6 w-6 text-warning" />
                        </div>
                        <div className="text-3xl font-bold text-warning">{stats.pending}</div>
                    </div>
                    <div className="panel">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-lg font-semibold">Under Review</div>
                            <IconEye className="h-6 w-6 text-info" />
                        </div>
                        <div className="text-3xl font-bold text-info">{stats.underReview}</div>
                    </div>
                    <div className="panel">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-lg font-semibold">Conditional</div>
                            <IconChecks className="h-6 w-6 text-secondary" />
                        </div>
                        <div className="text-3xl font-bold text-secondary">{stats.conditionallyApproved}</div>
                    </div>
                    <div className="panel">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-lg font-semibold">Total Value</div>
                            <IconDollarSignCircle className="h-6 w-6 text-success" />
                        </div>
                        <div className="text-3xl font-bold text-success">${(stats.totalValue / 1000).toFixed(0)}K</div>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('pending')}
                            className={`btn btn-sm ${filter === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
                        >
                            Pending
                        </button>
                        <button
                            onClick={() => setFilter('under review')}
                            className={`btn btn-sm ${filter === 'under review' ? 'btn-info' : 'btn-outline-info'}`}
                        >
                            Under Review
                        </button>
                        <button
                            onClick={() => setFilter('major contract')}
                            className={`btn btn-sm ${filter === 'major contract' ? 'btn-primary' : 'btn-outline-primary'}`}
                        >
                            Major Contracts
                        </button>
                        <button
                            onClick={() => setFilter('capital')}
                            className={`btn btn-sm ${filter === 'capital' ? 'btn-success' : 'btn-outline-success'}`}
                        >
                            Capital Expenditure
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search approvals..."
                                className="form-input pl-10 pr-4"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white-dark" />
                        </div>
                    </div>
                </div>

                {/* Approvals List */}
                <div className="space-y-4">
                    {filteredApprovals.map((approval) => (
                        <div key={approval.id} className="panel">
                            <div className="mb-4 flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="mb-2 flex items-center gap-2">
                                        <h5 className="text-lg font-semibold">{approval.approvalNumber}</h5>
                                        <span className={`badge ${getTypeBadge(approval.type)}`}>
                                            {approval.type}
                                        </span>
                                        <span className={`badge ${getPriorityBadge(approval.priority)}`}>
                                            {approval.priority}
                                        </span>
                                        <span className={`badge ${getStatusBadge(approval.status)}`}>
                                            {approval.status}
                                        </span>
                                    </div>
                                    <p className="mb-3 text-lg font-medium">{approval.description}</p>
                                    <p className="mb-3 text-sm text-white-dark">{approval.justification}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-primary">${approval.amount.toLocaleString()}</div>
                                        <div className="text-xs text-white-dark">Contract: {approval.contractPeriod}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleViewDocuments(approval)}
                                            className="btn btn-outline-info btn-sm"
                                            title="View Documents"
                                        >
                                            <IconEye className="h-4 w-4" />
                                        </button>
                                        {approval.status === 'Pending Executive Approval' && (
                                            <button
                                                onClick={() => handleSignOff(approval)}
                                                className="btn btn-success btn-sm"
                                                title="Digital Sign-off"
                                            >
                                                <IconPencil className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-6 border-t border-[#e0e6ed] pt-4 dark:border-[#253b5c] lg:grid-cols-4">
                                <div>
                                    <span className="text-sm font-medium text-white-dark">Vendor</span>
                                    <p className="font-semibold">{approval.vendor}</p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-white-dark">Requesting Department</span>
                                    <p className="font-semibold">{approval.requestor}</p>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-white-dark">Department Head</span>
                                    <div className="flex items-center gap-1">
                                        <IconCircleCheck className="h-4 w-4 text-success" />
                                        <span className="font-semibold">{approval.departmentHead}</span>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-white-dark">Due Date</span>
                                    <p className="font-semibold">{approval.dueDate}</p>
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between border-t border-[#e0e6ed] pt-4 dark:border-[#253b5c]">
                                <div className="flex items-center gap-4 text-xs text-white-dark">
                                    <span>Budget Code: {approval.budgetCode}</span>
                                    <span>Submitted: {approval.submittedDate}</span>
                                    <span className="flex items-center gap-1">
                                        <IconFile className="h-3 w-3" />
                                        {approval.documents} documents
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredApprovals.length === 0 && (
                    <div className="panel">
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <IconFile className="mb-4 h-16 w-16 text-white-dark" />
                            <h3 className="mb-2 text-lg font-semibold">No approvals found</h3>
                            <p className="text-white-dark">Try adjusting your filters or search terms</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Digital Sign-off Modal */}
            {signOffModal && selectedApproval && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-75">
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
                            <label className="mb-2 block text-sm font-medium">Executive Decision & Digital Signature</label>
                            <textarea
                                value={digitalSignature}
                                onChange={(e) => setDigitalSignature(e.target.value)}
                                className="form-textarea resize-none"
                                rows={4}
                                placeholder="Enter your decision rationale, comments, conditions, or digital signature..."
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
                                onClick={() => submitDigitalSignature('conditional')}
                                className="btn btn-warning"
                                disabled={!digitalSignature.trim()}
                            >
                                <IconClock className="mr-2" />
                                Conditional Approval
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
                                                    console.log('Viewing document:', doc.name);
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
                                    console.log('Downloading all documents for:', selectedDocument.approvalNumber);
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

export default ExecutiveApprovals;