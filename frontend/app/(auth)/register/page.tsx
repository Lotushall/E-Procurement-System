import PrivacyContent from "@/components/legal/privacy-content";
import TermsContent from "@/components/legal/terms-content";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

const InputField = ({ label, full, children }: { label: string; full?: boolean; children: ReactNode; }) => (
    <div className={cn("flex flex-col gap-1.5", full && "sm:col-span-2")}>
        <div className="flex gap-1">
            <p className="font-semibold tracking-wider">{label}</p>
            <span className="text-red-600">*</span>
        </div>

        {children}
    </div>
)

export default function Register() {
    return (
        <>
            <CardHeader className="flex flex-col items-center justify-center gap-0 animate-in duration-200">
                <div className="mb-3 animate-in duration-200">
                    <Image
                        src="/images/icon/lotushall_logo.png"
                        alt="Lotushall Logo"
                        width={80}
                        height={80}
                        priority
                    />
                </div>

                <CardTitle className="text-xl font-bold animate-in duration-200">ลงทะเบียนผู้ค้า</CardTitle>
                <CardDescription className="text-sm tracking-wide animate-in duration-200">สร้างบัญชีเพื่อเข้าร่วมการเสนอราคา</CardDescription>
            </CardHeader>

            <CardContent className="p-0">
                <h3 className="mb-1.5 mt-2.5 md:mt-0 font-semibold tracking-wide">
                    ประเภทผู้ค้า <span className="text-red-700">*</span>
                </h3>

                <Tabs defaultValue="company" className="w-full ">
                    <TabsList
                        className={cn(
                            "w-full min-h-12.5 border p-1 mb-2",
                            "*:data-active:bg-red-700 *:data-active:text-white *:data-active:hover:text-white *:cursor-pointer",
                            "*:font-bold tracking-wide"
                        )}
                    >
                        <TabsTrigger value="company">นิติบุคคล</TabsTrigger>
                        <TabsTrigger value="individual">บุคคลธรรมดา</TabsTrigger>
                    </TabsList>

                    {/* นิติบุคคล */}
                    <TabsContent value="company" className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3.5">

                        <InputField label="ชื่อบริษัท / นิติบุคคล" full>
                            <Input
                                placeholder="เช่น บริษัท สยาม เฮฟวี่ จำกัด"
                                className="h-10.5 rounded-md placeholder:tracking-wider!"
                            />
                        </InputField>

                        <InputField label="เลขประจำตัวผู้เสียภาษี">
                            <Input
                                placeholder="0-0000-00000-00-0"
                                className="h-10.5 rounded-md"
                            />
                        </InputField>

                        <InputField label="เบอร์ติดต่อ">
                            <Input
                                placeholder="0X-XXX-XXXX"
                                className="h-10.5 rounded-md"
                            />
                        </InputField>

                        <InputField label="ชื่อผู้ใช้ (Username)" full>
                            <Input
                                placeholder="เช่น siamheavy หรือ somchai.p"
                                className="h-10.5 rounded-md"
                            />
                        </InputField>

                        <InputField label="อีเมล">
                            <Input
                                placeholder="name@company.co.th"
                                className="h-10.5 rounded-md"
                            />
                        </InputField>

                        <InputField label="รหัสผ่าน">
                            <Input
                                placeholder="อย่างน้อย 8 ตัวอักษร"
                                className="h-10.5 rounded-md"
                            />
                        </InputField>

                    </TabsContent>

                    {/* บุคคลธรรมดา */}
                    <TabsContent value="individual" className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3.5">

                        <InputField label="ชื่อ – นามสกุล" full>
                            <Input placeholder="เช่น นายสมชาย ใจดี" className="h-10.5 rounded-md" />
                        </InputField>

                        <InputField label="เลขบัตรประชาชน">
                            <Input placeholder="X-XXXX-XXXXX-XX-X" className="h-10.5 rounded-md" />
                        </InputField>

                        <InputField label="เบอร์ติดต่อ">
                            <Input placeholder="0X-XXX-XXXX" className="h-10.5 rounded-md" />
                        </InputField>

                        <InputField label="ชื่อผู้ใช้ (Username)" full>
                            <Input placeholder="เช่น siamheavy หรือ somchai.p" className="h-10.5 rounded-md" />
                        </InputField>

                        <InputField label="อีเมล">
                            <Input placeholder="name@gmail.com" className="h-10.5 rounded-md" />
                        </InputField>

                        <InputField label="รหัสผ่าน">
                            <Input placeholder="อย่างน้อย 8 ตัวอักษร" className="h-10.5 rounded-md" />
                        </InputField>

                    </TabsContent>
                </Tabs>

                <FieldGroup className="mt-4 mb-5">
                    <Field orientation="horizontal" className="items-start md:items-center">

                        <Checkbox
                            id="terms-checkbox-basic"
                            name="terms-checkbox-basic"
                            className="cursor-pointer data-checked:bg-red-700 data-checked:border-red-700 data-checked:text-white"
                        />

                        <div className="flex flex-wrap items-baseline gap-x-1 text-sm font-light tracking-wide">
                            <label htmlFor="terms-checkbox-basic" className="cursor-pointer">
                                ข้าพเจ้ายอมรับ
                            </label>

                            <Dialog>
                                <DialogTrigger className="font-bold text-red-700 underline-offset-2 hover:underline cursor-pointer">
                                    ข้อกำหนดและเงื่อนไข
                                </DialogTrigger>
                                <DialogContent className="max-w-lg sm:max-w-lg">
                                    <DialogHeader>
                                        <DialogTitle>ข้อกำหนดและเงื่อนไขการใช้งาน</DialogTitle>
                                        <DialogDescription>Lotushall Mining e-Bidding System</DialogDescription>
                                    </DialogHeader>
                                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                                        <TermsContent />
                                    </div>
                                    <DialogFooter>
                                        <Link href={routes.terms} target="_blank" className="text-sm font-semibold text-red-700 hover:underline">
                                            เปิดฉบับเต็มในแท็บใหม่
                                        </Link>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            <span>และ</span>

                            <Dialog>
                                <DialogTrigger className="font-bold text-red-700 underline-offset-2 hover:underline cursor-pointer">
                                    นโยบายความเป็นส่วนตัว
                                </DialogTrigger>
                                <DialogContent className="max-w-lg sm:max-w-lg">
                                    <DialogHeader>
                                        <DialogTitle>นโยบายความเป็นส่วนตัว</DialogTitle>
                                        <DialogDescription>Lotushall Mining e-Bidding System</DialogDescription>
                                    </DialogHeader>
                                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                                        <PrivacyContent />
                                    </div>
                                    <DialogFooter>
                                        <Link href={routes.privacy} target="_blank" className="text-sm font-semibold text-red-700 hover:underline">
                                            เปิดฉบับเต็มในแท็บใหม่
                                        </Link>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            <label htmlFor="terms-checkbox-basic" className="cursor-pointer">
                                ในการขึ้นทะเบียนผู้ค้าของ Lotushall Mining
                            </label>
                        </div>
                    </Field>
                </FieldGroup>
            </CardContent>

            <CardFooter className="flex flex-col bg-white border-none pt-0 px-0 animate-in duration-200">
                <Button className="text-white text-lg font-medium bg-red-700 w-full px-1.5 h-11 hover:bg-red-600">
                    สร้างบัญชีผู้ค้า
                </Button>

                <div className="flex gap-1 text-sm tracking-wider mt-4.5">
                    <p className="font-light">มีบัญชีอยู่แล้ว?</p>
                    <Link
                        href={routes.login}
                        className="font-bold text-red-700"
                    >
                        เข้าสู่ระบบ
                    </Link>
                </div>
            </CardFooter>
        </>
    )
}
