export interface LoginPayload {
  identifier: string;
  password: string;
  remember: boolean;
}

export interface VerifyEmailParams {
  id: string;
  hash: string;
  expires: string;
  signature: string;
}

export interface RegisterVendorPayload {
  vendorType: "company" | "individual";
  companyName?: string;
  taxId?: string;
  fullName?: string;
  idCard?: string;
  phone: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  // Duplicated from confirmPassword: Laravel's `confirmed` rule on the
  // backend looks for `password_confirmation` specifically.
  password_confirmation: string;
  terms: boolean;
}
