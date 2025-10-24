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
const RequestList = lazy(() => import('../pages/Procurement/Requests/RequestList'));
const NewRequest = lazy(() => import('../pages/Procurement/Requests/NewRequest'));
const RFQList = lazy(() => import('../pages/Procurement/RFQ/RFQList'));
const ApprovalsList = lazy(() => import('../pages/Procurement/Approvals/ApprovalsList'));
const PurchaseOrderList = lazy(() => import('../pages/Procurement/PurchaseOrders/PurchaseOrderList'));
const SupplierList = lazy(() => import('../pages/Procurement/Suppliers/SupplierList'));

// Existing Pages (keeping only what exists)
const Widgets = lazy(() => import('../pages/Widgets'));
const FontIcons = lazy(() => import('../pages/FontIcons'));
const DragAndDrop = lazy(() => import('../pages/DragAndDrop'));
const Tables = lazy(() => import('../pages/Tables'));
const Charts = lazy(() => import('../pages/Charts'));
const About = lazy(() => import('../pages/About'));

const routes = [
    // Auth Routes (no layout)
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
    
    // Dashboard
    {
        path: '/',
        element: <Index />,
    },
    
    // Procurement Routes
    {
        path: '/procurement/dashboard',
        element: <ProcurementDashboard />,
    },
    {
        path: '/procurement/requests',
        element: <RequestList />,
    },
    {
        path: '/procurement/requests/new',
        element: <NewRequest />,
    },
    {
        path: '/procurement/rfq/list',
        element: <RFQList />,
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
