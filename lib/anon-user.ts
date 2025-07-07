// Utility to get or generate a persistent anonymous user ID for this device/browser
export function getAnonUserId(): string {
  if (typeof window === "undefined") return "anon-server";
  let id = localStorage.getItem("anon_user_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("anon_user_id", id);
  }
  return id;
} 