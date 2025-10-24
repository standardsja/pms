import { lazy } from 'react';

// Main Pages
const Index = lazy(() => import('../pages/Index'));
const Error = lazy(() => import('../components/Error'));

// Auth Pages
const Login = lazy(() => import('../pages/Auth/Login'));
const Register = lazy(() => import('../pages/Auth/Register'));
const ForgotPassword = lazy(() => import('../pages/Auth/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/Auth/ResetPassword'));
const Onboarding = lazy(() => import('../pages/Auth/Onboarding'));

// Procurement Pages
const ProcurementDashboard = lazy(() => import('../pages/Procurement/Dashboard'));
const RFQList = lazy(() => import('../pages/Procurement/RFQ/RFQList'));
const NewRFQ = lazy(() => import('../pages/Procurement/RFQ/NewRFQ'));
const RFQDetail = lazy(() => import('../pages/Procurement/RFQ/RFQDetail'));
const QuotesList = lazy(() => import('../pages/Procurement/Quotes/QuotesList'));
const EvaluationList = lazy(() => import('../pages/Procurement/Evaluation/EvaluationList'));
const ReviewList = lazy(() => import('../pages/Procurement/Review/ReviewList'));
const ApprovalsList = lazy(() => import('../pages/Procurement/Approvals/ApprovalsList'));
const PurchaseOrderList = lazy(() => import('../pages/Procurement/PurchaseOrders/PurchaseOrderList'));
const SupplierList = lazy(() => import('../pages/Procurement/Suppliers/SupplierList'));
const CatalogList = lazy(() => import('../pages/Procurement/Catalog/CatalogList'));
const ReportsList = lazy(() => import('../pages/Procurement/Reports/ReportsList'));
const PaymentsList = lazy(() => import('../pages/Procurement/Payments/PaymentsList'));
const AdminSettings = lazy(() => import('../pages/Procurement/Admin/AdminSettings'));

// Existing Pages
const Widgets = lazy(() => import('../pages/Widgets'));
const FontIcons = lazy(() => import('../pages/FontIcons'));
const DragAndDrop = lazy(() => import('../pages/DragAndDrop'));
const Tables = lazy(() => import('../pages/Tables'));
const Charts = lazy(() => import('../pages/Charts'));
const About = lazy(() => import('../pages/About'));

const routes = [
    // Auth Routes
    {
        path: '/auth/login',
        element: <Login />,
        layout: 'blank',
    },
    {
        path: '/auth/register',
        element: <Register />,
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
        element: <Onboarding />,
        layout: 'blank',
    },
    
    // Dashboard - Procurement Officer Dashboard loads first
    {
        path: '/',
        element: <ProcurementDashboard />,
    },
    
    // Procurement Routes
    {
        path: '/procurement/dashboard',
        element: <ProcurementDashboard />,
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
        path: '/procurement/evaluation',
        element: <EvaluationList />,
    },
    {
        path: '/procurement/review',
        element: <ReviewList />,
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
        path: '/procurement/suppliers',
        element: <SupplierList />,
    },
    {
        path: '/procurement/catalog',
        element: <CatalogList />,
    },
    {
        path: '/procurement/reports',
        element: <ReportsList />,
    },
    {
        path: '/procurement/payments',
        element: <PaymentsList />,
    },
    {
        path: '/procurement/admin',
        element: <AdminSettings />,
    },
    
    // Utility Pages
    {
        path: '/charts',
        element: <Charts />,
    },
    {
        path: '/widgets',
        element: <Widgets />,
    },
    {
        path: '/font-icons',
        element: <FontIcons />,
    },
    {
        path: '/dragndrop',
        element: <DragAndDrop />,
    },
    {
        path: '/tables',
        element: <Tables />,
    },
    {
        path: '/about',
        element: <About />,
        layout: 'blank',
    },
    
    // Error page - must be last
    {
        path: '*',
        element: <Error />,
        layout: 'blank',
    },
];

export { routes };
