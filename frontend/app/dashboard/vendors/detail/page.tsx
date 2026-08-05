"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { VendorDetailView } from "./_components/vendor-detail-view";

export default function VendorDetailPage() {
  return (
    <Suspense fallback={null}>
      <VendorDetailContent />
    </Suspense>
  );
}

function VendorDetailContent() {
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id"));

  return <VendorDetailView vendorId={id} />;
}
