import { Badge } from "@/components/ui/badge";
import { cn, formatPhone, getInitials } from "@/lib/utils";
import type { VendorContact } from "@/lib/vendor/profile/types";

export function VendorContactRow({ contact }: { contact: VendorContact }) {
  return (
    <div className="flex items-center gap-3.5 rounded-md border p-4">
      <div
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-md font-bold text-white",
          contact.isMainContact ? "bg-red-700" : "bg-gray-200 text-gray-500",
        )}
      >
        {getInitials(contact.contactName)}
      </div>

      <div className="flex min-w-0 flex-col">
        <div className="flex flex-col-reverse gap-1 md:flex-row md:items-center md:gap-2.5">
          <p className="font-bold tracking-wide capitalize">{contact.contactName}</p>
          {contact.isMainContact && (
            <Badge className="bg-red-100 text-red-800 tracking-wider">ผู้ติดต่อหลัก</Badge>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1 text-sm font-thin tracking-wide text-gray-600">
          <p className="capitalize">{contact.contactPosition || contact.contactName}</p>
          {contact.contactPhone && <p> · {formatPhone(contact.contactPhone)}</p>}
          {contact.contactEmail && <p className="break-all"> · {contact.contactEmail}</p>}
          {contact.lineId && <p> · {contact.lineId}</p>}
          {contact.otherContact && <p> · {contact.otherContact}</p>}
        </div>
      </div>
    </div>
  );
}
