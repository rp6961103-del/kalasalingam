import { Request, Response } from 'express';
import { db } from '../db/database';
import { databaseErrorCode, isDatabaseUnavailable } from '../db/pool';
import { IssueCategoryEnum, IssueSeverityEnum, IssueStatusEnum } from '../db/schema';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { SmsService } from '../services/smsService';

export class IssueController {
  static async list(req: AuthenticatedRequest, res: Response) {
    if (!req.authUser) return res.status(401).json({ error: 'Authentication required' });
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const reporterId = req.authUser.role === 'Student' ? req.authUser.id : undefined;
    return res.json(await db.listIssues({ category, status, reporterId }));
  }

  static async getById(req: AuthenticatedRequest, res: Response) {
    if (!req.authUser) return res.status(401).json({ error: 'Authentication required' });
    const issue = await db.findHydratedIssue(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    if (req.authUser.role === 'Student' && issue.reportedById !== req.authUser.id) {
      return res.status(404).json({ error: 'Issue not found' });
    }
    return res.json(issue);
  }

  static async create(req: AuthenticatedRequest, res: Response) {
    if (!req.authUser) return res.status(401).json({ error: 'Authentication required' });
    if (req.authUser.role !== 'Student') return res.status(403).json({ error: 'Only students can submit issues' });

    const {
      title,
      category,
      description,
      locationName,
      lat,
      lng,
      latitude,
      longitude,
      severity = 'Medium',
      isHazard = false,
      imageUrl,
    } = req.body as Record<string, unknown>;

    const finalLat = Number(lat ?? latitude);
    const finalLng = Number(lng ?? longitude);
    const parsedCategory = IssueCategoryEnum.safeParse(category);
    const parsedSeverity = IssueSeverityEnum.safeParse(severity);

    if (
      typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 200 ||
      typeof locationName !== 'string' || locationName.trim().length < 2 || locationName.length > 250 ||
      typeof description !== 'string' || description.length > 2000 ||
      !Number.isFinite(finalLat) || finalLat < -90 || finalLat > 90 ||
      !Number.isFinite(finalLng) || finalLng < -180 || finalLng > 180 ||
      !parsedCategory.success || !parsedSeverity.success ||
      typeof isHazard !== 'boolean' ||
      (imageUrl !== undefined && (
        typeof imageUrl !== 'string' ||
        imageUrl.length > 14_000_000 ||
        !/^(https:\/\/|http:\/\/|data:image\/(?:jpeg|png|webp);base64,)/i.test(imageUrl)
      ))
    ) {
      return res.status(400).json({ error: 'Issue details are invalid or exceed the allowed limits' });
    }

    try {
      const result = await db.createIssue({
        title: title.trim(),
        category: parsedCategory.data,
        description,
        locationName: locationName.trim(),
        latitude: finalLat,
        longitude: finalLng,
        severity: isHazard ? 'Hazard' : parsedSeverity.data,
        isHazard,
        reportedBy: {
          name: req.authUser.name,
          role: 'Student',
          regNo: req.authUser.regNo,
          phone: req.authUser.phone,
          email: req.authUser.email,
          department: req.authUser.department,
          hostel: req.authUser.hostel,
        },
        imageUrl: typeof imageUrl === 'string' ? imageUrl : undefined,
      });

      const delivery = await SmsService.deliver(result.sms.toPhone, result.sms.message);
      const sms = await db.updateSmsLog(result.sms.id, delivery);
      if (!sms) throw new Error('Unable to record SMS delivery result');

      if (result.issue.isHazard) {
        const managers = (await db.listUsers()).filter(
          (user) => user.role === 'Management' && /^\+91[6-9]\d{9}$/.test(user.phone)
        );
        await Promise.all(managers.map(async (manager) => {
          const managementSms = await db.createSmsLog({
            ticketNo: result.issue.ticketNo,
            recipientName: manager.name,
            recipientRole: 'Management',
            toPhone: manager.phone,
            message: `[KARE HAZARD ALERT] Critical issue #${result.issue.ticketNo}: "${result.issue.title}" at ${result.issue.locationName}. Review the management dashboard immediately.`,
            status: 'Pending',
            direction: 'Outbound_Management',
            gatewayId: 'pending',
          });
          const managementDelivery = await SmsService.deliver(managementSms.toPhone, managementSms.message);
          await db.updateSmsLog(managementSms.id, managementDelivery);
        }));
      }

      const smsMessage = sms.status === 'Sent' || sms.status === 'Delivered'
        ? `SMS accepted by the provider for ${sms.recipientName}.`
        : sms.status === 'Simulated'
          ? `SMS was simulated, not sent, for ${sms.recipientName}.`
          : `SMS failed for ${sms.recipientName}; the delivery failure was recorded.`;
      return res.status(201).json({ issue: result.issue, sms, message: `Issue reported successfully. ${smsMessage}` });
    } catch (error) {
      console.error(`Issue creation failed (${databaseErrorCode(error) || 'application error'})`);
      return res.status(isDatabaseUnavailable(error) ? 503 : 500).json({ error: 'Unable to create issue' });
    }
  }

  static async vote(req: AuthenticatedRequest, res: Response) {
    if (!req.authUser) return res.status(401).json({ error: 'Authentication required' });
    if (req.authUser.role !== 'Student') return res.status(403).json({ error: 'Only students can vote on issues' });

    const issue = await db.findHydratedIssue(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found' });
    try {
      const result = await db.voteIssue(req.params.id, req.authUser.id);
      return res.json({
        issue: result.issue,
        votes: result.votes,
        upvoted: result.upvoted,
        priorityScore: result.issue.priorityScore,
      });
    } catch (error) {
      console.error(`Issue vote failed (${databaseErrorCode(error) || 'application error'})`);
      return res.status(isDatabaseUnavailable(error) ? 503 : 500).json({ error: 'Unable to vote on issue' });
    }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response) {
    if (!req.authUser) return res.status(401).json({ error: 'Authentication required' });
    if (req.authUser.role !== 'Management') return res.status(403).json({ error: 'Management role required' });

    const { status, workerId, note } = req.body as Record<string, unknown>;
    const parsedStatus = IssueStatusEnum.safeParse(status);
    if (!parsedStatus.success) return res.status(400).json({ error: 'A valid status is required' });
    if (workerId !== undefined && (typeof workerId !== 'string' || !(await db.findWorkerById(workerId)))) {
      return res.status(400).json({ error: 'Assigned worker was not found' });
    }
    if (note !== undefined && (typeof note !== 'string' || note.length > 2000)) {
      return res.status(400).json({ error: 'Resolution note must be 2000 characters or fewer' });
    }

    try {
      const result = await db.updateIssueStatus(req.params.id, {
        status: parsedStatus.data,
        workerId: typeof workerId === 'string' ? workerId : undefined,
        note: typeof note === 'string' ? note.trim() : undefined,
        actorName: req.authUser.name,
        actorRole: req.authUser.role,
      });
      const delivery = await SmsService.deliver(result.sms.toPhone, result.sms.message);
      const sms = await db.updateSmsLog(result.sms.id, delivery);
      if (!sms) throw new Error('Unable to record SMS delivery result');
      const message = sms.status === 'Sent' || sms.status === 'Delivered'
        ? `SMS accepted by the provider for ${sms.recipientName}.`
        : sms.status === 'Simulated'
          ? `SMS was simulated, not sent, for ${sms.recipientName}.`
          : `SMS failed for ${sms.recipientName}; the delivery failure was recorded.`;
      return res.json({ issue: result.issue, sms, message: `Status updated to ${parsedStatus.data}. ${message}` });
    } catch (error) {
      console.error(`Issue status update failed (${databaseErrorCode(error) || 'application error'})`);
      return res.status(isDatabaseUnavailable(error) ? 503 : 500).json({ error: 'Unable to update issue status' });
    }
  }
}
