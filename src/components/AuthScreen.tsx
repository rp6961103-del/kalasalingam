import React, { useState } from 'react';
import { CurrentUser, UserRole } from '../types';
import { api } from '../services/api';
import { soundAlerts } from '../utils/soundAlerts';
import {
  GraduationCap,
  Building2,
  UserPlus,
  LogIn,
  ShieldCheck,
  User,
  Lock,
  Phone,
  Mail,
  Home,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  Building,
  KeyRound,
} from 'lucide-react';

interface AuthScreenProps {
  onLoginSuccess: (user: CurrentUser) => void;
}

type AuthMode = 'student_login' | 'admin_login' | 'student_register' | 'admin_register';

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<AuthMode>('student_login');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Student Login State
  const [studentLoginId, setStudentLoginId] = useState('');
  const [studentLoginPassword, setStudentLoginPassword] = useState('');

  // Admin Login State
  const [adminLoginId, setAdminLoginId] = useState('');
  const [adminLoginPassword, setAdminLoginPassword] = useState('');

  // Student Registration State
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentRegNo, setNewStudentRegNo] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentDept, setNewStudentDept] = useState('B.Tech Computer Science & Engineering');
  const [newStudentHostel, setNewStudentHostel] = useState('Bharathi Boys Hostel (Hostel 2)');
  const [newStudentPassword, setNewStudentPassword] = useState('');

  // Admin Registration State
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminStaffId, setNewAdminStaffId] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPhone, setNewAdminPhone] = useState('');
  const [newAdminDept, setNewAdminDept] = useState('Estate & Facility Works Directorate');
  const [newAdminDesignation, setNewAdminDesignation] = useState('Campus Facility Manager');
  const [newAdminPassword, setNewAdminPassword] = useState('');

  // Student Login Submit
  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      if (!studentLoginId.trim()) {
        throw new Error('Please enter your Student Register Number');
      }

      const res = await api.login({
        role: 'Student',
        identifier: studentLoginId.trim(),
        password: studentLoginPassword,
      });

      soundAlerts.playSuccessChime();
      localStorage.setItem('kare_user_session', JSON.stringify(res.user));
      onLoginSuccess(res.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // Admin Login Submit
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      if (!adminLoginId.trim()) {
        throw new Error('Please enter your Admin Staff ID');
      }

      const res = await api.login({
        role: 'Management',
        identifier: adminLoginId.trim(),
        password: adminLoginPassword,
      });

      soundAlerts.playSuccessChime();
      localStorage.setItem('kare_user_session', JSON.stringify(res.user));
      onLoginSuccess(res.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Admin login failed. Please verify Staff ID.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // Student Registration Submit
  const handleStudentRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      if (!newStudentName.trim() || !newStudentRegNo.trim() || !newStudentEmail.trim() || !newStudentPhone.trim()) {
        throw new Error('Name, register number, email, and phone are required');
      }
      if (newStudentPassword.length < 12) {
        throw new Error('Password must be at least 12 characters');
      }

      const res = await api.register({
        name: newStudentName.trim(),
        regNo: newStudentRegNo.trim(),
        role: 'Student',
        email: newStudentEmail.trim(),
        phone: newStudentPhone.trim(),
        department: newStudentDept,
        hostel: newStudentHostel,
        password: newStudentPassword,
      });

      soundAlerts.playSuccessChime();
      setSuccessMessage(`Registration successful! Logged in as ${res.user.name}.`);
      localStorage.setItem('kare_user_session', JSON.stringify(res.user));
      setTimeout(() => {
        onLoginSuccess(res.user);
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed. ID may already exist.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // Admin Registration Submit
  const handleAdminRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      if (!newAdminName.trim() || !newAdminStaffId.trim()) {
        throw new Error('Full Name and Staff ID are mandatory');
      }

      const res = await api.register({
        name: newAdminName.trim(),
        regNo: newAdminStaffId.trim(),
        role: 'Management',
        email: newAdminEmail.trim() || `${newAdminStaffId.trim().toLowerCase()}@klu.ac.in`,
        phone: newAdminPhone.trim(),
        department: newAdminDept,
        designation: newAdminDesignation,
        password: newAdminPassword,
      });

      soundAlerts.playSuccessChime();
      setSuccessMessage(`Registration successful! Logged in as Admin: ${res.user.name}.`);
      localStorage.setItem('kare_user_session', JSON.stringify(res.user));
      setTimeout(() => {
        onLoginSuccess(res.user);
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Admin registration failed. Staff ID may already exist.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col justify-center items-center p-3 sm:p-6 text-slate-800">
      {/* Brand & University Crest Banner */}
      <div className="max-w-xl w-full text-center mb-4 sm:mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-600 text-white font-bold text-2xl shadow-xl border-2 border-red-400 mb-2">
          📍
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Kalasalingam Academy of Research and Education
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
          Campus Facility Management & Incident Operations Portal
        </p>
        <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] text-amber-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Central Authentication Service (KARE SIS & Estate Division)</span>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
        {/* Navigation Tabs (4 Modes) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 border-b border-slate-200 bg-slate-50 text-xs font-bold text-center">
          <button
            type="button"
            onClick={() => {
              setMode('student_login');
              setErrorMessage(null);
            }}
            className={`py-3 px-2 flex flex-col items-center justify-center gap-1 border-b-2 transition cursor-pointer ${
              mode === 'student_login'
                ? 'border-blue-600 text-blue-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-blue-600" />
            <span className="truncate">Student Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('admin_login');
              setErrorMessage(null);
            }}
            className={`py-3 px-2 flex flex-col items-center justify-center gap-1 border-b-2 transition cursor-pointer ${
              mode === 'admin_login'
                ? 'border-indigo-600 text-indigo-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4 text-indigo-600" />
            <span className="truncate">Admin Login</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('student_register');
              setErrorMessage(null);
            }}
            className={`py-3 px-2 flex flex-col items-center justify-center gap-1 border-b-2 transition cursor-pointer ${
              mode === 'student_register'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <UserPlus className="w-4 h-4 text-emerald-600" />
            <span className="truncate">New Student</span>
          </button>

        </div>

        {/* Form Content */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Error & Success Messages */}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-emerald-800 text-xs flex items-center gap-2 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* TAB 1: STUDENT LOGIN */}
          {mode === 'student_login' && (
            <form onSubmit={handleStudentLogin} className="space-y-3.5 text-xs">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                  Student Portal Login
                </h3>
                <p className="text-[11px] text-slate-500">
                  Access campus map, drop facility issue pins, and track resolution progress.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Student Register Number / Email
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={studentLoginId}
                    onChange={(e) => setStudentLoginId(e.target.value)}
                    placeholder="e.g. 9921004123 or 9921004123@klu.ac.in"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono text-xs"
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={studentLoginPassword}
                    onChange={(e) => setStudentLoginPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Login as Student</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <span className="text-[11px] text-slate-500">
                  New to Kalasalingam University?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('student_register')}
                    className="text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Register as a New Student →
                  </button>
                </span>
              </div>
            </form>
          )}

          {/* TAB 2: ADMIN LOGIN */}
          {mode === 'admin_login' && (
            <form onSubmit={handleAdminLogin} className="space-y-3.5 text-xs">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                  Management & Facility Admin Login
                </h3>
                <p className="text-[11px] text-slate-500">
                  Manage worker rosters, change statuses, dispatch technician SMS, and track campus SLAs.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Staff ID / Employee Code
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={adminLoginId}
                    onChange={(e) => setAdminLoginId(e.target.value)}
                    placeholder="e.g. KARE-FAC-019"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-xs"
                  />
                  <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Facility Admin Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={adminLoginPassword}
                    onChange={(e) => setAdminLoginPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full pl-9 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                {loading ? (
                  <span>Authenticating Admin...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Login to Management Console</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <span className="text-[11px] text-slate-500">
                  Management accounts are provisioned by an administrator.
                </span>
              </div>
            </form>
          )}

          {/* TAB 3: REGISTER AS STUDENT */}
          {mode === 'student_register' && (
            <form onSubmit={handleStudentRegister} className="space-y-3 text-xs">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  Register as a New Student
                </h3>
                <p className="text-[11px] text-slate-500">
                  Create your student profile to report issues, upvote tickets, and receive SMS updates.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="e.g. Arvind R."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Register Number</label>
                  <input
                    type="text"
                    required
                    value={newStudentRegNo}
                    onChange={(e) => setNewStudentRegNo(e.target.value)}
                    placeholder="e.g. 9923001234"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Phone (for SMS)</label>
                  <input
                    type="tel"
                    required
                    value={newStudentPhone}
                    onChange={(e) => setNewStudentPhone(e.target.value)}
                    placeholder="+91XXXXXXXXXX"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">University Email</label>
                  <input
                    type="email"
                    value={newStudentEmail}
                    onChange={(e) => setNewStudentEmail(e.target.value)}
                    placeholder="e.g. 9923001234@klu.ac.in"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={newStudentDept}
                    onChange={(e) => setNewStudentDept(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="B.Tech Computer Science & Engineering">B.Tech Computer Science</option>
                    <option value="B.Tech Information Technology">B.Tech IT</option>
                    <option value="B.Tech Electronics & Communication">B.Tech ECE</option>
                    <option value="B.Tech Electrical & Electronics">B.Tech EEE</option>
                    <option value="B.Tech Mechanical Engineering">B.Tech Mechanical</option>
                    <option value="B.Tech Civil Engineering">B.Tech Civil</option>
                    <option value="B.Tech Biotechnology">B.Tech Biotechnology</option>
                    <option value="School of Architecture (KARE)">B.Arch Architecture</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hostel Residence</label>
                  <select
                    value={newStudentHostel}
                    onChange={(e) => setNewStudentHostel(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Bharathi Boys Hostel (Hostel 1)">Bharathi Boys Hostel 1</option>
                    <option value="Bharathi Boys Hostel (Hostel 2)">Bharathi Boys Hostel 2</option>
                    <option value="Bharathi Boys Hostel (Hostel 3)">Bharathi Boys Hostel 3</option>
                    <option value="Bharathi Boys Hostel (Hostel 4)">Bharathi Boys Hostel 4</option>
                    <option value="Mother Teresa Girls Hostel (Block A)">Mother Teresa Girls Hostel A</option>
                    <option value="Mother Teresa Girls Hostel (Block B)">Mother Teresa Girls Hostel B</option>
                    <option value="Day Scholar (Transit)">Day Scholar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Create Password</label>
                <input
                  type="password"
                  required
                  value={newStudentPassword}
                  onChange={(e) => setNewStudentPassword(e.target.value)}
                  placeholder="Create password"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                {loading ? (
                  <span>Registering Account...</span>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Complete Student Registration & Enter Portal</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <span className="text-[11px] text-slate-500">
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('student_login')}
                    className="text-emerald-700 font-bold hover:underline cursor-pointer"
                  >
                    Sign in to Student Account →
                  </button>
                </span>
              </div>
            </form>
          )}

          {/* TAB 4: REGISTER AS ADMIN */}
          {mode === 'admin_register' && (
            <form onSubmit={handleAdminRegister} className="space-y-3 text-xs">
              <div className="border-b border-slate-100 pb-2">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  Register as Management / Facility Admin
                </h3>
                <p className="text-[11px] text-slate-500">
                  Register facility directors, engineers, or department dispatchers.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    placeholder="e.g. Er. K. Ramanathan"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-amber-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Staff ID / Code</label>
                  <input
                    type="text"
                    required
                    value={newAdminStaffId}
                    onChange={(e) => setNewAdminStaffId(e.target.value)}
                    placeholder="e.g. KARE-EST-045"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mobile Contact</label>
                  <input
                    type="tel"
                    required
                    value={newAdminPhone}
                    onChange={(e) => setNewAdminPhone(e.target.value)}
                    placeholder="+91XXXXXXXXXX"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="facility@klu.ac.in"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Operational Wing</label>
                  <select
                    value={newAdminDept}
                    onChange={(e) => setNewAdminDept(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-xs focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Estate & Facility Works Directorate">Estate & Works Directorate</option>
                    <option value="Campus Safety & Civil Infrastructure">Campus Safety & Civil</option>
                    <option value="Electrical & Power Substation Wing">Electrical Maintenance Wing</option>
                    <option value="Plumbing, Water Works & Sanitation">Plumbing & Water Supply</option>
                    <option value="Campus IT & Wi-Fi Operations">Campus IT Network</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={newAdminDesignation}
                    onChange={(e) => setNewAdminDesignation(e.target.value)}
                    placeholder="e.g. Senior Project Engineer"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Admin Password</label>
                <input
                  type="password"
                  required
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="Create admin password"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                {loading ? (
                  <span>Registering Administrator...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Complete Admin Registration & Open Console</span>
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <span className="text-[11px] text-slate-500">
                  Already have an admin account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('admin_login')}
                    className="text-amber-700 font-bold hover:underline cursor-pointer"
                  >
                    Sign in as Admin →
                  </button>
                </span>
              </div>
            </form>
          )}
        </div>

      </div>

      <div className="mt-4 text-[11px] text-slate-400 text-center">
        Kalasalingam Academy of Research and Education • Anand Nagar, Krishnankoil - 626126, Tamil Nadu
      </div>
    </div>
  );
};
