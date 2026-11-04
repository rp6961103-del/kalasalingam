/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  CampusIssue,
  CampusWorker,
  SmsMessage,
  NotificationItem,
  CampusStats,
  CurrentUser,
  IssueCategory,
  IssueStatus,
  IssueSeverity
} from './types';
import { api } from './services/api';
import { soundAlerts } from './utils/soundAlerts';
import { Navbar } from './components/Navbar';
import { CampusMap } from './components/CampusMap';
import { ReportIssueForm } from './components/ReportIssueForm';
import { PriorityIssueList } from './components/PriorityIssueList';
import { IssueDetailModal } from './components/IssueDetailModal';
import { WorkerSmsDrawer } from './components/WorkerSmsDrawer';
import { NotificationDropdown } from './components/NotificationDropdown';
import { ManagementDashboardModal } from './components/ManagementDashboardModal';
import { LoginModal } from './components/LoginModal';
import { AuthScreen } from './components/AuthScreen';
import { DatabaseSchemaModal } from './components/DatabaseSchemaModal';
import { AlertTriangle, Sparkles, RefreshCw, Database } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Data states
  const [issues, setIssues] = useState<CampusIssue[]>([]);
  const [workers, setWorkers] = useState<CampusWorker[]>([]);
  const [smsLog, setSmsLog] = useState<SmsMessage[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [stats, setStats] = useState<CampusStats>({
    total: 8,
    open: 5,
    resolved: 2,
    inProgress: 1,
    hazards: 1,
    avgDays: 2.4,
  });

  // UI Filter states matching Figure 5/6
  const [selectedCategory, setSelectedCategory] = useState<string>('All categories');
  const [selectedStatus, setSelectedStatus] = useState<string>('All status');
  const [showHeatmap, setShowHeatmap] = useState<boolean>(false);

  // Pin & Modal selection states
  const [pinLocation, setPinLocation] = useState<{
    lat: number;
    lng: number;
    landmarkName?: string;
  } | null>(null);

  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [inspectingIssue, setInspectingIssue] = useState<CampusIssue | null>(null);

  // Drawers & Modals
  const [isSmsDrawerOpen, setIsSmsDrawerOpen] = useState(false);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Notification Banner (when new hazard or update occurs)
  const [bannerAlert, setBannerAlert] = useState<{
    title: string;
    message: string;
    ticketNo?: string;
  } | null>(null);

  // Fetch all initial data
  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    try {
      setIsRefreshing(true);
      const [fetchedIssues, fetchedStats, fetchedWorkers, fetchedSms, fetchedNotifs] =
        await Promise.all([
          api.getIssues({
            category: selectedCategory,
            status: selectedStatus,
          }),
          api.getStats(),
          currentUser.role === 'Management' ? api.getWorkers() : Promise.resolve([]),
          currentUser.role === 'Management' ? api.getSmsLog() : Promise.resolve([]),
          api.getNotifications(),
        ]);

      setIssues(fetchedIssues);
      setWorkers(fetchedWorkers);
      setStats(fetchedStats);
      setSmsLog(fetchedSms);
      setNotifications(fetchedNotifs);
    } catch (err) {
      console.error('Error fetching campus data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [currentUser, selectedCategory, selectedStatus]);

  useEffect(() => {
    let active = true;
    api.getCurrentUser()
      .then(({ user }) => {
        if (!active) return;
        setCurrentUser(user);
        localStorage.setItem('kare_user_session', JSON.stringify(user));
      })
      .catch(() => {
        localStorage.removeItem('kare_user_session');
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Map Pin Dropped
  const handlePinDropped = useCallback(
    (coords: { lat: number; lng: number; landmarkName: string }) => {
      setPinLocation(coords);
    },
    []
  );

  // Handle Issue Submission (Report an issue)
  const handleSubmitIssue = async (formData: {
    title: string;
    category: IssueCategory;
    description: string;
    locationName: string;
    lat: number;
    lng: number;
    severity: IssueSeverity;
    isHazard: boolean;
    imageUrl?: string;
  }) => {
    if (!currentUser) return;
    try {
      const response = await api.createIssue({
        ...formData,
        reportedBy: {
          name: currentUser.name,
          role: currentUser.role === 'Student' ? 'Student' : 'Staff',
          regNo: currentUser.regNo,
          phone: currentUser.phone,
        },
      });

      // Sound chime
      if (formData.isHazard) {
        soundAlerts.playHazardAlert();
      } else {
        soundAlerts.playSmsChime();
      }

      // Show temporary alert banner
      setBannerAlert({
        title: formData.isHazard ? '🚨 Critical Hazard Reported' : '📲 Issue Reported',
        message: `${response.message} Ticket #${response.issue.ticketNo}`,
        ticketNo: response.issue.ticketNo,
      });

      setTimeout(() => setBannerAlert(null), 8000);

      // Refresh data
      await fetchData();
      setPinLocation(null);
      setSelectedIssueId(response.issue.id);
    } catch (err) {
      console.error('Failed to submit issue:', err);
      throw err;
    }
  };

  // Handle Upvote
  const handleUpvote = async (issueId: string) => {
    if (!currentUser) return;
    try {
      const res = await api.upvoteIssue(issueId, currentUser.regNo);
      soundAlerts.playSuccessChime();

      setIssues((prev) =>
        prev
          .map((i) => (i.id === issueId ? { ...i, votes: res.votes, priorityScore: res.priorityScore } : i))
          .sort((a, b) => {
            if (a.isHazard && !b.isHazard && a.status !== 'Resolved') return -1;
            if (!a.isHazard && b.isHazard && b.status !== 'Resolved') return 1;
            return b.priorityScore - a.priorityScore;
          })
      );

      if (inspectingIssue?.id === issueId) {
        setInspectingIssue((prev) => (prev ? { ...prev, votes: res.votes, priorityScore: res.priorityScore } : null));
      }
    } catch (err) {
      console.error('Upvote failed:', err);
    }
  };

  // Handle Status Change (Reported -> Assigned -> In Progress -> Resolved)
  const handleStatusChange = async (
    issueId: string,
    newStatus: IssueStatus,
    note?: string,
    workerId?: string
  ) => {
    const actor = currentUser?.name || 'Facility Management';
    try {
      const res = await api.updateStatus(issueId, {
        status: newStatus,
        note,
        workerId,
        actorName: actor,
      });

      soundAlerts.playSmsChime();

      // Show confirmation banner
      setBannerAlert({
        title: `✅ Status Changed: ${newStatus}`,
        message: `Issue #${res.issue.ticketNo} status updated. ${res.message}`,
        ticketNo: res.issue.ticketNo,
      });

      setTimeout(() => setBannerAlert(null), 6000);

      // Re-fetch to guarantee sync with stats & audit trail
      await fetchData();

      if (inspectingIssue?.id === issueId) {
        setInspectingIssue(res.issue);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  // Find ticket from notification click
  const handleSelectTicketFromNotification = (ticketNo: string) => {
    const found = issues.find((i) => i.ticketNo === ticketNo);
    if (found) {
      setSelectedIssueId(found.id);
      setInspectingIssue(found);
    }
  };

  // Show on map handler
  const handleShowOnMap = (issue: CampusIssue) => {
    setSelectedIssueId(issue.id);
  };

  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;

  const handleLogout = () => {
    void api.logout().catch(() => undefined);
    localStorage.removeItem('kare_user_session');
    setCurrentUser(null);
  };

  // If user is not logged in, show the dedicated Auth & Registration Portal!
  if (!currentUser) {
    return (
      <AuthScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          localStorage.setItem('kare_user_session', JSON.stringify(user));
          setBannerAlert({
            title: `🎓 Welcome, ${user.name}`,
            message: `Authenticated as ${user.role} (${user.regNo}). Session active.`,
          });
          setTimeout(() => setBannerAlert(null), 5000);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar with Campus Identity & Stats matching Figure 5 & 6 */}
      <Navbar
        stats={stats}
        currentUser={currentUser}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
        unreadNotifsCount={unreadNotifsCount}
        onOpenNotifications={() => setIsNotifDropdownOpen(true)}
        onOpenSmsDrawer={() => setIsSmsDrawerOpen(true)}
        onOpenManagementModal={() => setIsManagementModalOpen(true)}
        onOpenSchemaModal={currentUser.role === 'Management' ? () => setIsSchemaModalOpen(true) : undefined}
        smsLogCount={smsLog.length}
        onRefresh={fetchData}
        isRefreshing={isRefreshing}
      />

      {/* Floating Real-time Status Alert Banner */}
      {bannerAlert && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 shadow-md flex items-center justify-between text-xs font-medium z-30 transition-all animate-in slide-in-from-top">
          <div className="max-w-7xl mx-auto flex items-center gap-2">
            <span className="font-bold">{bannerAlert.title}:</span>
            <span>{bannerAlert.message}</span>
          </div>
          <button
            onClick={() => setBannerAlert(null)}
            className="text-slate-900 hover:text-black font-bold ml-4 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Campus Operations Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
        {/* Left Column: Form & Priority List (matching Figure 5 & 6) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3 sm:gap-4">
          {/* Report an Issue Form */}
          <ReportIssueForm
            pinLocation={pinLocation}
            onClearPin={() => setPinLocation(null)}
            onSubmit={handleSubmitIssue}
            currentUser={currentUser}
          />

          {/* Filters & Issues (by priority) */}
          <PriorityIssueList
            issues={issues}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            selectedStatus={selectedStatus}
            onSelectStatus={setSelectedStatus}
            onSelectIssue={(issue) => setInspectingIssue(issue)}
            onShowOnMap={handleShowOnMap}
            onUpvote={handleUpvote}
            userRole={currentUser.role}
            currentUserId={currentUser.regNo}
          />
        </div>

        {/* Right Column: Interactive Leaflet Campus Map Canvas */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-[520px] lg:h-auto min-h-[500px]">
          <CampusMap
            issues={issues}
            selectedIssueId={selectedIssueId}
            onSelectIssue={(issue) => setInspectingIssue(issue)}
            pinLocation={pinLocation}
            onPinDropped={handlePinDropped}
            userRole={currentUser.role}
            onStatusChange={async (issueId, newStatus, note) => {
              await handleStatusChange(issueId, newStatus, note);
            }}
            onUpvote={handleUpvote}
            showHeatmap={showHeatmap}
            onToggleHeatmap={setShowHeatmap}
          />
        </div>
      </main>

      {/* Footer Info */}
      <footer className="bg-white border-t border-slate-200 py-2.5 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Kalasalingam Academy of Research and Education (Deemed to be University) • Anand Nagar, Krishnankoil - 626126
          </span>
          <div className="flex items-center gap-3">
            {currentUser.role === 'Management' && (
              <>
                <button
                  onClick={() => setIsSchemaModalOpen(true)}
                  className="text-indigo-600 hover:underline cursor-pointer font-medium flex items-center gap-1"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Database</span>
                </button>
                <span>•</span>
                <button
                  onClick={() => setIsSmsDrawerOpen(true)}
                  className="text-amber-600 hover:underline cursor-pointer font-medium"
                >
                  SMS Log ({smsLog.length})
                </button>
              </>
            )}
          </div>
        </div>
      </footer>

      {/* Detailed Issue Inspection Modal */}
      <IssueDetailModal
        issue={inspectingIssue}
        onClose={() => setInspectingIssue(null)}
        userRole={currentUser.role}
        workers={workers}
        onUpdateStatus={async (issueId, status, workerId, note) => {
          await handleStatusChange(issueId, status, note, workerId);
        }}
        onUpvote={handleUpvote}
        currentUserId={currentUser.regNo}
      />

      {/* Simulated Worker SMS & Gateway Drawer */}
      <WorkerSmsDrawer
        isOpen={isSmsDrawerOpen}
        onClose={() => setIsSmsDrawerOpen(false)}
        smsLog={smsLog}
        workers={workers}
      />

      {/* Automated Notifications Dropdown */}
      <NotificationDropdown
        isOpen={isNotifDropdownOpen}
        onClose={() => setIsNotifDropdownOpen(false)}
        notifications={notifications}
        onMarkAllAsRead={async () => {
          await api.markNotificationsRead();
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        }}
        onSelectTicket={handleSelectTicketFromNotification}
      />

      {/* Management Facility Dashboard Modal */}
      <ManagementDashboardModal
        isOpen={isManagementModalOpen}
        onClose={() => setIsManagementModalOpen(false)}
        workers={workers}
        issues={issues}
        stats={stats}
        onSelectWorkerIssues={(category) => {
          setSelectedCategory(category);
        }}
      />

      {/* Login / SSO Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentUser={currentUser}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setBannerAlert({
            title: `🎓 Welcome, ${user.name}`,
            message: `Authenticated as ${user.role} (${user.regNo}). Session active.`,
          });
          setTimeout(() => setBannerAlert(null), 5000);
        }}
        onLogout={handleLogout}
      />

      {/* myschema Relational Database Schema Explorer & Live Data Inspector */}
      <DatabaseSchemaModal
        isOpen={isSchemaModalOpen}
        onClose={() => setIsSchemaModalOpen(false)}
      />
    </div>
  );
}
