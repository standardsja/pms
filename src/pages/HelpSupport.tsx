import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { setPageTitle } from '../store/themeConfigSlice';
import { useDispatch } from 'react-redux';
import IconMail from '../components/Icon/IconMail';
import IconPhone from '../components/Icon/IconPhone';
import IconInfoCircle from '../components/Icon/IconInfoCircle';
import IconFile from '../components/Icon/IconFile';
import IconShoppingCart from '../components/Icon/IconShoppingCart';
import IconTag from '../components/Icon/IconTag';
import IconClipboardText from '../components/Icon/IconClipboardText';
import IconCreditCard from '../components/Icon/IconCreditCard';
import IconUser from '../components/Icon/IconUser';
import IconSearch from '../components/Icon/IconSearch';

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

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            <div className="container mx-auto px-6 py-12 max-w-7xl">
                <div className="pt-5">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-semibold text-gray-900 dark:text-white mb-3">Help & Support Center</h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">Find answers to common questions and get assistance with SPINX Enterprise Platform</p>
                    </div>

                    {/* Contact Support */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                        <div className="panel hover:shadow-lg transition-shadow duration-300">
                            <div className="flex items-center mb-5">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-900/20 text-primary">
                                    <IconMail className="h-6 w-6" />
                                </div>
                                <h5 className="text-lg font-semibold ltr:ml-3 rtl:mr-3 text-gray-900 dark:text-white">Email Support</h5>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 mb-3">Get help via email from our support team</p>
                            <a href="mailto:support@bsj.gov.jm" className="text-primary hover:text-primary/80 font-medium transition-colors">
                                support@bsj.gov.jm
                            </a>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Response within 24 hours</p>
                        </div>

                        <div className="panel hover:shadow-lg transition-shadow duration-300">
                            <div className="flex items-center mb-5">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-success">
                                    <IconPhone className="h-6 w-6" />
                                </div>
                                <h5 className="text-lg font-semibold ltr:ml-3 rtl:mr-3 text-gray-900 dark:text-white">Phone Support</h5>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 mb-3">Call us for urgent assistance</p>
                            <a href="tel:+18769265140" className="text-success hover:text-success/80 font-medium transition-colors">
                                +1 (876) 926-5140
                            </a>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Mon-Fri: 8:00 AM - 4:30 PM</p>
                        </div>

                        <div className="panel hover:shadow-lg transition-shadow duration-300">
                            <div className="flex items-center mb-5">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/20 text-info">
                                    <IconInfoCircle className="h-6 w-6" />
                                </div>
                                <h5 className="text-lg font-semibold ltr:ml-3 rtl:mr-3 text-gray-900 dark:text-white">IT Help Desk</h5>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 mb-3">Technical issues and system access</p>
                            <a href="mailto:it@bsj.gov.jm" className="text-info hover:text-info/80 font-medium transition-colors">
                                it@bsj.gov.jm
                            </a>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Internal Extension Available</p>
                        </div>
                    </div>

                    {/* Search FAQs */}
                    <div className="panel mb-8 shadow-sm">
                        <h5 className="text-xl font-semibold mb-5 text-gray-900 dark:text-white">Search Knowledge Base</h5>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search for answers..."
                                className="form-input ltr:pl-12 rtl:pr-12 h-12 text-base"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <div className="absolute top-1/2 -translate-y-1/2 ltr:left-4 rtl:right-4">
                                <IconSearch className="text-gray-400 w-5 h-5" />
                            </div>
                        </div>
                    </div>

                    {/* FAQs */}
                    <div className="panel shadow-sm">
                        <h5 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Frequently Asked Questions</h5>
                        {filteredFaqs.length === 0 ? (
                            <div className="text-center py-10">
                                <IconInfoCircle className="w-16 h-16 mx-auto text-white-dark mb-4" />
                                <p className="text-white-dark">No FAQs found matching your search.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredFaqs.map((faq) => (
                                    <div key={faq.id} className="border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                                        <button
                                            type="button"
                                            className={`p-5 w-full flex items-center font-medium hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors ${
                                                activeAccordion === faq.id ? 'bg-gray-50 dark:bg-gray-800/50' : ''
                                            }`}
                                            onClick={() => toggleAccordion(faq.id)}
                                        >
                                            <div className="flex items-center gap-4 flex-1 text-left">
                                                <div className="text-primary dark:text-blue-400">{faq.icon}</div>
                                                <div className="flex-1">
                                                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">{faq.category}</div>
                                                    <div className="text-gray-900 dark:text-white font-medium">{faq.question}</div>
                                                </div>
                                            </div>
                                            <div className={`ltr:ml-4 rtl:mr-4 transition-transform duration-200 text-gray-400 ${activeAccordion === faq.id ? 'rotate-180' : ''}`}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M19 9L12 15L5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </div>
                                        </button>
                                        {activeAccordion === faq.id && (
                                            <div className="px-5 pb-5 pt-2">
                                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{faq.answer}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* System Status */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                        <div className="panel shadow-sm">
                            <h5 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">System Status</h5>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">Procurement System</span>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium rounded-full">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                        Operational
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">Innovation Hub</span>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium rounded-full">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                        Operational
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">Email Notifications</span>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium rounded-full">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                        Operational
                                    </span>
                                </div>
                                <div className="flex items-center justify-between py-2">
                                    <span className="text-gray-700 dark:text-gray-300 font-medium">Report Generation</span>
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium rounded-full">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                        Operational
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="panel shadow-sm">
                            <h5 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Need More Help?</h5>
                            <div className="space-y-4">
                                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">If you can't find the answer you're looking for, our support team is ready to assist you.</p>
                                <button type="button" className="btn btn-primary w-full h-11 font-medium">
                                    Submit a Support Ticket
                                </button>
                                <a href="mailto:support@bsj.gov.jm?subject=Training Request - SPINX Enterprise Platform" className="btn btn-outline-primary w-full h-11 font-medium">
                                    Request System Training
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HelpSupport;
