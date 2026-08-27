export type UserRole = "jobseeker" | "shopowner" | "verifier" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  bio?: string;
  location?: string;
  avatarUrl?: string;
  trustScore: number;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type GigPostStatus = "PENDING" | "ACTIVE" | "REJECTED" | "CLOSED" | "COMPLETED";
export type GigPaymentType = "HOURLY" | "DAILY" | "FIXED";

export interface GigPostBusiness {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface GigPost {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  category?: Category;
  businessId: string;
  business?: GigPostBusiness;
  location: string;
  paymentAmount: number;
  paymentType: GigPaymentType;
  startDate: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  workersNeeded: number;
  requiredSkills: string[];
  contactInfo?: string;
  imageUrl?: string;
  status: GigPostStatus;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type GigStatus = "open" | "filled" | "completed" | "cancelled";
export type GigCategory = "retail" | "hospitality" | "delivery" | "events" | "general";

export interface Gig {
  id: string;
  title: string;
  description: string;
  shopOwnerId: string;
  shopOwnerName: string;
  category: GigCategory;
  location: string;
  wage: number;
  wageType: "hour" | "day" | "fixed";
  status: GigStatus;
  requiredSkills: string[];
  startDate: string;
  endDate?: string;
  createdAt: string;
  applicantsCount: number;
  imageUrl?: string;
}

export type ApplicationStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export interface Application {
  id: string;
  gigId: string;
  gigTitle: string;
  jobSeekerId: string;
  jobSeekerName: string;
  message: string;
  status: ApplicationStatus;
  createdAt: string;
}

export type ApplicationMode = "QUICK_APPLY" | "STANDARD" | "PROFESSIONAL";
export type QuestionType = "YES_NO" | "TEXT" | "MULTIPLE_CHOICE";

export interface ApplicationRequirements {
  requireCV: boolean;
  requireCoverLetter: boolean;
  requireExperience: boolean;
  requireAvailability: boolean;
  requireTransportation: boolean;
  requirePortfolio: boolean;
  requireExpectedSalary: boolean;
  requireShortMessage: boolean;
}

export interface ApplicationQuestion {
  id?: string;
  question: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
}

export interface ApplicationSettings {
  gigId: string;
  applicationMode: ApplicationMode;
  requirements: ApplicationRequirements;
  customQuestions: ApplicationQuestion[];
}

// Real, backend-connected job application submitted against a GigPost.
// Distinct from the legacy mock `Application`/`ApplicationStatus` above,
// which belongs to the old in-memory Gig system and is left untouched.
export type JobApplicationStatus =
  | "PENDING"
  | "SHORTLISTED"
  | "HIRED"
  | "REJECTED"
  | "WITHDRAWN"
  | "COMPLETED";

export interface ApplicationAnswer {
  questionId: string;
  question?: string;
  answer: string | boolean | string[];
}

export interface JobApplication {
  id: string;
  gigId: string;
  applicantId: string;
  applicationMode: ApplicationMode;
  status: JobApplicationStatus;
  experience?: string;
  availability?: string;
  transportation?: boolean;
  shortMessage?: string;
  cvUrl?: string;
  coverLetter?: string;
  portfolioUrl?: string;
  expectedSalary?: number;
  answers: ApplicationAnswer[];
  createdAt: string;
  updatedAt: string;
}

export interface SubmitApplicationPayload {
  gigId: string;
  experience?: string;
  availability?: string;
  transportation?: boolean;
  shortMessage?: string;
  cvUrl?: string;
  coverLetter?: string;
  portfolioUrl?: string;
  expectedSalary?: number;
  answers: ApplicationAnswer[];
}

export interface ApplicantGigSummary {
  id: string;
  title: string;
  description: string;
  category?: Category;
  location: string;
  paymentAmount: number;
  paymentType: GigPaymentType;
  startDate: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
  workersNeeded: number;
  requiredSkills: string[];
  status: GigPostStatus;
}

export interface Endorsement {
  id: string;
  verifierId: string;
  verifierName: string;
  jobSeekerId: string;
  jobSeekerName: string;
  skill: string;
  note: string;
  createdAt: string;
}

export interface Rating {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  gigId: string;
  gigTitle: string;
  score: number; // 1-5
  comment: string;
  createdAt: string;
}

export type NotificationType =
  | "GIG_COMPLETED"
  | "REVIEW_REQUESTED"
  | "REVIEW_RECEIVED"
  | "REVIEW_REPORTED"
  | "REVIEW_REMOVED"
  | "REPORT_RESOLVED"
  | "REPORT_DISMISSED"
  | "ACCOUNT_WARNING";

export type EmailStatus = "NOT_REQUIRED" | "PENDING" | "SENT" | "FAILED";

export interface Notification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  relatedEntityId?: string;
  isRead: boolean;
  readAt?: string;
  emailStatus: EmailStatus;
  createdAt: string;
}

export type ReviewStatus = "PUBLISHED" | "FLAGGED" | "REMOVED";
export type ReportStatus = "PENDING" | "RESOLVED" | "DISMISSED";
export type ModerationAction = "REMOVE_REVIEW" | "DISMISS_REPORT" | "WARN_AUTHOR";

export interface ReviewParty {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
}

export interface Review {
  id: string;
  gigId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment?: string;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
  reviewer?: ReviewParty;
  reviewee?: ReviewParty;
  gig?: { id: string; title: string };
}

export interface ReputationSummary {
  userId: string;
  averageRating: number | null;
  totalReviews: number;
  distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
}

export type WorkHistoryRole = "YOUTH" | "BUSINESS";

export interface WorkHistoryEntry {
  id: string;
  gigId: string;
  gigTitle: string;
  role: WorkHistoryRole;
  completedAt: string;
  gigStatus: GigPostStatus;
  counterpartId: string;
  counterpartName: string;
  hasReviewed?: boolean;
}

export interface ReviewReport {
  id: string;
  reviewId: string;
  reporterId: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
  reporter?: ReviewParty;
}

export interface FlaggedReview extends Review {
  reports: ReviewReport[];
}
