export interface TeamMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  /** Tailwind bg-color class for the avatar */
  color: string;
}

export const TEAM_MEMBERS: TeamMember[] = [
  { id: "tm-1", name: "Sarah Chen",    role: "PR Lead",             initials: "SC", color: "bg-violet-500"  },
  { id: "tm-2", name: "Alex Torres",   role: "Legal Counsel",       initials: "AT", color: "bg-blue-500"    },
  { id: "tm-3", name: "Marcus Webb",   role: "Marketing Director",  initials: "MW", color: "bg-emerald-600" },
  { id: "tm-4", name: "Priya Sharma",  role: "Content Strategist",  initials: "PS", color: "bg-rose-500"    },
  { id: "tm-5", name: "Jamie Lee",     role: "Creative Director",   initials: "JL", color: "bg-amber-500"   },
];

export function getMemberById(id: string): TeamMember | undefined {
  return TEAM_MEMBERS.find((m) => m.id === id);
}
