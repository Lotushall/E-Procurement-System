import { useQuery } from "@tanstack/react-query";
import { fetchPositionOptions } from "../api";

export function usePositionOptions() {
  return useQuery({
    queryKey: ["positions", "select"],
    queryFn: fetchPositionOptions,
  });
}
