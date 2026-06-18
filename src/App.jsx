import React, { Component } from 'react';
import Game from './Game.jsx';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="error-screen">
          <h1>Game failed to start</h1>
          <pre>{this.state.error.message}</pre>
        </main>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <Game />
    </ErrorBoundary>
  );
}
