import { Component } from "react";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/home";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-4">
          <h1 className="text-4xl font-bold mb-4">문제가 발생했습니다</h1>
          <p className="text-lg text-muted-foreground mb-2">
            예상치 못한 오류가 발생했습니다.
          </p>
          <p className="text-sm text-muted-foreground mb-8">
            {this.state.error?.message || "알 수 없는 오류"}
          </p>
          <button
            onClick={this.handleReset}
            className="px-6 py-3 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            홈으로 돌아가기
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
