import { useRouteError } from 'react-router-dom';

const Error = () => {
    const error = useRouteError() as any;

    console.error('Route error:', error);

    return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
            <h1>Error</h1>
            <p style={{ color: 'red', marginTop: '10px' }}>{error?.message || error?.statusText || 'An unknown error occurred'}</p>
            {error?.stack && (
                <pre
                    style={{
                        marginTop: '20px',
                        padding: '10px',
                        background: '#f5f5f5',
                        overflow: 'auto',
                        fontSize: '12px',
                    }}
                >
                    {error.stack}
                </pre>
            )}
        </div>
    );
};

export default Error;
