import { http, HttpResponse } from "msw/http";
import type { CurrentUser } from "@/lib/auth/types";
import { makeCurrentUser } from "@/tests/fixtures/users";
import { apiUrl, server } from "@/tests/msw/server";

const CURRENT_USER_URL = apiUrl("/api/v1/auth/user");

// ให้ useUser() คืน user คนนี้ (shape เดียวกับ CurrentUser ที่ API จริงคืน) — ใช้กับ guard และหน้าที่เช็คสิทธิ์ เช่น signInAs({ permissions: ["tors.viewAny"] })
export function signInAs(overrides: Partial<CurrentUser> = {}): CurrentUser {
  const user = makeCurrentUser(overrides);
  server.use(http.get(CURRENT_USER_URL, () => HttpResponse.json({ data: user })));
  return user;
}

// ให้ useUser() คืน null (ยังไม่ได้ล็อกอิน)
export function signOut() {
  server.use(http.get(CURRENT_USER_URL, () => new HttpResponse(null, { status: 401 })));
}
