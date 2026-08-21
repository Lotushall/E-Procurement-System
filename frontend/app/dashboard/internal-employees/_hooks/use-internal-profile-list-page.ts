import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useInternalProfileListPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return {};
}
