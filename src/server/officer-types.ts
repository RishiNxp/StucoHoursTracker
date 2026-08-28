export type OfficerMembership = {
  id: string;
  email: string;
  userId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string | null;
  deactivatedAt: string | null;
};

export type OfficerInvitation = {
  id: string;
  email: string;
  status: "pending" | "expired";
  expiresAt: string;
  createdAt: string;
  createdBy: string | null;
};

export type OfficersSnapshot = {
  memberships: OfficerMembership[];
  invitations: OfficerInvitation[];
};

export class OfficerConflictError extends Error {
  constructor(
    public readonly code: "ACTIVE_MEMBER_EXISTS" | "LAST_ACTIVE_OFFICER" | "INVITATION_INVALID" | "INVITATION_EMAIL_MISMATCH" | "OFFICER_NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "OfficerConflictError";
  }
}
