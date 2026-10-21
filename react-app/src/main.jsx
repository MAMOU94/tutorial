        import React from 'react'
        import ReactDOM from 'react-dom/client'
        import App from './App.jsx'
        import './index.css' 

        class ErrorBoundary extends React.Component {
          constructor(props) {
            super(props)
            this.state = { error: null, errorInfo: null }
          }

          static getDerivedStateFromError(error) {
            return { error }
          }

          componentDidCatch(error, errorInfo) {
            this.setState({ error, errorInfo })
            console.error('Renderer crash:', error, errorInfo)
          }

          render() {
            const { error, errorInfo } = this.state
            if (error) {
              return (
                <div style={{ fontFamily: 'system-ui, sans-serif', padding: 24, color: '#111', background: '#fff' }}>
                  <h1 style={{ fontSize: 20, marginBottom: 12 }}>Renderer Error</h1>
                  <div style={{ fontSize: 14, marginBottom: 8 }}>{String(error)}</div>
                  {errorInfo?.componentStack && (
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, background: '#f6f6f6', padding: 12, borderRadius: 6 }}>
                      {errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )
            }
            return this.props.children
          }
        }

        ReactDOM.createRoot(document.getElementById('root')).render(
          <React.StrictMode>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </React.StrictMode>,
        )
        
