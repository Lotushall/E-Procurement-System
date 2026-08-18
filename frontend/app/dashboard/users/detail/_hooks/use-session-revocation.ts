import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AUTH_USER_QUERY_KEY } from "@/lib/auth/queries/useUser";
import { routes } from "@/lib/routes";
import { useRevokeUserSession } from "@/lib/user/management/mutations/useRevokeUserSession";
import { useRevokeAllUserSessions } from "@/lib/user/management/mutations/useRevokeAllUserSessions";
import type { SessionInfo } from "@/lib/user/management/types";

export type SessionConfirmState =
  | { type: "single"; session: SessionInfo }
  | { type: "others" }
  | { type: "all" }
  | null;

export function useSessionRevocation(userId: number, sessions: SessionInfo[] | undefined) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const revokeOne = useRevokeUserSession(userId);
  const revokeAll = useRevokeAllUserSessions(userId);
  const [confirm, setConfirm] = useState<SessionConfirmState>(null);

  const handleConfirm = () => {
    if (!confirm) return;

    const revokesOwnSession =
      (confirm.type === "single" && confirm.session.current) ||
      (confirm.type === "all" && (sessions ?? []).some((session) => session.current));

    let promise: Promise<void>;

    if (confirm.type === "single") {
      promise = revokeOne.mutateAsync(confirm.session.id);
      toast.promise(promise, {
        loading: "กำลังเพิกถอน session...",
        success: "เพิกถอน session แล้ว",
        error: "เพิกถอน session ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      });
    } else if (confirm.type === "others") {
      promise = revokeAll.mutateAsync(true);
      toast.promise(promise, {
        loading: "กำลังเพิกถอน session อื่นทั้งหมด...",
        success: "เพิกถอน session อื่นทั้งหมดแล้ว",
        error: "เพิกถอน session ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      });
    } else {
      promise = revokeAll.mutateAsync(false);
      toast.promise(promise, {
        loading: "กำลังเพิกถอน session ทั้งหมด...",
        success: "เพิกถอน session ทั้งหมดแล้ว",
        error: "เพิกถอน session ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      });
    }

    if (revokesOwnSession) {
      promise
        .then(() => {
          queryClient.setQueryData(AUTH_USER_QUERY_KEY, null);
          router.replace(routes.auth.login);
        })
        .catch(() => {});
    }

    setConfirm(null);
  };

  return { confirm, setConfirm, handleConfirm };
}
