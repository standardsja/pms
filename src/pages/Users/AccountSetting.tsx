import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { setPageTitle } from '../../store/themeConfigSlice';
import { useDispatch } from 'react-redux';
import IconHome from '../../components/Icon/IconHome';
import IconDollarSignCircle from '../../components/Icon/IconDollarSignCircle';
import IconUser from '../../components/Icon/IconUser';
import IconPhone from '../../components/Icon/IconPhone';
import IconLinkedin from '../../components/Icon/IconLinkedin';
import IconTwitter from '../../components/Icon/IconTwitter';
import IconFacebook from '../../components/Icon/IconFacebook';
import IconGithub from '../../components/Icon/IconGithub';

const AccountSetting = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Account Setting'));
    });
    const [tabs, setTabs] = useState<string>('home');
    const toggleTabs = (name: string) => {
        setTabs(name);
    };

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link to="/" className="text-primary hover:underline">
                        Dashboard
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Account Settings</span>
                </li>
            </ul>
            <div className="pt-5">
                <div className="flex items-center justify-between mb-5">
                    <h5 className="font-semibold text-lg dark:text-white-light">Settings</h5>
                </div>
                <div>
                    <ul className="sm:flex font-semibold border-b border-[#ebedf2] dark:border-[#191e3a] mb-5 whitespace-nowrap overflow-y-auto">
                        <li className="inline-block">
                            <button
                                onClick={() => toggleTabs('home')}
                                className={`flex gap-2 p-4 border-b border-transparent hover:border-primary hover:text-primary ${tabs === 'home' ? '!border-primary text-primary' : ''}`}
                            >
                                <IconHome />
                                Home
                            </button>
                        </li>
                        <li className="inline-block">
                            <button
                                onClick={() => toggleTabs('payment-details')}
                                className={`flex gap-2 p-4 border-b border-transparent hover:border-primary hover:text-primary ${tabs === 'payment-details' ? '!border-primary text-primary' : ''}`}
                            >
                                <IconDollarSignCircle />
                                Payment Details
                            </button>
                        </li>
                        <li className="inline-block">
                            <button
                                onClick={() => toggleTabs('preferences')}
                                className={`flex gap-2 p-4 border-b border-transparent hover:border-primary hover:text-primary ${tabs === 'preferences' ? '!border-primary text-primary' : ''}`}
                            >
                                <IconUser className="w-5 h-5" />
                                Preferences
                            </button>
                        </li>
                        <li className="inline-block">
                            <button
                                onClick={() => toggleTabs('danger-zone')}
                                className={`flex gap-2 p-4 border-b border-transparent hover:border-primary hover:text-primary ${tabs === 'danger-zone' ? '!border-primary text-primary' : ''}`}
                            >
                                <IconPhone />
                                Danger Zone
                            </button>
                        </li>
                    </ul>
                </div>
                {tabs === 'home' ? (
                    <div>
                        <form className="border border-[#ebedf2] dark:border-[#191e3a] rounded-md p-4 mb-5 bg-white dark:bg-black">
                            <h6 className="text-lg font-bold mb-5">General Information</h6>
                            <div className="flex flex-col sm:flex-row">
                                <div className="ltr:sm:mr-4 rtl:sm:ml-4 w-full sm:w-2/12 mb-5">
                                    <img src="/assets//images/user-profile.jpeg" alt="img" className="w-20 h-20 md:w-32 md:h-32 rounded-full object-cover mx-auto" />
                                </div>
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <label htmlFor="name">Full Name</label>
                                        <input id="name" type="text" placeholder="John Doe" className="form-input" defaultValue="John Doe" />
                                    </div>
                                    <div>
                                        <label htmlFor="profession">Job Title</label>
                                        <input id="profession" type="text" placeholder="Procurement Officer" className="form-input" defaultValue="Procurement Officer" />
                                    </div>
                                    <div>
                                        <label htmlFor="department">Department</label>
                                        <select defaultValue="Procurement" id="department" className="form-select text-white-dark">
                                            <option value="Procurement">Procurement</option>
                                            <option value="Finance">Finance</option>
                                            <option value="Operations">Operations</option>
                                            <option value="IT">IT</option>
                                            <option value="HR">HR</option>
                                            <option value="Admin">Admin</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="country">Country</label>
                                        <select defaultValue="Jamaica" id="country" className="form-select text-white-dark">
                                            <option value="Jamaica">Jamaica</option>
                                            <option value="United States">United States</option>
                                            <option value="United Kingdom">United Kingdom</option>
                                            <option value="Canada">Canada</option>
                                            <option value="Trinidad and Tobago">Trinidad and Tobago</option>
                                            <option value="Barbados">Barbados</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="address">Office Address</label>
                                        <input id="address" type="text" placeholder="Kingston" className="form-input" defaultValue="123 Main Street" />
                                    </div>
                                    <div>
                                        <label htmlFor="location">City</label>
                                        <input id="location" type="text" placeholder="City" className="form-input" defaultValue="Kingston" />
                                    </div>
                                    <div>
                                        <label htmlFor="phone">Office Phone</label>
                                        <input id="phone" type="text" placeholder="+1 (876) 555-1234" className="form-input" defaultValue="+1 (876) 555-1234" />
                                    </div>
                                    <div>
                                        <label htmlFor="email">Work Email</label>
                                        <input id="email" type="email" placeholder="john.doe@company.com" className="form-input" defaultValue="john.doe@company.com" />
                                    </div>
                                    <div>
                                        <label htmlFor="employeeId">Employee ID</label>
                                        <input id="employeeId" type="text" placeholder="Enter Employee ID" className="form-input" defaultValue="EMP-2024-001" />
                                    </div>
                                    <div>
                                        <label htmlFor="supervisor">Reporting To</label>
                                        <input id="supervisor" type="text" placeholder="Supervisor Name" className="form-input" defaultValue="Sarah Johnson" />
                                    </div>
                                    <div className="sm:col-span-2 mt-3">
                                        <button type="button" className="btn btn-primary">
                                            Save Changes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                        <form className="border border-[#ebedf2] dark:border-[#191e3a] rounded-md p-4 bg-white dark:bg-black">
                            <h6 className="text-lg font-bold mb-5">Procurement Access & Permissions</h6>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div className="space-y-3">
                                    <label className="inline-flex cursor-pointer">
                                        <input type="checkbox" className="form-checkbox" defaultChecked />
                                        <span className="text-white-dark relative checked:bg-none ltr:ml-2 rtl:mr-2">Create RFQs</span>
                                    </label>
                                </div>
                                <div className="space-y-3">
                                    <label className="inline-flex cursor-pointer">
                                        <input type="checkbox" className="form-checkbox" defaultChecked />
                                        <span className="text-white-dark relative checked:bg-none ltr:ml-2 rtl:mr-2">Evaluate Quotes</span>
                                    </label>
                                </div>
                                <div className="space-y-3">
                                    <label className="inline-flex cursor-pointer">
                                        <input type="checkbox" className="form-checkbox" defaultChecked />
                                        <span className="text-white-dark relative checked:bg-none ltr:ml-2 rtl:mr-2">Generate Purchase Orders</span>
                                    </label>
                                </div>
                                <div className="space-y-3">
                                    <label className="inline-flex cursor-pointer">
                                        <input type="checkbox" className="form-checkbox" defaultChecked />
                                        <span className="text-white-dark relative checked:bg-none ltr:ml-2 rtl:mr-2">Manage Suppliers</span>
                                    </label>
                                </div>
                                <div className="space-y-3">
                                    <label className="inline-flex cursor-pointer">
                                        <input type="checkbox" className="form-checkbox" defaultChecked />
                                        <span className="text-white-dark relative checked:bg-none ltr:ml-2 rtl:mr-2">View Reports</span>
                                    </label>
                                </div>
                                <div className="space-y-3">
                                    <label className="inline-flex cursor-pointer">
                                        <input type="checkbox" className="form-checkbox" />
                                        <span className="text-white-dark relative checked:bg-none ltr:ml-2 rtl:mr-2">Approve Payments</span>
                                    </label>
                                </div>
                            </div>
                        </form>
                    </div>
                ) : (
                    ''
                )}
                {tabs === 'payment-details' ? (
                    <div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                            <div className="panel">
                                <div className="mb-5">
                                    <h5 className="font-semibold text-lg mb-4">Supplier Payment Addresses</h5>
                                    <p>
                                        Manage <span className="text-primary">supplier payment</span> addresses and financial contact information for procurement transactions.
                                    </p>
                                </div>
                                <div className="mb-5">
                                    <div className="border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                        <div className="flex items-start justify-between py-3">
                                            <h6 className="text-[#515365] font-bold dark:text-white-dark text-[15px]">
                                                Office #1
                                                <span className="block text-white-dark dark:text-white-light font-normal text-xs mt-1">123 Main Street, Kingston, Jamaica</span>
                                            </h6>
                                            <div className="flex items-start justify-between ltr:ml-auto rtl:mr-auto">
                                                <button className="btn btn-dark">Edit</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                        <div className="flex items-start justify-between py-3">
                                            <h6 className="text-[#515365] font-bold dark:text-white-dark text-[15px]">
                                                Warehouse #2
                                                <span className="block text-white-dark dark:text-white-light font-normal text-xs mt-1">45 Industrial Park, Portmore, Jamaica</span>
                                            </h6>
                                            <div className="flex items-start justify-between ltr:ml-auto rtl:mr-auto">
                                                <button className="btn btn-dark">Edit</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-start justify-between py-3">
                                            <h6 className="text-[#515365] font-bold dark:text-white-dark text-[15px]">
                                                Finance Dept.
                                                <span className="block text-white-dark dark:text-white-light font-normal text-xs mt-1">78 Business District, New Kingston, Jamaica</span>
                                            </h6>
                                            <div className="flex items-start justify-between ltr:ml-auto rtl:mr-auto">
                                                <button className="btn btn-dark">Edit</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button className="btn btn-primary">Add Delivery Address</button>
                            </div>
                            <div className="panel">
                                <div className="mb-5">
                                    <h5 className="font-semibold text-lg mb-4">Recent Purchase Orders</h5>
                                    <p>
                                        View your recent <span className="text-primary">Purchase Orders</span> and payment processing status for procurement activities.
                                    </p>
                                </div>
                                <div className="mb-5">
                                    <div className="border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                        <div className="flex items-start justify-between py-3">
                                            <div className="flex-none ltr:mr-4 rtl:ml-4">
                                                <span className="badge bg-success">Paid</span>
                                            </div>
                                            <h6 className="text-[#515365] font-bold dark:text-white-dark text-[15px]">
                                                PO-2024-098
                                                <span className="block text-white-dark dark:text-white-light font-normal text-xs mt-1">Office Furniture - $15,240</span>
                                            </h6>
                                            <div className="flex items-start justify-between ltr:ml-auto rtl:mr-auto">
                                                <button className="btn btn-dark">View</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="border-b border-[#ebedf2] dark:border-[#1b2e4b]">
                                        <div className="flex items-start justify-between py-3">
                                            <div className="flex-none ltr:mr-4 rtl:ml-4">
                                                <span className="badge bg-warning">Pending</span>
                                            </div>
                                            <h6 className="text-[#515365] font-bold dark:text-white-dark text-[15px]">
                                                PO-2024-099
                                                <span className="block text-white-dark dark:text-white-light font-normal text-xs mt-1">IT Equipment - $22,100</span>
                                            </h6>
                                            <div className="flex items-start justify-between ltr:ml-auto rtl:mr-auto">
                                                <button className="btn btn-dark">View</button>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-start justify-between py-3">
                                            <div className="flex-none ltr:mr-4 rtl:ml-4">
                                                <span className="badge bg-info">Processing</span>
                                            </div>
                                            <h6 className="text-[#515365] font-bold dark:text-white-dark text-[15px]">
                                                PO-2024-100
                                                <span className="block text-white-dark dark:text-white-light font-normal text-xs mt-1">Janitorial Supplies - $3,450</span>
                                            </h6>
                                            <div className="flex items-start justify-between ltr:ml-auto rtl:mr-auto">
                                                <button className="btn btn-dark">View</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <Link to="/procurement/purchase-orders" className="btn btn-primary">View All Purchase Orders</Link>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <div className="panel">
                                <div className="mb-5">
                                    <h5 className="font-semibold text-lg mb-4">Add Delivery Address</h5>
                                    <p>
                                        Add a new <span className="text-primary">delivery location</span> for procurement shipments.
                                    </p>
                                </div>
                                <div className="mb-5">
                                    <form>
                                        <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="billingName">Name</label>
                                                <input id="billingName" type="text" placeholder="Enter Name" className="form-input" />
                                            </div>
                                            <div>
                                                <label htmlFor="billingEmail">Email</label>
                                                <input id="billingEmail" type="email" placeholder="Enter Email" className="form-input" />
                                            </div>
                                        </div>
                                        <div className="mb-5">
                                            <label htmlFor="billingAddress">Address</label>
                                            <input id="billingAddress" type="text" placeholder="Enter Address" className="form-input" />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-5">
                                            <div className="md:col-span-2">
                                                <label htmlFor="billingCity">City</label>
                                                <input id="billingCity" type="text" placeholder="Enter City" className="form-input" />
                                            </div>
                                            <div>
                                                <label htmlFor="billingState">State</label>
                                                <select id="billingState" className="form-select text-white-dark">
                                                    <option>Choose...</option>
                                                    <option>...</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label htmlFor="billingZip">Zip</label>
                                                <input id="billingZip" type="text" placeholder="Enter Zip" className="form-input" />
                                            </div>
                                        </div>
                                        <button type="button" className="btn btn-primary">
                                            Add
                                        </button>
                                    </form>
                                </div>
                            </div>
                            <div className="panel">
                                <div className="mb-5">
                                    <h5 className="font-semibold text-lg mb-4">Supplier Contact Information</h5>
                                    <p>
                                        Add <span className="text-primary">supplier contact</span> details for procurement communication.
                                    </p>
                                </div>
                                <div className="mb-5">
                                    <form>
                                        <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="supplierName">Supplier Name</label>
                                                <input id="supplierName" type="text" placeholder="Enter Supplier Name" className="form-input" />
                                            </div>
                                            <div>
                                                <label htmlFor="supplierEmail">Contact Email</label>
                                                <input id="supplierEmail" type="email" placeholder="Enter Email" className="form-input" />
                                            </div>
                                        </div>
                                        <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="supplierPhone">Phone Number</label>
                                                <input id="supplierPhone" type="text" placeholder="Enter Phone" className="form-input" />
                                            </div>
                                            <div>
                                                <label htmlFor="category">Category</label>
                                                <select id="category" className="form-select text-white-dark">
                                                    <option>Office Supplies</option>
                                                    <option>IT Equipment</option>
                                                    <option>Furniture</option>
                                                    <option>Janitorial</option>
                                                    <option>Services</option>
                                                </select>
                                            </div>
                                        </div>
                                        <button type="button" className="btn btn-primary">
                                            Add Supplier
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    ''
                )}
                {tabs === 'preferences' ? (
                    <div className="switch">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
                            <div className="panel space-y-5">
                                <h5 className="font-semibold text-lg mb-4">Choose Theme</h5>
                                <div className="flex justify-around">
                                    <div className="flex">
                                        <label className="inline-flex cursor-pointer">
                                            <input className="form-radio ltr:mr-4 rtl:ml-4 cursor-pointer" type="radio" name="flexRadioDefault" defaultChecked />
                                            <span>
                                                <img className="ms-3" width="100" height="68" alt="settings-dark" src="/assets/images/settings-light.svg" />
                                            </span>
                                        </label>
                                    </div>

                                    <label className="inline-flex cursor-pointer">
                                        <input className="form-radio ltr:mr-4 rtl:ml-4 cursor-pointer" type="radio" name="flexRadioDefault" />
                                        <span>
                                            <img className="ms-3" width="100" height="68" alt="settings-light" src="/assets/images/settings-dark.svg" />
                                        </span>
                                    </label>
                                </div>
                            </div>
                            <div className="panel space-y-5">
                                <h5 className="font-semibold text-lg mb-4">Activity Data Export</h5>
                                <p>Download your Procurement Activity, RFQs, Purchase Orders, and Evaluation History Data</p>
                                <button type="button" className="btn btn-primary">
                                    Download Procurement Data
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="panel space-y-5">
                                <h5 className="font-semibold text-lg mb-4">Public Profile</h5>
                                <p>
                                    Your <span className="text-primary">Profile</span> will be visible to anyone on the network.
                                </p>
                                <label className="w-12 h-6 relative">
                                    <input type="checkbox" className="custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer peer" id="custom_switch_checkbox1" />
                                    <span className="bg-[#ebedf2] dark:bg-dark block h-full rounded-full before:absolute before:left-1 before:bg-white dark:before:bg-white-dark dark:peer-checked:before:bg-white before:bottom-1 before:w-4 before:h-4 before:rounded-full peer-checked:before:left-7 peer-checked:bg-primary before:transition-all before:duration-300"></span>
                                </label>
                            </div>
                            <div className="panel space-y-5">
                                <h5 className="font-semibold text-lg mb-4">Show my email</h5>
                                <p>
                                    Your <span className="text-primary">Email</span> will be visible to anyone on the network.
                                </p>
                                <label className="w-12 h-6 relative">
                                    <input type="checkbox" className="custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer peer" id="custom_switch_checkbox2" />
                                    <span className="bg-[#ebedf2] dark:bg-dark block h-full rounded-full before:absolute before:left-1 before:bg-white  dark:before:bg-white-dark dark:peer-checked:before:bg-white before:bottom-1 before:w-4 before:h-4 before:rounded-full peer-checked:before:left-7 peer-checked:bg-primary before:transition-all before:duration-300"></span>
                                </label>
                            </div>
                            <div className="panel space-y-5">
                                <h5 className="font-semibold text-lg mb-4">Enable Procurement Notifications</h5>
                                <p>
                                    Receive alerts for <span className="text-primary">RFQ updates</span>, quote submissions, and approval requests.
                                </p>
                                <label className="w-12 h-6 relative">
                                    <input type="checkbox" className="custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer peer" id="custom_switch_checkbox3" defaultChecked />
                                    <span className="bg-[#ebedf2] dark:bg-dark block h-full rounded-full before:absolute before:left-1 before:bg-white  dark:before:bg-white-dark dark:peer-checked:before:bg-white before:bottom-1 before:w-4 before:h-4 before:rounded-full peer-checked:before:left-7 peer-checked:bg-primary before:transition-all before:duration-300"></span>
                                </label>
                            </div>
                            <div className="panel space-y-5">
                                <h5 className="font-semibold text-lg mb-4">Hide left navigation</h5>
                                <p>
                                    Sidebar will be <span className="text-primary">hidden</span> by default
                                </p>
                                <label className="w-12 h-6 relative">
                                    <input type="checkbox" className="custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer peer" id="custom_switch_checkbox4" />
                                    <span className="bg-[#ebedf2] dark:bg-dark block h-full rounded-full before:absolute before:left-1 before:bg-white  dark:before:bg-white-dark dark:peer-checked:before:bg-white before:bottom-1 before:w-4 before:h-4 before:rounded-full peer-checked:before:left-7 peer-checked:bg-primary before:transition-all before:duration-300"></span>
                                </label>
                            </div>
                            <div className="panel space-y-5">
                                <h5 className="font-semibold text-lg mb-4">Auto-Approve Low-Value Items</h5>
                                <p>
                                    Automatically approve RFQs under <span className="text-primary">$1,000</span>
                                </p>
                                <label className="w-12 h-6 relative">
                                    <input type="checkbox" className="custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer peer" id="custom_switch_checkbox5" />
                                    <span className="bg-[#ebedf2] dark:bg-dark block h-full rounded-full before:absolute before:left-1 before:bg-white  dark:before:bg-white-dark dark:peer-checked:before:bg-white before:bottom-1 before:w-4 before:h-4 before:rounded-full peer-checked:before:left-7 peer-checked:bg-primary before:transition-all before:duration-300"></span>
                                </label>
                            </div>
                            <div className="panel space-y-5">
                                <h5 className="font-semibold text-lg mb-4">Supplier Email Notifications</h5>
                                <p>
                                    Send automatic email updates to <span className="text-primary">suppliers</span> on RFQ changes
                                </p>
                                <label className="w-12 h-6 relative">
                                    <input type="checkbox" className="custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer peer" id="custom_switch_checkbox6" defaultChecked />
                                    <span className="bg-[#ebedf2] dark:bg-dark block h-full rounded-full before:absolute before:left-1 before:bg-white  dark:before:bg-white-dark dark:peer-checked:before:bg-white before:bottom-1 before:w-4 before:h-4 before:rounded-full peer-checked:before:left-7 peer-checked:bg-primary before:transition-all before:duration-300"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                ) : (
                    ''
                )}
                {tabs === 'danger-zone' ? (
                    <div className="switch">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="panel space-y-5">
                                <h5 className="font-semibold text-lg mb-4">Clear Procurement Cache</h5>
                                <p>Remove cached RFQ data, supplier information, and reports to improve system performance.</p>
                                <button className="btn btn-secondary">Clear Cache</button>
                            </div>
                            <div className="panel space-y-5">
                                <h5 className="font-semibold text-lg mb-4">Deactivate Account</h5>
                                <p>You will not be able to receive messages, notifications for up to 24 hours.</p>
                                <label className="w-12 h-6 relative">
                                    <input type="checkbox" className="custom_switch absolute w-full h-full opacity-0 z-10 cursor-pointer peer" id="custom_switch_checkbox7" />
                                    <span className="bg-[#ebedf2] dark:bg-dark block h-full rounded-full before:absolute before:left-1 before:bg-white dark:before:bg-white-dark dark:peer-checked:before:bg-white before:bottom-1 before:w-4 before:h-4 before:rounded-full peer-checked:before:left-7 peer-checked:bg-primary before:transition-all before:duration-300"></span>
                                </label>
                            </div>
                            <div className="panel space-y-5">
                                <h5 className="font-semibold text-lg mb-4">Delete Account</h5>
                                <p>Once you delete the account, there is no going back. Please be certain.</p>
                                <button className="btn btn-danger btn-delete-account">Delete my account</button>
                            </div>
                        </div>
                    </div>
                ) : (
                    ''
                )}
            </div>
        </div>
    );
};

export default AccountSetting;
