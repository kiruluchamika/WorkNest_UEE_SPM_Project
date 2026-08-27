import { GigStatus } from "@prisma/client";
import { prisma } from "../config/db";
import { HttpError } from "../middleware/error.middleware";
import { createNotification } from "./notification.service";
import { fetchGigWithCategory } from "./gig.service";

// Shared by both completion entry points: the gig-level bulk "Mark Gig
// Complete" action and the per-application "Mark Work Completed" action
// (business completing a single hired worker's engagement). Both must
// produce the same work-history + notification side effects for the
// gigId/applicationId pair involved.

export async function createCompletionWorkHistory(params: {
  applicationId: string;
  gigId: string;
  businessId: string;
  applicantId: string;
  completedAt: Date;
  gigStatus: GigStatus;
}) {
  const { applicationId, gigId, businessId, applicantId, completedAt, gigStatus } = params;

  await Promise.all([
    prisma.workHistoryEntry.create({
      data: { applicationId, gigId, userId: applicantId, role: "YOUTH", completedAt, gigStatus },
    }),
    prisma.workHistoryEntry.create({
      data: { applicationId, gigId, userId: businessId, role: "BUSINESS", completedAt, gigStatus },
    }),
  ]);
}

export async function notifyGigParticipantOfCompletion(params: {
  recipientId: string;
  counterpartName: string;
  gigId: string;
  gigTitle: string;
  includeGigCompletedNotice: boolean;
}) {
  const { recipientId, counterpartName, gigId, gigTitle, includeGigCompletedNotice } = params;
  const gigLink = `/gigs/${gigId}`;

  const jobs = [
    createNotification({
      recipientId,
      type: "REVIEW_REQUESTED",
      title: "Submit Your Review",
      message: "You can now review the person or business you worked with.",
      link: gigLink,
      relatedEntityId: gigId,
      emailParams: { counterpartName, gigTitle },
    }),
  ];

  if (includeGigCompletedNotice) {
    jobs.push(
      createNotification({
        recipientId,
        type: "GIG_COMPLETED",
        title: "Gig Completed",
        message: "Your gig has been completed successfully.",
        link: gigLink,
        relatedEntityId: gigId,
      })
    );
  }

  await Promise.all(jobs);
}

export async function markGigComplete(gigId: string, businessUserId: string) {
  const gig = await prisma.gigPost.findFirst({
    where: { id: gigId, businessId: businessUserId, isDeleted: false },
    include: { business: { select: { id: true, name: true } } },
  });

  if (!gig) {
    throw new HttpError(404, "Gig not found");
  }
  if (gig.status !== "ACTIVE") {
    throw new HttpError(409, "Only active gigs can be marked as completed.");
  }

  await prisma.gigPost.update({ where: { id: gigId }, data: { status: "COMPLETED" } });

  const hiredApplications = await prisma.application.findMany({
    where: { gigPostId: gigId, status: "HIRED" },
    include: { applicant: { select: { id: true, name: true } } },
  });

  const completedAt = new Date();

  // The business gets exactly one GIG_COMPLETED notice regardless of how
  // many workers were hired — its content doesn't vary per applicant, so
  // it's sent once here rather than inside the loop below.
  await createNotification({
    recipientId: gig.business.id,
    type: "GIG_COMPLETED",
    title: "Gig Completed",
    message: "Your gig has been completed successfully.",
    link: `/gigs/${gigId}`,
    relatedEntityId: gigId,
  });

  for (const application of hiredApplications) {
    await prisma.application.update({
      where: { id: application.id },
      data: { status: "COMPLETED", completedAt },
    });

    await createCompletionWorkHistory({
      applicationId: application.id,
      gigId,
      businessId: gig.business.id,
      applicantId: application.applicant.id,
      completedAt,
      gigStatus: "COMPLETED",
    });

    await Promise.all([
      notifyGigParticipantOfCompletion({
        recipientId: application.applicant.id,
        counterpartName: gig.business.name,
        gigId,
        gigTitle: gig.title,
        includeGigCompletedNotice: true,
      }),
      notifyGigParticipantOfCompletion({
        recipientId: gig.business.id,
        counterpartName: application.applicant.name,
        gigId,
        gigTitle: gig.title,
        includeGigCompletedNotice: false,
      }),
    ]);
  }

  return fetchGigWithCategory(gigId);
}
