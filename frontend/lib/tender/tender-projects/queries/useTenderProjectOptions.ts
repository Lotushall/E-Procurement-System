import { useQuery } from "@tanstack/react-query";
import { fetchTenderProjectOptions } from "../api";

// key ขึ้นต้นด้วย "tenders_projects" เพื่อให้ mutation ของโครงการ (invalidate ["tenders_projects"]) refresh ตัวเลือกด้วย
export function useTenderProjectOptions() {
  return useQuery({
    queryKey: ["tenders_projects", "select"],
    queryFn: fetchTenderProjectOptions,
  });
}
