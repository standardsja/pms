import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../../store';
import Dropdown from '../../components/Dropdown';
import { setPageTitle } from '../../store/themeConfigSlice';
import { useEffect } from 'react';
import IconPencilPaper from '../../components/Icon/IconPencilPaper';
import IconCoffee from '../../components/Icon/IconCoffee';
import IconCalendar from '../../components/Icon/IconCalendar';
import IconMapPin from '../../components/Icon/IconMapPin';
import IconMail from '../../components/Icon/IconMail';
import IconPhone from '../../components/Icon/IconPhone';
import IconTwitter from '../../components/Icon/IconTwitter';
import IconDribbble from '../../components/Icon/IconDribbble';
import IconGithub from '../../components/Icon/IconGithub';
import IconShoppingBag from '../../components/Icon/IconShoppingBag';
import IconTag from '../../components/Icon/IconTag';
import IconCreditCard from '../../components/Icon/IconCreditCard';
import IconClock from '../../components/Icon/IconClock';
import IconHorizontalDots from '../../components/Icon/IconHorizontalDots';
import IconFile from '../../components/Icon/IconFile';
import IconClipboardText from '../../components/Icon/IconClipboardText';
import IconChecks from '../../components/Icon/IconChecks';

const Profile = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Profile'));
    });
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl' ? true : false;
    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link to="/" className="text-primary hover:underline">
                        Dashboard
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>My Profile</span>
                </li>
            </ul>
            <div className="pt-5">
                <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-5">
                    <div className="panel">
                        <div className="flex items-center justify-between mb-5">
                            <h5 className="font-semibold text-lg dark:text-white-light">Profile</h5>
                            <Link to="/users/user-account-settings" className="ltr:ml-auto rtl:mr-auto btn btn-primary p-2 rounded-full">
                                <IconPencilPaper />
                            </Link>
                        </div>
                        <div className="mb-5">
                            <div className="flex flex-col justify-center items-center">
                                <img src="/assets/images/user-profile.jpeg" alt="img" className="w-24 h-24 rounded-full object-cover  mb-5" />
                                <p className="font-semibold text-primary text-xl">John Doe</p>
                            </div>
                            <ul className="mt-5 flex flex-col max-w-[160px] m-auto space-y-4 font-semibold text-white-dark">
                                <li className="flex items-center gap-2">
                                    <IconShoppingBag className="shrink-0" />
                                    Procurement Officer
                                </li>
                                <li className="flex items-center gap-2">
                                    <IconCalendar className="shrink-0" />
                                    Joined: Jan 2024
                                </li>
                                <li className="flex items-center gap-2">
                                    <IconMapPin className="shrink-0" />
                                    Kingston, Jamaica
                                </li>
                                <li>
                                    <button className="flex items-center gap-2">
                                        <IconMail className="w-5 h-5 shrink-0" />
                                        <span className="text-primary truncate">john.doe@company.com</span>
                                    </button>
                                </li>
                                <li className="flex items-center gap-2">
                                    <IconPhone />
                                    <span className="whitespace-nowrap" dir="ltr">
                                        +1 (876) 555-1234
                                    </span>
                                </li>
                            </ul>
                            <ul className="mt-7 flex items-center justify-center gap-2">
                                <li>
                                    <Link to="/procurement/rfq/list" className="btn btn-primary flex items-center justify-center rounded-full px-4 h-10">
                                        View RFQs
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="panel lg:col-span-2 xl:col-span-3">
                        <div className="mb-5">
                            <h5 className="font-semibold text-lg dark:text-white-light">Recent Procurement Activities</h5>
                        </div>
                        <div className="mb-5">
                            <div className="table-responsive text-[#515365] dark:text-white-light font-semibold">
                                <table className="whitespace-nowrap">
                                    <thead>
                                        <tr>
                                            <th>Activity</th>
                                            <th>Status</th>
                                            <th>Progress</th>
                                            <th className="text-center">Last Updated</th>
                                        </tr>
                                    </thead>
                                    <tbody className="dark:text-white-dark">
                                        <tr>
                                            <td>RFQ-2024-045 - Office Supplies</td>
                                            <td><span className="badge bg-success">Approved</span></td>
                                            <td>
                                                <div className="h-1.5 bg-[#ebedf2] dark:bg-dark/40 rounded-full flex w-full">
                                                    <div className="bg-success rounded-full w-full"></div>
                                                </div>
                                            </td>
                                            <td className="text-center">5 mins ago</td>
                                        </tr>
                                        <tr>
                                            <td>EVAL-2024-032 - IT Equipment</td>
                                            <td><span className="badge bg-info">In Review</span></td>
                                            <td>
                                                <div className="h-1.5 bg-[#ebedf2] dark:bg-dark/40 rounded-full flex w-full">
                                                    <div className="bg-info rounded-full w-[75%]"></div>
                                                </div>
                                            </td>
                                            <td className="text-center">1 hour ago</td>
                                        </tr>
                                        <tr>
                                            <td>PO-2024-098 - Furniture</td>
                                            <td><span className="badge bg-warning">Pending Delivery</span></td>
                                            <td>
                                                <div className="h-1.5 bg-[#ebedf2] dark:bg-dark/40 rounded-full flex w-full">
                                                    <div className="bg-warning rounded-full  w-[60%]"></div>
                                                </div>
                                            </td>
                                            <td className="text-center">2 hours ago</td>
                                        </tr>
                                        <tr>
                                            <td>Q-2024-123 - Cleaning Services</td>
                                            <td><span className="badge bg-primary">Under Evaluation</span></td>
                                            <td>
                                                <div className="h-1.5 bg-[#ebedf2] dark:bg-dark/40 rounded-full flex w-full">
                                                    <div className="bg-primary rounded-full  w-[45%]"></div>
                                                </div>
                                            </td>
                                            <td className="text-center">5 hours ago</td>
                                        </tr>

                                        <tr>
                                            <td>RFQ-2024-046 - Security Equipment</td>
                                            <td><span className="badge bg-secondary">Awaiting Quotes</span></td>
                                            <td>
                                                <div className="h-1.5 bg-[#ebedf2] dark:bg-dark/40 rounded-full flex w-full">
                                                    <div className="bg-secondary  rounded-full  w-[30%]"></div>
                                                </div>
                                            </td>
                                            <td className="text-center">1 day ago</td>
                                        </tr>
                                        <tr>
                                            <td>EVAL-2024-033 - Janitorial Supplies</td>
                                            <td><span className="badge bg-success">Completed</span></td>
                                            <td>
                                                <div className="h-1.5 bg-[#ebedf2] dark:bg-dark/40 rounded-full flex w-full">
                                                    <div className="bg-success rounded-full  w-full"></div>
                                                </div>
                                            </td>
                                            <td className="text-center">2 days ago</td>
                                        </tr>
                                        <tr>
                                            <td>PO-2024-099 - Network Hardware</td>
                                            <td><span className="badge bg-info">In Transit</span></td>
                                            <td>
                                                <div className="h-1.5 bg-[#ebedf2] dark:bg-dark/40 rounded-full flex w-full">
                                                    <div className="bg-info rounded-full w-[80%]"></div>
                                                </div>
                                            </td>
                                            <td className="text-center">3 days ago</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="panel">
                        <div className="mb-5">
                            <h5 className="font-semibold text-lg dark:text-white-light">Performance Summary</h5>
                        </div>
                        <div className="space-y-4">
                            <div className="border border-[#ebedf2] rounded dark:bg-[#1b2e4b] dark:border-0">
                                <div className="flex items-center justify-between p-4 py-2">
                                    <div className="grid place-content-center w-9 h-9 rounded-md bg-primary-light dark:bg-primary text-primary dark:text-primary-light">
                                        <IconFile />
                                    </div>
                                    <div className="ltr:ml-4 rtl:mr-4 flex items-start justify-between flex-auto font-semibold">
                                        <h6 className="text-white-dark text-[13px] dark:text-white-dark">
                                            Active RFQs
                                            <span className="block text-base text-[#515365] dark:text-white-light">12 RFQs</span>
                                        </h6>
                                        <p className="ltr:ml-auto rtl:mr-auto text-primary">+3 this week</p>
                                    </div>
                                </div>
                            </div>
                            <div className="border border-[#ebedf2] rounded dark:bg-[#1b2e4b] dark:border-0">
                                <div className="flex items-center justify-between p-4 py-2">
                                    <div className="grid place-content-center w-9 h-9 rounded-md bg-info-light dark:bg-info text-info dark:text-info-light">
                                        <IconClipboardText />
                                    </div>
                                    <div className="ltr:ml-4 rtl:mr-4 flex items-start justify-between flex-auto font-semibold">
                                        <h6 className="text-white-dark text-[13px] dark:text-white-dark">
                                            Evaluations Completed
                                            <span className="block text-base text-[#515365] dark:text-white-light">28 this month</span>
                                        </h6>
                                        <p className="ltr:ml-auto rtl:mr-auto text-info">95%</p>
                                    </div>
                                </div>
                            </div>
                            <div className="border border-[#ebedf2] rounded dark:bg-[#1b2e4b] dark:border-0">
                                <div className="flex items-center justify-between p-4 py-2">
                                    <div className="grid place-content-center w-9 h-9 rounded-md bg-success-light dark:bg-success text-success dark:text-success-light">
                                        <IconChecks />
                                    </div>
                                    <div className="ltr:ml-4 rtl:mr-4 flex items-start justify-between flex-auto font-semibold">
                                        <h6 className="text-white-dark text-[13px] dark:text-white-dark">
                                            Approvals Processed
                                            <span className="block text-base text-[#515365] dark:text-white-light">45 this month</span>
                                        </h6>
                                        <p className="ltr:ml-auto rtl:mr-auto text-success">100%</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="panel">
                        <div className="flex items-center justify-between mb-10">
                            <h5 className="font-semibold text-lg dark:text-white-light">Department Access</h5>
                            <Link to="/settings" className="btn btn-primary">Manage Settings</Link>
                        </div>
                        <div className="group">
                            <ul className="list-inside list-disc text-white-dark font-semibold mb-7 space-y-2">
                                <li>Full Procurement Access</li>
                                <li>RFQ Creation & Management</li>
                                <li>Quote Evaluation Rights</li>
                                <li>Purchase Order Generation</li>
                                <li>Supplier Management</li>
                                <li>Reporting & Analytics</li>
                            </ul>
                            <div className="flex items-center justify-between mb-4 font-semibold">
                                <p className="flex items-center rounded-full bg-success px-2 py-1 text-xs text-white-light font-semibold">
                                    <IconChecks className="w-3 h-3 ltr:mr-1 rtl:ml-1" />Active Account
                                </p>
                                <p className="text-primary">Procurement Officer</p>
                            </div>
                        </div>
                    </div>
                    <div className="panel">
                        <div className="flex items-center justify-between mb-5">
                            <h5 className="font-semibold text-lg dark:text-white-light">Recent Transactions</h5>
                        </div>
                        <div>
                            <div className="border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                <div className="flex items-center justify-between py-2">
                                    <h6 className="text-[#515365] font-semibold dark:text-white-dark">
                                        November 2024
                                        <span className="block text-white-dark dark:text-white-light">15 Purchase Orders</span>
                                    </h6>
                                    <div className="flex items-start justify-between ltr:ml-auto rtl:mr-auto">
                                        <p className="font-semibold text-success">$125,450</p>
                                        <div className="dropdown ltr:ml-4 rtl:mr-4">
                                            <Dropdown
                                                offset={[0, 5]}
                                                placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`}
                                                btnClassName="hover:text-primary"
                                                button={<IconHorizontalDots className="opacity-80 hover:opacity-100" />}
                                            >
                                                <ul className="!min-w-[150px]">
                                                    <li>
                                                        <button type="button">View Details</button>
                                                    </li>
                                                    <li>
                                                        <button type="button">Download Report</button>
                                                    </li>
                                                </ul>
                                            </Dropdown>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                <div className="flex items-center justify-between py-2">
                                    <h6 className="text-[#515365] font-semibold dark:text-white-dark">
                                        October 2024
                                        <span className="block text-white-dark dark:text-white-light">22 Purchase Orders</span>
                                    </h6>
                                    <div className="flex items-start justify-between ltr:ml-auto rtl:mr-auto">
                                        <p className="font-semibold text-success">$98,720</p>
                                        <div className="dropdown ltr:ml-4 rtl:mr-4">
                                            <Dropdown offset={[0, 5]} placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`} button={<IconHorizontalDots className="opacity-80 hover:opacity-100" />}>
                                                <ul className="!min-w-[150px]">
                                                    <li>
                                                        <button type="button">View Details</button>
                                                    </li>
                                                    <li>
                                                        <button type="button">Download Report</button>
                                                    </li>
                                                </ul>
                                            </Dropdown>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between py-2">
                                    <h6 className="text-[#515365] font-semibold dark:text-white-dark">
                                        September 2024
                                        <span className="block text-white-dark dark:text-white-light">18 Purchase Orders</span>
                                    </h6>
                                    <div className="flex items-start justify-between ltr:ml-auto rtl:mr-auto">
                                        <p className="font-semibold text-success">$87,340</p>
                                        <div className="dropdown ltr:ml-4 rtl:mr-4">
                                            <Dropdown offset={[0, 5]} placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`} button={<IconHorizontalDots className="opacity-80 hover:opacity-100" />}>
                                                <ul className="!min-w-[150px]">
                                                    <li>
                                                        <button type="button">View Details</button>
                                                    </li>
                                                    <li>
                                                        <button type="button">Download Report</button>
                                                    </li>
                                                </ul>
                                            </Dropdown>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="panel">
                        <div className="flex items-center justify-between mb-5">
                            <h5 className="font-semibold text-lg dark:text-white-light">Quick Actions</h5>
                        </div>
                        <div className="space-y-3">
                            <Link to="/procurement/rfq/new" className="btn btn-primary w-full">
                                <IconFile className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                                Create New RFQ
                            </Link>
                            <Link to="/procurement/quotes" className="btn btn-info w-full">
                                <IconTag className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                                Review Quotes
                            </Link>
                            <Link to="/procurement/evaluation" className="btn btn-success w-full">
                                <IconClipboardText className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                                Start Evaluation
                            </Link>
                            <Link to="/procurement/suppliers" className="btn btn-secondary w-full">
                                <IconShoppingBag className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                                Manage Suppliers
                            </Link>
                            <Link to="/procurement/reports" className="btn btn-dark w-full">
                                <IconCreditCard className="w-5 h-5 ltr:mr-2 rtl:ml-2" />
                                View Reports
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;
