import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { setPageTitle } from '../../store/themeConfigSlice';
import { useDispatch } from 'react-redux';
import IconMail from '../../components/Icon/IconMail';
import IconPhone from '../../components/Icon/IconPhone';
import IconInfoCircle from '../../components/Icon/IconInfoCircle';
import IconFile from '../../components/Icon/IconFile';
import IconShoppingCart from '../../components/Icon/IconShoppingCart';
import IconTag from '../../components/Icon/IconTag';
import IconClipboardText from '../../components/Icon/IconClipboardText';
import IconCreditCard from '../../components/Icon/IconCreditCard';
import IconUser from '../../components/Icon/IconUser';
import IconSearch from '../../components/Icon/IconSearch';

const HelpSupport = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Help & Support'));
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [activeAccordion, setActiveAccordion] = useState<number | null>(1);

    const toggleAccordion = (index: number) => {
        setActiveAccordion(activeAccordion === index ? null : index);
    };

    const faqs = [
        {
            id: 1,
            icon: <IconShoppingCart className="w-5 h-5" />,
            category: 'RFQ Management',
            question: 'How do I create a new RFQ?',
            answer: 'Navigate to Procurement > RFQ Management and click the "Create New RFQ" button. Fill in the required details including item description, quantity, delivery date, and specifications. You can add multiple items to a single RFQ. Once completed, submit for approval.',
        },
        {
            id: 2,
            icon: <IconShoppingCart className="w-5 h-5" />,
            category: 'RFQ Management',
            question: 'Can I edit an RFQ after submission?',
            answer: 'Yes, you can edit RFQs that are in "Draft" status. Once an RFQ is submitted for approval or published to suppliers, you will need to request cancellation and create a new RFQ with the updated information.',
        },
        {
            id: 3,
            icon: <IconTag className="w-5 h-5" />,
            category: 'Quote Management',
            question: 'How long do suppliers have to submit quotes?',
            answer: 'The quote submission deadline is set when creating the RFQ. Standard practice is 5-10 business days, but this can be adjusted based on complexity and urgency. Suppliers can see the deadline in their portal.',
        },
        {
            id: 4,
            icon: <IconTag className="w-5 h-5" />,
            category: 'Quote Management',
            question: 'What if I receive no quotes?',
            answer: 'If no quotes are received by the deadline, you can extend the deadline, invite additional suppliers, or revise the RFQ specifications. Contact the Procurement Manager for assistance with non-responsive suppliers.',
        },
        {
            id: 5,
            icon: <IconClipboardText className="w-5 h-5" />,
            category: 'Evaluation Process',
            question: 'What criteria should I use for evaluation?',
            answer: 'Evaluate quotes based on: Price (weighted 40%), Quality/Specifications (30%), Delivery Time (15%), Supplier Rating (10%), and Payment Terms (5%). You can adjust these weights based on specific procurement needs.',
        },
        {
            id: 6,
            icon: <IconClipboardText className="w-5 h-5" />,
            category: 'Evaluation Process',
            question: 'Can multiple officers evaluate the same quotes?',
            answer: 'Yes, for high-value procurements (over $10,000), collaborative evaluation is recommended. Each officer can submit their evaluation independently, and the system will average the scores.',
        },
        {
            id: 7,
            icon: <IconCreditCard className="w-5 h-5" />,
            category: 'Purchase Orders',
            question: 'How do I generate a Purchase Order?',
            answer: 'After quote evaluation and approval, go to the approved evaluation and click "Generate PO". The system will auto-populate supplier and item details. Review, add any special terms, and submit for final approval.',
        },
        {
            id: 8,
            icon: <IconCreditCard className="w-5 h-5" />,
            category: 'Purchase Orders',
            question: 'What is the PO approval process?',
            answer: 'POs under $5,000 require Procurement Manager approval. POs $5,000-$25,000 require Finance Director approval. POs over $25,000 require Executive approval. You can track approval status in the PO dashboard.',
        },
        {
            id: 9,
            icon: <IconUser className="w-5 h-5" />,
            category: 'Supplier Management',
            question: 'How do I add a new supplier?',
            answer: 'Go to Procurement > Suppliers > Add New Supplier. Enter company details, contact information, and upload required documents (business registration, tax compliance certificate). New suppliers undergo verification before activation.',
        },
        {
            id: 10,
            icon: <IconUser className="w-5 h-5" />,
            category: 'Supplier Management',
            question: 'How are supplier ratings calculated?',
            answer: 'Supplier ratings are based on: On-time delivery (40%), Quality compliance (30%), Responsiveness (20%), and Pricing competitiveness (10%). Ratings are updated after each completed order.',
        },
    ];

    const filteredFaqs = faqs.filter(
        (faq) =>
            faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const quickLinks = [
        { title: 'RFQ Quick Guide', icon: <IconFile />, link: '/procurement/rfq/list' },
        { title: 'Supplier Directory', icon: <IconUser />, link: '/procurement/suppliers' },
        { title: 'Evaluation Templates', icon: <IconClipboardText />, link: '/procurement/evaluation' },
        { title: 'PO Templates', icon: <IconCreditCard />, link: '/procurement/purchase-orders' },
        { title: 'Procurement Policies', icon: <IconInfoCircle />, link: '#' },
        { title: 'Training Videos', icon: <IconInfoCircle />, link: '#' },
    ];

    return (
        <div>
            <ul className="flex space-x-2 rtl:space-x-reverse">
                <li>
                    <Link to="/" className="text-primary hover:underline">
                        Dashboard
                    </Link>
                </li>
                <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
                    <span>Help & Support</span>
                </li>
            </ul>

            <div className="pt-5">
                {/* Header */}
                <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2">Help & Support Center</h2>
                    <p className="text-white-dark">Find answers to common questions and get assistance with the Smart Portal for Information Exchange</p>
                </div>

                {/* Contact Support */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                    <div className="panel">
                        <div className="flex items-center mb-5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <IconMail className="h-5 w-5" />
                            </div>
                            <h5 className="text-lg font-semibold ltr:ml-3 rtl:mr-3">Email Support</h5>
                        </div>
                        <p className="text-white-dark mb-3">Get help via email from our support team</p>
                        <a href="mailto:procurement.support@company.com" className="text-primary hover:underline font-semibold">
                            procurement.support@company.com
                        </a>
                        <p className="text-xs text-white-dark mt-2">Response within 24 hours</p>
                    </div>

                    <div className="panel">
                        <div className="flex items-center mb-5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
                                <IconPhone className="h-5 w-5" />
                            </div>
                            <h5 className="text-lg font-semibold ltr:ml-3 rtl:mr-3">Phone Support</h5>
                        </div>
                        <p className="text-white-dark mb-3">Call us for urgent assistance</p>
                        <a href="tel:+18765551234" className="text-success hover:underline font-semibold">
                            +1 (876) 555-1234
                        </a>
                        <p className="text-xs text-white-dark mt-2">Mon-Fri: 8:00 AM - 5:00 PM</p>
                    </div>

                    <div className="panel">
                        <div className="flex items-center mb-5">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10 text-info">
                                <IconInfoCircle className="h-5 w-5" />
                            </div>
                            <h5 className="text-lg font-semibold ltr:ml-3 rtl:mr-3">IT Help Desk</h5>
                        </div>
                        <p className="text-white-dark mb-3">Technical issues and system access</p>
                        <a href="mailto:helpdesk@company.com" className="text-info hover:underline font-semibold">
                            helpdesk@company.com
                        </a>
                        <p className="text-xs text-white-dark mt-2">Ext: 2500</p>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="panel mb-6">
                    <h5 className="text-lg font-semibold mb-5">Quick Access Resources</h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {quickLinks.map((item, index) => (
                            <Link
                                key={index}
                                to={item.link}
                                className="flex flex-col items-center justify-center p-4 border border-white-light dark:border-white-light/10 rounded-lg hover:border-primary hover:shadow-lg transition-all"
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
                                    {item.icon}
                                </div>
                                <span className="text-center text-sm font-semibold">{item.title}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Search FAQs */}
                <div className="panel mb-6">
                    <h5 className="text-lg font-semibold mb-5">Search Frequently Asked Questions</h5>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search for answers..."
                            className="form-input ltr:pl-10 rtl:pr-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <div className="absolute top-1/2 -translate-y-1/2 ltr:left-3 rtl:right-3">
                            <IconSearch className="text-white-dark" />
                        </div>
                    </div>
                </div>

                {/* FAQs */}
                <div className="panel">
                    <h5 className="text-lg font-semibold mb-5">Frequently Asked Questions</h5>
                    {filteredFaqs.length === 0 ? (
                        <div className="text-center py-10">
                            <IconInfoCircle className="w-16 h-16 mx-auto text-white-dark mb-4" />
                            <p className="text-white-dark">No FAQs found matching your search.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredFaqs.map((faq) => (
                                <div key={faq.id} className="border border-[#d3d3d3] dark:border-[#1b2e4b] rounded">
                                    <button
                                        type="button"
                                        className={`p-4 w-full flex items-center text-white-dark dark:bg-[#1b2e4b] font-semibold hover:bg-primary/10 ${
                                            activeAccordion === faq.id ? '!bg-primary text-white' : ''
                                        }`}
                                        onClick={() => toggleAccordion(faq.id)}
                                    >
                                        <div className="flex items-center gap-3 flex-1 text-left">
                                            <div className={activeAccordion === faq.id ? 'text-white' : 'text-primary'}>{faq.icon}</div>
                                            <div>
                                                <div className="text-xs opacity-80 mb-1">{faq.category}</div>
                                                <div className={activeAccordion === faq.id ? 'text-white' : 'text-black dark:text-white'}>{faq.question}</div>
                                            </div>
                                        </div>
                                        <div className={`ltr:ml-auto rtl:mr-auto ${activeAccordion === faq.id ? 'rotate-180' : ''}`}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M19 9L12 15L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        </div>
                                    </button>
                                    {activeAccordion === faq.id && (
                                        <div className="p-4 text-[13px] border-t border-[#d3d3d3] dark:border-[#1b2e4b]">
                                            <p className="text-white-dark">{faq.answer}</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* System Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
                    <div className="panel">
                        <h5 className="text-lg font-semibold mb-5">System Status</h5>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-white-dark">Procurement System</span>
                                <span className="badge bg-success">Operational</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-white-dark">Supplier Portal</span>
                                <span className="badge bg-success">Operational</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-white-dark">Email Notifications</span>
                                <span className="badge bg-success">Operational</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-white-dark">Report Generation</span>
                                <span className="badge bg-success">Operational</span>
                            </div>
                        </div>
                    </div>

                    <div className="panel">
                        <h5 className="text-lg font-semibold mb-5">Need More Help?</h5>
                        <div className="space-y-4">
                            <p className="text-white-dark">
                                If you can't find the answer you're looking for, our support team is ready to assist you.
                            </p>
                            <button type="button" className="btn btn-primary w-full">
                                Submit a Support Ticket
                            </button>
                            <Link to="/procurement/admin" className="btn btn-outline-primary w-full">
                                Request System Training
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HelpSupport;
