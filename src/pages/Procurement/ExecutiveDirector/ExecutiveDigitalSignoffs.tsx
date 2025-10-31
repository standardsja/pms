import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconPencilPaper from '../../../components/Icon/IconPencilPaper';
import IconEye from '../../../components/Icon/IconEye';
import IconChecks from '../../../components/Icon/IconChecks';
import IconX from '../../../components/Icon/IconX';
import IconDownload from '../../../components/Icon/IconDownload';
import IconUser from '../../../components/Icon/IconUser';
import IconClock from '../../../components/Icon/IconClock';
import IconDollarSignCircle from '../../../components/Icon/IconDollarSignCircle';
import IconArchive from '../../../components/Icon/IconArchive';
import IconCircleCheck from '../../../components/Icon/IconCircleCheck';

const ExecutiveDigitalSignoffs = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Executive Director - Digital Sign-offs'));
    });

    const [filter, setFilter] = useState('pending');
    const [signoffModal, setSignoffModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [digitalSignature, setDigitalSignature] = useState('');
    const [signoffComments, setSignoffComments] = useState('');
    const [documentModal, setDocumentModal] = useState(false);

    // High-value procurement items requiring Executive Director digital sign-off
    const digitalSignoffItems = [
        {
            id: 1,
            procurementId: 'PROC-2024-E001',
            type: 'Major Capital Purchase',
            description: 'Enterprise Software Licensing - 3 Year Contract',
            department: 'Information Technology',
            requestor: 'CTO Office',
            submittedDate: '2024-10-28',
            dueDate: '2024-11-05',
            totalAmount: 250000,
            supplier: 'Microsoft Corporation',
            contractPeriod: '36 months',
            status: 'Pending Executive Sign-off',
            priority: 'High',
            riskLevel: 'Low',
            departmentHeadApproval: {
                approvedBy: 'John Smith - IT Director',
                approvedDate: '2024-10-27',
                comments: 'Critical for digital transformation initiative. Budget allocated and justified.'
            },
            procurementOfficerRecommendation: {
                officer: 'Jane Doe',
                date: '2024-10-26',
                recommendation: 'Strongly recommend approval. Competitive pricing and established vendor relationship.',
                riskAssessment: 'Low risk - tier 1 vendor with strong support structure'
            },
            businessJustification: 'Essential upgrade to support 500+ users with enhanced security features and productivity tools. ROI expected within 18 months through efficiency gains.',
            budgetImpact: 'Within approved IT budget allocation for FY2025-2027',
            complianceNotes: 'Meets all security and compliance requirements. SOC 2 Type II certified.',
            documents: ['Contract_Draft.pdf', 'Technical_Specifications.pdf', 'Budget_Analysis.xlsx', 'Risk_Assessment.pdf']
        },
        {
            id: 2,
            procurementId: 'PROC-2024-E002',
            type: 'Infrastructure Investment',
            description: 'Data Center Hardware Refresh',
            department: 'Information Technology',
            requestor: 'Infrastructure Team',
            submittedDate: '2024-10-29',
            dueDate: '2024-11-08',
            totalAmount: 180000,
            supplier: 'Dell Technologies',
            contractPeriod: '12 months',
            status: 'Pending Executive Sign-off',
            priority: 'High',
            riskLevel: 'Medium',
            departmentHeadApproval: {
                approvedBy: 'John Smith - IT Director',
                approvedDate: '2024-10-28',
                comments: 'Critical infrastructure upgrade to maintain business continuity and performance.'
            },
            procurementOfficerRecommendation: {
                officer: 'Mike Johnson',
                date: '2024-10-27',
                recommendation: 'Recommend approval with extended warranty option.',
                riskAssessment: 'Medium risk due to implementation complexity - mitigation plan in place'
            },
            businessJustification: 'Replace aging servers approaching end-of-life. Prevent potential downtime and maintain service levels.',
            budgetImpact: 'Capital expenditure within approved infrastructure budget',
            complianceNotes: 'Meets data protection and security standards. Energy efficient models selected.',
            documents: ['Hardware_Specifications.pdf', 'Implementation_Plan.pdf', 'Warranty_Terms.pdf', 'Migration_Strategy.pdf']
        },
        {
            id: 3,
            procurementId: 'PROC-2024-E003',
            type: 'Professional Services',
            description: 'Management Consulting Services',
            department: 'Strategic Planning',
            requestor: 'CEO Office',
            submittedDate: '2024-10-30',
            dueDate: '2024-11-12',
            totalAmount: 320000,
            supplier: 'McKinsey & Company',
            contractPeriod: '6 months',
            status: 'Pending Executive Sign-off',
            priority: 'Critical',
            riskLevel: 'Low',
            departmentHeadApproval: {
                approvedBy: 'Sarah Williams - Strategy Director',
                approvedDate: '2024-10-29',
                comments: 'Strategic initiative critical for organizational transformation and growth targets.'
            },
            procurementOfficerRecommendation: {
                officer: 'Robert Brown',
                date: '2024-10-28',
                recommendation: 'Highly recommended based on proven track record and methodology alignment.',
                riskAssessment: 'Low risk - tier 1 consulting firm with strong references in our industry'
            },
            businessJustification: 'Strategic planning and operational excellence initiative to achieve 15% efficiency improvement and market expansion.',
            budgetImpact: 'Special project budget approved by board of directors',
            complianceNotes: 'Confidentiality agreements and IP protection measures in place.',
            documents: ['SOW_Detailed.pdf', 'Consultant_Profiles.pdf', 'Timeline_Milestones.pdf', 'Confidentiality_Agreement.pdf']
        },
        {
            id: 4,
            procurementId: 'PROC-2024-E004',
            type: 'Facility Services',
            description: 'Office Space Renovation Contract',
            department: 'Facilities Management',
            requestor: 'Operations Team',
            submittedDate: '2024-10-25',
            dueDate: '2024-11-02',
            totalAmount: 150000,
            supplier: 'Modern Spaces Inc.',
            contractPeriod: '4 months',
            status: 'Digitally Signed by Executive',
            priority: 'Medium',
            riskLevel: 'Medium',
            signedDate: '2024-10-30',
            signedBy: 'Executive Director',
            departmentHeadApproval: {
                approvedBy: 'Tom Wilson - Facilities Director',
                approvedDate: '2024-10-24',
                comments: 'Necessary for employee satisfaction and modern workplace standards.'
            },
            procurementOfficerRecommendation: {
                officer: 'Lisa Martinez',
                date: '2024-10-23',
                recommendation: 'Approved contractor with competitive bid and good references.',
                riskAssessment: 'Medium risk - construction project with timeline dependencies'
            },
            businessJustification: 'Modernize workspace to improve employee productivity and attraction/retention of talent.',
            budgetImpact: 'Within approved facilities improvement budget',
            complianceNotes: 'All permits obtained. Safety protocols and insurance requirements met.',
            documents: ['Renovation_Plans.pdf', 'Contractor_License.pdf', 'Insurance_Certificate.pdf', 'Permit_Documentation.pdf']
        },
        {
            id: 5,
            procurementId: 'PROC-2024-E005',
            type: 'Legal Services',
            description: 'M&A Legal Advisory Services',
            department: 'Legal',
            requestor: 'General Counsel',
            submittedDate: '2024-10-31',
            dueDate: '2024-11-15',
            totalAmount: 275000,
            supplier: 'Latham & Watkins LLP',
            contractPeriod: '8 months',
            status: 'Pending Executive Sign-off',
            priority: 'Critical',
            riskLevel: 'Low',
            departmentHeadApproval: {
                approvedBy: 'David Chen - General Counsel',
                approvedDate: '2024-10-30',
                comments: 'Critical for upcoming acquisition. Top-tier firm with relevant expertise required.'
            },
            procurementOfficerRecommendation: {
                officer: 'Jennifer Taylor',
                date: '2024-10-29',
                recommendation: 'Strongly recommend - leading firm in M&A with excellent track record.',
                riskAssessment: 'Low risk - established relationship and proven expertise in our industry'
            },
            businessJustification: 'Legal expertise essential for successful acquisition execution and risk mitigation.',
            budgetImpact: 'Special project budget allocated for M&A activities',
            complianceNotes: 'Conflict checks completed. Engagement letter terms negotiated.',
            documents: ['Engagement_Letter.pdf', 'Firm_Credentials.pdf', 'Conflict_Check.pdf', 'Fee_Schedule.pdf']
        },
    ];

    // Filter items based on status
    const filteredItems = digitalSignoffItems.filter(item => {
        if (filter === 'all') return true;
        if (filter === 'pending') return item.status === 'Pending Executive Sign-off';
        if (filter === 'signed') return item.status === 'Digitally Signed by Executive';
        if (filter === 'rejected') return item.status === 'Rejected by Executive';
        return true;
    });

    // Statistics
    const stats = {
        total: digitalSignoffItems.length,
        pending: digitalSignoffItems.filter(i => i.status === 'Pending Executive Sign-off').length,
        signed: digitalSignoffItems.filter(i => i.status === 'Digitally Signed by Executive').length,
        rejected: digitalSignoffItems.filter(i => i.status === 'Rejected by Executive').length,
        totalValue: digitalSignoffItems.reduce((sum, i) => sum + i.totalAmount, 0),
    };

    const handleDigitalSignoff = (item: any) => {
        setSelectedItem(item);
        setSignoffModal(true);
        setDigitalSignature('');
        setSignoffComments('');
    };

    const handleViewDocuments = (item: any) => {
        setSelectedItem(item);
        setDocumentModal(true);
    };

    const submitDigitalSignature = (action: 'approve' | 'reject') => {
        if (!digitalSignature.trim()) {
            alert('Please provide your digital signature');
            return;
        }
        
        if (!signoffComments.trim()) {
            alert('Please provide executive comments');
            return;
        }

        // Process the digital signature action
        let message = '';
        switch (action) {
            case 'approve':
                message = `Procurement ${selectedItem.procurementId} digitally signed and approved for processing`;
                break;
            case 'reject':
                message = `Procurement ${selectedItem.procurementId} rejected and returned for revision`;
                break;
        }
        
        // Show success message (in production, this would be a toast notification)
        alert(message);
        setSignoffModal(false);
        setSelectedItem(null);
        setDigitalSignature('');
        setSignoffComments('');
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Pending Executive Sign-off':
                return 'badge-outline-warning';
            case 'Digitally Signed by Executive':
                return 'badge-outline-success';
            case 'Rejected by Executive':
                return 'badge-outline-danger';
            default:
                return 'badge-outline-primary';
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'Critical':
                return 'badge-outline-danger';
            case 'High':
                return 'badge-outline-warning';
            case 'Medium':
                return 'badge-outline-info';
            case 'Low':
                return 'badge-outline-success';
            default:
                return 'badge-outline-primary';
        }
    };

    const getRiskBadge = (risk: string) => {
        switch (risk) {
            case 'High':
                return 'text-danger';
            case 'Medium':
                return 'text-warning';
            case 'Low':
                return 'text-success';
            default:
                return 'text-primary';
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
                    <span>Executive Director - Digital Sign-offs</span>
                </li>
            </ul>

            <div className="pt-5">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold">Digital Sign-offs</h2>
                        <p className="text-white-dark">High-value procurement approvals requiring Executive Director digital signature</p>
                    </div>
                    <div className="flex gap-2">
                        <Link to="/procurement/executive-director-dashboard" className="btn btn-outline-primary">
                            <IconUser className="mr-2" />
                            Dashboard
                        </Link>
                    </div>
                </div>

                {/* Statistics */}
                <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="panel">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-lg font-semibold">Total Items</div>
                            <IconPencilPaper className="h-6 w-6 text-primary" />
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
                            <div className="text-lg font-semibold">Signed</div>
                            <IconChecks className="h-6 w-6 text-success" />
                        </div>
                        <div className="text-3xl font-bold text-success">{stats.signed}</div>
                    </div>
                    <div className="panel">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-lg font-semibold">Rejected</div>
                            <IconX className="h-6 w-6 text-danger" />
                        </div>
                        <div className="text-3xl font-bold text-danger">{stats.rejected}</div>
                    </div>
                    <div className="panel">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="text-lg font-semibold">Total Value</div>
                            <IconDollarSignCircle className="h-6 w-6 text-info" />
                        </div>
                        <div className="text-3xl font-bold text-info">${(stats.totalValue / 1000).toFixed(0)}K</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="mb-6 flex gap-2">
                    <button
                        onClick={() => setFilter('pending')}
                        className={`btn btn-sm ${filter === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
                    >
                        Pending Sign-offs
                    </button>
                    <button
                        onClick={() => setFilter('signed')}
                        className={`btn btn-sm ${filter === 'signed' ? 'btn-success' : 'btn-outline-success'}`}
                    >
                        Digitally Signed
                    </button>
                    <button
                        onClick={() => setFilter('rejected')}
                        className={`btn btn-sm ${filter === 'rejected' ? 'btn-danger' : 'btn-outline-danger'}`}
                    >
                        Rejected
                    </button>
                    <button
                        onClick={() => setFilter('all')}
                        className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                    >
                        All Items
                    </button>
                </div>

                {/* Digital Sign-off Items List */}
                <div className="space-y-4">
                    {filteredItems.map((item) => (
                        <div key={item.id} className="panel">
                            <div className="mb-4 flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="mb-2 flex items-center gap-2">
                                        <h5 className="text-lg font-semibold">{item.procurementId}</h5>
                                        <span className={`badge ${getPriorityBadge(item.priority)}`}>
                                            {item.priority}
                                        </span>
                                        <span className={`badge ${getStatusBadge(item.status)}`}>
                                            {item.status}
                                        </span>
                                        <span className={`text-sm font-medium ${getRiskBadge(item.riskLevel)}`}>
                                            🛡️ {item.riskLevel} Risk
                                        </span>
                                    </div>
                                    <p className="mb-2 text-lg font-medium">{item.description}</p>
                                    <p className="mb-3 text-sm text-white-dark">
                                        {item.type} | {item.department} | Due: {item.dueDate}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <div className="text-right">
                                        <div className="text-sm text-white-dark">Supplier</div>
                                        <div className="font-semibold">{item.supplier}</div>
                                        <div className="text-xl font-bold text-primary">${item.totalAmount.toLocaleString()}</div>
                                        <div className="text-sm text-white-dark">{item.contractPeriod}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleViewDocuments(item)}
                                            className="btn btn-outline-info btn-sm"
                                            title="View Documents"
                                        >
                                            <IconEye className="h-4 w-4" />
                                        </button>
                                        {item.status === 'Pending Executive Sign-off' && (
                                            <button
                                                onClick={() => handleDigitalSignoff(item)}
                                                className="btn btn-success btn-sm"
                                                title="Digital Sign-off"
                                            >
                                                <IconPencilPaper className="h-4 w-4 mr-1" />
                                                Sign
                                            </button>
                                        )}
                                        {item.status === 'Digitally Signed by Executive' && (
                                            <div className="flex items-center gap-1 text-success text-sm">
                                                <IconCircleCheck className="h-4 w-4" />
                                                Signed {item.signedDate}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mb-4 grid grid-cols-1 gap-4 border-t border-[#e0e6ed] pt-4 dark:border-[#253b5c] lg:grid-cols-2">
                                <div>
                                    <h6 className="mb-2 font-semibold">Business Justification</h6>
                                    <p className="text-sm text-white-dark">{item.businessJustification}</p>
                                </div>
                                <div>
                                    <h6 className="mb-2 font-semibold">Budget Impact</h6>
                                    <p className="text-sm text-white-dark">{item.budgetImpact}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 border-t border-[#e0e6ed] pt-4 dark:border-[#253b5c] lg:grid-cols-2">
                                <div>
                                    <h6 className="mb-2 font-semibold">Department Head Approval</h6>
                                    <div className="text-sm">
                                        <div className="font-medium text-success">{item.departmentHeadApproval.approvedBy}</div>
                                        <div className="text-white-dark">Approved: {item.departmentHeadApproval.approvedDate}</div>
                                        <div className="mt-1 text-white-dark">{item.departmentHeadApproval.comments}</div>
                                    </div>
                                </div>
                                <div>
                                    <h6 className="mb-2 font-semibold">Procurement Officer Recommendation</h6>
                                    <div className="text-sm">
                                        <div className="font-medium">{item.procurementOfficerRecommendation.officer}</div>
                                        <div className="text-white-dark">Date: {item.procurementOfficerRecommendation.date}</div>
                                        <div className="mt-1 text-white-dark">{item.procurementOfficerRecommendation.recommendation}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {filteredItems.length === 0 && (
                    <div className="panel">
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <IconPencilPaper className="mb-4 h-16 w-16 text-white-dark" />
                            <h3 className="mb-2 text-lg font-semibold">No items found</h3>
                            <p className="text-white-dark">No procurement items match the current filter</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Digital Sign-off Modal */}
            {signoffModal && selectedItem && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-75">
                    <div className="w-full max-w-4xl rounded-lg bg-white p-6 dark:bg-[#1b2e4b] max-h-[90vh] overflow-y-auto">
                        <div className="mb-4 flex items-center justify-between">
                            <h4 className="text-lg font-semibold flex items-center gap-2">
                                <IconPencilPaper />
                                Executive Digital Sign-off - {selectedItem.procurementId}
                            </h4>
                            <button 
                                onClick={() => setSignoffModal(false)} 
                                className="text-white-dark hover:text-danger"
                                title="Close Modal"
                            >
                                <IconX />
                            </button>
                        </div>
                        
                        <div className="mb-6 space-y-4">
                            {/* Executive Summary */}
                            <div className="rounded-lg border border-primary bg-primary-light p-4 dark:bg-primary-dark-light">
                                <h6 className="mb-3 font-semibold text-primary">Executive Summary</h6>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="font-medium text-white-dark">Procurement ID:</span>
                                        <p className="font-semibold">{selectedItem.procurementId}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-white-dark">Type:</span>
                                        <p className="font-semibold">{selectedItem.type}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-white-dark">Total Amount:</span>
                                        <p className="text-lg font-bold text-primary">${selectedItem.totalAmount.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-white-dark">Supplier:</span>
                                        <p className="font-semibold">{selectedItem.supplier}</p>
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <span className="font-medium text-white-dark">Description:</span>
                                    <p className="mt-1 font-semibold">{selectedItem.description}</p>
                                </div>
                            </div>

                            {/* Business Case */}
                            <div className="rounded-lg border border-[#e0e6ed] p-4 dark:border-[#253b5c]">
                                <h6 className="mb-3 font-semibold">Business Case & Impact</h6>
                                <div className="space-y-3 text-sm">
                                    <div>
                                        <span className="font-medium text-white-dark">Business Justification:</span>
                                        <p className="mt-1">{selectedItem.businessJustification}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-white-dark">Budget Impact:</span>
                                        <p className="mt-1">{selectedItem.budgetImpact}</p>
                                    </div>
                                    <div>
                                        <span className="font-medium text-white-dark">Compliance Notes:</span>
                                        <p className="mt-1">{selectedItem.complianceNotes}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Approvals Chain */}
                            <div className="rounded-lg border border-success bg-success-light p-4 dark:bg-success-dark-light">
                                <h6 className="mb-3 font-semibold text-success">Approval Chain</h6>
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                    <div>
                                        <h6 className="mb-2 font-semibold">Department Head Approval</h6>
                                        <div className="text-sm">
                                            <div className="font-medium text-success">{selectedItem.departmentHeadApproval.approvedBy}</div>
                                            <div className="text-white-dark">Approved: {selectedItem.departmentHeadApproval.approvedDate}</div>
                                            <div className="mt-1 text-white-dark">{selectedItem.departmentHeadApproval.comments}</div>
                                        </div>
                                    </div>
                                    <div>
                                        <h6 className="mb-2 font-semibold">Procurement Officer Recommendation</h6>
                                        <div className="text-sm">
                                            <div className="font-medium">{selectedItem.procurementOfficerRecommendation.officer}</div>
                                            <div className="text-white-dark">Date: {selectedItem.procurementOfficerRecommendation.date}</div>
                                            <div className="mt-1 text-white-dark">{selectedItem.procurementOfficerRecommendation.recommendation}</div>
                                            <div className="mt-1 text-white-dark">Risk: {selectedItem.procurementOfficerRecommendation.riskAssessment}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="mb-4">
                            <label className="mb-2 block text-sm font-medium">Digital Signature *</label>
                            <input
                                type="text"
                                value={digitalSignature}
                                onChange={(e) => setDigitalSignature(e.target.value)}
                                className="form-input"
                                placeholder="Type your full name as digital signature"
                            />
                        </div>
                        
                        <div className="mb-6">
                            <label className="mb-2 block text-sm font-medium">Executive Comments</label>
                            <textarea
                                value={signoffComments}
                                onChange={(e) => setSignoffComments(e.target.value)}
                                className="form-textarea resize-none"
                                rows={3}
                                placeholder="Provide executive comments, approval rationale, or conditions..."
                            />
                        </div>
                        
                        <div className="flex items-center justify-end gap-2 border-t border-[#e0e6ed] pt-4 dark:border-[#253b5c]">
                            <button
                                onClick={() => submitDigitalSignature('approve')}
                                className="btn btn-success"
                                disabled={!digitalSignature.trim() || !signoffComments.trim()}
                            >
                                <IconChecks className="mr-2" />
                                Approve & Sign Digitally
                            </button>
                            <button
                                onClick={() => submitDigitalSignature('reject')}
                                className="btn btn-danger"
                                disabled={!digitalSignature.trim() || !signoffComments.trim()}
                            >
                                <IconX className="mr-2" />
                                Reject with Signature
                            </button>
                            <button
                                onClick={() => setSignoffModal(false)}
                                className="btn btn-outline-secondary"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Document Viewer Modal */}
            {documentModal && selectedItem && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-75">
                    <div className="w-full max-w-5xl rounded-lg bg-white p-6 dark:bg-[#1b2e4b] max-h-[90vh] overflow-y-auto">
                        <div className="mb-4 flex items-center justify-between">
                            <h4 className="text-lg font-semibold flex items-center gap-2">
                                📄 Documents - {selectedItem.procurementId}
                            </h4>
                            <button 
                                onClick={() => setDocumentModal(false)} 
                                className="text-white-dark hover:text-danger"
                                title="Close Modal"
                            >
                                <IconX />
                            </button>
                        </div>
                        
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {selectedItem.documents.map((doc: string, index: number) => (
                                <div key={index} className="rounded-lg border border-[#e0e6ed] p-4 dark:border-[#253b5c]">
                                    <div className="mb-3 flex items-center gap-2">
                                        <span className="text-2xl">📄</span>
                                        <span className="font-semibold">{doc}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="btn btn-outline-primary btn-sm flex-1">
                                            <IconEye className="mr-1 h-4 w-4" />
                                            View
                                        </button>
                                        <button className="btn btn-outline-secondary btn-sm" title="Download Document">
                                            <IconDownload className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <div className="mt-6 flex justify-end">
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

export default ExecutiveDigitalSignoffs;