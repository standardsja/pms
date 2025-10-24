import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../../../store';
import { setPageTitle } from '../../../store/themeConfigSlice';
import ReactApexChart from 'react-apexcharts';
import IconChartSquare from '../../../components/Icon/IconChartSquare';
import IconDownload from '../../../components/Icon/IconDownload';
import IconPrinter from '../../../components/Icon/IconPrinter';

const ReportsList = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Procurement Reports'));
    });

    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);

    const handleDownloadCategoryChart = () => {
        alert('Downloading Spend by Category chart as PDF...');
    };

    const handlePrintCategoryChart = () => {
        window.print();
    };

    const handleDownloadReport = (report: { name: string; format: string }) => {
        alert(`Downloading ${report.name}.${report.format.toLowerCase()}...`);
    };

    const handlePrintReport = (report: { name: string }) => {
        alert(`Printing ${report.name}...`);
    };

    const [reports] = useState([
        { id: 1, name: 'Monthly Procurement Summary', type: 'Summary', period: 'October 2024', generatedDate: '2024-10-24', format: 'PDF', size: '2.3 MB' },
        { id: 2, name: 'Supplier Performance Report', type: 'Analysis', period: 'Q3 2024', generatedDate: '2024-10-20', format: 'Excel', size: '5.1 MB' },
        { id: 3, name: 'Budget vs Spend Analysis', type: 'Financial', period: 'October 2024', generatedDate: '2024-10-22', format: 'PDF', size: '1.8 MB' },
        { id: 4, name: 'RFQ Cycle Time Report', type: 'Performance', period: 'September 2024', generatedDate: '2024-10-15', format: 'PDF', size: '1.2 MB' },
    ]);

    // Spend by category chart
    const spendByCategoryChart: any = {
        series: [
            {
                name: 'Spend',
                data: [85000, 320000, 42000, 15000, 68000, 125000],
            },
        ],
        options: {
            chart: {
                height: 300,
                type: 'bar',
                fontFamily: 'Nunito, sans-serif',
                toolbar: {
                    show: false,
                },
            },
            plotOptions: {
                bar: {
                    horizontal: true,
                    dataLabels: {
                        position: 'top',
                    },
                },
            },
            dataLabels: {
                enabled: true,
                offsetX: 0,
                style: {
                    fontSize: '12px',
                    colors: ['#304758'],
                },
                formatter: (val: number) => '$' + (val / 1000).toFixed(0) + 'K',
            },
            stroke: {
                show: true,
                width: 1,
                colors: ['#fff'],
            },
            colors: isDark ? ['#5c1ac3'] : ['#1B55E2'],
            xaxis: {
                categories: ['Office Furniture', 'IT Equipment', 'Office Supplies', 'Cleaning', 'Services', 'Other'],
                labels: {
                    formatter: (val: number) => '$' + (val / 1000).toFixed(0) + 'K',
                },
            },
            grid: {
                borderColor: isDark ? '#191E3A' : '#E0E6ED',
            },
        },
    };

    return (
        <div>
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold">Procurement Reports</h2>
                    <p className="text-white-dark">Analytics and reporting dashboard</p>
                </div>
                <Link to="/procurement/reports/generate" className="btn btn-primary gap-2">
                    <IconChartSquare />
                    Generate Report
                </Link>
            </div>

            {/* Quick Stats */}
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="panel">
                    <div className="mb-3 text-lg font-semibold">Total Spend (MTD)</div>
                    <div className="text-3xl font-bold text-primary">$655K</div>
                    <div className="mt-2 text-xs text-success">↑ 12% from last month</div>
                </div>
                <div className="panel">
                    <div className="mb-3 text-lg font-semibold">Avg RFQ Time</div>
                    <div className="text-3xl font-bold text-warning">8.5 days</div>
                    <div className="mt-2 text-xs text-danger">↓ 2 days slower</div>
                </div>
                <div className="panel">
                    <div className="mb-3 text-lg font-semibold">Active Suppliers</div>
                    <div className="text-3xl font-bold text-success">142</div>
                    <div className="mt-2 text-xs text-success">↑ 8 new this month</div>
                </div>
                <div className="panel">
                    <div className="mb-3 text-lg font-semibold">Cost Savings</div>
                    <div className="text-3xl font-bold text-info">$45K</div>
                    <div className="mt-2 text-xs text-success">↑ 15% from target</div>
                </div>
            </div>

            {/* Spend by Category Chart */}
            <div className="mb-6 panel">
                <div className="mb-5 flex items-center justify-between">
                    <h5 className="text-lg font-semibold dark:text-white-light">Spend by Category</h5>
                    <div className="flex gap-2">
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={handleDownloadCategoryChart}>
                            <IconDownload className="h-4 w-4" />
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={handlePrintCategoryChart}>
                            <IconPrinter className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                <div className="rounded-lg bg-white dark:bg-black">
                    <ReactApexChart series={spendByCategoryChart.series} options={spendByCategoryChart.options} type="bar" height={300} />
                </div>
            </div>

            {/* Report Templates */}
            <div className="mb-6 panel">
                <h5 className="mb-4 text-lg font-semibold">Quick Report Templates</h5>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Link
                        to="/procurement/reports/generate?template=monthly"
                        className="rounded-lg border border-white-light p-4 hover:border-primary hover:shadow-lg dark:border-white/10"
                    >
                        <h6 className="mb-2 font-semibold">Monthly Summary</h6>
                        <p className="text-xs text-white-dark">Comprehensive monthly procurement overview</p>
                    </Link>
                    <Link
                        to="/procurement/reports/generate?template=supplier"
                        className="rounded-lg border border-white-light p-4 hover:border-primary hover:shadow-lg dark:border-white/10"
                    >
                        <h6 className="mb-2 font-semibold">Supplier Performance</h6>
                        <p className="text-xs text-white-dark">Detailed supplier metrics and analysis</p>
                    </Link>
                    <Link
                        to="/procurement/reports/generate?template=budget"
                        className="rounded-lg border border-white-light p-4 hover:border-primary hover:shadow-lg dark:border-white/10"
                    >
                        <h6 className="mb-2 font-semibold">Budget Analysis</h6>
                        <p className="text-xs text-white-dark">Budget vs actual spend comparison</p>
                    </Link>
                    <Link
                        to="/procurement/reports/generate?template=rfq"
                        className="rounded-lg border border-white-light p-4 hover:border-primary hover:shadow-lg dark:border-white/10"
                    >
                        <h6 className="mb-2 font-semibold">RFQ Performance</h6>
                        <p className="text-xs text-white-dark">RFQ cycle times and efficiency</p>
                    </Link>
                    <Link
                        to="/procurement/reports/generate?template=savings"
                        className="rounded-lg border border-white-light p-4 hover:border-primary hover:shadow-lg dark:border-white/10"
                    >
                        <h6 className="mb-2 font-semibold">Cost Savings</h6>
                        <p className="text-xs text-white-dark">Cost reduction and savings analysis</p>
                    </Link>
                    <Link
                        to="/procurement/reports/generate?template=compliance"
                        className="rounded-lg border border-white-light p-4 hover:border-primary hover:shadow-lg dark:border-white/10"
                    >
                        <h6 className="mb-2 font-semibold">Compliance Report</h6>
                        <p className="text-xs text-white-dark">Procurement compliance metrics</p>
                    </Link>
                </div>
            </div>

            {/* Generated Reports Table */}
            <div className="panel">
                <div className="mb-5 flex items-center justify-between">
                    <h5 className="text-lg font-semibold">Generated Reports</h5>
                    <input type="text" placeholder="Search reports..." className="form-input w-auto" />
                </div>
                <div className="table-responsive">
                    <table className="table-hover">
                        <thead>
                            <tr>
                                <th>Report Name</th>
                                <th>Type</th>
                                <th>Period</th>
                                <th>Generated Date</th>
                                <th>Format</th>
                                <th>Size</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reports.map((report) => (
                                <tr key={report.id}>
                                    <td className="font-semibold">{report.name}</td>
                                    <td>
                                        <span className="badge bg-primary">{report.type}</span>
                                    </td>
                                    <td>{report.period}</td>
                                    <td>{report.generatedDate}</td>
                                    <td>
                                        <span className={`badge ${report.format === 'PDF' ? 'bg-danger' : 'bg-success'}`}>{report.format}</span>
                                    </td>
                                    <td>{report.size}</td>
                                    <td>
                                        <div className="flex gap-2">
                                            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => handleDownloadReport(report)}>
                                                <IconDownload className="h-4 w-4" />
                                            </button>
                                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => handlePrintReport(report)}>
                                                <IconPrinter className="h-4 w-4" />
                                            </button>
                                        </div>
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

export default ReportsList;
