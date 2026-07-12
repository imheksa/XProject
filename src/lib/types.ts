export const SCAN_CATEGORIES = [
  "NOT_FOLLOWING_BACK",
  "NON_PREMIUM",
  "INACTIVE_FOLLOWING",
  "INACTIVE_FOLLOWER",
] as const;
export type ScanCategory = (typeof SCAN_CATEGORIES)[number];

export type ScanStatus = "RUNNING" | "COMPLETED" | "FAILED";

export const JOB_TYPES = [
  "UNFOLLOW_NOT_FOLLOWING_BACK",
  "UNFOLLOW_NON_PREMIUM",
  "UNFOLLOW_INACTIVE",
  "REMOVE_INACTIVE_FOLLOWERS",
] as const;
export type JobType = (typeof JOB_TYPES)[number];

export type JobStatus =
  | "PENDING"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type JobItemStatus =
  | "PENDING"
  | "DONE"
  | "FAILED"
  | "SKIPPED"
  | "RATE_LIMITED";

// Maps each bulk-action job type to the scan category it acts on.
export const JOB_TYPE_TO_CATEGORY: Record<JobType, ScanCategory> = {
  UNFOLLOW_NOT_FOLLOWING_BACK: "NOT_FOLLOWING_BACK",
  UNFOLLOW_NON_PREMIUM: "NON_PREMIUM",
  UNFOLLOW_INACTIVE: "INACTIVE_FOLLOWING",
  REMOVE_INACTIVE_FOLLOWERS: "INACTIVE_FOLLOWER",
};

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  UNFOLLOW_NOT_FOLLOWING_BACK: "Unfollow accounts that don't follow you back",
  UNFOLLOW_NON_PREMIUM: "Unfollow non-Premium accounts",
  UNFOLLOW_INACTIVE: "Unfollow accounts inactive 90+ days",
  REMOVE_INACTIVE_FOLLOWERS: "Remove followers inactive 90+ days",
};
