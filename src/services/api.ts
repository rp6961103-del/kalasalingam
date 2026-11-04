import { CampusIssue, CampusWorker, SmsMessage, NotificationItem, CampusStats, IssueCategory, IssueStatus, IssueSeverity, CurrentUser } from '../types';

async function request(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  return fetch(input, { ...init, credentials: 'same-origin' });
}

export const api = {
  async getStats(): Promise<CampusStats> {
    const res = await request('/api/stats');
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },

  async getIssues(params?: { category?: string; status?: string }): Promise<CampusIssue[]> {
    const query = new URLSearchParams();
    if (params?.category && params.category !== 'All categories') query.append('category', params.category);
    if (params?.status && params.status !== 'All status') query.append('status', params.status);

    const res = await request(`/api/issues?${query.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch issues');
    return res.json();
  },

  async createIssue(payload: {
    title: string;
    category: IssueCategory;
    description: string;
    locationName: string;
    lat: number;
    lng: number;
    severity?: IssueSeverity;
    isHazard?: boolean;
    reportedBy?: {
      name: string;
      role: 'Student' | 'Staff' | 'Faculty';
      regNo: string;
      phone: string;
    };
    imageUrl?: string;
  }): Promise<{ issue: CampusIssue; sms: SmsMessage; message: string }> {
    const res = await request('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit issue');
    }
    return res.json();
  },

  async upvoteIssue(id: string, userId: string): Promise<{ issue: CampusIssue; upvoted: boolean; votes: number; priorityScore: number }> {
    const res = await request(`/api/issues/${id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error('Failed to vote');
    return res.json();
  },

  async updateStatus(
    id: string,
    payload: {
      status: IssueStatus;
      workerId?: string;
      note?: string;
      actorName?: string;
    }
  ): Promise<{ issue: CampusIssue; message: string }> {
    const res = await request(`/api/issues/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to update status');
    return res.json();
  },

  async getWorkers(): Promise<CampusWorker[]> {
    const res = await request('/api/workers');
    if (!res.ok) throw new Error('Failed to fetch workers');
    return res.json();
  },

  async getSmsLog(): Promise<SmsMessage[]> {
    const res = await request('/api/sms');
    if (!res.ok) throw new Error('Failed to fetch SMS log');
    return res.json();
  },

  async getNotifications(): Promise<NotificationItem[]> {
    const res = await request('/api/notifications');
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  },

  async markNotificationsRead(): Promise<void> {
    await request('/api/notifications/read', { method: 'POST' });
  },

  async login(payload: {
    role: 'Student' | 'Management';
    identifier: string;
    password?: string;
    otp?: string;
    department?: string;
    hostel?: string;
  }): Promise<{ user: CurrentUser; message: string }> {
    const res = await request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed');
    }
    return res.json();
  },

  async register(payload: {
    name: string;
    regNo: string;
    role: 'Student' | 'Management';
    email?: string;
    phone?: string;
    department?: string;
    hostel?: string;
    designation?: string;
    password?: string;
  }): Promise<{ user: CurrentUser; message: string }> {
    const res = await request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Registration failed');
    }
    return res.json();
  },

  async sendOtp(payload: {
    phone?: string;
    identifier: string;
  }): Promise<{ success: boolean; message: string }> {
    const res = await request('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to send OTP');
    return res.json();
  },

  async getCurrentUser(): Promise<{ user: CurrentUser }> {
    const res = await request('/api/auth/me');
    if (!res.ok) throw new Error('Session is invalid or expired');
    return res.json();
  },

  async logout(): Promise<void> {
    await request('/api/auth/logout', { method: 'POST' });
  },

  async getSchema(): Promise<{
    databaseName: string;
    schema: string;
    tables: Array<{
      key: string;
      tableName: string;
      description: string;
      primaryKey: string;
      foreignKeys: Array<{ column: string; referencesTable: string; referencesColumn: string }>;
      indexes: Array<{ indexName: string; columns: string[]; isUnique: boolean }>;
      columns: Array<{ name: string; type: string; isNullable: boolean; description?: string }>;
      rowCount: number;
    }>;
  }> {
    const res = await fetch('/api/schema');
    if (!res.ok) throw new Error('Failed to fetch schema metadata');
    return res.json();
  },

  async getTableRows(tableName: string): Promise<any[]> {
    const res = await fetch(`/api/schema/${tableName}`);
    if (!res.ok) throw new Error(`Failed to fetch rows for table ${tableName}`);
    return res.json();
  },
};
