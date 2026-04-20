import React from 'react';

class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Global Error Caught:", error, errorInfo);
        this.state.errorInfo = errorInfo;
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '40px',
                    fontFamily: 'system-ui, sans-serif',
                    backgroundColor: '#1a1a1a',
                    color: '#fff',
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <h1 style={{ color: '#ef4444', marginBottom: '20px' }}>Something went wrong</h1>
                    <div style={{
                        backgroundColor: '#333',
                        padding: '20px',
                        borderRadius: '8px',
                        maxWidth: '800px',
                        width: '100%',
                        overflow: 'auto'
                    }}>
                        <h3 style={{ marginTop: 0, color: '#fca5a5' }}>Error:</h3>
                        <pre style={{ whiteSpace: 'pre-wrap', color: '#e5e5e5' }}>{this.state.error?.toString()}</pre>

                        <h3 style={{ color: '#fca5a5' }}>Component Stack:</h3>
                        <pre style={{ whiteSpace: 'pre-wrap', color: '#9ca3af', fontSize: '0.9em' }}>
                            {this.state.errorInfo?.componentStack || 'No stack trace available'}
                        </pre>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '20px',
                            padding: '10px 20px',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '16px'
                        }}
                    >
                        Reload Application
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default GlobalErrorBoundary;
