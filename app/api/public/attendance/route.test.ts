import { describe, it, expect, beforeEach, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    votingSession: { findFirst: vi.fn() },
    user: { count: vi.fn(), findMany: vi.fn() },
    attendance: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { GET } from "@/app/api/public/attendance/route";

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.votingSession.findFirst.mockResolvedValue({
    id: "s1",
    isAttendanceOpen: true,
    attendanceStartedAt: null,
    attendanceEndedAt: null,
    quorum: 5,
  });
  prismaMock.user.count.mockResolvedValue(2);
  prismaMock.user.findMany.mockResolvedValue([
    { id: "c1", fullName: "Ana", role: "PRESIDENT", photoUrl: null, party: "P1", partyLogoUrl: null },
    { id: "c2", fullName: "Bruno", role: "COUNCILOR", photoUrl: null, party: "P2", partyLogoUrl: null },
  ]);
  prismaMock.attendance.findMany.mockResolvedValue([]);
});

describe("GET /api/public/attendance", () => {
  it("retorna null sem sessão ativa", async () => {
    prismaMock.votingSession.findFirst.mockResolvedValue(null);
    const res = await GET();
    expect(await res.json()).toBeNull();
  });

  it("monta a lista com os ausentes quando não há registros", async () => {
    const json = await (await GET()).json();
    expect(json.attendances).toHaveLength(2);
    expect(json.attendances.every((a: { isPresent: boolean }) => a.isPresent === false)).toBe(true);
    expect(json.presentCount).toBe(0);
    expect(json.totalCount).toBe(2);
    expect(json.hasQuorum).toBe(false);
  });

  it("calcula presença e quórum a partir dos registros", async () => {
    prismaMock.attendance.findMany.mockResolvedValue([
      { userId: "c1", isPresent: true, arrivedAt: new Date("2026-03-01T19:00:00Z"), absenceJustification: null, absenceJustifiedAt: null },
      { userId: "c2", isPresent: false, arrivedAt: null, absenceJustification: "Saúde", absenceJustifiedAt: null },
    ]);
    const json = await (await GET()).json();
    const present = json.attendances.find((a: { id: string }) => a.id === "c1");
    const absent = json.attendances.find((a: { id: string }) => a.id === "c2");
    expect(present).toMatchObject({ isPresent: true, user: { fullName: "Ana", role: "PRESIDENT" } });
    expect(absent).toMatchObject({ isPresent: false, absenceJustification: "Saúde" });
    expect(json.presentCount).toBe(1);
    expect(json.hasQuorum).toBe(false);
  });

  it("marca quórum atingido quando os presentes alcançam o mínimo", async () => {
    prismaMock.attendance.findMany.mockResolvedValue([{ userId: "c1", isPresent: true, arrivedAt: null }]);
    prismaMock.votingSession.findFirst.mockResolvedValue({
      id: "s1",
      isAttendanceOpen: false,
      attendanceStartedAt: null,
      attendanceEndedAt: new Date(),
      quorum: 1,
    });
    const json = await (await GET()).json();
    expect(json.presentCount).toBe(1);
    expect(json.hasQuorum).toBe(true);
  });
});
