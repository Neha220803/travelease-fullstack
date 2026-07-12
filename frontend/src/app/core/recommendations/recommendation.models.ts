export interface Recommendation {
  recommendationId: string;
  categoryId: number;
  recommendationType: string;
  referenceId: string;
  rankOrder: number;
}

/**
 * Superset returned by the same GET /api/recommendations endpoint - the base
 * Recommendation fields plus the referenced activity's own details, enriched
 * server-side so callers never hardcode or recompute a price. Enrichment
 * fields are null for non-Activity recommendation types.
 */
export interface ActivityRecommendation extends Recommendation {
  activityId: string | null;
  activityName: string | null;
  providerName: string | null;
  price: number | null;
  startTime: string | null;
  endTime: string | null;
  destinationId: number | null;
}
