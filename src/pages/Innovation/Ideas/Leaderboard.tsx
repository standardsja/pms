import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { setPageTitle } from '../../../store/themeConfigSlice';
import { fetchLeaderboard, type LeaderboardRow } from '../../../utils/ideasApi';

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
  return <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">{initials || 'U'}</div>;
}

export default function Leaderboard() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { dispatch(setPageTitle('Innovation Leaderboard')); }, [dispatch]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchLeaderboard();
        setRows(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <ul className="flex space-x-2 rtl:space-x-reverse text-sm">
        <li>
          <Link to="/innovation/dashboard" className="text-primary hover:underline">{t('innovation.hub')}</Link>
        </li>
        <li className="before:content-['/'] ltr:before:mr-2 rtl:before:ml-2">
          <span className="font-semibold">Leaderboard</span>
        </li>
      </ul>

      <div className="panel">
        <h1 className="text-xl font-bold mb-4">Top contributors</h1>
        {loading ? (
          <div className="h-32 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
        ) : error ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Unable to Load Leaderboard</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md mx-auto">
              We encountered a problem loading the leaderboard. Please try again.
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="btn btn-primary"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-gray-500">No data yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="py-2 pr-4">Rank</th>
                  <th className="py-2 pr-4">User</th>
                  <th className="py-2 pr-4">Ideas</th>
                  <th className="py-2 pr-4">Upvotes</th>
                  <th className="py-2 pr-4">Comments</th>
                  <th className="py-2 pr-4">Points</th>
                  <th className="py-2 pr-4">Badge</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr key={r.userId} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-2 pr-4 font-medium">{idx + 1}</td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={r.name} />
                        <div>
                          <div className="font-medium">{r.name}</div>
                          <div className="text-xs text-gray-500">{r.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 pr-4">{r.ideaCount}</td>
                    <td className="py-2 pr-4">{r.upvotes}</td>
                    <td className="py-2 pr-4">{r.comments}</td>
                    <td className="py-2 pr-4 font-semibold">{r.points}</td>
                    <td className="py-2 pr-4">{r.badge ? <span className="px-2 py-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">{r.badge}</span> : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
