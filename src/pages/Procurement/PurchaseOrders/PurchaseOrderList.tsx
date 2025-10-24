import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';

const PurchaseOrderList = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Purchase Orders'));
    });

    return (
        <div>
            <h2 className="mb-6 text-xl font-bold">Purchase Orders</h2>
            <div className="panel">
                <p>Purchase Order management page - Coming soon</p>
            </div>
        </div>
    );
};

export default PurchaseOrderList;
