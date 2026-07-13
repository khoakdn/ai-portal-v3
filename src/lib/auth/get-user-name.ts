export function getUserName(email?: string | null): string {
  if (!email) return "Team Member";
  return email
    .split("@")[0]
    .split(".")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
