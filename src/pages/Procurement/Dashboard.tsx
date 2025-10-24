import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../../store';
import { setPageTitle } from '../../store/themeConfigSlice';
import ReactApexChart from 'react-apexcharts';
import PerfectScrollbar from 'react-perfect-scrollbar';
import IconShoppingCart from '../../components/Icon/IconShoppingCart';
import IconDollarSignCircle from '../../components/Icon/IconDollarSignCircle';
import IconInbox from '../../components/Icon/IconInbox';
import IconTag from '../../components/Icon/IconTag';
import IconCreditCard from '../../components/Icon/IconCreditCard';
import IconClipboardText from '../../components/Icon/IconClipboardText';
import IconFile from '../../components/Icon/IconFile';
import IconFolder from '../../components/Icon/IconFolder';
import IconUser from '../../components/Icon/IconUser';
import IconSettings from '../../components/Icon/IconSettings';
import IconChartSquare from '../../components/Icon/IconChartSquare';
import IconChecks from '../../components/Icon/IconChecks';
import IconBell from '../../components/Icon/IconBell';
import IconClock from '../../components/Icon/IconClock';
import IconTrendingUp from '../../components/Icon/IconTrendingUp';

const ProcurementOfficerDashboard = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Procurement Officer Dashboard'));
    });

    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl' ? true : false;

    // Mock statistics
    const stats = {
        activeRFQs: 12,
        pendingQuotes: 8,
        pendingEvaluations: 5,
        procurementReviews: 7,
        activePOs: 25,
        activeContracts: 15,
        totalSuppliers: 142,
        catalogItems: 856,
        monthlyReports: 3,
        workflowTemplates: 12,
    };

    // Recent activities
    const recentActivities = [
        { id: 1, action: 'RFQ Created', description: 'RFQ-2024-045 - Office Supplies', time: '5 min ago', status: 'success' },
        { id: 2, action: 'Quote Received', description: 'Q-2024-123 from ABC Corp', time: '15 min ago', status: 'info' },
        { id: 3, action: 'Evaluation Completed', description: 'EVAL-2024-032 - IT Equipment', time: '1 hour ago', status: 'success' },
        { id: 4, action: 'PO Approved', description: 'PO-2024-098 - $15,240', time: '2 hours ago', status: 'success' },
        { id: 5, action: 'Supplier Added', description: 'XYZ Suppliers Ltd', time: '3 hours ago', status: 'primary' },
    ];

    // Pending approvals
    const pendingApprovals = [
        { id: 1, type: 'RFQ', number: 'RFQ-2024-046', description: 'Furniture Purchase', amount: 12500, dueDate: '2024-10-25' },
        { id: 2, type: 'Quote', number: 'Q-2024-124', description: 'IT Services', amount: 8900, dueDate: '2024-10-26' },
        { id: 3, type: 'Evaluation', number: 'EVAL-2024-033', description: 'Cleaning Supplies', amount: 3200, dueDate: '2024-10-27' },
        { id: 4, type: 'PO', number: 'PO-2024-099', description: 'Security Equipment', amount: 22100, dueDate: '2024-10-28' },
    ];

    // Top suppliers by spend
    const topSuppliers = [
        { name: 'ABC Corporation', spend: 125000, orders: 45, rating: 4.8 },
        { name: 'XYZ Suppliers Ltd', spend: 98000, orders: 32, rating: 4.6 },
        { name: 'Tech Solutions Inc', spend: 87500, orders: 28, rating: 4.9 },
        { name: 'Office Pro Supply', spend: 65000, orders: 52, rating: 4.5 },
        { name: 'Industrial Goods Co', spend: 54000, orders: 18, rating: 4.7 },
    ];

    // Procurement spend chart
    const procurementSpendChart: any = {
        series: [
            {
                name: 'Actual Spend',
                data: [45000, 52000, 48000, 61000, 55000, 68000, 72000, 65000, 59000, 71000, 67000, 75000],
            },
            {
                name: 'Budget',
                data: [50000, 55000, 50000, 65000, 60000, 70000, 75000, 70000, 65000, 75000, 70000, 80000],
            },
        ],
        options: {
            chart: {
                height: 300,
                type: 'area',
                fontFamily: 'Nunito, sans-serif',
                zoom: {
                    enabled: false,
                },
                toolbar: {
                    show: false,
                },
            },
            dataLabels: {
                enabled: false,
            },
            stroke: {
                show: true,
                curve: 'smooth',
                width: 2,
                lineCap: 'square',
            },
            colors: isDark ? ['#2196F3', '#00ab55'] : ['#1B55E2', '#00ab55'],
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            xaxis: {
                axisBorder: {
                    show: false,
                },
                axisTicks: {
                    show: false,
                },
            },
            yaxis: {
                tickAmount: 7,
                labels: {
                    formatter: (value: number) => {
                        return '$' + value / 1000 + 'K';
                    },
                    offsetX: isRtl ? -30 : -10,
                },
                opposite: isRtl ? true : false,
            },
            grid: {
                borderColor: isDark ? '#191E3A' : '#E0E6ED',
                strokeDashArray: 5,
            },
            legend: {
                position: 'top',
                horizontalAlign: 'right',
            },
            tooltip: {
                marker: {
                    show: true,
                },
            },
            fill: {
                type: 'gradient',
                gradient: {
                    shadeIntensity: 1,
                    inverseColors: false,
                    opacityFrom: isDark ? 0.19 : 0.28,
                    opacityTo: 0.05,
                    stops: isDark ? [100, 100] : [45, 100],
                },
            },
        },
    };

    // RFQ status distribution
    const rfqStatusChart: any = {
        series: [stats.activeRFQs, stats.pendingQuotes, stats.pendingEvaluations],
        options: {
            chart: {
                type: 'donut',
                height: 250,
                fontFamily: 'Nunito, sans-serif',
            },
            dataLabels: {
                enabled: false,
            },
            stroke: {
                show: true,
                width: 15,
                colors: isDark ? '#0e1726' : '#fff',
            },
            colors: isDark ? ['#5c1ac3', '#e2a03f', '#00ab55'] : ['#e2a03f', '#5c1ac3', '#00ab55'],
            legend: {
                position: 'bottom',
                horizontalAlign: 'center',
                fontSize: '14px',
                markers: {
                    width: 10,
                    height: 10,
                },
            },
            labels: ['Active RFQs', 'Pending Quotes', 'Evaluations'],
            states: {
                hover: {
                    filter: {
                        type: 'none',
                        value: 0.15,
                    },
                },
            },
        },
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h2 className="text-2xl font-bold">Procurement Officer Dashboard</h2>
                <p className="text-white-dark">Comprehensive procurement management overview</p>
            </div>

            {/* Key Metrics Grid */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {/* RFQs */}
                <div className="panel">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <IconShoppingCart className="h-5 w-5" />
                        </div>
                        <Link to="/procurement/rfq/list" className="text-xs font-semibold text-primary hover:underline">
                            View All
                        </Link>
                    </div>
                    <div className="text-2xl font-bold text-primary">{stats.activeRFQs}</div>
                    <div className="text-sm font-semibold">Active RFQs</div>
                </div>

                {/* Quotes */}
                <div className="panel">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-warning/10 text-warning">
                            <IconTag className="h-5 w-5" />
                        </div>
                        <Link to="/procurement/quotes" className="text-xs font-semibold text-warning hover:underline">
                            View All
                        </Link>
                    </div>
                    <div className="text-2xl font-bold text-warning">{stats.pendingQuotes}</div>
                    <div className="text-sm font-semibold">Pending Quotes</div>
                </div>

                {/* Evaluations */}
                <div className="panel">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-info/10 text-info">
                            <IconClipboardText className="h-5 w-5" />
                        </div>
                        <Link to="/procurement/evaluation" className="text-xs font-semibold text-info hover:underline">
                            View All
                        </Link>
                    </div>
                    <div className="text-2xl font-bold text-info">{stats.pendingEvaluations}</div>
                    <div className="text-sm font-semibold">Evaluations</div>
                </div>

                {/* POs/Contracts */}
                <div className="panel">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-success/10 text-success">
                            <IconCreditCard className="h-5 w-5" />
                        </div>
                        <Link to="/procurement/purchase-orders" className="text-xs font-semibold text-success hover:underline">
                            View All
                        </Link>
                    </div>
                    <div className="text-2xl font-bold text-success">{stats.activePOs}</div>
                    <div className="text-sm font-semibold">Active POs</div>
                </div>

                {/* Suppliers */}
                <div className="panel">
                    <div className="mb-4 flex items-center justify-between">
                        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
                            <IconUser className="h-5 w-5" />
                        </div>
                        <Link to="/procurement/suppliers" className="text-xs font-semibold text-secondary hover:underline">
                            View All
                        </Link>
                    </div>
                    <div className="text-2xl font-bold text-secondary">{stats.totalSuppliers}</div>
                    <div className="text-sm font-semibold">Total Suppliers</div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="mb-6 grid gap-6 lg:grid-cols-3">
                {/* Procurement Spend Chart */}
                <div className="panel lg:col-span-2">
                    <div className="mb-5 flex items-center justify-between">
                        <h5 className="text-lg font-semibold dark:text-white-light">Procurement Spend vs Budget</h5>
                    </div>
                    <div className="rounded-lg bg-white dark:bg-black">
                        <ReactApexChart series={procurementSpendChart.series} options={procurementSpendChart.options} type="area" height={300} />
                    </div>
                </div>

                {/* RFQ Status Distribution */}
                <div className="panel">
                    <div className="mb-5 flex items-center justify-between">
                        <h5 className="text-lg font-semibold dark:text-white-light">RFQ Pipeline</h5>
                    </div>
                    <div className="rounded-lg bg-white dark:bg-black">
                        <ReactApexChart series={rfqStatusChart.series} options={rfqStatusChart.options} type="donut" height={250} />
                    </div>
                </div>
            </div>

            {/* Quick Access Menu */}
            <div className="mb-6">
                <h5 className="mb-4 text-lg font-semibold">Quick Access</h5>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {/* RFQ Management */}
                    <Link
                        to="/procurement/rfq/list"
                        className="panel group cursor-pointer border-2 border-transparent hover:border-primary"
                    >
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white">
                            <IconShoppingCart className="h-6 w-6" />
                        </div>
                        <h6 className="mb-1 font-semibold">RFQs</h6>
                        <p className="text-xs text-white-dark">Manage Requests for Quotations</p>
                    </Link>

                    {/* Quotes */}
                    <Link
                        to="/procurement/quotes"
                        className="panel group cursor-pointer border-2 border-transparent hover:border-warning"
                    >
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10 text-warning group-hover:bg-warning group-hover:text-white">
                            <IconTag className="h-6 w-6" />
                        </div>
                        <h6 className="mb-1 font-semibold">Quotes</h6>
                        <p className="text-xs text-white-dark">Review supplier quotations</p>
                    </Link>

                    {/* Evaluations */}
                    <Link
                        to="/procurement/evaluation"
                        className="panel group cursor-pointer border-2 border-transparent hover:border-info"
                    >
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-info/10 text-info group-hover:bg-info group-hover:text-white">
                            <IconClipboardText className="h-6 w-6" />
                        </div>
                        <h6 className="mb-1 font-semibold">Evaluations</h6>
                        <p className="text-xs text-white-dark">Evaluate and compare quotes</p>
                    </Link>

                    {/* Procurement Review */}
                    <Link
                        to="/procurement/review"
                        className="panel group cursor-pointer border-2 border-transparent hover:border-success"
                    >
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-success/10 text-success group-hover:bg-success group-hover:text-white">
                            <IconChecks className="h-6 w-6" />
                        </div>
                        <h6 className="mb-1 font-semibold">Procurement Review</h6>
                        <p className="text-xs text-white-dark">Final procurement reviews</p>
                    </Link>

                    {/* PO/Contract */}
                    <Link
                        to="/procurement/purchase-orders"
                        className="panel group cursor-pointer border-2 border-transparent hover:border-secondary"
                    >
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10 text-secondary group-hover:bg-secondary group-hover:text-white">
                            <IconCreditCard className="h-6 w-6" />
                        </div>
                        <h6 className="mb-1 font-semibold">PO/Contract</h6>
                        <p className="text-xs text-white-dark">Purchase orders & contracts</p>
                    </Link>

                    {/* Suppliers */}
                    <Link
                        to="/procurement/suppliers"
                        className="panel group cursor-pointer border-2 border-transparent hover:border-danger"
                    >
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-danger/10 text-danger group-hover:bg-danger group-hover:text-white">
                            <IconUser className="h-6 w-6" />
                        </div>
                        <h6 className="mb-1 font-semibold">Suppliers</h6>
                        <p className="text-xs text-white-dark">Supplier management</p>
                    </Link>

                    {/* Catalog */}
                    <Link
                        to="/procurement/catalog"
                        className="panel group cursor-pointer border-2 border-transparent hover:border-primary"
                    >
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white">
                            <IconFolder className="h-6 w-6" />
                        </div>
                        <h6 className="mb-1 font-semibold">Catalog</h6>
                        <p className="text-xs text-white-dark">{stats.catalogItems} items available</p>
                    </Link>

                    {/* Reports */}
                    <Link
                        to="/procurement/reports"
                        className="panel group cursor-pointer border-2 border-transparent hover:border-warning"
                    >
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10 text-warning group-hover:bg-warning group-hover:text-white">
                            <IconChartSquare className="h-6 w-6" />
                        </div>
                        <h6 className="mb-1 font-semibold">Reports</h6>
                        <p className="text-xs text-white-dark">Analytics & reporting</p>
                    </Link>

                    {/* Admin */}
                    <Link
                        to="/procurement/admin"
                        className="panel group cursor-pointer border-2 border-transparent hover:border-info"
                    >
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-info/10 text-info group-hover:bg-info group-hover:text-white">
                            <IconSettings className="h-6 w-6" />
                        </div>
                        <h6 className="mb-1 font-semibold">Admin</h6>
                        <p className="text-xs text-white-dark">Workflows & templates</p>
                    </Link>

                    {/* Payments */}
                    <Link
                        to="/procurement/payments"
                        className="panel group cursor-pointer border-2 border-transparent hover:border-success"
                    >
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-success/10 text-success group-hover:bg-success group-hover:text-white">
                            <IconDollarSignCircle className="h-6 w-6" />
                        </div>
                        <h6 className="mb-1 font-semibold">Payments</h6>
                        <p className="text-xs text-white-dark">Payment processing</p>
                    </Link>
                </div>
            </div>

            {/* Bottom Section - Activities and Tables */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Activities */}
                <div className="panel h-full">
                    <div className="mb-5 flex items-center justify-between">
                        <h5 className="text-lg font-semibold dark:text-white-light">
                            <div className="flex items-center gap-2">
                                <IconBell className="h-5 w-5" />
                                Recent Activities
                            </div>
                        </h5>
                    </div>
                    <PerfectScrollbar className="relative h-[400px] pr-3 -mr-3">
                        <div className="space-y-4">
                            {recentActivities.map((activity) => (
                                <div key={activity.id} className="flex items-start gap-3 border-b border-white-light pb-4 dark:border-white/10">
                                    <div
                                        className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                                            activity.status === 'success'
                                                ? 'bg-success/10 text-success'
                                                : activity.status === 'info'
                                                ? 'bg-info/10 text-info'
                                                : 'bg-primary/10 text-primary'
                                        }`}
                                    >
                                        <IconClock className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1">
                                        <h6 className="font-semibold">{activity.action}</h6>
                                        <p className="text-sm text-white-dark">{activity.description}</p>
                                        <p className="mt-1 text-xs text-white-dark">{activity.time}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </PerfectScrollbar>
                </div>

                {/* Pending Approvals */}
                <div className="panel h-full">
                    <div className="mb-5 flex items-center justify-between">
                        <h5 className="text-lg font-semibold dark:text-white-light">
                            <div className="flex items-center gap-2">
                                <IconInbox className="h-5 w-5" />
                                Pending Approvals
                            </div>
                        </h5>
                        <Link to="/procurement/approvals" className="text-sm font-semibold text-primary hover:underline">
                            View All
                        </Link>
                    </div>
                    <div className="table-responsive">
                        <table className="table-hover">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Number</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                    <th>Due Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingApprovals.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <span
                                                className={`badge ${
                                                    item.type === 'RFQ'
                                                        ? 'bg-primary'
                                                        : item.type === 'Quote'
                                                        ? 'bg-warning'
                                                        : item.type === 'Evaluation'
                                                        ? 'bg-info'
                                                        : 'bg-success'
                                                }`}
                                            >
                                                {item.type}
                                            </span>
                                        </td>
                                        <td>
                                            <Link to="#" className="text-primary hover:underline">
                                                {item.number}
                                            </Link>
                                        </td>
                                        <td>{item.description}</td>
                                        <td className="font-semibold">${item.amount.toLocaleString()}</td>
                                        <td>{item.dueDate}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Top Suppliers Table */}
            <div className="panel mt-6">
                <div className="mb-5 flex items-center justify-between">
                    <h5 className="text-lg font-semibold dark:text-white-light">
                        <div className="flex items-center gap-2">
                            <IconTrendingUp className="h-5 w-5" />
                            Top Suppliers by Spend
                        </div>
                    </h5>
                    <Link to="/procurement/suppliers" className="text-sm font-semibold text-primary hover:underline">
                        View All Suppliers
                    </Link>
                </div>
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>Supplier Name</th>
                                <th>Total Spend</th>
                                <th>Orders</th>
                                <th>Rating</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topSuppliers.map((supplier, index) => (
                                <tr key={index}>
                                    <td className="font-semibold">{supplier.name}</td>
                                    <td className="text-success font-bold">${supplier.spend.toLocaleString()}</td>
                                    <td>{supplier.orders}</td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <span className="text-warning">★</span>
                                            <span className="font-semibold">{supplier.rating}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <Link to={`/procurement/suppliers/${index + 1}`} className="text-primary hover:underline">
                                            View Details
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProcurementOfficerDashboard;
