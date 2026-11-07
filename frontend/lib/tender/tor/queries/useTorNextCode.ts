import { useQuery } from "@tanstack/react-query";
import { fetchTorNextCode } from "../api";

export function useTorNextCode() {
  return useQuery({
    queryKey: ["tors", "next-code"],
    queryFn: () => fetchTorNextCode(),
  });
}
