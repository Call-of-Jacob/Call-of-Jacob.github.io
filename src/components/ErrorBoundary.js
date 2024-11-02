class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
        // Send to error tracking service
        Monitoring.logError(error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-screen">
                    <h2>Something went wrong</h2>
                    <button onClick={() => window.location.reload()}>
                        Reload Game
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
} 