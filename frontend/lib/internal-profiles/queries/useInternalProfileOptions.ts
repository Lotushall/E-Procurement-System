import { useQuery } from "@tanstack/react-query";
import { fetchInternalProfileOptions } from "../api";

export function useInternalProfileOptions() {
  return useQuery({
    queryKey: ["internal_profiles", "select"],
    queryFn: fetchInternalProfileOptions,
  });
}
