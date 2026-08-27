import { useQuery } from "@tanstack/react-query";
import { fetchAvailableInternalProfiles } from "../api";

export function useAvailableInternalProfiles() {
  return useQuery({
    queryKey: ["internal_profiles", "select-available"],
    queryFn: fetchAvailableInternalProfiles,
  });
}
