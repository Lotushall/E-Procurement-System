import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw/http";
import { describe, expect, it, vi } from "vitest";
import { Providers } from "@/app/providers";
import { api } from "@/lib/api";
import { useRequireAuth } from "@/lib/auth/guards/useRequireAuth";
import { AUTH_USER_QUERY_KEY } from "@/lib/auth/queries/useUser";
import { makeCurrentUser } from "@/tests/fixtures/users";
import { signInAs } from "@/tests/helpers/auth";
import { router } from "@/tests/mocks/next-navigation";
import { apiUrl, server } from "@/tests/msw/server";

const devtoolsProps = vi.hoisted(() => ({ calls: [] as Record<string, unknown>[] }));

// ใน NODE_ENV=test ตัวจริงไม่ render อะไร — mock เพื่อเช็คว่า Providers ติดตั้งมันด้วยค่าที่ตั้งใจไว้
vi.mock("@tanstack/react-query-devtools", () => ({
  ReactQueryDevtools: (props: Record<string, unknown>) => {
    devtoolsProps.calls.push(props);
    return <div data-testid="query-devtools" />;
  },
}));

function CaptureClient({ onClient }: { onClient: (client: QueryClient) => void }) {
  onClient(useQueryClient());
  return null;
}

function GuardedPage() {
  const { isChecking } = useRequireAuth();
  return isChecking ? null : <p>หน้าที่ต้อง login</p>;
}

function GreetingQuery() {
  const { data, isSuccess } = useQuery({
    queryKey: ["providers-test"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/providers-test"));
      return (await response.json()) as { greeting: string };
    },
  });
  return <p>{isSuccess ? data.greeting : "กำลังโหลด"}</p>;
}

describe("Providers", () => {
  it("renders its children", () => {
    render(
      <Providers>
        <p>เนื้อหาแอป</p>
      </Providers>,
    );

    expect(screen.getByText("เนื้อหาแอป")).toBeInTheDocument();
  });

  it("gives descendants a working React Query client", async () => {
    server.use(http.get(apiUrl("/providers-test"), () => HttpResponse.json({ greeting: "สวัสดี" })));

    render(
      <Providers>
        <GreetingQuery />
      </Providers>,
    );

    expect(screen.getByText("กำลังโหลด")).toBeInTheDocument();
    expect(await screen.findByText("สวัสดี")).toBeInTheDocument();
  });

  it("keeps the same client across re-renders so the cache survives", () => {
    const seen: QueryClient[] = [];
    const tree = () => (
      <Providers>
        <CaptureClient onClient={(client) => seen.push(client)} />
      </Providers>
    );

    const { rerender } = render(tree());
    rerender(tree());

    expect(seen).toHaveLength(2);
    expect(seen[1]).toBe(seen[0]);
  });

  it("creates a separate client for each mounted provider", () => {
    const first: QueryClient[] = [];
    const second: QueryClient[] = [];

    const a = render(
      <Providers>
        <CaptureClient onClient={(client) => first.push(client)} />
      </Providers>,
    );
    a.unmount();
    render(
      <Providers>
        <CaptureClient onClient={(client) => second.push(client)} />
      </Providers>,
    );

    expect(first[0]).not.toBe(second[0]);
  });

  it("signs the user out of the cache as soon as any API call answers 401 (session expired)", async () => {
    server.use(http.get(apiUrl("/api/v1/tors"), () => new HttpResponse(null, { status: 401 })));
    let client!: QueryClient;
    render(
      <Providers>
        <CaptureClient onClient={(c) => (client = c)} />
      </Providers>,
    );
    client.setQueryData(AUTH_USER_QUERY_KEY, makeCurrentUser());

    await expect(api.get("/api/v1/tors")).rejects.toMatchObject({ response: { status: 401 } });

    expect(client.getQueryData(AUTH_USER_QUERY_KEY)).toBeNull();
  });

  it("sends a guarded page to the login page right after a 401, without waiting for the user refetch", async () => {
    signInAs();
    server.use(http.get(apiUrl("/api/v1/tors"), () => new HttpResponse(null, { status: 401 })));
    render(
      <Providers>
        <GuardedPage />
      </Providers>,
    );
    expect(await screen.findByText("หน้าที่ต้อง login")).toBeInTheDocument();

    await expect(api.get("/api/v1/tors")).rejects.toMatchObject({ response: { status: 401 } });

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("หน้าที่ต้อง login")).not.toBeInTheDocument();
  });

  it("keeps the user when the 401 is the current-user check itself", async () => {
    server.use(http.get(apiUrl("/api/v1/auth/user"), () => new HttpResponse(null, { status: 401 })));
    let client!: QueryClient;
    render(
      <Providers>
        <CaptureClient onClient={(c) => (client = c)} />
      </Providers>,
    );
    const user = makeCurrentUser();
    client.setQueryData(AUTH_USER_QUERY_KEY, user);

    await expect(api.get("/api/v1/auth/user")).rejects.toMatchObject({ response: { status: 401 } });

    expect(client.getQueryData(AUTH_USER_QUERY_KEY)).toEqual(user);
  });

  it("stops handling 401s after it unmounts", async () => {
    server.use(http.get(apiUrl("/api/v1/tors"), () => new HttpResponse(null, { status: 401 })));
    let client!: QueryClient;
    const { unmount } = render(
      <Providers>
        <CaptureClient onClient={(c) => (client = c)} />
      </Providers>,
    );
    const user = makeCurrentUser();
    client.setQueryData(AUTH_USER_QUERY_KEY, user);
    unmount();

    await expect(api.get("/api/v1/tors")).rejects.toMatchObject({ response: { status: 401 } });

    expect(client.getQueryData(AUTH_USER_QUERY_KEY)).toEqual(user);
  });

  it("mounts the React Query devtools closed, in the bottom-left corner", () => {
    devtoolsProps.calls.length = 0;

    render(
      <Providers>
        <p>เนื้อหาแอป</p>
      </Providers>,
    );

    expect(screen.getByTestId("query-devtools")).toBeInTheDocument();
    expect(devtoolsProps.calls[0]).toMatchObject({ initialIsOpen: false, buttonPosition: "bottom-left" });
  });
});
