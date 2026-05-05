const KEY = "screenshot-shelf:onboarding-seen:v1";
const EVENT = "shelf:onboarding-requested";

export function hasSeenOnboarding(): boolean {
  return localStorage.getItem(KEY) === "true";
}

export function markOnboardingSeen(): void {
  localStorage.setItem(KEY, "true");
}

export function requestOnboarding(): void {
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function onOnboardingRequested(callback: () => void): () => void {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}
