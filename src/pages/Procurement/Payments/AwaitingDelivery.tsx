import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';
import IconInbox from '../../../components/Icon/IconInbox';
import { Link } from 'react-router-dom';

interface PaymentItem {
  id: number;
  poNumber: string;
  supplier: string;
  amount: number;
  delivered: boolean;
  deliveredAt?: string;
  confirmedBy?: string;
  paid: boolean;
}

const AwaitingDelivery = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setPageTitle('Awaiting Delivery Confirmation'));
  }, [dispatch]);

  const [items, setItems] = useState<PaymentItem[]>([
    { id: 1, poNumber: 'PO-2025-014', supplier: 'ABC Corp', amount: 15240, delivered: false, paid: false },
    { id: 2, poNumber: 'PO-2025-015', supplier: 'XYZ Supplies', amount: 9800, delivered: true, deliveredAt: '2025-10-30', confirmedBy: 'Stores', paid: false },
    { id: 3, poNumber: 'PO-2025-016', supplier: 'Office Pro', amount: 4320, delivered: true, deliveredAt: '2025-10-29', confirmedBy: 'Stores', paid: true },
  ]);

  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [deliverWho, setDeliverWho] = useState('Stores');
  const [deliverDate, setDeliverDate] = useState('');
  const [activeDeliverId, setActiveDeliverId] = useState<number | null>(null);

  const awaiting = items.filter((i) => !i.delivered && !i.paid);

  const openDeliveryConfirm = (id: number) => {
    setActiveDeliverId(id);
    setDeliverDate('');
    setDeliverWho('Stores');
    setShowDeliverModal(true);
  };

  const confirmDelivery = () => {
    if (!activeDeliverId) return;
    const date = deliverDate || new Date().toISOString().slice(0, 10);
    setItems((prev) => prev.map((it) => (it.id === activeDeliverId ? { ...it, delivered: true, deliveredAt: date, confirmedBy: deliverWho } : it)));
    setShowDeliverModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Awaiting Delivery Confirmation</h2>
        <Link to="/finance" className="text-primary hover:text-primary-dark">Back to Finance Dashboard</Link>
      </div>

      <div className="panel">
        <div className="mb-5 flex items-center justify-between">
          <h5 className="text-lg font-semibold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-info/10 text-info mr-2"><IconInbox className="h-4 w-4"/></span>
            Awaiting Delivery Confirmation
          </h5>
        </div>
        {awaiting.length === 0 ? (
          <div className="text-sm text-white-dark">No items awaiting confirmation.</div>
        ) : (
          <div className="table-responsive">
            <table className="table-hover">
              <thead>
                <tr>
                  <th>PO #</th>
                  <th>Supplier</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {awaiting.map((i) => (
                  <tr key={i.id}>
                    <td>{i.poNumber}</td>
                    <td>{i.supplier}</td>
                    <td className="font-semibold text-primary">${i.amount.toLocaleString()}</td>
                    <td>
                      <button className="btn btn-sm btn-info" onClick={() => openDeliveryConfirm(i.id)}>Mark Delivered</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Delivery Modal */}
      {showDeliverModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60">
          <div className="panel w-full max-w-xl">
            <div className="mb-5 flex items-center justify-between">
              <h5 className="text-xl font-semibold">Confirm Delivery</h5>
              <button onClick={() => setShowDeliverModal(false)} className="text-white-dark hover:text-dark">×</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold mb-2">Confirmed By</label>
                <input type="text" className="form-input" value={deliverWho} onChange={(e) => setDeliverWho(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Delivery Date</label>
                <input type="date" className="form-input" value={deliverDate} onChange={(e) => setDeliverDate(e.target.value)} />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button onClick={() => setShowDeliverModal(false)} className="btn btn-outline-danger">Cancel</button>
              <button onClick={confirmDelivery} className="btn btn-info">Mark Delivered</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AwaitingDelivery;