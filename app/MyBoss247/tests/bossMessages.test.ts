import { describe, it, expect } from "vitest";
import { escalationMessage, Personality } from "../convex/lib/bossMessages";

const ALL: Personality[] = ["drill_sergeant", "tough_coach", "supportive_manager"];

describe("escalationMessage", () => {
  it("always includes the task title", () => {
    for (const p of ALL) {
      expect(escalationMessage(p, "orange", "Call investors")).toContain("Call investors");
      expect(escalationMessage(p, "red", "Ship the MVP")).toContain("Ship the MVP");
    }
  });

  it("is distinctly in-character per personality (red)", () => {
    expect(escalationMessage("drill_sergeant", "red", "X")).toMatch(/RED|NOW|unacceptable/i);
    expect(escalationMessage("supportive_manager", "red", "X")).toMatch(/let's|what do you need/i);
    expect(escalationMessage("tough_coach", "red", "X")).toMatch(/critical|not like you/i);
  });

  it("produces a distinct, non-empty message for every personality × level", () => {
    const seen = new Set<string>();
    for (const p of ALL) {
      for (const level of ["orange", "red"] as const) {
        const m = escalationMessage(p, level, "Task");
        expect(m.length).toBeGreaterThan(10);
        seen.add(m);
      }
    }
    expect(seen.size).toBe(ALL.length * 2); // all 6 unique
  });
});
