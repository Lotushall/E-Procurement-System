"use client";

import { useUser } from "@/lib/auth/useUser";

export default function DashboardPage() {
  const { data: user } = useUser();

  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-bold">
        ยินดีต้อนรับ{user ? `, ${user.username}` : ""}
      </h1>
      <p className="text-sm text-muted-foreground">
        นี่คือหน้าแดชบอร์ดสำหรับผู้ใช้งานภายใน เนื้อหาส่วนนี้จะถูกเพิ่มเติมในภายหลัง
      </p>
    </div>
  );
}
