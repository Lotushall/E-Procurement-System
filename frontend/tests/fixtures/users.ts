import type { CurrentUser } from "@/lib/auth/types";
import type { User } from "@/lib/user/types";

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    username: "officer",
    email: "officer@example.com",
    userType: "internal",
    status: "active",
    email_verified_at: "2026-01-01T00:00:00.000000Z",
    created_at: "2026-01-01T00:00:00.000000Z",
    updated_at: "2026-01-01T00:00:00.000000Z",
    roles: [],
    permissions: [],
    ...overrides,
  };
}

// รูปแบบที่ GET /api/v1/auth/user คืนจริง (CurrentUser)
export function makeCurrentUser(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 1,
    username: "officer",
    email: "officer@example.com",
    userType: "internal",
    emailVerifiedAt: "2026-01-01T00:00:00.000000Z",
    roles: [],
    permissions: [],
    profiles: { companyName: null, shopName: null, firstname: null, lastname: null },
    ...overrides,
  };
}
