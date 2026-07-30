"use client";

import { use } from "react";
import { VendorDetailView } from "./_components/vendor-detail-view";

export default function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <VendorDetailView vendorId={Number(id)} />;
}
