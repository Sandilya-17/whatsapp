import React from 'react';
import type { Toast } from '../types';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container" style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '380px',
      pointerEvents: 'none'
    }}>
      {toasts.map((toast) => {
        let icon = <Info size={18} className="text-blue-400" />;
        let borderClass = 'rgba(59, 130, 246, 0.3)';
        let bg = 'rgba(15, 23, 42, 0.95)';

        if (toast.type === 'success') {
          icon = <CheckCircle2 size={18} style={{ color: '#10b981' }} />;
          borderClass = 'rgba(16, 185, 129, 0.4)';
        } else if (toast.type === 'error') {
          icon = <AlertCircle size={18} style={{ color: '#ef4444' }} />;
          borderClass = 'rgba(239, 68, 68, 0.4)';
        } else if (toast.type === 'warning') {
          icon = <AlertTriangle size={18} style={{ color: '#f59e0b' }} />;
          borderClass = 'rgba(245, 158, 11, 0.4)';
        }

        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              background: bg,
              backdropFilter: 'blur(16px)',
              border: `1px solid ${borderClass}`,
              borderRadius: '12px',
              padding: '12px 16px',
              color: '#f8fafc',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '14px',
              animation: 'slideInRight 0.25s ease-out',
            }}
          >
            <div>{icon}</div>
            <div style={{ flex: 1, wordBreak: 'break-word', fontWeight: 500 }}>{toast.message}</div>
            <button
              onClick={() => onDismiss(toast.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
                borderRadius: '6px'
              }}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
