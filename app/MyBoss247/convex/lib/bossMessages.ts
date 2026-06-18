/**
 * Pure, in-character escalation messages for the warning system (T0.4).
 * No Convex/db access — unit-testable. The Boss speaks differently per
 * personality when a required task crosses into orange (overdue) or red (critical).
 */

export type Personality =
  | "drill_sergeant"
  | "tough_coach"
  | "supportive_manager";

export type EscalationLevel = "orange" | "red";

export function escalationMessage(
  personality: Personality,
  level: EscalationLevel,
  taskTitle: string
): string {
  const t = taskTitle;
  if (level === "red") {
    switch (personality) {
      case "drill_sergeant":
        return `"${t}" is RED. The deadline is blown. This is unacceptable — fix it NOW.`;
      case "supportive_manager":
        return `Hey — "${t}" is now critically overdue. It happens, but let's get it sorted today. What do you need from me?`;
      case "tough_coach":
      default:
        return `"${t}" just went critical — overdue by a full day. That's not like you. Get it done.`;
    }
  }
  // orange — firm warning
  switch (personality) {
    case "drill_sergeant":
      return `"${t}" is overdue. The clock is against you. Move.`;
    case "supportive_manager":
      return `Quick nudge — "${t}" slipped past its deadline. Let's not let it sit. You've got this.`;
    case "tough_coach":
    default:
      return `"${t}" is overdue. Don't let it slide — handle it now.`;
  }
}
