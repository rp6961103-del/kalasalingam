import React, { useState } from 'react';
import { CampusIssue, IssueCategory, IssueStatus, UserRole } from '../types';
import { ThumbsUp, MapPin, Eye, AlertTriangle, Clock, Search, ArrowUpDown, ChevronRight } from 'lucide-react';

interface PriorityIssueListProps {
  issues: CampusIssue[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
  onSelectIssue: (issue: CampusIssue) => void;
  onShowOnMap: (issue: CampusIssue) => void;
  onUpvote: (issueId: string) => void;
  userRole: UserRole;
  currentUserId: string;
}

export const PriorityIssueList: React.FC<PriorityIssueListProps> = ({
  issues,
  selectedCategory,
  onSelectCategory,
  selectedStatus,
  onSelectStatus,
  onSelectIssue,
  onShowOnMap,
  onUpvote,
  userRole,
  currentUserId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter issues by search query as well
  const displayedIssues = issues.filter((issue) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      issue.title.toLowerCase().includes(query) ||
      issue.description.toLowerCase().includes(query) ||
      issue.locationName.toLowerCase().includes(query) ||
      issue.ticketNo.toLowerCase().includes(query)
    );
  });

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 text-slate-800 space-y-4">
      {/* Filters Section matching Figure 5 & 6 */}
      <div>
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
          Filters
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => onSelectCategory(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="All categories">All categories</option>
              <option value="Electrical">Electrical</option>
              <option value="Plumbing">Plumbing</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Wi-Fi/Network">Wi-Fi/Network</option>
              <option value="HVAC">HVAC</option>
              <option value="Civil/Safety">Civil/Safety</option>
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => onSelectStatus(e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="All status">All status</option>
              <option value="Reported">Reported</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>
        </div>

        {/* Quick Search */}
        <div className="mt-2 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tickets, buildings, keywords..."
            className="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Issues (by priority) Section matching Figures 5 & 6 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
            Issues (by priority)
          </h3>
          <span className="text-[11px] font-semibold text-slate-500">
            {displayedIssues.length} {displayedIssues.length === 1 ? 'issue' : 'issues'}
          </span>
        </div>

        {/* Priority explanation notice */}
        <div className="mb-3 px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-800 leading-tight">
          <span className="font-semibold">Priority Formula:</span> Severity + Votes (×3) + Age + Hazards straight to #1
        </div>

        {displayedIssues.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded border border-dashed border-slate-200">
            No issues match current filters.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {displayedIssues.map((issue, index) => {
              const hasUpvoted = issue.upvotedBy.includes(currentUserId);

              // Status styles matching screenshot
              let statusBadgeClass = 'bg-red-100 text-red-800 border-red-300';
              if (issue.status === 'Assigned') {
                statusBadgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
              } else if (issue.status === 'In Progress') {
                statusBadgeClass = 'bg-blue-100 text-blue-800 border-blue-300';
              } else if (issue.status === 'Resolved') {
                statusBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
              }

              return (
                <div
                  key={issue.id}
                  className={`p-3 rounded-lg border transition-all hover:shadow-sm ${
                    issue.isHazard && issue.status !== 'Resolved'
                      ? 'bg-red-50/70 border-red-300 ring-1 ring-red-300'
                      : issue.status === 'Resolved'
                      ? 'bg-slate-50/80 border-slate-200 opacity-90'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Hazard Banner */}
                      {issue.isHazard && issue.status !== 'Resolved' && (
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded mb-1 animate-pulse">
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                          <span>SAFETY HAZARD #1 PRIORITY</span>
                        </div>
                      )}

                      <h4
                        onClick={() => onSelectIssue(issue)}
                        className="text-xs font-bold text-slate-900 truncate hover:text-blue-600 cursor-pointer"
                        title={issue.title}
                      >
                        {issue.title}
                      </h4>

                      {/* Badges matching Figure 5/6 */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${statusBadgeClass}`}>
                          {issue.status}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          {issue.category}
                        </span>
                        <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-0.5">
                          👍 {issue.votes}
                        </span>
                      </div>

                      {/* Location snippet */}
                      <p className="text-[11px] text-slate-500 mt-1 truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span>{issue.locationName}</span>
                      </p>
                    </div>

                    {/* Priority score & actions */}
                    <div className="text-right flex flex-col items-end flex-shrink-0">
                      <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        score {issue.priorityScore}
                      </span>

                      <div className="mt-2 flex items-center gap-1">
                        <button
                          onClick={() => onUpvote(issue.id)}
                          title="Upvote to raise facility priority"
                          className={`p-1 rounded text-xs transition cursor-pointer ${
                            hasUpvoted
                              ? 'bg-amber-100 text-amber-800 font-bold'
                              : 'bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-700'
                          }`}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onShowOnMap(issue)}
                          className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline font-semibold px-1 py-0.5 cursor-pointer whitespace-nowrap"
                        >
                          Show on map
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
