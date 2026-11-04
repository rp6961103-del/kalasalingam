/**
 * Campus SMS Gateway & Automated Worker Dispatch Service
 *
 * Twilio delivery and explicit development-only simulation for campus notifications.
 */

import { SmsLogRow, IssueCategory } from '../db/schema';

export interface SmsDeliveryResult {
  status: SmsLogRow['status'];
  gatewayId: string;
  providerMessageId?: string;
  error?: string;
  deliveredAt?: string;
}

export class SmsService {
  static async deliver(toPhone: string, message: string): Promise<SmsDeliveryResult> {
    const provider = process.env.SMS_PROVIDER?.toLowerCase();
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;
    if (provider !== 'twilio' || !accountSid || !authToken || !from) {
      return process.env.NODE_ENV === 'production'
        ? { status: 'Failed', gatewayId: provider || 'unconfigured', error: 'SMS provider credentials are not configured' }
        : { status: 'Simulated', gatewayId: 'development-simulation', error: 'SMS was not sent; configure Twilio credentials to enable delivery' };
    }

    const phone = toPhone.replace(/[\s()-]/g, '');
    if (!/^\+91[6-9]\d{9}$/.test(phone)) {
      return { status: 'Failed', gatewayId: 'validation', error: 'Recipient is not a valid Indian mobile number' };
    }

    const normalizedFrom = from.replace(/[\s()-]/g, '');
    if (!/^\+[1-9]\d{7,14}$/.test(normalizedFrom)) {
      return { status: 'Failed', gatewayId: 'configuration', error: 'TWILIO_PHONE_NUMBER must be an E.164 number' };
    }

    try {
      const body = new URLSearchParams({ To: phone, From: normalizedFrom, Body: message });
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body,
          signal: AbortSignal.timeout(10_000),
        });

        if (response.status === 429 && attempt === 0) {
          const retryAfter = Number(response.headers.get('Retry-After'));
          await response.body?.cancel();
          await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) ? Math.min(2000, Math.max(0, retryAfter * 1000)) : 250));
          continue;
        }

        const result = await response.json() as { sid?: string; status?: string; message?: string; code?: number };
        if (!response.ok) {
          return {
            status: 'Failed',
            gatewayId: 'twilio',
            error: result.message ? `Twilio rejected the SMS (${result.code ?? response.status}): ${result.message}` : `Twilio request failed with status ${response.status}`,
          };
        }

        return {
          status: result.status === 'delivered' ? 'Delivered' : 'Sent',
          gatewayId: 'twilio',
          providerMessageId: result.sid,
          deliveredAt: result.status === 'delivered' ? new Date().toISOString() : undefined,
        };
      }

      return { status: 'Failed', gatewayId: 'twilio', error: 'Twilio rate limit remained after one safe retry' };
    } catch (error) {
      return {
        status: 'Failed',
        gatewayId: 'twilio',
        error: error instanceof Error ? `SMS provider request failed: ${error.message}` : 'SMS provider request failed',
      };
    }
  }

  /**
   * Generates dispatch text for assigned technician
   */
  static buildWorkerDispatchMessage(params: {
    ticketNo: string;
    title: string;
    locationName: string;
    category: IssueCategory;
    severity: string;
    isHazard: boolean;
    reporterName: string;
    reporterPhone: string;
  }): string {
    if (params.isHazard) {
      return `🚨 [CRITICAL HAZARD - KARE DISPATCH] Ticket #${params.ticketNo}: "${params.title}" at ${params.locationName}. Category: ${params.category}. Immediate on-site response required. Reported by ${params.reporterName} (${params.reporterPhone}). Coordinate with Campus Safety.`;
    }

    return `[KARE FACILITY ALERT] New task #${params.ticketNo}: "${params.title}" at ${params.locationName}. Category: ${params.category}. Priority: ${params.severity}. Reported by ${params.reporterName} (${params.reporterPhone}). Please inspect and update status.`;
  }

  /**
   * Generates notification text for student reporter when status changes
   */
  static buildStudentStatusUpdateMessage(params: {
    ticketNo: string;
    title: string;
    status: string;
    actorName: string;
    workerName?: string;
    note?: string;
  }): string {
    let base = `[KARE STATUS UPDATE] Your issue #${params.ticketNo} "${params.title}" is now marked as ${params.status.toUpperCase()} by ${params.actorName}.`;
    if (params.workerName) {
      base += ` Assigned Technician: ${params.workerName}.`;
    }
    if (params.note) {
      base += ` Note: "${params.note}"`;
    }
    return base;
  }
}
