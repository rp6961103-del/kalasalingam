export type IssueCategory =
  | 'Electrical'
  | 'Plumbing'
  | 'Cleaning'
  | 'Wi-Fi/Network'
  | 'HVAC'
  | 'Civil/Safety';

export type IssueStatus = 'Reported' | 'Assigned' | 'In Progress' | 'Resolved';

export type IssueSeverity = 'Low' | 'Medium' | 'High' | 'Hazard';

export interface CampusWorker {
  id: string;
  name: string;
  phone: string;
  role: string;
  category: IssueCategory;
  avatar: string;
  status: 'Available' | 'On Task' | 'Off Duty';
  activeIssues: number;
}

export interface IssueAuditLog {
  id: string;
  timestamp: string;
  status: IssueStatus;
  action: string;
  actor: string;
  note?: string;
}

export interface CampusIssue {
  id: string;
  ticketNo: string;
  title: string;
  category: IssueCategory;
  description: string;
  locationName: string;
  lat: number;
  lng: number;
  latitude?: number;
  longitude?: number;
  status: IssueStatus;
  severity: IssueSeverity;
  isHazard: boolean;
  votes: number;
  upvotedBy: string[];
  priorityScore: number;
  reportedBy: {
    name: string;
    role: 'Student' | 'Staff' | 'Faculty';
    regNo: string;
    phone: string;
  };
  assignedWorker?: CampusWorker;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolutionNote?: string;
  auditTrail: IssueAuditLog[];
}

export interface SmsMessage {
  id: string;
  timestamp: string;
  toPhone: string;
  recipientName: string;
  recipientRole: string;
  ticketNo: string;
  message: string;
  status: 'Pending' | 'Simulated' | 'Sent' | 'Delivered' | 'Read' | 'Failed';
  direction: 'Outbound_Worker' | 'Outbound_Student' | 'Outbound_Management';
  gatewayId?: string;
  error?: string;
  providerMessageId?: string;
  deliveredAt?: string;
}

export interface NotificationItem {
  id: string;
  timestamp: string;
  ticketNo: string;
  title: string;
  message: string;
  type: 'alert' | 'assignment' | 'status_change' | 'sms_dispatched';
  isRead: boolean;
}

export interface CampusStats {
  total: number;
  open: number;
  resolved: number;
  inProgress: number;
  hazards: number;
  avgDays: number;
}

export interface CampusLandmark {
  name: string;
  category: string;
  lat: number;
  lng: number;
  code: string;
  icon: string;
}

export type UserRole = 'Student' | 'Management';

export interface CurrentUser {
  name: string;
  role: UserRole;
  regNo: string;
  phone: string;
  email: string;
  department?: string;
  designation?: string;
  hostel?: string;
  avatar?: string;
  token?: string;
}
