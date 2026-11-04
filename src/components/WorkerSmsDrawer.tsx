import React, { useState } from 'react';
import { SmsMessage, CampusWorker } from '../types';
import {
  X,
  Smartphone,
  CheckCheck,
  Send,
  PhoneCall,
  MessageSquare,
  ShieldAlert,
  Clock,
  Sparkles
} from 'lucide-react';

interface WorkerSmsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  smsLog: SmsMessage[];
  workers: CampusWorker[];
  onTriggerTestSms?: () => void;
}

export const WorkerSmsDrawer: React.FC<WorkerSmsDrawerProps> = ({
  isOpen,
  onClose,
  smsLog,
  workers,
}) => {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(workers[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'worker_phone' | 'student_phone' | 'gateway_log'>('worker_phone');

  if (!isOpen) return null;

  const currentWorker = workers.find((w) => w.id === selectedWorkerId) || workers[0];

  // Filter messages for selected worker
  const workerMessages = smsLog.filter(
    (s) =>
      s.direction === 'Outbound_Worker' &&
      (s.toPhone === currentWorker?.phone || s.recipientName.includes(currentWorker?.name || ''))
  );

  // Student messages
  const studentMessages = smsLog.filter((s) => s.direction === 'Outbound_Student');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
      <div className="bg-slate-900 text-slate-100 w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-slate-700 animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                Campus SMS Notification Log
              </h3>
              <p className="text-[11px] text-slate-400">
                Twilio sends and development-only simulations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('worker_phone')}
            className={`flex-1 py-2.5 px-3 text-center border-b-2 transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'worker_phone'
                ? 'border-amber-400 text-amber-300 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Technician Phone</span>
          </button>

          <button
            onClick={() => setActiveTab('student_phone')}
            className={`flex-1 py-2.5 px-3 text-center border-b-2 transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'student_phone'
                ? 'border-blue-400 text-blue-300 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Student SMS Feed</span>
          </button>

          <button
            onClick={() => setActiveTab('gateway_log')}
            className={`flex-1 py-2.5 px-3 text-center border-b-2 transition cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'gateway_log'
                ? 'border-emerald-400 text-emerald-300 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Gateway Log ({smsLog.length})</span>
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {activeTab === 'worker_phone' && (
            <div className="space-y-4">
              {/* Technician Selector Pills */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Select Campus Technician Phone:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {workers.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => setSelectedWorkerId(w.id)}
                      className={`p-2 rounded text-left border transition text-xs cursor-pointer ${
                        selectedWorkerId === w.id
                          ? 'bg-amber-950/60 border-amber-500 text-amber-200'
                          : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-bold truncate text-[11px]">{w.name}</div>
                      <div className="text-[10px] text-slate-400 truncate">{w.category}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Realistic Smartphone Screen Mockup */}
              <div className="bg-slate-950 rounded-2xl border-4 border-slate-700 p-3 shadow-2xl max-w-sm mx-auto">
                {/* Phone Speaker & Camera Notch */}
                <div className="flex items-center justify-center mb-2">
                  <div className="w-16 h-1.5 bg-slate-800 rounded-full" />
                </div>

                {/* Worker Phone Screen Header */}
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <img
                      src={currentWorker.avatar}
                      alt={currentWorker.name}
                      className="w-8 h-8 rounded-full object-cover border border-slate-600"
                    />
                    <div>
                      <div className="text-xs font-bold text-white truncate max-w-[150px]">
                        {currentWorker.name}
                      </div>
                      <div className="text-[10px] text-amber-400 font-mono">
                        {currentWorker.phone}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800 font-semibold">
                    {currentWorker.category}
                  </span>
                </div>

                {/* SMS Bubble Conversation */}
                <div className="space-y-2.5 min-h-[260px] max-h-[340px] overflow-y-auto p-1 text-xs">
                  {workerMessages.length === 0 ? (
                    <div className="text-center text-slate-500 py-12 text-xs">
                      No notification attempts yet for <span className="text-amber-400">{currentWorker.category}</span>.
                    </div>
                  ) : (
                    workerMessages.map((sms) => (
                      <div
                        key={sms.id}
                        className={`p-3 rounded-lg border leading-relaxed ${
                          sms.message.includes('CRITICAL HAZARD')
                            ? 'bg-red-950/80 border-red-700 text-red-100'
                            : 'bg-slate-800 border-slate-700 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                          <span className="font-bold text-amber-400">KARE-DISPATCH-SMS</span>
                          <span>{new Date(sms.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-[11px] whitespace-pre-wrap">{sms.message}</p>
                        <div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                          sms.status === 'Failed' ? 'text-red-400' :
                          sms.status === 'Simulated' ? 'text-amber-400' :
                          sms.status === 'Delivered' ? 'text-emerald-400' : 'text-sky-400'
                        }`}>
                          {sms.status === 'Delivered' ? <CheckCheck className="w-3 h-3" /> : null}
                          <span>{sms.status === 'Simulated' ? 'Not sent (simulation)' : sms.status}</span>
                        </div>
                        {sms.error && <p className="mt-1 text-[10px] text-red-300">{sms.error}</p>}
                      </div>
                    ))
                  )}
                </div>

                {/* Worker replies are not implemented yet. */}
                <div className="mt-3 pt-2 border-t border-slate-800 flex items-center gap-2">
                  <input
                    type="text"
                    disabled
                    placeholder="Worker automated reply line..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-400"
                  />
                  <div className="text-[10px] text-slate-500 uppercase font-mono">SIMULATED</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'student_phone' && (
            <div className="space-y-3">
              <div className="bg-blue-950/40 border border-blue-800/80 p-3 rounded-lg text-xs text-blue-200 leading-relaxed">
                <span className="font-bold block text-blue-100 mb-0.5">Student SMS notification attempts:</span>
                Issue status changes can trigger SMS attempts. Delivery requires Twilio credentials and a valid recipient number; the result is shown for each attempt below.
              </div>

              {/* Student SMS Feed */}
              <div className="space-y-2.5">
                {studentMessages.length === 0 ? (
                  <div className="text-center text-slate-500 py-12 text-xs bg-slate-950/50 rounded-lg border border-slate-800">
                    No student notification attempts yet.
                  </div>
                ) : (
                  studentMessages.map((sms) => (
                    <div
                      key={sms.id}
                      className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-200"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="font-bold text-blue-400">To Student: {sms.recipientName} ({sms.toPhone})</span>
                        <span>{new Date(sms.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-100">{sms.message}</p>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/60 pt-1">
                        <span>Ref #{sms.ticketNo}</span>
                        <span className={`flex items-center gap-1 font-semibold ${
                          sms.status === 'Failed' ? 'text-red-400' :
                          sms.status === 'Simulated' ? 'text-amber-400' : 'text-sky-400'
                        }`}>
                          {sms.status === 'Delivered' ? <CheckCheck className="w-3 h-3" /> : null}
                          {sms.status === 'Simulated' ? 'Not sent (simulation)' : sms.status}
                        </span>
                      </div>
                      {sms.error && <p className="mt-1 text-[10px] text-red-300">{sms.error}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'gateway_log' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>SMS attempts: {smsLog.length}</span>
                <span className="text-slate-400 font-mono">Latest gateway: {smsLog[0]?.gatewayId || 'No sends yet'}</span>
              </div>

              <div className="space-y-2">
                {smsLog.map((sms) => (
                  <div
                    key={sms.id}
                    className="p-2.5 bg-slate-950 rounded border border-slate-800 font-mono text-[11px]"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="text-amber-400 font-bold">{sms.toPhone}</span>
                      <span>{new Date(sms.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="text-slate-300 text-[11px] font-sans">{sms.message}</div>
                    <div className="mt-1 text-[10px] text-slate-500 flex items-center justify-between">
                      <span>Recipient: {sms.recipientName}</span>
                      <span className={`font-bold ${
                        sms.status === 'Failed' ? 'text-red-400' :
                        sms.status === 'Simulated' ? 'text-amber-400' :
                        sms.status === 'Delivered' ? 'text-emerald-400' : 'text-sky-400'
                      }`}>STATUS: {sms.status === 'Simulated' ? 'Not sent (simulation)' : sms.status}</span>
                    </div>
                    {sms.error && <div className="mt-1 text-[10px] text-red-300 font-sans">{sms.error}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>SMS provider status is not a carrier delivery receipt</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
