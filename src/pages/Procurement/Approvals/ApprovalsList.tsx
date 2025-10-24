import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../../store/themeConfigSlice';

const ApprovalsList = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('Pending Approvals'));
    });

    return (
        <div>
            <h2 className="mb-6 text-xl font-bold">Pending Approvals</h2>
            <div className="panel">
                <p>Approval workflow page - Coming soon</p>
            </div>
        </div>
    );
};

export default ApprovalsList;
