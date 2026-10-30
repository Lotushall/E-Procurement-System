import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchInternalProfileList } from "../api";
import type { InternalProfileListParams } from "../types";

export function useInternalProfileList(
  params: InternalProfileListParams = {},
  page = 1,
  per_page = 20,
) {
  return useQuery({
    queryKey: ["internal_profiles", "list", params, page, per_page],
    queryFn: () => fetchInternalProfileList(params, page, per_page),
    placeholderData: keepPreviousData,
  });
}
