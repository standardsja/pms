import { lazy } from 'react';
import OnboardingGuard from '../components/OnboardingGuard';
import AdminRoute from '../components/AdminRoute';
import CommitteeRoute from '../components/CommitteeRoute';
import ProcurementRoute from '../components/ProcurementRoute';

// Main Pages
const Index = lazy(() => import('../pages/Index'));
const LandingPage = lazy(() => import('../pages/LandingPage'));
const Error = lazy(() => import('../components/Error'));

// Auth Pages
const Login = lazy(() => import('../pages/Procurement/Auth/Login'));
const ForgotPassword = lazy(() => import('../pages/Procurement/Auth/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/Procurement/Auth/ResetPassword'));
const Onboarding = lazy(() => import('../pages/Procurement/Auth/Onboarding'));

// Procurement Pages
const ProcurementDashboard = lazy(() => import('../pages/Procurement/Dashboard'));
const ProcurementManagerDashboard = lazy(() => import('../pages/Procurement/Manager/ProcurementManagerDashboard'));
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
const AdminSettings = lazy(() => import('../pages/Procurement/Admin/AdminSettings'));

// Request Pages
const Requests = lazy(() => import('../pages/Procurement/Requests/Requests'));
const RequestForm = lazy(() => import('../pages/Procurement/Requests/RequestForm'));
const CombineRequests = lazy(() => import('../pages/Procurement/Requests/CombineRequests'));
const FinanceRequests = lazy(() => import('../pages/Procurement/Finance/Requests'));

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
const ModuleSelector = lazy(() => import('../pages/ModuleSelector'));

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
    // Root path shows ModuleSelector for authenticated users or redirects to login
    {
        path: '/',
        element: <LandingPage />,
        layout: 'blank',
    },
    // Keep legacy dashboard route for direct access
    {
        path: '/dashboard',
        element: <Index />,
    },
    // Direct route to module selector
    {
        path: '/modules',
        element: <ModuleSelector />,
        layout: 'blank',
    },

    // ============================================
    // INNOVATION HUB MODULE
    // ============================================
    {
        path: '/innovation/dashboard',
        element: <InnovationDashboard />,
    },
    {
        path: '/innovation/ideas/new',
        element: <SubmitIdea />,
    },
    {
        path: '/innovation/ideas/browse',
        element: <ViewIdeas />,
    },
    {
        path: '/innovation/ideas/mine',
        element: <MyIdeas />,
    },
    {
        path: '/innovation/ideas/popular',
        element: <VoteOnIdeas />,
    },
    {
        path: '/innovation/ideas/all',
        element: <ViewIdeas />,
    },
    {
        path: '/innovation/ideas/analytics',
        element: <InnovationAnalytics />,
    },
    {
        path: '/innovation/leaderboard',
        element: <InnovationLeaderboard />,
    },
    {
        path: '/innovation/ideas/:id',
        element: <IdeaDetails />,
    },
    {
        path: '/innovation/projects',
        element: <BSJProjects />,
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

    // ============================================
    // MAIN DASHBOARD - Now points to module selector
    // ============================================
    {
        path: '/procurement',
        element: <ProcurementDashboard />,
    },

    // ============================================
    // PROCUREMENT MODULE
    // ============================================
    {
        path: '/procurement/dashboard',
        element: <ProcurementDashboard />,
    },
    {
        path: '/procurement/manager',
        element: <ProcurementManagerDashboard />,
    },
    {
        path: '/procurement/manager/rfqs-awaiting',
        element: <RFQsAwaitingApproval />,
    },
    {
        path: '/procurement/manager/evaluations-to-validate',
        element: <EvaluationsToValidate />,
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
        element: <ApprovalsList />,
    },
    {
        path: '/procurement/purchase-orders',
        element: <PurchaseOrderList />,
    },
    {
        path: '/procurement/purchase-orders/new',
        element: <NewPurchaseOrder />,
    },
    {
        path: '/procurement/purchase-orders/:id',
        element: <PurchaseOrderDetail />,
    },
    {
        path: '/procurement/suppliers',
        element: <SupplierList />,
    },
    {
        path: '/supplier',
        element: <SupplierDashboard />,
    },
    {
        path: '/procurement/suppliers/new',
        element: <NewSupplier />,
    },
    {
        path: '/procurement/suppliers/:id',
        element: <SupplierDetail />,
    },
    {
        path: '/procurement/suppliers/:id/edit',
        element: <EditSupplier />,
    },
    {
        path: '/procurement/catalog',
        element: <CatalogList />,
    },
    {
        path: '/procurement/catalog/new',
        element: <NewCatalogItem />,
    },
    {
        path: '/procurement/catalog/:id',
        element: <CatalogItemDetail />,
    },
    {
        path: '/procurement/catalog/:id/edit',
        element: <EditCatalogItem />,
    },
    {
        path: '/procurement/reports',
        element: <ReportsList />,
    },
    {
        path: '/procurement/reports/generate',
        element: <NewReport />,
    },
    {
        path: '/procurement/payments',
        element: <PaymentsList />,
    },
    {
        path: '/finance',
        element: <FinanceDashboard />,
    },
    {
        path: '/finance/requests',
        element: <FinanceRequests />,
    },
    {
        path: '/finance/awaiting-delivery',
        element: <AwaitingDelivery />,
    },
    {
        path: '/finance/payments-to-process',
        element: <PaymentsToProcess />,
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
        element: <DepartmentHeadDashboard />,
    },
    {
        path: '/procurement/department-head/evaluations',
        element: <DepartmentHeadEvaluationReview />,
    },
    {
        path: '/procurement/department-head/reports',
        element: <DepartmentHeadReportReview />,
    },

    // ============================================
    // EXECUTIVE DIRECTOR ROUTES
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

    // ============================================
    // ADMIN ROUTES
    // ============================================
    {
        path: '/procurement/admin',
        element: (
            <AdminRoute>
                <AdminSettings />
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
    // ERROR HANDLING - MUST BE LAST
    // ============================================
    {
        path: '*',
        element: <Error />,
        layout: 'blank',
    },
];

export { routes };
