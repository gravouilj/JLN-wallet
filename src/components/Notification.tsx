import { useAtom } from 'jotai';
import { useEffect } from 'react';
import { notificationAtom } from '../atoms';

const Notification = () => {
  const [notification, setNotification] = useAtom(notificationAtom);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000); // Auto-hide after 4 seconds

      return () => clearTimeout(timer);
    }
  }, [notification, setNotification]);

  if (!notification) return null;

  const { type, message } = notification;

  // Type-based styling - Using CSS variables instead of Tailwind
  const typeStyles = {
    success: 'notification-success',
    error: 'notification-error',
    warning: 'notification-warning',
    info: 'notification-info'
  };

  return (
    <div 
      className={`notification ${typeStyles[type] || typeStyles.info}`}
    >
      <p className="notification-message">
        {type === 'success' && '✅ '}
        {type === 'error' && '❌ '}
        {type === 'warning' && '⚠️ '}
        {message}
      </p>
      <button
        onClick={() => setNotification(null)}
        aria-label="Close notification"
        className="notification-close"
      >
        ×
      </button>
    </div>
  );
};

export default Notification;
