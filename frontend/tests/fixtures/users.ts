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
