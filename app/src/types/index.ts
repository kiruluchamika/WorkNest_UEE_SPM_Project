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
