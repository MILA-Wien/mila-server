/**
 * Shape returned by GET /api/memberships/:id
 * (a subset of the full Membership record with expanded user fields)
 */
export interface MembershipDetails {
  id: number;
  /** Always expanded (object), never a raw FK, for this endpoint. */
  memberships_user: { username: string; username_last: string };
  memberships_type: string;
  memberships_status: string;
  shifts_categories_allowed: { shifts_categories_id: number }[];
  shifts_user_type: string;
  shifts_skills: { shifts_skills_id: { id: number; icon: string } | null }[];
}
