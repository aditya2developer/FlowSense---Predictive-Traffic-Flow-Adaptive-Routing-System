function LoadingSpinner({ message = "Analyzing traffic and routes..." }) {
  return (
    <div className="loading-spinner-wrapper" role="status" aria-live="polite">
      <div className="loading-spinner" />
      <p className="loading-text">{message}</p>
    </div>
  );
}

export default LoadingSpinner;
