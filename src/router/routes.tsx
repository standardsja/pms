import React, { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import OnboardingGuard from '../components/OnboardingGuard';
import AdminRoute from '../components/AdminRoute';
import CommitteeRoute from '../components/CommitteeRoute';
import ProcurementRoute from '../components/ProcurementRoute';
import InnovationRoute from '../components/InnovationRoute';
import ModuleRoute from '../components/ModuleRoute';
import RoleDashboardGuard from '../components/RoleDashboardGuard';
import { getUser } from '../utils/auth';
import { detectUserRoles, getDashboardPath } from '../utils/roleDetection';

const RoleDashboardRedirect: React.FC = () => {
    const currentUser = getUser();

    if (!currentUser) {
        return <Navigate to="/auth/login" replace />;
    }

    const roles = detectUserRoles(currentUser.roles || (currentUser.role ? [currentUser.role] : []));
    const target = getDashboardPath(roles, typeof window !== 'undefined' ? window.location.pathname : '');
    return <Navigate to={target} replace />;
};

// Main Pages
const LandingPage = lazy(() => import('../pages/LandingPage'));
const Error = lazy(() => import('../components/Error'));
const NotFound = lazy(() => import('../pages/Procurement/NotFound'));

// Auth Pages
const Login = lazy(() => import('../pages/Procurement/Auth/Login'));
const ForgotPassword = lazy(() => import('../pages/Procurement/Auth/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/Procurement/Auth/ResetPassword'));
const Onboarding = lazy(() => import('../pages/Procurement/Auth/Onboarding'));

// Procurement Pages
const ProcurementDashboard = lazy(() => import('../pages/Procurement/Dashboard'));
const ProcurementManagerDashboard = lazy(() => import('../pages/Procurement/Manager/ProcurementManagerDashboard'));
const HeadOfDivisionDashboard = lazy(() => import('../pages/Procurement/HeadOfDivision/HeadOfDivisionDashboard'));
const HODDepartments = lazy(() => import('../pages/Procurement/HeadOfDivision/pages/Departments'));
const HODUserManagement = lazy(() => import('../pages/Procurement/HeadOfDivision/pages/UserManagement'));
const HODReports = lazy(() => import('../pages/Procurement/HeadOfDivision/pages/Reports'));
const HODPendingApprovals = lazy(() => import('../pages/Procurement/HeadOfDivision/pages/PendingApprovals'));
const ProcurementManagerRequests = lazy(() => import('../pages/Procurement/Manager/Requests'));
const ProcurementManagerAssignRequests = lazy(() => import('../pages/Procurement/Manager/AssignRequests'));
const ProcurementManagerLoadBalancingSettings = lazy(() => import('../pages/Procurement/Manager/LoadBalancingSettings'));
const RFQsAwaitingApproval = lazy(() => import('../pages/Procurement/Manager/RFQsAwaitingApproval'));
const EvaluationsToValidate = lazy(() => import('../pages/Procurement/Manager/EvaluationsToValidate'));
const RFQList = lazy(() => import('../pages/Procurement/RFQ/RFQList'));
const NewRFQ = lazy(() => import('../pages/Procurement/RFQ/NewRFQ'));
const RFQDetail = lazy(() => import('../pages/Procurement/RFQ/RFQDetail'));
const QuotesList = lazy(() => import('../pages/Procurement/Quotes/QuotesList'));
const NewQuote = lazy(() => import('../pages/Procurement/Quotes/NewQuote'));
const QuoteDetail = lazy(() => import('../pages/Procurement/Quotes/QuoteDetail'));
const EvaluationList = lazy(() => import('../pages/Procurement/Evaluation/EvaluationList'));
const NewEvaluation = lazy(() => import('../pages/Procurement/Evaluation/NewEvaluation'));
const EvaluationEdit = lazy(() => import('../pages/Procurement/Evaluation/EvaluationEdit'));
const EvaluationDetail = lazy(() => import('../pages/Procurement/Evaluation/EvaluationDetail'));
const ReviewList = lazy(() => import('../pages/Procurement/Review/ReviewList'));
const ReviewDetail = lazy(() => import('../pages/Procurement/Review/ReviewDetail'));
const ApprovalsList = lazy(() => import('../pages/Procurement/Approvals/ApprovalsList'));
const PurchaseOrderList = lazy(() => import('../pages/Procurement/PurchaseOrders/PurchaseOrderList'));
const NewPurchaseOrder = lazy(() => import('../pages/Procurement/PurchaseOrders/NewPurchaseOrder'));
const PurchaseOrderDetail = lazy(() => import('../pages/Procurement/PurchaseOrders/PurchaseOrderDetail'));
const SupplierList = lazy(() => import('../pages/Procurement/Suppliers/SupplierList'));
const SupplierDashboard = lazy(() => import('../pages/Procurement/Suppliers/SupplierDashboard'));
const NewSupplier = lazy(() => import('../pages/Procurement/Suppliers/NewSupplier'));
const SupplierDetail = lazy(() => import('../pages/Procurement/Suppliers/SupplierDetail'));
const EditSupplier = lazy(() => import('../pages/Procurement/Suppliers/EditSupplier'));
const CatalogList = lazy(() => import('../pages/Procurement/Catalog/CatalogList'));
const NewCatalogItem = lazy(() => import('../pages/Procurement/Catalog/NewCatalogItem'));
const CatalogItemDetail = lazy(() => import('../pages/Procurement/Catalog/CatalogItemDetail'));
const EditCatalogItem = lazy(() => import('../pages/Procurement/Catalog/EditCatalogItem'));
const ReportsList = lazy(() => import('../pages/Procurement/Reports/ReportsList'));
const NewReport = lazy(() => import('../pages/Procurement/Reports/NewReport'));
const PaymentsList = lazy(() => import('../pages/Procurement/Payments/PaymentsList'));
const PaymentDetail = lazy(() => import('../pages/Procurement/Payments/PaymentDetail'));
const FinanceDashboard = lazy(() => import('../pages/Procurement/Payments/FinanceDashboard'));
const AwaitingDelivery = lazy(() => import('../pages/Procurement/Payments/AwaitingDelivery'));
const PaymentsToProcess = lazy(() => import('../pages/Procurement/Payments/PaymentsToProcess'));
const AdminDashboard = lazy(() => import('../pages/Procurement/Admin/AdminDashboard'));
const AdminSettings = lazy(() => import('../pages/Procurement/Admin/AdminSettings'));
const ModuleAccessControl = lazy(() => import('../pages/Procurement/Admin/ModuleAccessControl'));
const AssignRequestsToUsers = lazy(() => import('../pages/Procurement/Admin/AssignRequestsToUsers'));
const SystemDashboard = lazy(() => import('../pages/Procurement/Admin/SystemDashboard'));
const DepartmentManagement = lazy(() => import('../pages/Procurement/Admin/DepartmentManagement'));
const UserSecurityAccess = lazy(() => import('../pages/Procurement/Admin/UserSecurityAccess'));
const AuditCompliance = lazy(() => import('../pages/Procurement/Admin/AuditCompliance'));
const RequestWorkflowConfiguration = lazy(() => import('../pages/Procurement/Admin/RequestWorkflowConfiguration'));
const FinancialManagement = lazy(() => import('../pages/Procurement/Admin/FinancialManagement'));
const VendorManagement = lazy(() => import('../pages/Procurement/Admin/VendorManagement'));
const RolePermissionManagement = lazy(() => import('../pages/Procurement/Admin/RolePermissionManagement'));
const BulkUserManagement = lazy(() => import('../pages/Procurement/Admin/BulkUserManagement'));
const SystemConfiguration = lazy(() => import('../pages/Procurement/Admin/SystemConfiguration'));

// Forms Pages
const FormSelection = lazy(() => import('../pages/Procurement/Forms/FormSelection'));
const FormDetail = lazy(() => import('../pages/Procurement/Forms/FormDetail'));

// Request Pages
const Requests = lazy(() => import('../pages/Procurement/Requests/Requests'));
const RequestForm = lazy(() => import('../pages/Procurement/Requests/RequestForm'));
const CombineRequests = lazy(() => import('../pages/Procurement/Requests/CombineRequests'));
const CombinedRequestDetail = lazy(() => import('../pages/Procurement/Requests/CombinedRequestDetail'));
const FinanceRequests = lazy(() => import('../pages/Procurement/Finance/Requests'));

// Role-Specific Dashboards
const RequesterDashboard = lazy(() => import('../pages/Procurement/Requester/RequesterDashboard'));
const FinanceOfficerDashboard = lazy(() => import('../pages/Procurement/Finance/FinanceOfficerDashboard'));
const FinanceManagerDashboard = lazy(() => import('../pages/Procurement/Finance/FinanceManagerDashboard'));
const AuditorDashboard = lazy(() => import('../pages/Procurement/Audit/AuditorDashboard'));
const DepartmentHeadDashboardNew = lazy(() => import('../pages/Procurement/DepartmentHead/DepartmentHeadDashboardNew'));
const DepartmentManagerDashboard = lazy(() => import('../pages/Procurement/DepartmentManager/DepartmentManagerDashboard'));
const ExecutiveDashboard = lazy(() => import('../pages/Procurement/Executive/ExecutiveDashboard'));
const SeniorDirectorDashboard = lazy(() => import('../pages/Procurement/Director/SeniorDirectorDashboard'));
const DepartmentHeadDashboard2 = lazy(() => import('../pages/Procurement/Department/DepartmentHeadDashboard'));
const PaymentStageDashboard = lazy(() => import('../pages/Procurement/Payments/PaymentStageDashboard'));

// Department Head Pages
const DepartmentHeadDashboard = lazy(() => import('../pages/Procurement/DepartmentHead/DepartmentHeadDashboard'));
const DepartmentHeadEvaluationReview = lazy(() => import('../pages/Procurement/DepartmentHead/DepartmentHeadEvaluationReview'));
const DepartmentHeadReportReview = lazy(() => import('../pages/Procurement/DepartmentHead/DepartmentHeadReportReview'));

// Executive Director Pages
const ExecutiveDirectorDashboard = lazy(() => import('../pages/Procurement/ExecutiveDirector/ExecutiveDirectorDashboard'));
const ExecutiveApprovals = lazy(() => import('../pages/Procurement/Approvals/ExecutiveApprovals'));
const ExecutiveDirectorReports = lazy(() => import('../pages/Procurement/ExecutiveDirector/ExecutiveDirectorReports'));
const ExecutiveDigitalSignoffs = lazy(() => import('../pages/Procurement/ExecutiveDirector/ExecutiveDigitalSignoffs'));

// User Pages
const Profile = lazy(() => import('../pages/Procurement/Users/Profile'));
const AccountSetting = lazy(() => import('../pages/Procurement/Users/AccountSetting'));
const HelpSupport = lazy(() => import('../pages/HelpSupport'));

// Module Selector (legacy)

// Innovation Hub Pages
const InnovationDashboard = lazy(() => import('../pages/Innovation/InnovationDashboard'));
const SubmitIdea = lazy(() => import('../pages/Innovation/Ideas/SubmitIdea'));
const ViewIdeas = lazy(() => import('../pages/Innovation/Ideas/ViewIdeas'));
const VoteOnIdeas = lazy(() => import('../pages/Innovation/Ideas/VoteOnIdeas'));
const MyIdeas = lazy(() => import('../pages/Innovation/Ideas/MyIdeas'));
const IdeaDetails = lazy(() => import('../pages/Innovation/Ideas/IdeaDetails'));
const InnovationLeaderboard = lazy(() => import('../pages/Innovation/Ideas/Leaderboard'));
const BSJProjects = lazy(() => import('../pages/Innovation/Projects/BSJProjects'));
const CommitteeDashboard = lazy(() => import('../pages/Innovation/Committee/CommitteeDashboard'));
const CommitteeReviewIdeas = lazy(() => import('../pages/Innovation/Committee/ReviewIdeas'));
const InnovationAnalytics = lazy(() => import('../pages/Innovation/Ideas/Analytics'));
const InnovationNotFound = lazy(() => import('../pages/Innovation/NotFound'));

// Admin Pages
const AuditTrail = lazy(() => import('../pages/Admin/AuditTrail'));

const routes = [
    // ============================================
    // AUTH ROUTES
    // ============================================
    {
        path: '/auth/login',
        element: <Login />,
        layout: 'blank',
    },
    {
        path: '/auth/boxed-signin',
        element: <Login />,
        layout: 'blank',
    },
    {
        path: '/auth/forgot-password',
        element: <ForgotPassword />,
        layout: 'blank',
    },
    {
        path: '/auth/reset-password',
        element: <ResetPassword />,
        layout: 'blank',
    },
    {
        path: '/onboarding',
        element: (
            <OnboardingGuard>
                <Onboarding />
            </OnboardingGuard>
        ),
        layout: 'blank',
    },

    // ============================================
    // MODULE SELECTOR / ONBOARDING
    // ============================================
    // Root path redirects authenticated users based on onboarding
    {
        path: '/',
        element: <LandingPage />,
        layout: 'blank',
    },
    // Keep legacy dashboard route for direct access
    {
        path: '/dashboard',
        element: <RoleDashboardRedirect />,
    },
    // Module selector removed; onboarding handles initial module choice

    // ============================================
    // INNOVATION HUB MODULE
    // ============================================
    {
        path: '/innovation/dashboard',
        element: (
            <InnovationRoute>
                <InnovationDashboard />
            </InnovationRoute>
        ),
    },
    {
        path: '/innovation/ideas/new',
        element: (
            <InnovationRoute>
                <SubmitIdea />
            </InnovationRoute>
        ),
    },
    {
        path: '/innovation/ideas/browse',
        element: (
            <InnovationRoute>
                <ViewIdeas />
            </InnovationRoute>
        ),
    },
    {
        path: '/innovation/ideas/mine',
        element: (
            <InnovationRoute>
                <MyIdeas />
            </InnovationRoute>
        ),
    },
    {
        path: '/innovation/ideas/popular',
        element: (
            <InnovationRoute>
                <VoteOnIdeas />
            </InnovationRoute>
        ),
    },
    {
        path: '/innovation/ideas/all',
        element: (
            <InnovationRoute>
                <ViewIdeas />
            </InnovationRoute>
        ),
    },
    {
        path: '/innovation/ideas/analytics',
        element: (
            <InnovationRoute>
                <InnovationAnalytics />
            </InnovationRoute>
        ),
    },
    {
        path: '/innovation/leaderboard',
        element: (
            <InnovationRoute>
                <InnovationLeaderboard />
            </InnovationRoute>
        ),
    },
    {
        path: '/innovation/ideas/:id',
        element: (
            <InnovationRoute>
                <IdeaDetails />
            </InnovationRoute>
        ),
    },
    {
        path: '/innovation/projects',
        element: (
            <InnovationRoute>
                <BSJProjects />
            </InnovationRoute>
        ),
    },
    {
        path: '/innovation/committee',
        element: (
            <CommitteeRoute>
                <CommitteeDashboard />
            </CommitteeRoute>
        ),
    },
    {
        path: '/innovation/committee/dashboard',
        element: (
            <CommitteeRoute>
                <CommitteeDashboard />
            </CommitteeRoute>
        ),
    },
    {
        path: '/innovation/committee/review',
        element: (
            <CommitteeRoute>
                <CommitteeReviewIdeas />
            </CommitteeRoute>
        ),
    },
    {
        path: '/innovation/committee/review/:id',
        element: (
            <CommitteeRoute>
                <CommitteeDashboard />
            </CommitteeRoute>
        ), // TODO: Create detailed review page
    },
    // Innovation 404 catch-all (must be after all specific innovation routes)
    {
        path: '/innovation/*',
        element: <InnovationNotFound />,
    },

    // ============================================
    // ROLE-SPECIFIC DASHBOARDS
    // ============================================
    {
        path: '/procurement/dashboard/requester',
        element: (
            <RoleDashboardGuard allowedRoles={['REQUESTER']} fallbackPath="/apps/requests">
                <RequesterDashboard />
            </RoleDashboardGuard>
        ),
    },
    {
        path: '/procurement/dashboard/finance-officer',
        element: (
            <RoleDashboardGuard allowedRoles={['FINANCE_OFFICER', 'FINANCE_PAYMENT_STAGE']} fallbackPath="/procurement/dashboard">
                <FinanceOfficerDashboard />
            </RoleDashboardGuard>
        ),
    },
    {
        path: '/procurement/dashboard/auditor',
        element: (
            <RoleDashboardGuard allowedRoles={['AUDITOR']} fallbackPath="/procurement/dashboard">
                <AuditorDashboard />
            </RoleDashboardGuard>
        ),
    },
    {
        path: '/procurement/dashboard/department-head',
        element: (
            <RoleDashboardGuard allowedRoles={['DEPARTMENT_HEAD']} fallbackPath="/procurement/dashboard">
                <DepartmentHeadDashboardNew />
            </RoleDashboardGuard>
        ),
    },
    {
        path: '/procurement/dashboard/department-manager',
        element: (
            <RoleDashboardGuard allowedRoles={['DEPT_MANAGER', 'DEPARTMENT_MANAGER']} fallbackPath="/apps/requests">
                <DepartmentManagerDashboard />
            </RoleDashboardGuard>
        ),
    },

    // ============================================
    // MAIN DASHBOARD - Now points to module selector
    // ============================================
    {
        path: '/procurement',
        element: <RoleDashboardRedirect />,
    },

    // ============================================
    // PROCUREMENT MODULE
    // ============================================
    {
        path: '/procurement/dashboard',
        element: <RoleDashboardRedirect />,
    },
    {
        path: '/procurement/hod',
        element: (
            <RoleDashboardGuard allowedRoles={['HEAD_OF_DIVISION']}>
                <HeadOfDivisionDashboard />
            </RoleDashboardGuard>
        ),
    },
    {
        path: '/procurement/hod/departments',
        element: (
            <RoleDashboardGuard allowedRoles={['HEAD_OF_DIVISION']}>
                <HODDepartments />
            </RoleDashboardGuard>
        ),
    },
    {
        path: '/procurement/hod/users',
        element: (
            <RoleDashboardGuard allowedRoles={['HEAD_OF_DIVISION']}>
                <HODUserManagement />
            </RoleDashboardGuard>
        ),
    },
    {
        path: '/procurement/hod/reports',
        element: (
            <RoleDashboardGuard allowedRoles={['HEAD_OF_DIVISION']}>
                <HODReports />
            </RoleDashboardGuard>
        ),
    },
    {
        path: '/procurement/hod/pending-approvals',
        element: (
            <RoleDashboardGuard allowedRoles={['HEAD_OF_DIVISION']}>
                <HODPendingApprovals />
            </RoleDashboardGuard>
        ),
    },
    {
        path: '/procurement/manager',
        element: (
            <RoleDashboardGuard allowedRoles={['PROCUREMENT_MANAGER']}>
                <ProcurementManagerDashboard />
            </RoleDashboardGuard>
        ),
    },
    {
        path: '/procurement/manager/requests',
        element: (
            <RoleDashboardGuard allowedRoles={['PROCUREMENT_MANAGER']}>
                <ProcurementManagerRequests />
            </RoleDashboardGuard>
        ),
    },
    {
        path: '/procurement/manager/assign',
        element: (
            <RoleDashboardGuard allowedRoles={['PROCUREMENT_MANAGER']}>
                <ProcurementManagerAssignRequests />
            </RoleDashboardGuard>
        ),
    },
    {
        path: '/procurement/manager/settings',
        element: (
            <RoleDashboardGuard allowedRoles={['PROCUREMENT_MANAGER']}>
                <ProcurementManagerLoadBalancingSettings />
            </RoleDashboardGuard>
        ),
    },
    {
        path: '/procurement/manager/rfqs-awaiting',
        element: (
            <RoleDashboardGuard allowedRoles={['PROCUREMENT_MANAGER']}>
                <RFQsAwaitingApproval />
            </RoleDashboardGuard>
        ),
    },
    {
        path: '/procurement/manager/evaluations-to-validate',
        element: (
            <RoleDashboardGuard allowedRoles={['PROCUREMENT_MANAGER']}>
                <EvaluationsToValidate />
            </RoleDashboardGuard>
        ),
    },
    {
        path: '/procurement/rfq/list',
        element: <RFQList />,
    },
    {
        path: '/procurement/rfq/new',
        element: <NewRFQ />,
    },
    {
        path: '/procurement/rfq/:id',
        element: <RFQDetail />,
    },
    {
        path: '/procurement/quotes',
        element: <QuotesList />,
    },
    {
        path: '/procurement/quotes/new',
        element: <NewQuote />,
    },
    {
        path: '/procurement/quotes/:id',
        element: <QuoteDetail />,
    },
    {
        path: '/procurement/evaluation',
        element: <EvaluationList />,
    },
    {
        path: '/procurement/evaluation/new',
        element: <NewEvaluation />,
    },
    {
        path: '/procurement/evaluation/:id/edit',
        element: <EvaluationEdit />,
    },
    {
        path: '/procurement/evaluation/:id',
        element: <EvaluationDetail />,
    },
    {
        path: '/procurement/review',
        element: <ReviewList />,
    },
    {
        path: '/procurement/review/:id',
        element: <ReviewDetail />,
    },
    {
        path: '/procurement/approvals',
        element: (
            <ProcurementRoute>
                <ApprovalsList />
            </ProcurementRoute>
        ),
    },
    {
        path: '/procurement/purchase-orders',
        element: (
            <ProcurementRoute>
                <PurchaseOrderList />
            </ProcurementRoute>
        ),
    },
    {
        path: '/procurement/purchase-orders/new',
        element: (
            <ProcurementRoute>
                <NewPurchaseOrder />
            </ProcurementRoute>
        ),
    },
    {
        path: '/procurement/purchase-orders/:id',
        element: (
            <ProcurementRoute>
                <PurchaseOrderDetail />
            </ProcurementRoute>
        ),
    },
    {
        path: '/procurement/suppliers',
        element: (
            <ProcurementRoute>
                <SupplierList />
            </ProcurementRoute>
        ),
    },
    {
        path: '/supplier',
        element: (
            <RoleDashboardGuard allowedRoles={['SUPPLIER']}>
                <SupplierDashboard />
            </RoleDashboardGuard>
        ),
    },
    {
        path: '/procurement/suppliers/new',
        element: (
            <ProcurementRoute>
                <NewSupplier />
            </ProcurementRoute>
        ),
    },
    {
        path: '/procurement/suppliers/:id',
        element: (
            <ProcurementRoute>
                <SupplierDetail />
            </ProcurementRoute>
        ),
    },
    {
        path: '/procurement/suppliers/:id/edit',
        element: (
            <ProcurementRoute>
                <EditSupplier />
            </ProcurementRoute>
        ),
    },
    {
        path: '/procurement/catalog',
        element: (
            <ProcurementRoute>
                <CatalogList />
            </ProcurementRoute>
        ),
    },
    {
        path: '/procurement/catalog/new',
        element: (
            <ProcurementRoute>
                <NewCatalogItem />
            </ProcurementRoute>
        ),
    },
    {
        path: '/procurement/catalog/:id',
        element: (
            <ProcurementRoute>
                <CatalogItemDetail />
            </ProcurementRoute>
        ),
    },
    {
        path: '/procurement/catalog/:id/edit',
        element: (
            <ProcurementRoute>
                <EditCatalogItem />
            </ProcurementRoute>
        ),
    },
    {
        path: '/procurement/reports',
        element: (
            <ProcurementRoute>
                <ReportsList />
            </ProcurementRoute>
        ),
    },
    {
        path: '/procurement/reports/generate',
        element: (
            <ProcurementRoute>
                <NewReport />
            </ProcurementRoute>
        ),
    },
    {
        path: '/procurement/payments',
        element: (
            <ProcurementRoute>
                <PaymentsList />
            </ProcurementRoute>
        ),
    },
    // Finance Dashboard guarded for finance roles
    {
        path: '/finance',
        element: (
            <RoleDashboardGuard allowedRoles={['FINANCE_OFFICER', 'FINANCE_MANAGER', 'BUDGET_MANAGER', 'FINANCE_PAYMENT_STAGE']} fallbackPath="/procurement/dashboard">
                <FinanceDashboard />
            </RoleDashboardGuard>
        ),
    },
    {
        path: '/finance/requests',
        element: (
            <RoleDashboardGuard allowedRoles={['FINANCE_OFFICER', 'FINANCE_MANAGER', 'BUDGET_MANAGER', 'FINANCE_PAYMENT_STAGE']} fallbackPath="/procurement/dashboard">
                <FinanceRequests />
            </RoleDashboardGuard>
        ),
    },
    {
        path: '/finance/awaiting-delivery',
        element: (
            <RoleDashboardGuard allowedRoles={['FINANCE_OFFICER', 'FINANCE_MANAGER', 'BUDGET_MANAGER', 'FINANCE_PAYMENT_STAGE']} fallbackPath="/procurement/dashboard">
                <AwaitingDelivery />
            </RoleDashboardGuard>
        ),
    },
    {
        path: '/finance/payments-to-process',
        element: (
            <RoleDashboardGuard allowedRoles={['FINANCE_OFFICER', 'FINANCE_MANAGER', 'BUDGET_MANAGER', 'FINANCE_PAYMENT_STAGE']} fallbackPath="/procurement/dashboard">
                <PaymentsToProcess />
            </RoleDashboardGuard>
        ),
    },
    {
        path: '/procurement/payments/:id',
        element: <PaymentDetail />,
    },

    // ============================================
    // DEPARTMENT HEAD ROUTES
    // ============================================
    {
        path: '/procurement/department-head-dashboard',
        element: (
            <RoleDashboardGuard allowedRoles={['DEPARTMENT_HEAD']} fallbackPath="/procurement/dashboard">
                <DepartmentHeadDashboard />
            </RoleDashboardGuard>
        ),
    },
    {
        path: '/procurement/department-head/evaluations',
        element: <DepartmentHeadEvaluationReview />,
    },
    {
        path: '/finance/manager',
        element: (
            <RoleDashboardGuard allowedRoles={['FINANCE_MANAGER', 'BUDGET_MANAGER']} fallbackPath="/procurement/dashboard">
                <FinanceManagerDashboard />
            </RoleDashboardGuard>
        ),
    },
    // ============================================
    {
        path: '/procurement/executive-director-dashboard',
        element: <ExecutiveDirectorDashboard />,
    },
    {
        path: '/procurement/executive/approvals',
        element: <ExecutiveApprovals />,
    },
    {
        path: '/procurement/executive/reports',
        element: <ExecutiveDirectorReports />,
    },
    {
        path: '/procurement/executive/signoffs',
        element: <ExecutiveDigitalSignoffs />,
    },

    // ============================================
    // REQUEST ROUTES
    // ============================================
    // FORMS ROUTES
    // ============================================
    {
        path: '/procurement/forms',
        element: (
            <ProcurementRoute>
                <FormSelection />
            </ProcurementRoute>
        ),
    },
    {
        path: '/procurement/forms/:id',
        element: (
            <ProcurementRoute>
                <FormDetail />
            </ProcurementRoute>
        ),
    },

    // ============================================
    // REQUEST ROUTES
    // ============================================
    {
        path: '/apps/requests',
        element: <Requests />,
    },
    {
        path: '/apps/requests/mine',
        element: <Requests />,
    },
    {
        path: '/apps/requests/new',
        element: <RequestForm />,
    },
    {
        path: '/apps/requests/edit/:id',
        element: <RequestForm />,
    },
    {
        path: '/apps/requests/combine',
        element: (
            <ProcurementRoute>
                <CombineRequests />
            </ProcurementRoute>
        ),
    },
    {
        path: '/apps/requests/combined/:id',
        element: (
            <ProcurementRoute>
                <CombinedRequestDetail />
            </ProcurementRoute>
        ),
    },

    // ============================================
    // ROLE-SPECIFIC DASHBOARD ROUTES
    // ============================================
    {
        path: '/executive/dashboard',
        element: (
            <RoleDashboardGuard allowedRoles={['EXECUTIVE_DIRECTOR']} fallbackPath="/procurement/dashboard">
                <ExecutiveDashboard />
            </RoleDashboardGuard>
        ),
    },
    {
        path: '/director/dashboard',
        element: (
            <RoleDashboardGuard allowedRoles={['SENIOR_DIRECTOR']} fallbackPath="/procurement/dashboard">
                <SeniorDirectorDashboard />
            </RoleDashboardGuard>
        ),
    },
    {
        path: '/department-head/dashboard',
        element: (
            <RoleDashboardGuard allowedRoles={['DEPARTMENT_HEAD']} fallbackPath="/procurement/dashboard">
                <DepartmentHeadDashboard2 />
            </RoleDashboardGuard>
        ),
    },
    {
        path: '/payments/dashboard',
        element: (
            <RoleDashboardGuard allowedRoles={['FINANCE_PAYMENT_STAGE', 'SENIOR_DIRECTOR']} fallbackPath="/procurement/dashboard">
                <PaymentStageDashboard />
            </RoleDashboardGuard>
        ),
    },
    {
        path: '/audit/dashboard',
        element: (
            <ModuleRoute module="audit" requiredRoles={['AUDITOR']} fallbackPath="/procurement/dashboard">
                <AuditorDashboard />
            </ModuleRoute>
        ),
    },

    // ============================================
    // ADMIN ROUTES
    // ============================================
    {
        path: '/procurement/admin',
        element: (
            <AdminRoute>
                <AdminDashboard />
            </AdminRoute>
        ),
    },
    {
        path: '/procurement/admin/settings',
        element: (
            <AdminRoute>
                <AdminSettings />
            </AdminRoute>
        ),
    },
    {
        path: '/procurement/admin/modules',
        element: (
            <AdminRoute>
                <ModuleAccessControl />
            </AdminRoute>
        ),
    },
    {
        path: '/procurement/admin/assign-requests',
        element: (
            <AdminRoute>
                <AssignRequestsToUsers />
            </AdminRoute>
        ),
    },
    {
        path: '/procurement/admin/system-dashboard',
        element: (
            <AdminRoute>
                <SystemDashboard />
            </AdminRoute>
        ),
    },
    {
        path: '/procurement/admin/departments',
        element: (
            <AdminRoute>
                <DepartmentManagement />
            </AdminRoute>
        ),
    },
    {
        path: '/procurement/admin/user-security',
        element: (
            <AdminRoute>
                <UserSecurityAccess />
            </AdminRoute>
        ),
    },
    {
        path: '/procurement/admin/audit-logs',
        element: (
            <AdminRoute>
                <AuditCompliance />
            </AdminRoute>
        ),
    },
    {
        path: '/procurement/admin/workflow-config',
        element: (
            <AdminRoute>
                <RequestWorkflowConfiguration />
            </AdminRoute>
        ),
    },
    {
        path: '/procurement/admin/financial',
        element: (
            <AdminRoute>
                <FinancialManagement />
            </AdminRoute>
        ),
    },
    {
        path: '/procurement/admin/vendors',
        element: (
            <AdminRoute>
                <VendorManagement />
            </AdminRoute>
        ),
    },
    {
        path: '/procurement/admin/roles-permissions',
        element: (
            <AdminRoute>
                <RolePermissionManagement />
            </AdminRoute>
        ),
    },
    {
        path: '/procurement/admin/bulk-users',
        element: (
            <AdminRoute>
                <BulkUserManagement />
            </AdminRoute>
        ),
    },
    {
        path: '/procurement/admin/system-config',
        element: (
            <AdminRoute>
                <SystemConfiguration />
            </AdminRoute>
        ),
    },

    // ============================================
    // USER PAGES
    // ============================================
    {
        path: '/profile',
        element: <Profile />,
    },
    {
        path: '/settings',
        element: <AccountSetting />,
    },
    {
        path: '/users/user-account-settings',
        element: <AccountSetting />,
    },
    {
        path: '/help',
        element: <HelpSupport />,
        layout: 'blank',
    },

    // ============================================
    // ADMIN ROUTES
    // ============================================
    {
        path: '/admin/audit-trail',
        element: (
            <AdminRoute>
                <AuditTrail />
            </AdminRoute>
        ),
    },

    // ============================================
    // PROCUREMENT 404 CATCH-ALL
    // ============================================
    {
        path: '/procurement/*',
        element: <NotFound />,
    },
    {
        path: '/finance/*',
        element: <NotFound />,
    },
    {
        path: '/apps/*',
        element: <NotFound />,
    },

    // ============================================
    // ERROR HANDLING - MUST BE LAST
    // ============================================
    {
        path: '*',
        element: <Error />,
        layout: 'blank',
    },
];

export { routes };
