export const routes = {
  home: "/",
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
      detail: (id: number | string) => `/dashboard/vendors/${id}`,
    },
    tor: {
      index: "/dashboard/tor",
    },
  },
  terms: "/terms",
  privacy: "/privacy",
} as const;
