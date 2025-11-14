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

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <Suspense>
            <Provider store={store}>
                <RouterProvider router={router} future={{ v7_startTransition: true }} />
            </Provider>
        </Suspense>
    </React.StrictMode>
);

