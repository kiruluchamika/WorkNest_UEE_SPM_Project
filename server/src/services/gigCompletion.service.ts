import { prisma } from "../config/db";
import { HttpError } from "../middleware/error.middleware";
import { createNotification } from "./notification.service";
import { fetchGigWithCategory } from "./gig.service";

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
  const gigLink = `/gigs/${gigId}`;

  // Fires once for the business regardless of how many workers were hired —
  // unlike REVIEW_REQUESTED below, this notification's content doesn't vary
  // per applicant, so it must live outside the loop to avoid duplicates.
  // Its email is skipped (NOT_REQUIRED) since gig-completion + review-request
  // are sent as a single combined email, carried by REVIEW_REQUESTED instead.
  await createNotification({
    recipientId: gig.business.id,
    type: "GIG_COMPLETED",
    title: "Gig Completed",
    message: "Your gig has been completed successfully.",
    link: gigLink,
    relatedEntityId: gigId,
  });

  for (const application of hiredApplications) {
    await prisma.application.update({
      where: { id: application.id },
      data: { status: "COMPLETED", completedAt },
    });

    await Promise.all([
      prisma.workHistoryEntry.create({
        data: {
          applicationId: application.id,
          gigId,
          userId: application.applicant.id,
          role: "YOUTH",
          completedAt,
          gigStatus: "COMPLETED",
        },
      }),
      prisma.workHistoryEntry.create({
        data: {
          applicationId: application.id,
          gigId,
          userId: gig.business.id,
          role: "BUSINESS",
          completedAt,
          gigStatus: "COMPLETED",
        },
      }),
    ]);

    await Promise.all([
      createNotification({
        recipientId: application.applicant.id,
        type: "GIG_COMPLETED",
        title: "Gig Completed",
        message: "Your gig has been completed successfully.",
        link: gigLink,
        relatedEntityId: gigId,
      }),
      createNotification({
        recipientId: application.applicant.id,
        type: "REVIEW_REQUESTED",
        title: "Submit Your Review",
        message: "You can now review the person or business you worked with.",
        link: gigLink,
        relatedEntityId: gigId,
        emailParams: { counterpartName: gig.business.name, gigTitle: gig.title },
      }),
      createNotification({
        recipientId: gig.business.id,
        type: "REVIEW_REQUESTED",
        title: "Submit Your Review",
        message: "You can now review the person or business you worked with.",
        link: gigLink,
        relatedEntityId: gigId,
        emailParams: { counterpartName: application.applicant.name, gigTitle: gig.title },
      }),
    ]);
  }

  return fetchGigWithCategory(gigId);
}
