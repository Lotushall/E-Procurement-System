"use client";


import { useVendorProfile } from "@/lib/vendor/useVendorProfile"

export default function Profile() {

  const { data: vendor } = useVendorProfile()

  console.log(vendor);

  return (
    <div>

    </div>
  )
}
