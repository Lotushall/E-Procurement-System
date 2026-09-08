export const routes = {
  home: "/",
  notifications: "/notifications",
  profiles: {
    profile: "/profiles",
    vendorInfo: "/profiles/vendor-info",
    contract: "/profiles/contract",
    document: "/profiles/document",
  },
  auth: {
    login: "/login",
    forgotpassword: "/forgot-password",
    resetPassword: "/reset-password",
    register: "/register",
    verifyEmail: "/verify-email",
  },
  dashboards: {
    dashboard: "/dashboard",
    tors: {
      index: "/dashboard/tors",
    },
    tender_project: {
      index: "/dashboard/tender-projects",
      detail: (id: number | string) => `/dashboard/tender-projects/detail?id=${id}`,
      edit: (id: number | string) => `/dashboard/tender-projects/edit?id=${id}`,
    },
    vendors: {
      index: "/dashboard/vendors",
      detail: (id: number | string) => `/dashboard/vendors/detail?id=${id}`,
    },
    reports: {
      index: "/dashboard/reports",
    },
    user: {
      index: "/dashboard/users",
      create: "/dashboard/users/create",
      detail: (id: number | string) => `/dashboard/users/detail?id=${id}`,
      edit: (id: number | string) => `/dashboard/users/edit?id=${id}`,
      roles: "/dashboard/users/roles-permissions",
    },
    internal_employees: {
      index: (search?: string) =>
        `/dashboard/internal-employees${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      departments_positions:
        "/dashboard/internal-employees/departments-positions",
    },
    setting: {
      index: "/dashboard/settings",
    },
  },
  terms: "/terms",
  privacy: "/privacy",
} as const;
