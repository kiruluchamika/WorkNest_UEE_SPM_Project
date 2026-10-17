import { test, expect, request as apiRequest, type APIRequestContext } from "@playwright/test";
import { API_BASE_URL, loginAsSeededAdmin, registerUser, type TestUser } from "./helpers/api";
import {
  Cleanup,
  approveGig,
  auth,
  browsableGigIds,
  createCategory,
  createGig,
  dateFromToday,
  errorMessage,
  notificationTitles,
  rejectGig,
  uniqueSuffix,
  validGig,
  type GigInput,
} from "./helpers/gigPosting";

/**
 * Gig posting workflow, checked directly against the API:
 *   1. Admin manages categories
 *   2. Shop owner posts a gig (with validation)
 *   3. Admin approves or rejects it
 *   4. Only approved gigs reach job seekers
 * Test ids (TC-CAT-01 ...) match the written gig posting test cases.
 */

let api: APIRequestContext;
let adminToken: string;
let owner: TestUser;
let jobseeker: TestUser;
let category: { id: string; name: string };
const cleanup = new Cleanup();

test.beforeAll(async () => {
  api = await apiRequest.newContext();
  adminToken = await loginAsSeededAdmin(api);
  owner = await registerUser(api, "shopowner");
  jobseeker = await registerUser(api, "jobseeker");
  category = await createCategory(api, adminToken, cleanup);
});

test.afterAll(async () => {
  await cleanup.run(api, adminToken);
  await api.dispose();
});

test.describe("1. Admin — category management", () => {
  test("TC-CAT-01 admin creates a category and businesses can see it", async () => {
    const created = await createCategory(api, adminToken, cleanup);

    const adminList = await api.get(`${API_BASE_URL}/admin/categories`, { headers: auth(adminToken) });
    const { categories: all } = await adminList.json();
    expect(all.map((c: { id: string }) => c.id)).toContain(created.id);

    const publicList = await api.get(`${API_BASE_URL}/categories`);
    const { categories: active } = await publicList.json();
    expect(active.map((c: { id: string }) => c.id)).toContain(created.id);
  });

  test("TC-CAT-02 category name shorter than 2 characters is rejected", async () => {
    const res = await api.post(`${API_BASE_URL}/admin/categories`, {
      headers: auth(adminToken),
      data: { name: "A" },
    });
    expect(res.status()).toBe(400);
    expect(await errorMessage(res)).toBe("Name must be at least 2 characters");
  });

  test("TC-CAT-04 duplicate category name is rejected", async () => {
    const res = await api.post(`${API_BASE_URL}/admin/categories`, {
      headers: auth(adminToken),
      data: { name: category.name },
    });
    expect(res.status()).toBe(409);
    expect(await errorMessage(res)).toBe("Category name already exists");
  });

  test("TC-CAT-05 admin edits a category description", async () => {
    const created = await createCategory(api, adminToken, cleanup);
    const res = await api.put(`${API_BASE_URL}/admin/categories/${created.id}`, {
      headers: auth(adminToken),
      data: { description: "Updated by e2e test" },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).category.description).toBe("Updated by e2e test");
  });

  test("TC-CAT-06/07/08 inactive categories are hidden from businesses until reactivated", async () => {
    const created = await createCategory(api, adminToken, cleanup);
    const setActive = (isActive: boolean) =>
      api.patch(`${API_BASE_URL}/admin/categories/${created.id}/status`, {
        headers: auth(adminToken),
        data: { isActive },
      });
    const publicIds = async () =>
      ((await (await api.get(`${API_BASE_URL}/categories`)).json()).categories as { id: string }[]).map((c) => c.id);

    expect((await setActive(false)).status()).toBe(200);
    expect(await publicIds()).not.toContain(created.id);

    const gigRes = await api.post(`${API_BASE_URL}/gigs`, {
      headers: auth(owner.token),
      data: validGig(created.id),
    });
    expect(gigRes.status()).toBe(400);
    expect(await errorMessage(gigRes)).toBe("Selected category is not available.");

    expect((await setActive(true)).status()).toBe(200);
    expect(await publicIds()).toContain(created.id);
  });

  test("TC-CAT-09 only admins can create categories", async () => {
    const res = await api.post(`${API_BASE_URL}/admin/categories`, {
      headers: auth(owner.token),
      data: { name: `Not Allowed ${uniqueSuffix()}` },
    });
    expect(res.status()).toBe(403);
  });
});

test.describe("2. Shop owner — create gig post", () => {
  test("TC-GIG-01 shop owner posts a gig and it waits for review", async () => {
    const gig = await createGig(api, owner.token, cleanup, validGig(category.id));
    expect(gig.status).toBe("PENDING");

    const myGigs = await api.get(`${API_BASE_URL}/gigs/my?status=PENDING`, { headers: auth(owner.token) });
    const { gigs } = await myGigs.json();
    expect(gigs.map((g: { id: string }) => g.id)).toContain(gig.id);
  });

  test("TC-GIG-02 gig with all optional fields is saved", async () => {
    const body = validGig(category.id, {
      startTime: "09:00",
      endDate: dateFromToday(4),
      endTime: "17:00",
      requiredSkills: ["Customer service", "Cash handling"],
      contactInfo: "0771234567",
    });
    const gig = await createGig(api, owner.token, cleanup, body);

    const res = await api.get(`${API_BASE_URL}/gigs/${gig.id}`, { headers: auth(owner.token) });
    const saved = (await res.json()).gig;
    expect(saved.startTime).toBe("09:00");
    expect(saved.endTime).toBe("17:00");
    expect(saved.contactInfo).toBe("0771234567");
    expect(saved.requiredSkills).toEqual(["Customer service", "Cash handling"]);
  });

  test("TC-GIG-03 shop owner gets a 'Gig Submitted' notification", async () => {
    const gig = await createGig(api, owner.token, cleanup, validGig(category.id));
    expect(await notificationTitles(api, owner.token, gig.id)).toContain("Gig Submitted");
  });

  const invalidCases: { id: string; name: string; overrides: Partial<GigInput>; message: string }[] = [
    { id: "TC-GIG-04", name: "empty title", overrides: { title: "" }, message: "Gig title is required." },
    {
      id: "TC-GIG-05",
      name: "title over 100 characters",
      overrides: { title: "x".repeat(101) },
      message: "Gig title must be at most 100 characters.",
    },
    { id: "TC-GIG-06", name: "no category", overrides: { categoryId: "" }, message: "Please select a category." },
    {
      id: "TC-GIG-07",
      name: "short description",
      overrides: { description: "Clean shop" },
      message: "Description must be at least 20 characters.",
    },
    { id: "TC-GIG-08", name: "empty location", overrides: { location: "" }, message: "Location is required." },
    { id: "TC-GIG-09", name: "zero payment", overrides: { paymentAmount: 0 }, message: "Payment must be greater than 0." },
    {
      id: "TC-GIG-10",
      name: "payment above Rs. 1,000,000",
      overrides: { paymentAmount: 2_000_000 },
      message: "Payment must be at most Rs. 1,000,000.",
    },
    {
      id: "TC-GIG-11a",
      name: "zero workers",
      overrides: { workersNeeded: 0 },
      message: "Workers needed must be at least 1.",
    },
    {
      id: "TC-GIG-11b",
      name: "more than 100 workers",
      overrides: { workersNeeded: 101 },
      message: "Workers needed must be at most 100.",
    },
    {
      id: "TC-GIG-12",
      name: "start date in the past",
      overrides: { startDate: dateFromToday(-2) },
      message: "Start date cannot be in the past.",
    },
    {
      id: "TC-GIG-13",
      name: "end date before start date",
      overrides: { startDate: dateFromToday(5), endDate: dateFromToday(3) },
      message: "End date cannot be before the start date.",
    },
    {
      id: "TC-GIG-14",
      name: "end time before start time on the same day",
      overrides: { startTime: "14:00", endTime: "09:00" },
      message: "End time must be after the start time. For overnight work, set an end date.",
    },
    {
      id: "TC-GIG-15",
      name: "end time without start time",
      overrides: { endTime: "09:00" },
      message: "Add a start time before setting an end time.",
    },
    {
      id: "TC-GIG-17",
      name: "invalid contact information",
      overrides: { contactInfo: "call me" },
      message: "Contact information must be a valid phone number or email.",
    },
    {
      id: "TC-GIG-18",
      name: "more than 15 skills",
      overrides: { requiredSkills: Array.from({ length: 16 }, (_, i) => `Skill ${i + 1}`) },
      message: "You can list at most 15 skills.",
    },
  ];

  for (const { id, name, overrides, message } of invalidCases) {
    test(`${id} rejects a gig with ${name}`, async () => {
      const res = await api.post(`${API_BASE_URL}/gigs`, {
        headers: auth(owner.token),
        data: validGig(category.id, overrides),
      });
      expect(res.status()).toBe(400);
      expect(await errorMessage(res)).toBe(message);
    });
  }

  test("TC-GIG-16 overnight shift with an end date is accepted", async () => {
    const gig = await createGig(
      api,
      owner.token,
      cleanup,
      validGig(category.id, { startTime: "22:00", endDate: dateFromToday(4), endTime: "02:00" })
    );
    expect(gig.status).toBe("PENDING");
  });

  test("TC-GIG-19 editing a pending gig keeps it pending", async () => {
    const gig = await createGig(api, owner.token, cleanup, validGig(category.id));
    const res = await api.put(`${API_BASE_URL}/gigs/${gig.id}`, {
      headers: auth(owner.token),
      data: { title: `${gig.title} (edited)` },
    });
    expect(res.status()).toBe(200);
    const updated = (await res.json()).gig;
    expect(updated.title).toBe(`${gig.title} (edited)`);
    expect(updated.status).toBe("PENDING");
  });

  test("TC-GIG-20 an optional field can be cleared on edit", async () => {
    const gig = await createGig(api, owner.token, cleanup, validGig(category.id, { contactInfo: "0771234567" }));
    const res = await api.put(`${API_BASE_URL}/gigs/${gig.id}`, {
      headers: auth(owner.token),
      data: { contactInfo: null },
    });
    expect(res.status()).toBe(200);
    expect((await res.json()).gig.contactInfo).toBeNull();
  });

  test("TC-GIG-21 deleted gig disappears from My Gigs", async () => {
    const gig = await createGig(api, owner.token, cleanup, validGig(category.id));
    const res = await api.delete(`${API_BASE_URL}/gigs/${gig.id}`, { headers: auth(owner.token) });
    expect(res.status()).toBe(204);

    const { gigs } = await (await api.get(`${API_BASE_URL}/gigs/my`, { headers: auth(owner.token) })).json();
    expect(gigs.map((g: { id: string }) => g.id)).not.toContain(gig.id);
  });

  test("TC-GIG-22 job seekers cannot post gigs", async () => {
    const res = await api.post(`${API_BASE_URL}/gigs`, {
      headers: auth(jobseeker.token),
      data: validGig(category.id),
    });
    expect(res.status()).toBe(403);
  });
});

test.describe("3. Admin — approve or reject", () => {
  test("TC-REV-01 new gig appears in the admin pending list", async () => {
    const gig = await createGig(api, owner.token, cleanup, validGig(category.id));
    const res = await api.get(`${API_BASE_URL}/admin/gigs?status=PENDING`, { headers: auth(adminToken) });
    const { gigs } = await res.json();
    expect(gigs.map((g: { id: string }) => g.id)).toContain(gig.id);
  });

  test("TC-REV-03/04 admin approves a gig and the owner is notified", async () => {
    const gig = await createGig(api, owner.token, cleanup, validGig(category.id));
    const res = await approveGig(api, adminToken, gig.id);
    expect(res.status()).toBe(200);
    expect((await res.json()).gig.status).toBe("ACTIVE");
    expect(await notificationTitles(api, owner.token, gig.id)).toContain("Gig Approved");
  });

  test("TC-REV-05/07 admin rejects a gig with a reason and the owner is notified", async () => {
    const gig = await createGig(api, owner.token, cleanup, validGig(category.id));
    const reason = "Please add the exact shop address.";
    const res = await rejectGig(api, adminToken, gig.id, reason);
    expect(res.status()).toBe(200);

    const saved = (await (await api.get(`${API_BASE_URL}/gigs/${gig.id}`, { headers: auth(owner.token) })).json()).gig;
    expect(saved.status).toBe("REJECTED");
    expect(saved.rejectionReason).toBe(reason);
    expect(await notificationTitles(api, owner.token, gig.id)).toContain("Gig Needs Changes");
  });

  test("TC-REV-06 rejection reason shorter than 5 characters is refused", async () => {
    const gig = await createGig(api, owner.token, cleanup, validGig(category.id));
    const res = await rejectGig(api, adminToken, gig.id, "No");
    expect(res.status()).toBe(400);
    expect(await errorMessage(res)).toBe("Please provide a meaningful rejection reason.");

    const saved = (await (await api.get(`${API_BASE_URL}/gigs/${gig.id}`, { headers: auth(owner.token) })).json()).gig;
    expect(saved.status).toBe("PENDING");
  });

  test("TC-REV-08 owner resubmits a rejected gig for review", async () => {
    const gig = await createGig(api, owner.token, cleanup, validGig(category.id));
    await rejectGig(api, adminToken, gig.id, "Please add the exact shop address.");

    const res = await api.patch(`${API_BASE_URL}/gigs/${gig.id}/resubmit`, { headers: auth(owner.token) });
    expect(res.status()).toBe(200);
    const resubmitted = (await res.json()).gig;
    expect(resubmitted.status).toBe("PENDING");
    expect(resubmitted.rejectionReason).toBeNull();
  });

  test("TC-REV-09 an already reviewed gig cannot be approved or rejected again", async () => {
    const gig = await createGig(api, owner.token, cleanup, validGig(category.id));
    await approveGig(api, adminToken, gig.id);

    expect((await approveGig(api, adminToken, gig.id)).status()).toBe(409);
    expect((await rejectGig(api, adminToken, gig.id, "Changed my mind about it.")).status()).toBe(409);
  });

  test("TC-REV-10 changing the payment of an approved gig sends it back to review", async () => {
    const gig = await createGig(api, owner.token, cleanup, validGig(category.id));
    await approveGig(api, adminToken, gig.id);

    const res = await api.put(`${API_BASE_URL}/gigs/${gig.id}`, {
      headers: auth(owner.token),
      data: { paymentAmount: 3000 },
    });
    expect((await res.json()).gig.status).toBe("PENDING");
    expect(await browsableGigIds(api, jobseeker.token)).not.toContain(gig.id);
  });

  test("TC-REV-11 changing only the contact info keeps an approved gig active", async () => {
    const gig = await createGig(api, owner.token, cleanup, validGig(category.id));
    await approveGig(api, adminToken, gig.id);

    const res = await api.put(`${API_BASE_URL}/gigs/${gig.id}`, {
      headers: auth(owner.token),
      data: { contactInfo: "owner@example.com" },
    });
    expect((await res.json()).gig.status).toBe("ACTIVE");
  });

  test("TC-REV-12 only admins can approve or reject gigs", async () => {
    const gig = await createGig(api, owner.token, cleanup, validGig(category.id));
    expect((await approveGig(api, owner.token, gig.id)).status()).toBe(403);
    expect((await rejectGig(api, jobseeker.token, gig.id, "Not allowed to do this.")).status()).toBe(403);
  });
});

test.describe("4. Job seeker — sees only approved gigs", () => {
  test("TC-JS-01 approved gig is visible to job seekers", async () => {
    const gig = await createGig(api, owner.token, cleanup, validGig(category.id));
    await approveGig(api, adminToken, gig.id);

    expect(await browsableGigIds(api, jobseeker.token)).toContain(gig.id);

    const detail = await api.get(`${API_BASE_URL}/gigs/public/${gig.id}`, { headers: auth(jobseeker.token) });
    expect(detail.status()).toBe(200);
    const shown = (await detail.json()).gig;
    expect(shown.title).toBe(gig.title);
    expect(shown.location).toBe(gig.location);
    expect(shown.filledPositions).toBe(0);
  });

  test("TC-JS-02 pending gig is hidden from job seekers", async () => {
    const gig = await createGig(api, owner.token, cleanup, validGig(category.id));
    expect(await browsableGigIds(api, jobseeker.token)).not.toContain(gig.id);
  });

  test("TC-JS-03 rejected gig is hidden from job seekers", async () => {
    const gig = await createGig(api, owner.token, cleanup, validGig(category.id));
    await rejectGig(api, adminToken, gig.id, "Please add the exact shop address.");
    expect(await browsableGigIds(api, jobseeker.token)).not.toContain(gig.id);
  });

  test("TC-JS-04 closed gig is hidden from job seekers", async () => {
    const gig = await createGig(api, owner.token, cleanup, validGig(category.id));
    await approveGig(api, adminToken, gig.id);
    const res = await api.patch(`${API_BASE_URL}/gigs/${gig.id}/close`, { headers: auth(owner.token) });
    expect(res.status()).toBe(200);
    expect(await browsableGigIds(api, jobseeker.token)).not.toContain(gig.id);
  });

  test("TC-JS-06 filtering by category returns only that category's gigs", async () => {
    const otherCategory = await createCategory(api, adminToken, cleanup);
    const inCategory = await createGig(api, owner.token, cleanup, validGig(category.id));
    const inOther = await createGig(api, owner.token, cleanup, validGig(otherCategory.id));
    await approveGig(api, adminToken, inCategory.id);
    await approveGig(api, adminToken, inOther.id);

    const ids = await browsableGigIds(api, jobseeker.token, `?categoryId=${category.id}`);
    expect(ids).toContain(inCategory.id);
    expect(ids).not.toContain(inOther.id);
  });
});
