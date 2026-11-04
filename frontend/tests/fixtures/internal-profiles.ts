import type {
  AvailableInternalProfile,
  Department,
  InternalProfile,
  InternalProfileOption,
  Position,
} from "@/lib/internal-profiles/types";

export function makeDepartment(overrides: Partial<Department> = {}): Department {
  return { id: 1, name: "จัดซื้อ", internalProfilesCount: 0, ...overrides };
}

export function makePosition(overrides: Partial<Position> = {}): Position {
  return { id: 1, name: "เจ้าหน้าที่จัดซื้อ", internalProfilesCount: 0, ...overrides };
}

export function makeInternalProfile(overrides: Partial<InternalProfile> = {}): InternalProfile {
  return {
    id: 1,
    userId: null,
    employeeNo: "EMP-001",
    prefix: "นาย",
    firstname: "สมชาย",
    lastname: "ใจดี",
    department: makeDepartment(),
    position: makePosition(),
    phone: "081-234-5678",
    ...overrides,
  };
}

// GET /internal-profiles/select
export function makeInternalProfileOption(overrides: Partial<InternalProfileOption> = {}): InternalProfileOption {
  return { id: 1, name: "สมชาย ใจดี", ...overrides };
}

// GET /internal-profiles/select-available
export function makeAvailableInternalProfile(
  overrides: Partial<AvailableInternalProfile> = {},
): AvailableInternalProfile {
  return { id: 1, name: "สมชาย ใจดี", ...overrides };
}
