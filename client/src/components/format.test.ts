import { describe, expect, it } from "vitest";
import { formatCalendarDate } from "./format";

describe("formatCalendarDate", () => {
  it("shows the stored calendar day regardless of the viewer's time zone", () => {
    // Midnight UTC is the previous evening in the Americas; the lot still expires on the 22nd.
    expect(formatCalendarDate("2027-09-22T00:00:00Z")).toMatch(/22/);
    expect(formatCalendarDate(null)).toBe("—");
  });
});
