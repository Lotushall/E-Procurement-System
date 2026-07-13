export interface User {
  id: number;
  username: string;
  email: string;
  userType: "internal" | "company" | "individual";
  status: "pending" | "active" | "suspended" | "inactive";
  email_verified_at: string;
  created_at: string;
  updated_at: string;
  roles: string[];
  permissions: string[];
}
