import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IRootState } from '../../store';
import { toggleAnimation, toggleLayout, toggleMenu, toggleNavbar, toggleRTL, toggleTheme, toggleSemidark, toggleAccent } from '../../store/themeConfigSlice';
import IconSettings from '../Icon/IconSettings';
import IconX from '../Icon/IconX';
import IconSun from '../Icon/IconSun';
import IconMoon from '../Icon/IconMoon';
import IconLaptop from '../Icon/IconLaptop';
import IconLayoutGrid from '../Icon/IconLayoutGrid';
import IconMenu from '../Icon/IconMenu';

const Setting = () => {
    const themeConfig = useSelector((state: IRootState) => state.themeConfig);
    const dispatch = useDispatch();

    const [showCustomizer, setShowCustomizer] = useState(false);

    return (
        <div>
            <div className={`${(showCustomizer && '!block') || ''} fixed inset-0 bg-[black]/60 z-[51] px-4 hidden transition-[display]`} onClick={() => setShowCustomizer(false)}></div>

            <nav
                className={`${
                    (showCustomizer && 'ltr:!right-0 rtl:!left-0') || ''
                } bg-white fixed ltr:-right-[400px] rtl:-left-[400px] top-0 bottom-0 w-full max-w-[400px] shadow-[5px_0_25px_0_rgba(94,92,154,0.1)] transition-[right] duration-300 z-[51] dark:bg-black p-4`}
            >
                <button
                    type="button"
                    className="bg-primary ltr:rounded-tl-full rtl:rounded-tr-full ltr:rounded-bl-full rtl:rounded-br-full absolute ltr:-left-12 rtl:-right-12 top-0 bottom-0 my-auto w-12 h-10 flex justify-center items-center text-white cursor-pointer"
                    onClick={() => setShowCustomizer(!showCustomizer)}
                >
                    <IconSettings className="animate-[spin_3s_linear_infinite] w-5 h-5" />
                </button>

                <div className="overflow-y-auto overflow-x-hidden perfect-scrollbar h-full">
                    {/* Modern Gradient Header */}
                    <div className="relative pb-6 mb-6">
                        <button
                            type="button"
                            className="absolute top-0 ltr:right-0 rtl:left-0 p-2 rounded-lg opacity-60 hover:opacity-100 dark:text-white hover:bg-white/10 transition-all duration-200"
                            onClick={() => setShowCustomizer(false)}
                        >
                            <IconX className="w-5 h-5" />
                        </button>

                        <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-2xl p-6 shadow-lg">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                                    <IconSettings className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <h4 className="text-2xl font-bold text-white mb-1">BSJ Customizer</h4>
                                    <p className="text-white/90 text-sm">Personalize your workspace experience</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Color Scheme Section */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-gray-800 dark:to-gray-900 rounded-xl mb-4 p-5 shadow-md border border-slate-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg">
                                <IconSun className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h5 className="text-lg font-semibold dark:text-white">Color Scheme</h5>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Choose your preferred theme mode</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-4">
                            <button
                                type="button"
                                className={`${
                                    themeConfig.theme === 'light'
                                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg scale-105'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-md hover:scale-105'
                                } btn transition-all duration-200 flex items-center justify-center gap-2 py-3 font-medium`}
                                onClick={() => dispatch(toggleTheme('light'))}
                            >
                                <IconSun className="w-5 h-5 shrink-0" />
                                <span>Light</span>
                            </button>

                            <button
                                type="button"
                                className={`${
                                    themeConfig.theme === 'dark'
                                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg scale-105'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-md hover:scale-105'
                                } btn transition-all duration-200 flex items-center justify-center gap-2 py-3 font-medium`}
                                onClick={() => dispatch(toggleTheme('dark'))}
                            >
                                <IconMoon className="w-5 h-5 shrink-0" />
                                <span>Dark</span>
                            </button>

                            <button
                                type="button"
                                className={`${
                                    themeConfig.theme === 'system'
                                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg scale-105'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-md hover:scale-105'
                                } btn transition-all duration-200 flex items-center justify-center gap-2 py-3 font-medium`}
                                onClick={() => dispatch(toggleTheme('system'))}
                            >
                                <IconLaptop className="w-5 h-5 shrink-0" />
                                <span>System</span>
                            </button>
                        </div>
                    </div>

                    {/* Accent Color Section */}
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl mb-4 p-5 shadow-md border border-purple-200 dark:border-purple-700">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h5 className="text-lg font-semibold dark:text-white">Accent Color</h5>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Primary color for buttons and highlights</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <button
                                type="button"
                                className={`${
                                    (themeConfig as any).accent === 'blue'
                                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg scale-105'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-md hover:scale-105'
                                } btn transition-all duration-200 py-3 font-medium relative overflow-hidden`}
                                onClick={() => dispatch(toggleAccent('blue'))}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 opacity-20"></div>
                                <span className="relative z-10">Blue</span>
                            </button>
                            <button
                                type="button"
                                className={`${
                                    (themeConfig as any).accent === 'purple'
                                        ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg scale-105'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-md hover:scale-105'
                                } btn transition-all duration-200 py-3 font-medium relative overflow-hidden`}
                                onClick={() => dispatch(toggleAccent('purple'))}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-purple-600 opacity-20"></div>
                                <span className="relative z-10">Purple</span>
                            </button>
                        </div>
                    </div>

                    {/* Navigation Position Section */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl mb-4 p-5 shadow-md border border-blue-200 dark:border-blue-700">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg">
                                <IconMenu className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h5 className="text-lg font-semibold dark:text-white">Navigation Position</h5>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Configure menu layout and behavior</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-4">
                            <button
                                type="button"
                                className={`${
                                    themeConfig.menu === 'horizontal'
                                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg scale-105'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-md hover:scale-105'
                                } btn transition-all duration-200 py-3 font-medium`}
                                onClick={() => dispatch(toggleMenu('horizontal'))}
                            >
                                Horizontal
                            </button>

                            <button
                                type="button"
                                className={`${
                                    themeConfig.menu === 'vertical'
                                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg scale-105'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-md hover:scale-105'
                                } btn transition-all duration-200 py-3 font-medium`}
                                onClick={() => dispatch(toggleMenu('vertical'))}
                            >
                                Vertical
                            </button>

                            <button
                                type="button"
                                className={`${
                                    themeConfig.menu === 'collapsible-vertical'
                                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg scale-105'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-md hover:scale-105'
                                } btn transition-all duration-200 py-3 font-medium`}
                                onClick={() => dispatch(toggleMenu('collapsible-vertical'))}
                            >
                                Collapsible
                            </button>
                        </div>
                        <div className="mt-5">
                            <label className="inline-flex items-center cursor-pointer group">
                                <input
                                    type="checkbox"
                                    className="form-checkbox w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 focus:ring-2 transition-all"
                                    checked={themeConfig.semidark === true || themeConfig.semidark === 'true'}
                                    onChange={(e) => dispatch(toggleSemidark(e.target.checked))}
                                />
                                <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    Semi Dark Mode (Sidebar & Header)
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Layout Style Section */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl mb-4 p-5 shadow-md border border-emerald-200 dark:border-emerald-700">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg">
                                <IconLayoutGrid className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h5 className="text-lg font-semibold dark:text-white">Layout Style</h5>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Choose between boxed or full-width layout</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <button
                                type="button"
                                className={`${
                                    themeConfig.layout === 'boxed-layout'
                                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg scale-105'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-md hover:scale-105'
                                } btn transition-all duration-200 py-3 font-medium`}
                                onClick={() => dispatch(toggleLayout('boxed-layout'))}
                            >
                                Boxed
                            </button>

                            <button
                                type="button"
                                className={`${
                                    themeConfig.layout === 'full'
                                        ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg scale-105'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-md hover:scale-105'
                                } btn transition-all duration-200 py-3 font-medium`}
                                onClick={() => dispatch(toggleLayout('full'))}
                            >
                                Full Width
                            </button>
                        </div>
                    </div>

                    {/* Direction Section */}
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl mb-4 p-5 shadow-md border border-orange-200 dark:border-orange-700">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                                </svg>
                            </div>
                            <div>
                                <h5 className="text-lg font-semibold dark:text-white">Text Direction</h5>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Left-to-right or right-to-left reading</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <button
                                type="button"
                                className={`${
                                    themeConfig.rtlClass === 'ltr'
                                        ? 'bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg scale-105'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-md hover:scale-105'
                                } btn transition-all duration-200 py-3 font-medium`}
                                onClick={() => dispatch(toggleRTL('ltr'))}
                            >
                                LTR
                            </button>

                            <button
                                type="button"
                                className={`${
                                    themeConfig.rtlClass === 'rtl'
                                        ? 'bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-lg scale-105'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-md hover:scale-105'
                                } btn transition-all duration-200 py-3 font-medium`}
                                onClick={() => dispatch(toggleRTL('rtl'))}
                            >
                                RTL
                            </button>
                        </div>
                    </div>

                    {/* Navbar Type Section */}
                    <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-xl mb-4 p-5 shadow-md border border-rose-200 dark:border-rose-700">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-gradient-to-br from-rose-500 to-pink-500 rounded-lg">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </div>
                            <div>
                                <h5 className="text-lg font-semibold dark:text-white">Navbar Type</h5>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Navigation bar positioning behavior</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3 mt-4">
                            <label
                                className={`${
                                    themeConfig.navbar === 'navbar-sticky'
                                        ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg scale-105'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-md hover:scale-105'
                                } btn transition-all duration-200 py-3 font-medium cursor-pointer flex items-center justify-center gap-2`}
                            >
                                <input
                                    type="radio"
                                    checked={themeConfig.navbar === 'navbar-sticky'}
                                    value="navbar-sticky"
                                    className="form-radio hidden"
                                    onChange={() => dispatch(toggleNavbar('navbar-sticky'))}
                                />
                                <span>Sticky</span>
                            </label>
                            <label
                                className={`${
                                    themeConfig.navbar === 'navbar-floating'
                                        ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg scale-105'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-md hover:scale-105'
                                } btn transition-all duration-200 py-3 font-medium cursor-pointer flex items-center justify-center gap-2`}
                            >
                                <input
                                    type="radio"
                                    checked={themeConfig.navbar === 'navbar-floating'}
                                    value="navbar-floating"
                                    className="form-radio hidden"
                                    onChange={() => dispatch(toggleNavbar('navbar-floating'))}
                                />
                                <span>Floating</span>
                            </label>
                            <label
                                className={`${
                                    themeConfig.navbar === 'navbar-static'
                                        ? 'bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg scale-105'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:shadow-md hover:scale-105'
                                } btn transition-all duration-200 py-3 font-medium cursor-pointer flex items-center justify-center gap-2`}
                            >
                                <input
                                    type="radio"
                                    checked={themeConfig.navbar === 'navbar-static'}
                                    value="navbar-static"
                                    className="form-radio hidden"
                                    onChange={() => dispatch(toggleNavbar('navbar-static'))}
                                />
                                <span>Static</span>
                            </label>
                        </div>
                    </div>

                    {/* Router Transition Section */}
                    <div className="bg-gradient-to-br from-cyan-50 to-sky-50 dark:from-cyan-900/20 dark:to-sky-900/20 rounded-xl mb-4 p-5 shadow-md border border-cyan-200 dark:border-cyan-700">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-gradient-to-br from-cyan-500 to-sky-500 rounded-lg">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div>
                                <h5 className="text-lg font-semibold dark:text-white">Page Transitions</h5>
                                <p className="text-xs text-gray-600 dark:text-gray-400">Animation effect when navigating pages</p>
                            </div>
                        </div>
                        <div className="mt-4">
                            <select
                                className="form-select w-full py-3 px-4 border-2 border-cyan-300 dark:border-cyan-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200 font-medium"
                                value={themeConfig.animation}
                                onChange={(e) => dispatch(toggleAnimation(e.target.value))}
                            >
                                <option value=" ">None</option>
                                <option value="animate__fadeIn">Fade</option>
                                <option value="animate__fadeInDown">Fade Down</option>
                                <option value="animate__fadeInUp">Fade Up</option>
                                <option value="animate__fadeInLeft">Fade Left</option>
                                <option value="animate__fadeInRight">Fade Right</option>
                                <option value="animate__slideInDown">Slide Down</option>
                                <option value="animate__slideInLeft">Slide Left</option>
                                <option value="animate__slideInRight">Slide Right</option>
                                <option value="animate__zoomIn">Zoom In</option>
                            </select>
                        </div>
                    </div>
                </div>
            </nav>
        </div>
    );
};

export default Setting;
