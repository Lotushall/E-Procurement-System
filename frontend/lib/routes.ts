export const routes = {
  home: "/",
  profiles: {
    profile: "/profiles",
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
  },
  terms: "/terms",
  privacy: "/privacy",
} as const;
