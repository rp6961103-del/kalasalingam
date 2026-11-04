import React, { useState } from 'react';
import { CampusWorker, CampusIssue, CampusStats } from '../types';
import {
  X,
  Users,
  BarChart3,
  CheckCircle,
  Clock,
  Phone,
  AlertTriangle,
  Download,
  ShieldCheck,
  Wrench,
  Search
} from 'lucide-react';

interface ManagementDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  workers: CampusWorker[];
  issues: CampusIssue[];
  stats: CampusStats;
  onSelectWorkerIssues: (category: string) => void;
}

export const ManagementDashboardModal: React.FC<ManagementDashboardModalProps> = ({
  isOpen,
  onClose,
  workers,
  issues,
  stats,
  onSelectWorkerIssues,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  // Compute category statistics
  const categoryCounts = issues.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Export issues as CSV
  const handleExportCSV = () => {
    const headers = ['TicketNo', 'Title', 'Category', 'Status', 'Severity', 'PriorityScore', 'Votes', 'Location', 'AssignedWorker', 'ReportedBy', 'CreatedAt'];
    const rows = issues.map((i) => [
      i.ticketNo,
      `"${i.title.replace(/"/g, '""')}"`,
      i.category,
      i.status,
      i.severity,
      i.priorityScore,
      i.votes,
      `"${i.locationName.replace(/"/g, '""')}"`,
      i.assignedWorker?.name || 'Unassigned',
      i.reportedBy.name,
      i.createdAt,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `KARE_Facility_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredWorkers = workers.filter((w) =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                Kalasalingam University • Facility Operations Roster & SLA
              </h2>
              <p className="text-xs text-slate-400">
                Staff dispatch management, active technician workloads, and campus performance
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

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs sm:text-sm">
          {/* Executive Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Total Campus Tickets
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Across all KARE sectors</div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
                Pending / In Progress
              </div>
              <div className="text-2xl font-bold text-amber-700 mt-1">
                {stats.open}
              </div>
              <div className="text-[10px] text-amber-600 mt-0.5">Active field tasks</div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                Resolved Ratio
              </div>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
              </div>
              <div className="text-[10px] text-emerald-600 mt-0.5">
                {stats.resolved} of {stats.total} closed
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider">
                Avg Resolution SLA
              </div>
              <div className="text-2xl font-bold text-blue-700 mt-1">
                {stats.avgDays} <span className="text-sm font-normal">days</span>
              </div>
              <div className="text-[10px] text-blue-600 mt-0.5">Target: &lt; 3.0 days</div>
            </div>
          </div>

          {/* Technicians & Workers Roster Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-blue-600" />
                Campus Maintenance Crew Roster
              </h3>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search technician..."
                    className="pl-7 pr-3 py-1 text-xs border border-slate-300 rounded bg-slate-50 focus:bg-white"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1.5" />
                </div>

                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                >
                  <Download className="w-3.5 h-3.5" /> Export CSV
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 font-semibold text-slate-700">
                    <th className="p-2.5">Technician</th>
                    <th className="p-2.5">Trade / Specialty</th>
                    <th className="p-2.5">Phone Contact</th>
                    <th className="p-2.5 text-center">Active Workload</th>
                    <th className="p-2.5">Duty Status</th>
                    <th className="p-2.5 text-right">Quick Filter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredWorkers.map((worker) => (
                    <tr key={worker.id} className="hover:bg-slate-50">
                      <td className="p-2.5 flex items-center gap-2">
                        <img
                          src={worker.avatar}
                          alt={worker.name}
                          className="w-7 h-7 rounded-full object-cover border border-slate-300"
                        />
                        <span className="font-bold text-slate-900">{worker.name}</span>
                      </td>
                      <td className="p-2.5">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 font-medium rounded">
                          {worker.category}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-slate-600">
                        {worker.phone}
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-bold ${
                            worker.activeIssues > 1
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {worker.activeIssues} {worker.activeIssues === 1 ? 'task' : 'tasks'}
                        </span>
                      </td>
                      <td className="p-2.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          {worker.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          onClick={() => {
                            onSelectWorkerIssues(worker.category);
                            onClose();
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-semibold cursor-pointer"
                        >
                          View Tasks →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Category Distribution Bar */}
          <div className="space-y-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700">
              Campus Service Request Distribution by Trade
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              {Object.entries(categoryCounts).map(([cat, count]) => (
                <div key={cat} className="p-2.5 bg-slate-50 border border-slate-200 rounded text-center">
                  <span className="text-[11px] font-semibold text-slate-600 block truncate">{cat}</span>
                  <span className="text-lg font-bold text-slate-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            KARE Central Facilities & Estate Office • Srivilliputtur, TN
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded font-semibold cursor-pointer transition"
          >
            Close Console
          </button>
        </div>
      </div>
    </div>
  );
};
