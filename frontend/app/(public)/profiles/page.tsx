"use client";

import AccountInfoSection from "./_components/account-info-section";
import ChangePasswordSection from "./_components/change-password-section";

export default function Account() {
  return (
    <div className="flex flex-col">
      <AccountInfoSection />
      <ChangePasswordSection />
    </div>
  )
}
