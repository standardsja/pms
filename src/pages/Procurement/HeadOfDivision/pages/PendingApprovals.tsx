import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPageTitle } from '../../../../store/themeConfigSlice';
import { selectUser } from '../../../../store/authSlice';
import IconSearch from '../../../../components/Icon/IconSearch';
import IconEye from '../../../../components/Icon/IconEye';
import { Request } from '../../../../types/request.types';
import { adaptRequestsResponse, filterRequests, formatDate, searchRequests, sortRequestsByDateDesc } from '../../../../utils/requestUtils';
import { getApiUrl, getAuthHeadersSync } from '../../../../utils/api';
import { Link } from 'react-router-dom';
import { showError } from '../../../../utils/notifications';

const HODPendingApprovals: React.FC = () => {
    const dispatch = useDispatch();
    const user = useSelector(selectUser);

    const [requests, setRequests] = useState<Request[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [query, setQuery] = useState<string>('');

    useEffect(() => {
        dispatch(setPageTitle('HOD - Pending Approvals'));
    }, [dispatch]);

    useEffect(() => {
        const controller = new AbortController();
        const load = async () => {
            setLoading(true);
            try {
                const res = await fetch(getApiUrl('/api/requests'), {
                    headers: getAuthHeadersSync(),
                    signal: controller.signal,
                });
                let data: unknown = null;
                try {
                    data = await res.json();
                } catch {
                    /* noop */
                }
                if (!res.ok) {
                    const msg = (data && (data as any).message) || res.statusText || 'Failed to load requests';
                    throw new Error(String(msg));
                }
                const adapted = adaptRequestsResponse(data);
                // Filter to Pending requests and limit to HOD's department when available
                const deptName = (user?.department_name || '').trim();
                const onlyPending = filterRequests(adapted, { status: 'Pending', department: deptName || (undefined as unknown as string) });
                setRequests(sortRequestsByDateDesc(onlyPending));
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : 'Unable to load pending approvals';
                showError('Error', msg);
            } finally {
                setLoading(false);
            }
        };
        load();
        return () => controller.abort();
    }, [user?.department_name]);

    const filtered = useMemo(() => {
        const searched = searchRequests(requests, query);
        return searched;
    }, [requests, query]);

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">Pending Approvals</h1>
            </div>

            <div className="mb-4 flex items-center gap-3">
                <div className="relative w-full max-w-md">
                    <IconSearch className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by ID, Title, Requester, Dept"
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-dark dark:border-gray-600 dark:text-white"
                        aria-label="Search pending approvals"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-dark rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex justify-center items-center h-64">
                        <p className="text-gray-500 dark:text-gray-400">No pending approvals found</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead className="bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">ID</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Title</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Department</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Requester</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Status</th>
                                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Date</th>
                                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filtered.map((r) => (
                                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                                    <td className="px-6 py-4 text-sm text-blue-600 dark:text-blue-400 font-medium">{r.id}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{r.title}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{r.department}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{r.requester}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">{r.status}</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(r.date)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <Link to={`/apps/requests/edit/${r.id}`} className="inline-flex items-center gap-1 text-primary hover:text-primary/80 text-sm font-medium">
                                            <IconEye className="w-4 h-4" />
                                            Review
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default HODPendingApprovals;
