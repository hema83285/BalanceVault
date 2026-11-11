export default function Alert({ type = 'error', message, onClose }) {
  if (!message) return null;
  return (
    <div className={`alert alert-${type}`} role="alert">
      <span style={{ flex: 1 }}>{message}</span>
      {onClose && (
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', lineHeight: 1, color: 'inherit', opacity: 0.6 }}>×</button>
      )}
    </div>
  );
}
