import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconCreditCard from '../../../components/Icon/IconCreditCard';
import { Link } from 'react-router-dom';

interface PaymentItem {
  id: number;
  poNumber: string;
  supplier: string;
  amount: number;
  delivered: boolean;
  deliveredAt?: string;
  paid: boolean;
  paidAt?: string;
  paymentMethod?: string;
  paymentRef?: string;
}

const PaymentsToProcess = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setPageTitle('Payments to Process'));
  }, [dispatch]);

  const [items, setItems] = useState<PaymentItem[]>([
    { id: 1, poNumber: 'PO-2025-014', supplier: 'ABC Corp', amount: 15240, delivered: true, deliveredAt: '2025-10-30', paid: false },
    { id: 2, poNumber: 'PO-2025-015', supplier: 'XYZ Supplies', amount: 9800, delivered: true, deliveredAt: '2025-10-30', paid: false },
    { id: 3, poNumber: 'PO-2025-016', supplier: 'Office Pro', amount: 4320, delivered: true, deliveredAt: '2025-10-29', paid: true, paidAt: '2025-10-30', paymentMethod: 'EFT', paymentRef: 'TRX-883012' },
  ]);

  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState('EFT');
  const [payRef, setPayRef] = useState('');
  const [payDate, setPayDate] = useState('');
  const [activePayId, setActivePayId] = useState<number | null>(null);

  const pending = items.filter((i) => i.delivered && !i.paid);

  const openRecordPayment = (id: number) => {
    setActivePayId(id);
    setPayMethod('EFT');
    setPayRef('');
    setPayDate('');
    setShowPayModal(true);
  };

  const recordPayment = () => {
    if (!activePayId) return;
    const date = payDate || new Date().toISOString().slice(0, 10);
    setItems((prev) => prev.map((it) => (it.id === activePayId ? { ...it, paid: true, paidAt: date, paymentMethod: payMethod, paymentRef: payRef } : it)));
    setShowPayModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Payments to Process</h2>
        <Link to="/finance" className="text-primary hover:text-primary-dark">Back to Finance Dashboard</Link>
      </div>

      <div className="panel">
        <div className="mb-5 flex items-center justify-between">
          <h5 className="text-lg font-semibold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-success/10 text-success mr-2"><IconCreditCard className="h-4 w-4"/></span>
            Payments to Process
          </h5>
        </div>
        {pending.length === 0 ? (
          <div className="text-sm text-white-dark">No payments pending processing.</div>
        ) : (
          <div className="table-responsive">
            <table className="table-hover">
              <thead>
                <tr>
                  <th>PO #</th>
                  <th>Supplier</th>
                  <th>Amount</th>
                  <th>Delivered</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((i) => (
                  <tr key={i.id}>
                    <td>{i.poNumber}</td>
                    <td>{i.supplier}</td>
                    <td className="font-semibold text-primary">${i.amount.toLocaleString()}</td>
                    <td>
                      <span className="badge bg-success">{i.deliveredAt || 'Yes'}</span>
                    </td>
                    <td>
                      <button className="btn btn-sm btn-success" onClick={() => openRecordPayment(i.id)}>Record Payment</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60">
          <div className="panel w-full max-w-xl">
            <div className="mb-5 flex items-center justify-between">
              <h5 className="text-xl font-semibold">Record Payment</h5>
              <button onClick={() => setShowPayModal(false)} className="text-white-dark hover:text-dark">×</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold mb-2">Method</label>
                <select className="form-select" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  <option value="EFT">EFT</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Card">Card</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Reference</label>
                <input className="form-input" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="e.g. TRX-12345" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Payment Date</label>
                <input type="date" className="form-input" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button onClick={() => setShowPayModal(false)} className="btn btn-outline-danger">Cancel</button>
              <button onClick={recordPayment} className="btn btn-success">Record Payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsToProcess;