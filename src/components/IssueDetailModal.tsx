import React, { useState } from 'react';
import { CampusIssue, CampusWorker, IssueStatus, UserRole } from '../types';
import {
  X,
  MapPin,
  Clock,
  User,
  Phone,
  ThumbsUp,
  CheckCircle,
  AlertTriangle,
  Send,
  Wrench,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

interface IssueDetailModalProps {
  issue: CampusIssue | null;
  onClose: () => void;
  userRole: UserRole;
  workers: CampusWorker[];
  onUpdateStatus: (
    issueId: string,
    status: IssueStatus,
    workerId?: string,
    note?: string
  ) => Promise<void>;
  onUpvote: (issueId: string) => void;
  currentUserId: string;
}

export const IssueDetailModal: React.FC<IssueDetailModalProps> = ({
  issue,
  onClose,
  userRole,
  workers,
  onUpdateStatus,
  onUpvote,
  currentUserId,
}) => {
  if (!issue) return null;

  const [selectedStatus, setSelectedStatus] = useState<IssueStatus>(issue.status);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>(
    issue.assignedWorker?.id || workers[0]?.id || ''
  );
  const [resolutionNote, setResolutionNote] = useState<string>(issue.resolutionNote || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const statuses: IssueStatus[] = ['Reported', 'Assigned', 'In Progress', 'Resolved'];
  const currentStatusIndex = statuses.indexOf(issue.status);

  const handleSaveStatus = async () => {
    try {
      setIsUpdating(true);
      await onUpdateStatus(
        issue.id,
        selectedStatus,
        selectedWorkerId,
        resolutionNote.trim() || undefined
      );
      setStatusMessage(`Status updated to ${selectedStatus}! Automated notifications generated.`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch {
      setStatusMessage('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const hasUpvoted = issue.upvotedBy.includes(currentUserId);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-start justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono font-bold bg-slate-200 text-slate-800 px-2 py-0.5 rounded">
                #{issue.ticketNo}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                {issue.category}
              </span>
              {issue.isHazard && (
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-600 text-white flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3 h-3" />
                  HAZARD
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              {issue.title}
            </h2>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{issue.locationName}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-5 overflow-y-auto flex-1 text-slate-800 text-xs sm:text-sm">
          {/* Progress Tracking Stepper (Reported → Assigned → In Progress → Resolved) */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              Progress Tracking Lifecycle
            </h3>
            <div className="grid grid-cols-4 gap-1 relative">
              {statuses.map((st, idx) => {
                const isCompleted = idx <= currentStatusIndex;
                const isCurrent = idx === currentStatusIndex;

                let circleClass = 'bg-slate-200 text-slate-500 border-slate-300';
                if (isCompleted) {
                  circleClass = 'bg-blue-600 text-white border-blue-600';
                }
                if (st === 'Resolved' && isCompleted) {
                  circleClass = 'bg-emerald-600 text-white border-emerald-600';
                }

                return (
                  <div key={st} className="flex flex-col items-center text-center">
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center font-bold text-xs shadow transition-all ${circleClass} ${
                        isCurrent ? 'ring-4 ring-blue-100' : ''
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span
                      className={`text-[10px] sm:text-xs mt-1.5 font-semibold ${
                        isCurrent ? 'text-blue-700 font-bold' : isCompleted ? 'text-slate-800' : 'text-slate-400'
                      }`}
                    >
                      {st}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Issue Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Description & Photo */}
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-slate-700 text-xs uppercase tracking-wider mb-1">
                  Description
                </h4>
                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200 leading-relaxed whitespace-pre-wrap">
                  {issue.description}
                </p>
              </div>

              {issue.imageUrl && (
                <div>
                  <h4 className="font-semibold text-slate-700 text-xs uppercase tracking-wider mb-1">
                    Photo Attachment
                  </h4>
                  <div className="rounded-lg overflow-hidden border border-slate-200 max-h-48 bg-slate-100">
                    <img
                      src={issue.imageUrl}
                      alt={issue.title}
                      className="w-full h-44 object-cover hover:scale-105 transition duration-300"
                    />
                  </div>
                </div>
              )}

              {/* Priority & Upvotes strip */}
              <div className="flex items-center justify-between p-2.5 bg-amber-50/70 border border-amber-200 rounded text-xs">
                <div>
                  <span className="font-semibold text-amber-900 block">
                    Priority Score: <span className="font-bold text-amber-700">{issue.priorityScore}</span>
                  </span>
                  <span className="text-[11px] text-amber-700">
                    Severity: {issue.severity} • {issue.votes} votes
                  </span>
                </div>
                <button
                  onClick={() => onUpvote(issue.id)}
                  className={`px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                    hasUpvoted
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'bg-white border border-amber-300 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{hasUpvoted ? 'Upvoted' : 'Upvote'}</span>
                </button>
              </div>
            </div>

            {/* Reporter & Assigned Worker Details */}
            <div className="space-y-3">
              {/* Assigned Worker Card */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-slate-700 text-xs uppercase tracking-wider flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5 text-blue-600" />
                    Assigned Worker
                  </h4>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-medium">
                    SMS Linked
                  </span>
                </div>
                {issue.assignedWorker ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={issue.assignedWorker.avatar}
                      alt={issue.assignedWorker.name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-300"
                    />
                    <div>
                      <div className="font-bold text-slate-900 text-xs">
                        {issue.assignedWorker.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {issue.assignedWorker.role}
                      </div>
                      <div className="text-[11px] text-blue-600 font-semibold flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {issue.assignedWorker.phone}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 italic text-xs">No worker assigned yet</div>
                )}
              </div>

              {/* Student Reporter Card */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <h4 className="font-semibold text-slate-700 text-xs uppercase tracking-wider mb-2 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  Reported By
                </h4>
                <div className="space-y-1 text-xs">
                  <div className="font-semibold text-slate-900">{issue.reportedBy.name}</div>
                  <div className="text-[11px] text-slate-500">
                    Reg No: <span className="font-mono text-slate-700">{issue.reportedBy.regNo}</span> • {issue.reportedBy.role}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Phone: <span className="text-slate-700">{issue.reportedBy.phone}</span>
                  </div>
                </div>
              </div>

              {/* Audit Trail Log */}
              <div>
                <h4 className="font-semibold text-slate-700 text-xs uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Audit Trail
                </h4>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {issue.auditTrail.map((log) => (
                    <div
                      key={log.id}
                      className="p-2 bg-slate-50 border-l-2 border-blue-500 rounded-r text-[11px] text-slate-600"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="font-medium text-slate-600">{log.actor}</span>
                      </div>
                      <div className="font-medium text-slate-800 mt-0.5">{log.action}</div>
                      {log.note && <div className="italic text-slate-500 mt-0.5">"{log.note}"</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Management Controls Box */}
          {userRole === 'Management' && (
            <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-blue-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-blue-700" />
                  Management Action Console
                </h4>
                <span className="text-[10px] text-blue-700 font-semibold bg-white px-2 py-0.5 rounded border border-blue-200">
                  Admin Authorized
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Update Progress Status:
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value as IssueStatus)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Reported">Reported</option>
                    <option value="Assigned">Assigned</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assign Technician:
                  </label>
                  <select
                    value={selectedWorkerId}
                    onChange={(e) => setSelectedWorkerId(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium text-slate-800 focus:ring-2 focus:ring-blue-500"
                  >
                    {workers.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.category}) - {w.phone}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1 text-xs">
                  Resolution Note / Action Remarks:
                </label>
                <input
                  type="text"
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="e.g. Broken pipe replaced and pressure tested. Area sanitized."
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-blue-700 italic">
                  📲 Updating automatically dispatches SMS updates to both student and technician.
                </span>
                <button
                  type="button"
                  onClick={handleSaveStatus}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded shadow transition cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{isUpdating ? 'Saving...' : 'Save & Dispatch Status SMS'}</span>
                </button>
              </div>

              {statusMessage && (
                <div className="p-2 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 text-xs font-semibold">
                  {statusMessage}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Reported: {new Date(issue.createdAt).toLocaleDateString()} at{' '}
            {new Date(issue.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded cursor-pointer transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
