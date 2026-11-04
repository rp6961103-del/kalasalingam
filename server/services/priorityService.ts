/**
 * Priority Ranking Engine for Campus Facilities
 *
 * Computes deterministic priority score based on:
 * - Severity Weight: Low: 5, Medium: 10, High: 20, Hazard: 100
 * - Community Upvotes: +3 points per upvote
 * - Age Factor: +0.5 points per hour since logged (max +24 pts)
 * - Hazard Override: +200 points to strictly rank safety threats at the very top
 */

export interface PriorityParams {
  severity: string;
  isHazard: boolean;
  votes: number;
  createdAt: string;
}

export class PriorityService {
  /**
   * Calculates the priority score for a campus issue
   */
  static calculateScore(params: PriorityParams): number {
    let severityBase = 5;
    if (params.severity === 'Medium') severityBase = 10;
    if (params.severity === 'High') severityBase = 20;
    if (params.severity === 'Hazard' || params.isHazard) severityBase = 100;

    const votesWeight = Math.max(0, params.votes || 0) * 3;

    const createdTime = new Date(params.createdAt).getTime();
    const hoursElapsed = Math.max(0, (Date.now() - createdTime) / (1000 * 60 * 60));
    const ageBoost = Math.min(24, Math.floor(hoursElapsed * 0.5));

    const hazardOverride = params.isHazard ? 200 : 0;

    return severityBase + votesWeight + ageBoost + hazardOverride;
  }

  /**
   * Comparator for sorting issues in descending priority order,
   * guaranteeing unresolved hazards strictly lead the queue.
   */
  static sortComparator<T extends { isHazard: boolean; status: string; priorityScore: number }>(
    a: T,
    b: T
  ): number {
    const aIsActiveHazard = a.isHazard && a.status !== 'Resolved';
    const bIsActiveHazard = b.isHazard && b.status !== 'Resolved';

    if (aIsActiveHazard && !bIsActiveHazard) return -1;
    if (!aIsActiveHazard && bIsActiveHazard) return 1;

    return b.priorityScore - a.priorityScore;
  }
}
