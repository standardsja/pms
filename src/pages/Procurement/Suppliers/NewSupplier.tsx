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
    const [contact, setContact] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [address, setAddress] = useState('');
    const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
    const [rating, setRating] = useState<number>(4.0);
    const [notes, setNotes] = useState('');

    const [modal, setModal] = useState<{ open: boolean; title: string; message: string; tone: 'success' | 'warning' }>(
        { open: false, title: '', message: '', tone: 'success' }
    );

    const openModal = (tone: 'success' | 'warning', title: string, message: string) => setModal({ open: true, title, message, tone });
    const closeModal = () => setModal({ open: false, title: '', message: '', tone: 'success' });

    const validate = () => name.trim() && category.trim() && contact.trim() && email.trim();

    const handleDraft = () => {
        openModal('warning', 'Saved as Draft', 'Supplier draft saved. You can complete it later.');
    };

    const handleCreate = () => {
        if (!validate()) {
            openModal('warning', 'Missing Information', 'Please fill in Name, Category, Contact and Email.');
            return;
        }
        openModal('success', 'Supplier Created', 'The supplier has been added successfully.');
        setTimeout(() => {
            closeModal();
            navigate('/procurement/suppliers');
        }, 800);
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
                            <label className="mb-1 block text-white-dark">Supplier Name</label>
                            <input className="form-input" placeholder="e.g. Tech Solutions Inc" value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-white-dark">Category</label>
                            <input className="form-input" placeholder="e.g. IT Equipment" value={category} onChange={(e) => setCategory(e.target.value)} />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-white-dark">Status</label>
                                <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value as 'Active' | 'Inactive')}>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-white-dark">Rating</label>
                                <input type="number" min={1} max={5} step="0.1" className="form-input" value={rating} onChange={(e) => setRating(Number(e.target.value))} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="panel">
                    <h5 className="mb-5 text-lg font-semibold">Contact Details</h5>
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1 block text-white-dark">Contact Person</label>
                            <input className="form-input" placeholder="e.g. Jane Doe" value={contact} onChange={(e) => setContact(e.target.value)} />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 block text-white-dark">Email</label>
                                <input type="email" className="form-input" placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                            <div>
                                <label className="mb-1 block text-white-dark">Phone</label>
                                <input className="form-input" placeholder="+1-555-0123" value={phone} onChange={(e) => setPhone(e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <label className="mb-1 block text-white-dark">Address</label>
                            <textarea className="form-textarea" rows={3} placeholder="Street, City, Country" value={address} onChange={(e) => setAddress(e.target.value)} />
                        </div>
                        <div>
                            <label className="mb-1 block text-white-dark">Notes</label>
                            <textarea className="form-textarea" rows={3} placeholder="Optional notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
                <button className="btn bg-warning text-white hover:opacity-90" onClick={handleDraft}>Save as Draft</button>
                <button className="btn btn-primary" onClick={handleCreate}>Create Supplier</button>
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
