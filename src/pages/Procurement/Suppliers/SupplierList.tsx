import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';

const SupplierList = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Supplier Management'));
    });

    return (
        <div>
            <h2 className="mb-6 text-xl font-bold">Supplier Management</h2>
            <div className="panel">
                <p>Supplier management page - Coming soon</p>
            </div>
        </div>
    );
};

export default SupplierList;
