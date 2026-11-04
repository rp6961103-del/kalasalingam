import React from 'react';
import { CampusStats, CurrentUser } from '../types';
import {
  Bell,
  Smartphone,
  ShieldCheck,
  User,
  LogOut,
  AlertTriangle,
  Clock,
  CheckCircle,
  FileText,
  Building,
  RefreshCw,
  Users,
  Database
} from 'lucide-react';

interface NavbarProps {
  stats: CampusStats;
  currentUser: CurrentUser;
  onOpenLoginModal: () => void;
  onLogout: () => void;
  unreadNotifsCount: number;
  onOpenNotifications: () => void;
  onOpenSmsDrawer: () => void;
  onOpenManagementModal: () => void;
  onOpenSchemaModal?: () => void;
  smsLogCount: number;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  stats,
  currentUser,
  onOpenLoginModal,
  onLogout,
  unreadNotifsCount,
  onOpenNotifications,
  onOpenSmsDrawer,
  onOpenManagementModal,
  onOpenSchemaModal,
  smsLogCount,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <header className="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-40">
      {/* Top Banner Row */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Campus Identity matching Figure 5/6 */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-bold text-white shadow">
              📍
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base sm:text-lg tracking-tight text-white">
                  Campus Issue Reporter
                </span>
                <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider hidden sm:inline-block">
                  KARE Krishnankoil
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Kalasalingam Academy of Research and Education • Facility & Maintenance Operations
              </p>
            </div>
          </div>

          {/* Quick Refresh Icon for mobile */}
          <button
            onClick={onRefresh}
            title="Refresh issues"
            className="md:hidden p-1.5 text-slate-400 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Center: Live Facility Stats Counters strip matching Figures 5 & 6 */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 bg-slate-800/80 px-3 py-1 rounded-lg border border-slate-700/80 text-center w-full md:w-auto overflow-x-auto">
          <div className="px-2 py-0.5">
            <span className="block text-sm sm:text-base font-bold text-white leading-none">
              {stats.total}
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Total</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-700" />
          <div className="px-2 py-0.5">
            <span className="block text-sm sm:text-base font-bold text-red-400 leading-none">
              {stats.open}
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Open</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-700" />
          <div className="px-2 py-0.5">
            <span className="block text-sm sm:text-base font-bold text-blue-400 leading-none">
              {stats.inProgress}
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Active</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-700" />
          <div className="px-2 py-0.5">
            <span className="block text-sm sm:text-base font-bold text-emerald-400 leading-none">
              {stats.resolved}
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Resolved</span>
          </div>
          <div className="h-6 w-[1px] bg-slate-700" />
          <div className="px-2 py-0.5">
            <span className="block text-sm sm:text-base font-bold text-amber-300 leading-none">
              {stats.avgDays}
            </span>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Avg days</span>
          </div>
        </div>

        {/* Right Action Tools: Notifications, SMS Drawer, Schema Explorer, Role Switcher matching Figure 5/6 */}
        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-end">
          {/* Database Schema Explorer Button */}
          {onOpenSchemaModal && (
            <button
              onClick={onOpenSchemaModal}
              title="Inspect 'myschema' Database Structure, Tables, & Live Records"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded border border-slate-700 text-indigo-300 hover:text-indigo-200 transition cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">myschema DB</span>
            </button>
          )}

          {/* SMS Worker Dispatch Live Drawer Button */}
          {currentUser.role === 'Management' && (
            <button
              onClick={onOpenSmsDrawer}
              title="View SMS delivery log"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded border border-slate-700 text-amber-300 transition cursor-pointer relative"
            >
              <Smartphone className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">SMS Log</span>
              <span className="bg-amber-500/20 text-amber-300 text-[10px] px-1 rounded border border-amber-500/40 font-bold">
                {smsLogCount}
              </span>
            </button>
          )}

          {/* Automated Notification Bell */}
          <button
            onClick={onOpenNotifications}
            title="Automated Status Notifications"
            className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 text-slate-200 transition relative cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Management Dashboard Modal Trigger (if Management) */}
          {currentUser.role === 'Management' && (
            <button
              onClick={onOpenManagementModal}
              title="Facility Management Roster & SLA Metrics"
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 bg-blue-700 hover:bg-blue-600 text-xs font-semibold rounded text-white transition cursor-pointer shadow-sm"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Staff Roster</span>
            </button>
          )}

          {/* Role Status & Switcher matching Figure 5/6: "👤 Admin Logout" or "👤 Student Switch" */}
          <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 p-0.5">
            <button
              onClick={onOpenLoginModal}
              title="Click to view User Profile, Register New Account, or Switch"
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs hover:bg-slate-700/60 rounded transition cursor-pointer text-left"
            >
              <span className="text-blue-400 text-xs">👤</span>
              <div className="leading-tight">
                <span className="font-semibold text-slate-200 block text-xs">
                  {currentUser.role === 'Management' ? 'Admin' : 'Student'}
                </span>
                <span className="text-[10px] text-slate-400 block truncate max-w-[85px]">
                  {currentUser.name.split(' ')[0]}
                </span>
              </div>
            </button>

            <button
              onClick={onOpenLoginModal}
              title="Register a New Student / Admin or Switch Account"
              className="text-[11px] px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-amber-300 font-medium transition cursor-pointer border-l border-slate-600 hidden sm:inline-block"
            >
              + Register / Switch
            </button>

            <button
              onClick={onLogout}
              title="Log out of current account and return to Login / Register Portal"
              className="text-[11px] px-2.5 py-1 bg-red-950/80 hover:bg-red-900 border-l border-slate-700 rounded text-red-200 hover:text-white font-bold transition cursor-pointer flex items-center gap-1"
            >
              <LogOut className="w-3 h-3" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
