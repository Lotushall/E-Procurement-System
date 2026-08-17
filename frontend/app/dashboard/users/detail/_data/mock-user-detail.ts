import type { UserStatus } from "@/lib/user/management/types";

export type ActivityType =
  | "login"
  | "logout"
  | "password_changed"
  | "profile_updated"
  | "role_changed"
  | "permission_changed"
  | "status_changed"
  | "session_revoked";

export interface MockSession {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  loginAt: string;
  lastActiveAt: string;
  current: boolean;
}

export interface MockPermission {
  name: string;
  label: string;
  source: "role" | "direct";
}

export interface MockActivity {
  id: string;
  type: ActivityType;
  description: string;
  actor: string;
  ip: string;
  at: string;
}

export interface MockInternalProfile {
  employeeNo: string;
  prefix: string;
  firstname: string;
  lastname: string;
  department: string;
  position: string;
  phone: string;
}

export interface MockCompanyProfile {
  companyName: string;
  taxId: string;
  contactName: string;
  contactPhone: string;
}

export interface MockIndividualProfile {
  fullName: string;
  nationalId: string;
  phone: string;
}

interface MockUserBase {
  id: number;
  username: string;
  email: string;
  name: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  emailVerified: boolean;
  emailVerifiedAt: string | null;
  lastLoginAt: string;
  passwordChangedAt: string;
  twoFactorEnabled: boolean;
  roles: string[];
  permissions: MockPermission[];
  sessions: MockSession[];
  activity: MockActivity[];
}

export type MockUserDetail =
  | (MockUserBase & { userType: "internal"; profile: MockInternalProfile })
  | (MockUserBase & { userType: "company"; profile: MockCompanyProfile })
  | (MockUserBase & { userType: "individual"; profile: MockIndividualProfile });

const hoursAgo = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60 * 1000).toISOString();
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

export const MOCK_USER_DETAIL: MockUserDetail = {
  id: 1,
  username: "somchai.j",
  email: "somchai.j@e-procurement.go.th",
  name: "สมชาย ใจดี",
  userType: "internal",
  status: "active",
  createdAt: daysAgo(210),
  updatedAt: daysAgo(3),
  emailVerified: true,
  emailVerifiedAt: daysAgo(210),
  lastLoginAt: minutesAgo(2),
  passwordChangedAt: daysAgo(46),
  twoFactorEnabled: false,
  roles: ["manager"],
  profile: {
    employeeNo: "EMP-10234",
    prefix: "นาย",
    firstname: "สมชาย",
    lastname: "ใจดี",
    department: "ฝ่ายจัดซื้อจัดจ้าง",
    position: "ผู้จัดการฝ่ายจัดซื้อ",
    phone: "0891234567",
  },
  permissions: [
    { name: "vendors.view", label: "ดูข้อมูลผู้ค้า", source: "role" },
    { name: "vendors.create", label: "เพิ่มผู้ค้า", source: "role" },
    { name: "vendors.approve", label: "อนุมัติผู้ค้า", source: "role" },
    { name: "vendors.edit", label: "แก้ไขข้อมูลผู้ค้า", source: "direct" },
    { name: "users.view", label: "ดูข้อมูลผู้ใช้", source: "direct" },
  ],
  sessions: [
    {
      id: "sess-1",
      device: "MacBook Pro",
      browser: "Chrome",
      os: "Windows 11",
      ip: "192.168.1.10",
      location: "กรุงเทพมหานคร, ไทย",
      loginAt: hoursAgo(3),
      lastActiveAt: minutesAgo(2),
      current: true,
    },
    {
      id: "sess-2",
      device: "iPhone 15",
      browser: "Safari",
      os: "iOS 18",
      ip: "49.230.14.88",
      location: "เชียงใหม่, ไทย",
      loginAt: daysAgo(1),
      lastActiveAt: hoursAgo(5),
      current: false,
    },
    {
      id: "sess-3",
      device: "Dell XPS 13",
      browser: "Firefox",
      os: "Windows 10",
      ip: "10.0.0.42",
      location: "กรุงเทพมหานคร, ไทย",
      loginAt: daysAgo(6),
      lastActiveAt: daysAgo(4),
      current: false,
    },
  ],
  activity: [
    {
      id: "act-1",
      type: "login",
      description: "เข้าสู่ระบบสำเร็จ",
      actor: "สมชาย ใจดี",
      ip: "192.168.1.10",
      at: minutesAgo(2),
    },
    {
      id: "act-2",
      type: "permission_changed",
      description: 'เพิ่มสิทธิ์ "แก้ไขข้อมูลผู้ค้า" ให้กับผู้ใช้นี้โดยตรง',
      actor: "ผู้ดูแลระบบ",
      ip: "192.168.1.5",
      at: daysAgo(3),
    },
    {
      id: "act-3",
      type: "profile_updated",
      description: "แก้ไขข้อมูลตำแหน่งและแผนก",
      actor: "ผู้ดูแลระบบ",
      ip: "192.168.1.5",
      at: daysAgo(3),
    },
    {
      id: "act-4",
      type: "password_changed",
      description: "เปลี่ยนรหัสผ่านสำเร็จ",
      actor: "สมชาย ใจดี",
      ip: "192.168.1.10",
      at: daysAgo(46),
    },
    {
      id: "act-5",
      type: "role_changed",
      description: 'เปลี่ยน role จาก "staff" เป็น "manager"',
      actor: "ผู้ดูแลระบบ",
      ip: "192.168.1.5",
      at: daysAgo(90),
    },
    {
      id: "act-6",
      type: "session_revoked",
      description: "เพิกถอน session บนอุปกรณ์ Android",
      actor: "ผู้ดูแลระบบ",
      ip: "192.168.1.5",
      at: daysAgo(120),
    },
    {
      id: "act-7",
      type: "status_changed",
      description: 'เปลี่ยนสถานะบัญชีเป็น "ใช้งานอยู่"',
      actor: "ผู้ดูแลระบบ",
      ip: "192.168.1.5",
      at: daysAgo(210),
    },
    {
      id: "act-8",
      type: "logout",
      description: "ออกจากระบบ",
      actor: "สมชาย ใจดี",
      ip: "192.168.1.10",
      at: daysAgo(1),
    },
  ],
};
