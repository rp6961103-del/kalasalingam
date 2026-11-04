import React from 'react';
import { NotificationItem } from '../types';
import { X, Bell, CheckCheck, AlertTriangle, RefreshCw, Send, CheckCircle2 } from 'lucide-react';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  onSelectTicket: (ticketNo: string) => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onSelectTicket,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end p-2 sm:p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full max-h-[85vh] flex flex-col border border-slate-200 overflow-hidden text-slate-800 animate-in slide-in-from-top-4 duration-150">
        {/* Header */}
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">
              Automated Status Notifications
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action bar */}
        <div className="px-3 py-1.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
          <span>{notifications.length} notifications</span>
          <button
            onClick={onMarkAllAsRead}
            className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer flex items-center gap-1"
          >
            <CheckCheck className="w-3 h-3" /> Mark all read
          </button>
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-1">
          {notifications.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              No notifications yet.
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  onSelectTicket(notif.ticketNo);
                  onClose();
                }}
                className={`p-3 hover:bg-slate-50 transition cursor-pointer text-xs ${
                  !notif.isRead ? 'bg-blue-50/50' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    {notif.type === 'alert' ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                    ) : notif.type === 'sms_dispatched' ? (
                      <Send className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-slate-900 truncate">{notif.title}</span>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">
                      {notif.message}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="font-mono text-blue-600 font-semibold">#{notif.ticketNo}</span>
                      <span className="text-blue-600 hover:underline">View Ticket →</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-center">
          <button
            onClick={onClose}
            className="w-full py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
