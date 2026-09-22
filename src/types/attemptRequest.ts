export type AttemptRequestStatus = "pending" | "approved" | "rejected";

export interface AttemptRequest {
  id: string;
  phoneNumber: string;
  displayName: string;
  reason: string;
  status: AttemptRequestStatus;
  createdAt: number;
  resolvedAt: number | null;
  grantedAmount: number | null;
}
