import { ShieldAlert } from "lucide-react";

export function Forbidden() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
      <ShieldAlert className="size-10 text-muted-foreground" />
      <p className="text-lg font-semibold">ไม่มีสิทธิ์เข้าถึงหน้านี้</p>
      <p className="text-sm text-muted-foreground">กรุณาติดต่อผู้ดูแลระบบหากคิดว่านี่คือความผิดพลาด</p>
    </div>
  );
}
