"use client";

import { useVendorProfile } from "@/lib/vendor/profile/useVendorProfile";
import SectionTitle from "../_components/section-title";
import AddContactDialog from "./_components/add-contact-dialog";
import EditContactDialog from "./_components/edit-contact-dialog";
import DeleteContactDialog from "./_components/delete-contact-dialog";
import ViewContactDialog from "./_components/view-contact-dialog";
import { cn, formatPhone, getInitials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";

export default function Contract() {
    const { data: vendor, isLoading } = useVendorProfile();

    return (
        <div className="flex flex-col">
            <SectionTitle title="ผู้ติดต่อ" desc="บุคคลที่ Lotushall Mining สามารถติดต่อได้เกี่ยวกับการจัดซื้อจัดจ้าง" >
                <AddContactDialog />
            </SectionTitle>

            {!isLoading ? (
                <>
                    {[...(vendor?.contact ?? [])]
                        .sort((a, b) => (b.isMainContact ? 1 : 0) - (a.isMainContact ? 1 : 0))
                        .map((contact, index) => {
                            const isLastContact = (vendor?.contact?.length ?? 0) <= 1;
                            const deleteDisabledReason = contact.isMainContact
                                ? "ไม่สามารถลบผู้ติดต่อหลักได้"
                                : isLastContact
                                ? "ต้องมีผู้ติดต่ออย่างน้อย 1 คน"
                                : undefined;

                            return (
                                <div key={index} className="flex justify-between gap-3 p-4 border rounded-md">
                                    <div className="flex md:items-center gap-2 md:gap-3.5 min-w-0">
                                        <div className={cn(
                                            "flex items-center justify-center shrink-0 font-bold text-white size-11 rounded-md",
                                            contact.isMainContact ? "bg-red-700" : "bg-gray-200 text-gray-500"
                                        )}>
                                            {getInitials(contact.contactName)}
                                        </div>

                                        <div className="flex flex-col min-w-0">
                                            <div className="flex flex-col-reverse md:flex-row md:items-center gap-1 md:gap-2.5">
                                                <p className="font-bold tracking-wide capitalize">{contact.contactName}</p>

                                                {contact.isMainContact && (
                                                    <Badge className="bg-red-100 text-red-800 tracking-wider">
                                                        ผู้ติดต่อหลัก
                                                    </Badge>
                                                )}
                                            </div>

                                            <div className="hidden md:flex items-center gap-1 flex-wrap text-sm text-gray-600 font-thin tracking-wide">
                                                <p className="capitalize">{contact.contactPosition || contact.contactName}</p>
                                                {contact.contactPhone && (
                                                    <p> · {formatPhone(contact.contactPhone)}</p>
                                                )}

                                                {contact.contactEmail && (
                                                    <p className="break-all"> · {contact.contactEmail}</p>
                                                )}

                                                {contact.lineId && (
                                                    <p> · {contact.lineId}</p>
                                                )}

                                                {contact.otherContact && (
                                                    <p> · {contact.otherContact}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end md:gap-1">
                                        <ViewContactDialog contact={contact} />
                                        <EditContactDialog contact={contact} />
                                        <DeleteContactDialog contact={contact} disabledReason={deleteDisabledReason} />
                                    </div>
                                </div>
                            );
                        })}
                </>
            ) : (
                <div className="flex justify-center items-center h-70">
                    <Spinner className="size-8" />
                </div>
            )}

        </div>
    )
}
