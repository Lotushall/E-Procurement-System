import { useQuery } from "@tanstack/react-query";
import { fetchTenderProjectOptions } from "../api";
import type { TenderProjectOptionsParams } from "../types";

// key ขึ้นต้นด้วย "tenders_projects" เพื่อให้ mutation ของโครงการ (invalidate ["tenders_projects"]) refresh ตัวเลือกด้วย
// params อยู่ใน key: เปลี่ยนหน่วยงานในฟอร์ม TOR = ดึงชุดใหม่ (ชุดเก่ายังอยู่ใน cache)
export function useTenderProjectOptions(
  params: TenderProjectOptionsParams = {},
  { enabled = true }: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: ["tenders_projects", "select", params],
    queryFn: () => fetchTenderProjectOptions(params),
    enabled,
  });
}
