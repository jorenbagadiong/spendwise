"use client";

import { useEffect, useRef } from "react";

import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { getOnboardingPlan } from "@/lib/workspace/workspace";
import { usePersistenceState, useProfileState } from "@/stores/finance-data-provider";

/**
 * Shows onboarding instead of the app shell when it's needed (SW-010).
 * While saved data is loading, or when it can't be read, the shell is shown
 * as before (its DataGate shows the loading or recovery screen), so
 * returning visitors never see a flash of onboarding.
 *
 * The shell is always rendered (Next.js validates every route segment),
 * just hidden while onboarding is open.
 */
export function OnboardingGate({ children }: { children: React.ReactNode }) {
  const status = usePersistenceState((state) => state.status);
  const workspace = usePersistenceState((state) => state.workspace);
  const profileStatus = useProfileState((state) => state.status);
  const profile = useProfileState((state) => state.profile);
  const plan = getOnboardingPlan({ status, workspace }, { status: profileStatus, profile });
  const onboarding = plan === "new-user" || plan === "existing-data" || plan === "missing-workspace";

  // When onboarding finishes, start the app at the top (the last step is
  // long on phones, so the page was scrolled down) and move focus to the
  // page heading so keyboard and screen-reader users land at the start.
  const wasOnboarding = useRef(false);
  useEffect(() => {
    if (wasOnboarding.current && !onboarding) {
      window.scrollTo(0, 0);
      const heading = document.querySelector<HTMLElement>("header h1");
      if (heading) {
        heading.tabIndex = -1;
        heading.focus();
      }
    }
    wasOnboarding.current = onboarding;
  }, [onboarding]);

  return (
    <>
      {onboarding && <OnboardingFlow plan={plan} />}
      <div hidden={onboarding} className={onboarding ? "hidden" : "contents"}>
        {children}
      </div>
    </>
  );
}
