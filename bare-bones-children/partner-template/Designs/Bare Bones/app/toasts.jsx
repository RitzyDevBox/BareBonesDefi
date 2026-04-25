// Toast system — imperative API via window.toast
const ToastCtx = React.createContext(null);

function ToastProvider({ children }) {
  const [items, setItems] = React.useState([]);
  const idRef = React.useRef(1);

  const push = React.useCallback((t) => {
    const id = idRef.current++;
    const toast = { id, type: 'info', duration: 5000, ...t };
    setItems(prev => [...prev, toast]);
    if (toast.duration > 0) {
      setTimeout(() => dismiss(id), toast.duration);
    }
    return id;
  }, []);

  const dismiss = React.useCallback((id) => {
    setItems(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), 220);
  }, []);

  React.useEffect(() => {
    window.toast = {
      success: (title, opts) => push({ type: 'success', title, ...opts }),
      error:   (title, opts) => push({ type: 'error',   title, ...opts }),
      warning: (title, opts) => push({ type: 'warning', title, ...opts }),
      info:    (title, opts) => push({ type: 'info',    title, ...opts }),
    };
  }, [push]);

  return (
    <ToastCtx.Provider value={{ push, dismiss }}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {items.map(t => <Toast key={t.id} {...t} onClose={() => dismiss(t.id)} />)}
      </div>
    </ToastCtx.Provider>
  );
}

function Toast({ type, title, description, action, onAction, onClose, leaving, duration = 5000 }) {
  const IconMap = {
    success: <I.CheckC size={13} stroke={2} />,
    error:   <I.ErrorI size={13} stroke={2} />,
    warning: <I.Warn   size={13} stroke={2} />,
    info:    <I.Info   size={13} stroke={2} />,
  };
  return (
    <div className={`toast ${type}${leaving ? ' leaving' : ''}`} role="status">
      <div className="toast-icon">{IconMap[type]}</div>
      <div className="toast-body">
        <div className="tt">{title}</div>
        {description && <div className="td">{description}</div>}
        {action && (
          <button className="ta" onClick={() => { onAction && onAction(); onClose(); }}>
            {action} <I.Arrow size={12} />
          </button>
        )}
      </div>
      <button className="toast-close" onClick={onClose} aria-label="Dismiss">
        <I.Close size={12} />
      </button>
      {duration > 0 && (
        <div className="toast-progress"
             style={{ animation: `toast-shrink ${duration}ms linear forwards` }} />
      )}
    </div>
  );
}

// Inject keyframe for progress
if (!document.getElementById('toast-kf')) {
  const s = document.createElement('style');
  s.id = 'toast-kf';
  s.textContent = `@keyframes toast-shrink { from { transform: scaleX(1); } to { transform: scaleX(0); } }`;
  document.head.appendChild(s);
}

Object.assign(window, { ToastProvider, Toast });
