export function getUserName(email?: string | null): string {
  if (!email) return "Team Member";
  return email
    .split("@")[0]
    .split(".")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getUserFirstName(email?: string | null): string {
  const fullName = getUserName(email);
  if (fullName === "Team Member") return fullName;
  return fullName.split(" ")[0] ?? fullName;
}
