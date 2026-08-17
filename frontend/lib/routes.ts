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
    tenders: {
      index: "/dashboard/tenders",
    },
    vendors: {
      index: "/dashboard/vendors",
      detail: (id: number | string) => `/dashboard/vendors/detail?id=${id}`,
    },
    reports: {
      index: "/dashboard/reports",
    },
    logs: {
      index: "/dashboard/logs",
    },
    user: {
      index: "/dashboard/users",
      create: "/dashboard/users/create",
      detail: (id: number | string) => `/dashboard/users/detail?id=${id}`,
      edit: (id: number | string) => `/dashboard/users/edit?id=${id}`,
      roles: "/dashboard/users/roles-permissions",
    },
    setting: {
      index: "/dashboard/settings",
    },
  },
  terms: "/terms",
  privacy: "/privacy",
} as const;
