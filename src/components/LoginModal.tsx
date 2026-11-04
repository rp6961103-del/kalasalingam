import React, { useState } from 'react';
import { CurrentUser } from '../types';
import { api } from '../services/api';
import { soundAlerts } from '../utils/soundAlerts';
import {
  X,
  GraduationCap,
  Building2,
  UserPlus,
  LogIn,
  ShieldCheck,
  User,
  Lock,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  Building
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CurrentUser | null;
  onLoginSuccess: (user: CurrentUser) => void;
  onLogout?: () => void;
}

type ModalTab = 'student_login' | 'admin_login' | 'student_register' | 'admin_register';

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLoginSuccess,
  onLogout,
}) => {
  if (!isOpen) return null;

  const [tab, setTab] = useState<ModalTab>(
    currentUser?.role === 'Management' ? 'admin_login' : 'student_login'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Student Login
  const [studentId, setStudentId] = useState(currentUser?.role === 'Student' ? currentUser.regNo : '');
  const [studentPassword, setStudentPassword] = useState('');

  // Admin Login
  const [adminId, setAdminId] = useState(
    currentUser?.role === 'Management' ? currentUser.regNo : ''
  );
  const [adminPassword, setAdminPassword] = useState('');

  // New Student Register
  const [regStudentName, setRegStudentName] = useState('');
  const [regStudentId, setRegStudentId] = useState('');
  const [regStudentEmail, setRegStudentEmail] = useState('');
  const [regStudentPhone, setRegStudentPhone] = useState('');
  const [regStudentDept, setRegStudentDept] = useState('B.Tech Computer Science & Engineering');
  const [regStudentHostel, setRegStudentHostel] = useState('Bharathi Boys Hostel (Hostel 2)');
  const [regStudentPassword, setRegStudentPassword] = useState('');

  // New Admin Register
  const [regAdminName, setRegAdminName] = useState('');
  const [regAdminId, setRegAdminId] = useState('');
  const [regAdminPhone, setRegAdminPhone] = useState('');
  const [regAdminDept, setRegAdminDept] = useState('Estate & Facility Works Directorate');
  const [regAdminDesignation, setRegAdminDesignation] = useState('Campus Facility Superintendent');
  const [regAdminPassword, setRegAdminPassword] = useState('');

  // Submit Login
  const handleLogin = async (role: 'Student' | 'Management') => {
    try {
      setLoading(true);
      setError(null);
      const identifier = role === 'Student' ? studentId : adminId;
      const pwd = role === 'Student' ? studentPassword : adminPassword;

      if (!identifier.trim()) {
        throw new Error(`Please enter your ${role === 'Student' ? 'Student Register No' : 'Staff ID'}`);
      }

      const res = await api.login({ role, identifier: identifier.trim(), password: pwd });
      soundAlerts.playSuccessChime();
      localStorage.setItem('kare_user_session', JSON.stringify(res.user));
      onLoginSuccess(res.user);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please check ID.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Submit Registration
  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      if (!regStudentName.trim() || !regStudentId.trim() || !regStudentEmail.trim() || !regStudentPhone.trim()) {
        throw new Error('Name, register number, email, and phone are required');
      }
      if (regStudentPassword.length < 12) {
        throw new Error('Password must be at least 12 characters');
      }

      const res = await api.register({
        name: regStudentName.trim(),
        regNo: regStudentId.trim(),
        role: 'Student',
        email: regStudentEmail.trim(),
        phone: regStudentPhone.trim(),
        department: regStudentDept,
        hostel: regStudentHostel,
        password: regStudentPassword,
      });

      soundAlerts.playSuccessChime();
      setSuccess(`Registration successful! Welcome ${res.user.name}`);
      localStorage.setItem('kare_user_session', JSON.stringify(res.user));
      setTimeout(() => {
        onLoginSuccess(res.user);
        onClose();
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      if (!regAdminName.trim() || !regAdminId.trim()) {
        throw new Error('Name and Staff ID are required');
      }

      const res = await api.register({
        name: regAdminName.trim(),
        regNo: regAdminId.trim(),
        role: 'Management',
        phone: regAdminPhone.trim(),
        department: regAdminDept,
        designation: regAdminDesignation,
        password: regAdminPassword,
      });

      soundAlerts.playSuccessChime();
      setSuccess(`Admin registered! Welcome ${res.user.name}`);
      localStorage.setItem('kare_user_session', JSON.stringify(res.user));
      setTimeout(() => {
        onLoginSuccess(res.user);
        onClose();
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Admin registration failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white font-bold text-lg shadow-md border border-red-400">
              📍
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg">KARE Auth Portal</h3>
                <span className="text-[10px] bg-red-900 text-red-200 px-1.5 py-0.5 rounded font-mono font-semibold">
                  Campus ID
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Kalasalingam Academy of Research and Education
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

        {/* Active Session Info Bar */}
        {currentUser && (
          <div className="bg-blue-50/90 border-b border-blue-200 px-4 py-2 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-slate-500">Logged in:</span>
              <span className="font-bold text-slate-900">{currentUser.name}</span>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold uppercase">
                {currentUser.role}
              </span>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="text-red-600 hover:text-red-800 font-bold hover:underline cursor-pointer text-xs ml-2 flex-shrink-0"
              >
                Sign Out
              </button>
            )}
          </div>
        )}

        {/* 4 Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-center">
          <button
            type="button"
            onClick={() => {
              setTab('student_login');
              setError(null);
            }}
            className={`py-2.5 px-1 border-b-2 transition cursor-pointer ${
              tab === 'student_login'
                ? 'border-blue-600 text-blue-700 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Student Login
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('admin_login');
              setError(null);
            }}
            className={`py-2.5 px-1 border-b-2 transition cursor-pointer ${
              tab === 'admin_login'
                ? 'border-indigo-600 text-indigo-700 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Admin Login
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('student_register');
              setError(null);
            }}
            className={`py-2.5 px-1 border-b-2 transition cursor-pointer ${
              tab === 'student_register'
                ? 'border-emerald-600 text-emerald-700 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            + New Student
          </button>

        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto max-h-[70vh] text-xs">
          {error && (
            <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-700 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* TAB 1: STUDENT LOGIN */}
          {tab === 'student_login' && (
            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Student Register Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g. 9921004123"
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-500"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
                </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-8 pr-9 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleLogin('Student')}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Logging in...' : 'Login as Student'}</span>
              </button>
            </div>
          )}

          {/* TAB 2: ADMIN LOGIN */}
          {tab === 'admin_login' && (
            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Admin Staff ID
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={adminId}
                    onChange={(e) => setAdminId(e.target.value)}
                    placeholder="e.g. KARE-FAC-019"
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                  <Building className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Admin Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full pl-8 pr-9 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleLogin('Management')}
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{loading ? 'Logging in...' : 'Login as Admin'}</span>
              </button>
            </div>
          )}

          {/* TAB 3: REGISTER NEW STUDENT */}
          {tab === 'student_register' && (
            <form onSubmit={handleRegisterStudent} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={regStudentName}
                    onChange={(e) => setRegStudentName(e.target.value)}
                    placeholder="e.g. Arun S."
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Register No</label>
                  <input
                    type="text"
                    required
                    value={regStudentId}
                    onChange={(e) => setRegStudentId(e.target.value)}
                    placeholder="e.g. 9923004567"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Phone</label>
                  <input
                    type="tel"
                    required
                    value={regStudentPhone}
                    onChange={(e) => setRegStudentPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hostel Block</label>
                  <select
                    value={regStudentHostel}
                    onChange={(e) => setRegStudentHostel(e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs"
                  >
                    <option value="Bharathi Boys Hostel (Hostel 1)">Bharathi Boys Hostel 1</option>
                    <option value="Bharathi Boys Hostel (Hostel 2)">Bharathi Boys Hostel 2</option>
                    <option value="Bharathi Boys Hostel (Hostel 3)">Bharathi Boys Hostel 3</option>
                    <option value="Mother Teresa Girls Hostel (Block A)">Mother Teresa Girls A</option>
                    <option value="Mother Teresa Girls Hostel (Block B)">Mother Teresa Girls B</option>
                    <option value="Day Scholar">Day Scholar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department</label>
                <select
                  value={regStudentDept}
                  onChange={(e) => setRegStudentDept(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs"
                >
                  <option value="B.Tech Computer Science & Engineering">B.Tech Computer Science</option>
                  <option value="B.Tech Electronics & Communication">B.Tech ECE</option>
                  <option value="B.Tech Mechanical Engineering">B.Tech Mechanical</option>
                  <option value="B.Tech Civil Engineering">B.Tech Civil</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={regStudentEmail}
                  onChange={(e) => setRegStudentEmail(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                />
                </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password (minimum 12 characters)</label>
                <input
                  type="password"
                  required
                  minLength={12}
                  value={regStudentPassword}
                  onChange={(e) => setRegStudentPassword(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow cursor-pointer transition"
              >
                {loading ? 'Creating Student Profile...' : 'Complete Student Registration'}
              </button>
            </form>
          )}

          {/* TAB 4: REGISTER NEW ADMIN */}
          {tab === 'admin_register' && (
            <form onSubmit={handleRegisterAdmin} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={regAdminName}
                    onChange={(e) => setRegAdminName(e.target.value)}
                    placeholder="e.g. Er. K. Ramanathan"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Staff ID / Code</label>
                  <input
                    type="text"
                    required
                    value={regAdminId}
                    onChange={(e) => setRegAdminId(e.target.value)}
                    placeholder="e.g. KARE-EST-045"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Phone</label>
                  <input
                    type="tel"
                    required
                    value={regAdminPhone}
                    onChange={(e) => setRegAdminPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={regAdminDesignation}
                    onChange={(e) => setRegAdminDesignation(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department</label>
                <select
                  value={regAdminDept}
                  onChange={(e) => setRegAdminDept(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs"
                >
                  <option value="Estate & Facility Works Directorate">Estate & Works Directorate</option>
                  <option value="Campus Safety & Civil Infrastructure">Campus Safety & Civil</option>
                  <option value="Electrical & Power Substation Wing">Electrical Maintenance Wing</option>
                  <option value="Plumbing, Water Works & Sanitation">Plumbing & Water Supply</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Admin Password</label>
                <input
                  type="password"
                  required
                  value={regAdminPassword}
                  onChange={(e) => setRegAdminPassword(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow cursor-pointer transition"
              >
                {loading ? 'Creating Admin Profile...' : 'Complete Admin Registration'}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-400">
          Kalasalingam University Facility Management Central Portal
        </div>
      </div>
    </div>
  );
};
