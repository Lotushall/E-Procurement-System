import type {
  InternalProfileFields,
  Permission,
  RoleDetail,
  SessionInfo,
  UserDetail,
  UserListItem,
} from "@/lib/user/management/types";

// แถวในรายการผู้ใช้ GET /api/v1/dashboard/users
export function makeManagedUser(overrides: Partial<UserListItem> = {}): UserListItem {
  return {
    id: 1,
    username: "somchai",
    email: "somchai@example.com",
    name: "สมชาย ใจดี",
    userType: "internal",
    status: "active",
    createdAt: "2026-01-15T03:00:00.000000Z",
    ...overrides,
  };
}

export function makeInternalProfileFields(overrides: Partial<InternalProfileFields> = {}): InternalProfileFields {
  return {
    prefix: "นาย",
    firstname: "สมชาย",
    lastname: "ใจดี",
    employeeNo: "EMP-001",
    department: "จัดซื้อ",
    position: "เจ้าหน้าที่จัดซื้อ",
    phone: "081-234-5678",
    ...overrides,
  };
}

// GET /api/v1/dashboard/users/:id
export function makeUserDetail(overrides: Partial<UserDetail> = {}): UserDetail {
  return {
    ...makeManagedUser(),
    vendorProfileId: null,
    role: "officer",
    internalProfile: makeInternalProfileFields(),
    permissions: [],
    emailVerifiedAt: "2026-01-15T03:00:00.000000Z",
    lastLoginAt: "2026-02-01T03:00:00.000000Z",
    passwordChangedAt: "2026-01-20T03:00:00.000000Z",
    ...overrides,
  };
}

// GET /api/v1/dashboard/roles
export function makeRole(overrides: Partial<RoleDetail> = {}): RoleDetail {
  return { id: 1, name: "officer", permissions: [], userCount: 0, ...overrides };
}

// GET /api/v1/dashboard/permissions
export function makePermission(overrides: Partial<Permission> = {}): Permission {
  return { name: "users.viewAny", label: "ดูรายการผู้ใช้", group: "users", ...overrides };
}

// GET /api/v1/dashboard/users/:id/sessions
export function makeUserSession(overrides: Partial<SessionInfo> = {}): SessionInfo {
  return {
    id: "session-1",
    device: "Desktop",
    browser: "Chrome",
    os: "Windows",
    ipAddress: "192.168.1.10",
    lastActiveAt: "2026-02-01T03:00:00.000000Z",
    current: false,
    ...overrides,
  };
}
