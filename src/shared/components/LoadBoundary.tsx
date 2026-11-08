import { Component, type ReactNode } from 'react'

interface State {
  failed: boolean
}

/**
 * Around a lazily loaded page: if its chunk fails to load (a deploy replaced
 * it mid-visit, a dropped connection) or the page throws while rendering, show
 * a way back instead of letting the error unmount the whole app.
 */
export default class LoadBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <p role="alert" style={{ padding: '80px 16px', textAlign: 'center' }}>
        This page failed to load. <a href={window.location.pathname}>Reload</a> or go <a href="/">home</a>.
      </p>
    )
  }
}
