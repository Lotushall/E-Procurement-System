import { useQuery } from "@tanstack/react-query";
import { fetchPositionList } from "../api";

export function usePositionList() {
  return useQuery({
    queryKey: ["positions", "list"],
    queryFn: fetchPositionList,
  });
}
