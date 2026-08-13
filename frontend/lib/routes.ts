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
    vendors: {
      index: "/dashboard/vendors",
      detail: (id: number | string) => `/dashboard/vendors/detail?id=${id}`,
    },
    tor: {
      index: "/dashboard/tor",
    },
    user: {
      index: "/dashboard/users",
      detail: (id: number | string) => `/dashboard/users/detail?id=${id}`,
    },
  },
  terms: "/terms",
  privacy: "/privacy",
} as const;
