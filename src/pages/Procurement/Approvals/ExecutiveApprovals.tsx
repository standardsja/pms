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
import { getApiUrl } from '../../../config/api';
import { getToken } from '../../../utils/auth';
import Swal from 'sweetalert2';

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
    const [executiveApprovals, setExecutiveApprovals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch executive-level approvals from API
    useEffect(() => {
        const fetchApprovals = async () => {
            try {
                setLoading(true);
                const token = getToken();
                const apiUrl = getApiUrl();

                const response = await fetch(`${apiUrl}/approvals`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    // Filter for EXECUTIVE_REVIEW status
                    const executiveItems = data.filter((item: any) => item.status === 'EXECUTIVE_REVIEW');
                    setExecutiveApprovals(executiveItems);
                } else {
                    console.error('Failed to fetch approvals');
                }
            } catch (error) {
                console.error('Error fetching executive approvals:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchApprovals();
    }, []);

    // Filter approvals based on selected filter and search term
    const filteredApprovals = executiveApprovals.filter((approval: any) => {
        const matchesFilter = filter === 'all' ||
            approval.status?.toLowerCase().includes(filter.toLowerCase()) ||
            approval.procurementType?.toLowerCase().includes(filter.toLowerCase());
        const matchesSearch =
            approval.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            approval.requestNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            approval.createdBy?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    // Statistics
    const stats = {
        total: executiveApprovals.length,
        pending: executiveApprovals.filter((a: any) => a.status === 'EXECUTIVE_REVIEW').length,
        underReview: executiveApprovals.filter((a: any) => a.status === 'EXECUTIVE_REVIEW').length,
        conditionallyApproved: 0,
        totalValue: executiveApprovals.reduce((sum: number, a: any) => sum + (a.estimatedValue || 0), 0),
    };

    const handleSignOff = (approval: any) => {
        setSelectedApproval(approval);
        setSignOffModal(true);
    };

    const handleViewDocuments = (approval: any) => {
        setSelectedDocument(approval);
        setDocumentModal(true);
    };

    const submitDigitalSignature = async (action: 'approve' | 'reject' | 'conditional') => {
        if (!digitalSignature.trim()) {
            Swal.fire('Error', 'Please provide your digital signature/comments', 'error');
            return;
        }
        
        try {
            const apiUrl = getApiUrl();
            const token = getToken();
            
            const response = await fetch(`${apiUrl}/requests/${selectedApproval?.id}/action`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    action: action === 'approve' ? 'APPROVE' : 'REJECT',
                    comments: digitalSignature,
                    signature: digitalSignature
                })
            });

            if (!response.ok) throw new Error('Failed to process approval');

            await Swal.fire('Success', `Request ${action}d successfully`, 'success');
            setSignOffModal(false);
            setSelectedApproval(null);
            setDigitalSignature('');
            
            // Refresh approvals list
            fetchApprovals();
        } catch (error) {
            console.error('Error processing approval:', error);
            Swal.fire('Error', 'Failed to process approval', 'error');
        }
    };

    const downloadDocument = (document: any) => {
        console.log('Downloading document:', document.name);
        alert(`Downloading ${document.name}...`);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'EXECUTIVE_REVIEW':
            case 'Pending Executive Approval':
                return 'badge-outline-warning';
            case 'DEPARTMENT_REVIEW':
            case 'Under Review':
                return 'badge-outline-info';
            case 'FINANCE_APPROVED':
            case 'Approved':
                return 'badge-outline-success';
            case 'REJECTED':
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