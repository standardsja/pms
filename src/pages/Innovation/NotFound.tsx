import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setPageTitle } from '../../store/themeConfigSlice';

const NotFound = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        dispatch(setPageTitle('Page Not Found'));
    }, [dispatch]);

    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 px-4">
            <div className="w-full max-w-4xl text-center">
                {/* 404 Illustration - Light Bulb/Innovation Theme */}
                <div className="mb-6">
                    <svg className="mx-auto h-48 w-48 text-purple-500 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                        />
                    </svg>
                </div>

                {/* Error Code */}
                <h1 className="mb-3 text-7xl font-bold text-gray-800 dark:text-white">404</h1>

                {/* Error Message */}
                <h2 className="mb-2 text-2xl font-semibold text-gray-700 dark:text-gray-200">Page Not Found</h2>
                <p className="mb-6 text-base text-gray-600 dark:text-gray-400">This page doesn't exist in the Innovation Hub. Let's get you back on track!</p>

                {/* Action Buttons */}
                <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                    <button onClick={() => navigate(-1)} className="btn btn-gradient border-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transition-all hover:shadow-xl">
                        <svg className="h-5 w-5 ltr:mr-2 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        Go Back
                    </button>

                    <Link to="/innovation/dashboard" className="btn btn-outline-primary border-2 shadow-md transition-all hover:shadow-lg">
                        <svg className="h-5 w-5 ltr:mr-2 rtl:ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                            />
                        </svg>
                        Innovation Dashboard
                    </Link>
                </div>

                {/* Helpful Links */}
                <div className="mt-8 rounded-lg bg-white p-5 shadow-lg dark:bg-gray-800">
                    <h3 className="mb-3 text-lg font-semibold text-gray-800 dark:text-white">Quick Links</h3>
                    <div className="grid grid-cols-1 gap-2 text-left sm:grid-cols-2">
                        <Link to="/innovation/ideas/new" className="flex items-center rounded-md p-3 text-gray-700 transition-colors hover:bg-purple-50 dark:text-gray-300 dark:hover:bg-gray-700">
                            <svg className="mr-3 h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Submit New Idea
                        </Link>
                        <Link to="/innovation/ideas/browse" className="flex items-center rounded-md p-3 text-gray-700 transition-colors hover:bg-purple-50 dark:text-gray-300 dark:hover:bg-gray-700">
                            <svg className="mr-3 h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Browse Ideas
                        </Link>
                        <Link to="/innovation/ideas/mine" className="flex items-center rounded-md p-3 text-gray-700 transition-colors hover:bg-purple-50 dark:text-gray-300 dark:hover:bg-gray-700">
                            <svg className="mr-3 h-5 w-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                            My Ideas
                        </Link>
                        <Link to="/innovation/projects" className="flex items-center rounded-md p-3 text-gray-700 transition-colors hover:bg-purple-50 dark:text-gray-300 dark:hover:bg-gray-700">
                            <svg className="mr-3 h-5 w-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            BSJ Projects
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
