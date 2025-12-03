import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconArrowLeft from '../../../components/Icon/IconArrowLeft';

const NewSupplier = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        dispatch(setPageTitle('Add New Supplier'));
    });

    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [contactName, setContactName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [website, setWebsite] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const [modal, setModal] = useState<{ open: boolean; title: string; message: string; tone: 'success' | 'warning' }>(
        { open: false, title: '', message: '', tone: 'success' }
    );

    const openModal = (tone: 'success' | 'warning', title: string, message: string) => setModal({ open: true, title, message, tone });
    const closeModal = () => setModal({ open: false, title: '', message: '', tone: 'success' });

    const validate = () => name.trim() && email.trim();

    const handleCreate = async () => {
        if (!validate()) {
            openModal('warning', 'Missing Information', 'Please fill in Supplier Name and Email.');
            return;
        }

        try {
            setLoading(true);

            const token = localStorage.getItem('token');
            const userId = localStorage.getItem('userId');

            const response = await fetch('http://heron:4000/api/suppliers', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    'x-user-id': userId || '',
                },
                body: JSON.stringify({
                    name,
                    email,
                    contact: {
                        name: contactName,
                        email,
                        phone,
                        category,
                    },
                    address,
                    website,
                    category,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to create supplier');
            }

            openModal('success', 'Supplier Created', 'The supplier has been added successfully.');
            setTimeout(() => {
                closeModal();
                navigate('/procurement/suppliers');
            }, 800);
        } catch (err) {
            console.error('Error creating supplier:', err);
            openModal('warning', 'Error', err instanceof Error ? err.message : 'Failed to create supplier');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold">Add Supplier</h2>
                    <p className="text-white-dark">Create a new supplier profile</p>
                </div>
                <Link to="/procurement/suppliers" className="btn btn-outline-danger gap-2">
                    <IconArrowLeft />
                    Back to List
                </Link>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">Basic Information</h5>
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1 block text-white-dark">
                                Supplier Name <span className="text-danger">*</span>
                            </label>
                            <input className="form-input" placeholder="e.g. Tech Solutions Inc" value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                        <div>
                            <label className="mb-1 block text-white-dark">Category</label>
                            <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                                <option value="">Select Category</option>
                                <option value="Office Supplies">Office Supplies</option>
                                <option value="IT Equipment">IT Equipment</option>
                                <option value="Office Furniture">Office Furniture</option>
                                <option value="Cleaning Services">Cleaning Services</option>
                                <option value="Construction">Construction</option>
                                <option value="General">General</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-white-dark">Website</label>
                            <input type="url" className="form-input" placeholder="https://supplier.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">Contact Details</h5>
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1 block text-white-dark">Contact Person</label>
                            <input className="form-input" placeholder="e.g. Jane Doe" value={contactName} onChange={(e) => setContactName(e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-white-dark">
                                Email <span className="text-danger">*</span>
                            </label>
                            <input
                                type="email"
                                className="form-input"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                            <p className="mt-1 text-xs text-white-dark">This email will be used for PO notifications</p>
                        </div>
                        <div>
                            <label className="mb-1 block text-white-dark">Phone</label>
                            <input className="form-input" placeholder="+1-555-0123" value={phone} onChange={(e) => setPhone(e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-white-dark">Address</label>
                            <textarea className="form-textarea" rows={3} placeholder="Street, City, Country" value={address} onChange={(e) => setAddress(e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-white-dark">Notes</label>
                            <textarea className="form-textarea" rows={2} placeholder="Optional notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
                <button className="btn btn-primary" onClick={handleCreate} disabled={loading}>
                    {loading ? (
                        <>
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-l-transparent"></span>
                            <span className="ml-2">Creating...</span>
                        </>
                    ) : (
                        'Create Supplier'
                    )}
                </button>
                <Link to="/procurement/suppliers" className="btn btn-outline-danger">
                    Cancel
                </Link>
            </div>

            {modal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
                        <div className={`mb-3 text-lg font-semibold ${modal.tone === 'success' ? 'text-success' : 'text-warning'}`}>{modal.title}</div>
                        <div className="text-white-dark">{modal.message}</div>
                        <div className="mt-5 text-right">
                            <button className={`btn ${modal.tone === 'success' ? 'btn-success' : 'bg-warning text-white hover:opacity-90'}`} onClick={closeModal}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NewSupplier;
