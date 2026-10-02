import React from 'react';
import { X, Bell, Check, CheckCheck, Info, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useServer } from '../../context/ServerContext';
import { db } from '../../services/storage';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const { notifications, refreshAll } = useServer();

  if (!isOpen) return null;

  const handleMarkAllRead = () => {
    db.markAllNotificationsRead();
    refreshAll();
  };

  const handleMarkOne = (id: string) => {
    db.markNotificationAsRead(id);
    refreshAll();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
      <div className="flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Bell className="h-5 w-5 text-sky-500" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Notification Center
              </h2>
              <p className="text-[11px] text-slate-400">
                Peringatan server, billing, dan akun
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              title="Tandai semua sudah dibaca"
              className="rounded-lg p-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <CheckCheck className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Tidak ada notifikasi baru.
            </div>
          ) : (
            notifications.map(item => (
              <div
                key={item.id}
                onClick={() => handleMarkOne(item.id)}
                className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                  item.isRead
                    ? 'border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400'
                    : 'border-sky-200 bg-sky-50/50 text-slate-900 dark:border-sky-900/60 dark:bg-sky-950/20 dark:text-slate-100 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {item.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    {item.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                    {item.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-500" />}
                    {item.type === 'info' && <Info className="h-4 w-4 text-sky-500" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold">{item.title}</h4>
                      <span className="font-mono text-[10px] text-slate-400">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {item.message}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
