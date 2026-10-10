import { navigationRef } from "./navigationRef";

let pendingLink: string | null = null;

function performNavigation(link: string, role: string | undefined): void {
  const gigMatch = link.match(/^\/gigs\/(.+)$/);
  const reviewMatch = link.match(/^\/reviews\/(.+)$/);

  // Nested cross-navigator navigation isn't expressible in RootStackParamList's
  // typing (each root screen takes no params); the `any` cast matches the
  // same pragmatic escape the in-app tap handler used before this was shared.
  const navigate = navigationRef.navigate as (name: string, params?: object) => void;

  try {
    if (gigMatch && role === "shopowner") {
      navigate("ShopOwner", {
        screen: "MyGigsTab",
        params: { screen: "GigDetail", params: { gigId: gigMatch[1] } },
      });
    } else if (reviewMatch && role === "admin") {
      navigate("Admin", { screen: "ReviewsTab" });
    }
  } catch {
    // Route not registered in this tree — ignore, the tap is just a no-op.
  }
}

// Best-effort deep-link resolution: only attempts navigation where the
// target screen is reliably reachable (and backed by real data) from the
// current role's navigation tree. Otherwise the tap is a no-op — there's
// no safe destination to send the user to.
//
// If the navigator isn't mounted yet (a cold start from tapping a push
// notification while auth/fonts are still loading), the link is queued and
// replayed once via flushPendingNotificationLink, called from
// NavigationContainer's onReady once `role` is known.
export function navigateToNotificationLink(link: string | undefined, role: string | undefined): void {
  if (!link) return;

  if (!navigationRef.isReady()) {
    pendingLink = link;
    return;
  }

  performNavigation(link, role);
}

export function flushPendingNotificationLink(role: string | undefined): void {
  if (!pendingLink || !navigationRef.isReady()) return;
  const link = pendingLink;
  pendingLink = null;
  performNavigation(link, role);
}
