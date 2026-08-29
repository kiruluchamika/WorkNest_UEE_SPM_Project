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
  verifierApplication?: Pick<VerifierApplication, "id" | "status" | "submittedAt" | "reviewedAt" | "rejectionReason" | "approvalAcknowledgedAt" | "suspendedAt" | "suspensionReason">;
}

export type VerifierApplicationStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
export interface VerifierApplication {
  id: string;
  applicantId: string;
  applicant: { id: string; name: string; email: string; phone?: string; createdAt: string };
  district: string;
  identityType: string;
  identityNumber: string;
  identityDocumentReference: string;
  identityDocumentMetadata?: Record<string, unknown>;
  addressInformation: string;
  communityReference?: string;
  status: VerifierApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  rejectionReason?: string;
  approvalAcknowledgedAt?: string;
  suspendedAt?: string;
  suspensionReason?: string;
  reviewer?: { id: string; name: string; email: string };
  suspendedBy?: { id: string; name: string; email: string };
  reactivationRequests?: VerifierReactivationRequest[];
  suspensionEvents?: VerifierSuspensionEvent[];
}

export interface VerifierSuspensionEvent {
  id: string;
  verifierApplicationId: string;
  reason: string;
  suspendedAt: string;
  suspendedBy?: { id: string; name: string; email: string };
  reactivatedAt?: string;
  reactivationRequests?: VerifierReactivationRequest[];
}

export type VerifierReactivationRequestStatus = "PENDING" | "APPROVED" | "REJECTED";
export interface VerifierReactivationRequest {
  id: string;
  verifierId: string;
  verifierApplicationId: string;
  suspensionEventId?: string;
  explanation: string;
  attachmentReference?: string;
  attachmentMetadata?: Record<string, unknown>;
  status: VerifierReactivationRequestStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewReason?: string;
  reviewer?: { id: string; name: string; email: string };
}

export interface VerifierApplicationPayload {
  district: string;
  identityType: "NATIONAL_ID" | "PASSPORT" | "DRIVING_LICENCE";
  identityNumber: string;
  identityDocumentReference?: string;
  identityDocumentMetadata?: Record<string, unknown>;
  addressInformation: string;
  communityReference?: string;
}

export type VerificationRequestStatus = "PENDING"|"ASSIGNED"|"UNDER_REVIEW"|"FLAGGED"|"RETURNED_FOR_REVIEW"|"APPROVED"|"REJECTED"|"ADMIN_CONFIRMED";
export interface VerificationRequest {
  id:string; applicantId:string; applicant:{id:string;name:string;email:string;phone?:string;bio?:string;location?:string};
  district:string; personalInformation:string; identityDocument:string; supportingEvidence?:string; communityReferences:string;
  status:VerificationRequestStatus; assignedVerifierId?:string; submittedAt:string; assignedAt?:string; reviewStartedAt?:string; decidedAt?:string;
  verifierNote?:string; rejectionReason?:string; flagReason?:string; flaggedAt?:string; wasFlagged:boolean; adminResponse?:string; adminReviewedAt?:string;
  assignedVerifier?:{id:string;name:string;email:string}; adminReviewer?:{id:string;name:string;email:string};
}
export interface VerifierDashboardData { application?:{district:string;isAvailable:boolean;status:VerifierApplicationStatus};queues:{awaiting:number;underReview:number;returned:number};today:{assigned:number;approved:number;rejected:number;flagged:number};allTime:{assigned:number;approved:number;rejected:number;flagged:number}; }
export interface AdminVerificationOverview { requestsToday:number;approvedToday:number;rejectedToday:number;flaggedToday:number;awaitingReview:number;underReview:number; }
export interface AdminVerifierStatistics { assigned:number;approved:number;rejected:number;flagged:number; }

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

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}
