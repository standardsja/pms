import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client'

// Perfect Scrollbar
import 'react-perfect-scrollbar/dist/css/styles.css';

// Tailwind css
import './tailwind.css';

// i18n (needs to be bundled)
import './i18n';

// Router
import { RouterProvider } from 'react-router-dom';
import router from './router/index';

// Redux
import { Provider } from 'react-redux';
import store from './store/index';

// Suppress ReactQuill findDOMNode warning in development (known React 18 + ReactQuill issue)
// See: https://github.com/zenoamaro/react-quill/issues/122
if (import.meta.env.DEV) {
    const originalError = console.error;
    console.error = (...args) => {
        if (typeof args[0] === 'string' && args[0].includes('findDOMNode')) {
            // Suppress findDOMNode warning from ReactQuill
            return;
        }
        originalError.apply(console, args);
    };
}

// Module-load diagnostic wrapper (helps catch Safari "Importing a module script failed" errors)
if (typeof window !== 'undefined') {
    (function () {
        const failing = new Set<string>();

        function createBanner() {
            if (document.getElementById('module-load-diagnostic-banner')) return;
            const banner = document.createElement('div');
            banner.id = 'module-load-diagnostic-banner';
            banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;background:#fff3cd;color:#856404;border-bottom:1px solid #ffeeba;padding:12px 16px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,"Helvetica Neue",Arial;display:flex;align-items:flex-start;gap:12px;';
            banner.innerHTML = `
                <div style="flex:1">
                    <strong>Module load error detected</strong>
                    <div style="font-size:12px;margin-top:6px;color:#856404">One or more module scripts failed to load. This can occur in Safari when a module import returns an error page, wrong MIME type, or mixed-content.</div>
                    <div class="diagnostic-urls" style="margin-top:8px;font-size:12px;color:#6b4f00"></div>
                    <div style="margin-top:6px;font-size:12px;color:#6b4f00">Check the Network tab for the failing resource(s). If the URL is HTTP while your page is HTTPS, use the same protocol or a protocol-relative URL.</div>
                </div>
                <div style="flex: none; display:flex; gap:8px; align-items:center">
                    <button id="diagnostic-refresh" style="background:#fff;border:1px solid #e6b800;padding:6px 8px;border-radius:6px;cursor:pointer">Reload</button>
                    <button id="diagnostic-dismiss" style="background:transparent;border:0;color:#856404;cursor:pointer">Dismiss</button>
                </div>
            `;
            document.documentElement.style.paddingTop = '48px';
            document.body.prepend(banner);
            const dismiss = document.getElementById('diagnostic-dismiss');
            const refresh = document.getElementById('diagnostic-refresh');
            dismiss?.addEventListener('click', () => {
                banner.remove();
                document.documentElement.style.paddingTop = '';
            });
            refresh?.addEventListener('click', () => window.location.reload());
        }

        function updateBannerUrls() {
            const el = document.querySelector('#module-load-diagnostic-banner .diagnostic-urls');
            if (!el) return;
            el.innerHTML = Array.from(failing)
                .map((u) => `<div style="word-break:break-all;margin-top:4px">${u}</div>`)
                .join('');
        }

        window.addEventListener(
            'error',
            (ev: Event | any) => {
                try {
                    const e = ev as ErrorEvent & { target?: any };
                    const msg = String(e?.message || '');
                    let url = '';
                    if (e?.filename) url = e.filename;
                    else if (e?.target && e.target.src) url = e.target.src;

                    const isModuleFail = msg.includes('Importing a module script failed') || (e?.target && e.target.tagName === 'SCRIPT' && e?.target.type === 'module' && !!e?.target.src && (e?.message || '').includes('failed'));
                    if (isModuleFail) {
                        console.error('Module load failure detected', ev);
                        if (url) failing.add(url);
                        createBanner();
                        updateBannerUrls();
                    }
                } catch (err) {
                    console.error('Module diagnostic handler error', err);
                }
            },
            true
        );

        window.addEventListener('unhandledrejection', (ev: any) => {
            try {
                const reason = ev?.reason;
                const text = typeof reason === 'string' ? reason : reason?.message || '';
                if (String(text).includes('Importing a module script failed') || String(text).includes('failed to fetch')) {
                    console.error('Unhandled rejection related to module load', ev);
                    // best-effort: try to extract URL
                    const url = reason?.url || reason?.stack || '';
                    if (url) failing.add(url);
                    createBanner();
                    updateBannerUrls();
                }
            } catch (err) {
                console.error(err);
            }
        });
    })();
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <Suspense>
            <Provider store={store}>
                <RouterProvider router={router} future={{ v7_startTransition: true }} />
            </Provider>
        </Suspense>
    </React.StrictMode>
);

