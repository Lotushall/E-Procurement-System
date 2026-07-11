"use client";

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
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Controller } from "react-hook-form";
import { InputField } from "../_components/input-field";
import { MaskedInput } from "./_components/masked-input";
import { formatCitizenId, formatPhone } from "./_schemas/schema";
import { useRegisterForm } from "./_hooks/use-register-form";

export default function Register() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const {
        register,
        control,
        setValue,
        formState: { errors },
        vendorType,
        termsAccepted,
        onSubmit,
        isSubmitting,
        registeredEmail,
        onResend,
        isResending,
        resendCooldown,
    } = useRegisterForm();

    if (registeredEmail) {
        return (
            <>
                <CardHeader className="flex flex-col items-center justify-center gap-0 animate-in duration-200">
                    <div className="mb-3">
                        <Image
                            src="/images/icon/lotushall_logo.png"
                            alt="Lotushall Logo"
                            width={80}
                            height={80}
                            priority
                        />
                    </div>

                    <CardTitle className="text-xl font-bold">กรุณายืนยันอีเมลของคุณ</CardTitle>
                    <CardDescription className="text-sm tracking-wide text-center">
                        เราได้ส่งลิงก์ยืนยันไปที่ <span className="font-semibold text-foreground">{registeredEmail}</span> กรุณาตรวจสอบกล่องจดหมายของคุณเพื่อยืนยันอีเมลก่อนเข้าสู่ระบบ
                    </CardDescription>
                </CardHeader>

                <CardFooter className="flex flex-col bg-white border-none pb-6 pt-4">
                    <Link href={routes.login} className="w-full">
                        <Button className="text-white text-lg font-medium bg-red-700 w-full px-1.5 h-11 hover:bg-red-600">
                            ไปหน้าเข้าสู่ระบบ
                        </Button>
                    </Link>

                    <button
                        type="button"
                        onClick={onResend}
                        disabled={isResending || resendCooldown > 0}
                        className="mt-4.5 text-sm font-semibold text-red-700 tracking-wide cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {resendCooldown > 0
                            ? `ส่งอีกครั้งได้ใน ${resendCooldown} วินาที`
                            : isResending
                                ? "กำลังส่ง..."
                                : "ไม่ได้รับอีเมล? ส่งอีกครั้ง"}
                    </button>
                </CardFooter>
            </>
        );
    }

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

            <form onSubmit={onSubmit} noValidate>
                <CardContent className="p-0">
                    <h3 className="mb-1.5 mt-2.5 md:mt-0 font-semibold tracking-wide">
                        ประเภทผู้ค้า <span className="text-red-700">*</span>
                    </h3>

                    <Tabs
                        value={vendorType}
                        onValueChange={(value) => setValue("vendorType", value as "company" | "individual")}
                        className="w-full "
                    >
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

                            <InputField label="ชื่อบริษัท / นิติบุคคล" labelClassName="font-semibold tracking-wider" full error={errors.companyName?.message}>
                                <Input
                                    {...register("companyName")}
                                    aria-invalid={!!errors.companyName}
                                    placeholder="เช่น บริษัท สยาม เฮฟวี่ จำกัด"
                                    className="h-10.5 rounded-md placeholder:tracking-wider!"
                                />
                            </InputField>

                            <InputField label="เลขประจำตัวผู้เสียภาษี" labelClassName="font-semibold tracking-wider" error={errors.taxId?.message}>
                                <MaskedInput
                                    control={control}
                                    name="taxId"
                                    format={formatCitizenId}
                                    aria-invalid={!!errors.taxId}
                                    placeholder="0-0000-00000-00-0"
                                    className="h-10.5 rounded-md"
                                />
                            </InputField>

                            <InputField label="เบอร์ติดต่อ" labelClassName="font-semibold tracking-wider" error={errors.phone?.message}>
                                <MaskedInput
                                    control={control}
                                    name="phone"
                                    format={formatPhone}
                                    aria-invalid={!!errors.phone}
                                    placeholder="0X-XXX-XXXX"
                                    className="h-10.5 rounded-md"
                                />
                            </InputField>

                            <InputField label="ชื่อผู้ใช้ (Username)" labelClassName="font-semibold tracking-wider" error={errors.username?.message}>
                                <Input
                                    {...register("username")}
                                    aria-invalid={!!errors.username}
                                    placeholder="เช่น siamheavy หรือ somchai.p"
                                    className="h-10.5 rounded-md"
                                />
                            </InputField>

                            <InputField label="อีเมล" labelClassName="font-semibold tracking-wider" error={errors.email?.message}>
                                <Input
                                    {...register("email")}
                                    aria-invalid={!!errors.email}
                                    placeholder="name@company.co.th"
                                    className="h-10.5 rounded-md"
                                />
                            </InputField>

                            <InputField label="รหัสผ่าน" labelClassName="font-semibold tracking-wider" error={errors.password?.message}>
                                <div className="relative">
                                    <Input
                                        {...register("password")}
                                        type={showPassword ? "text" : "password"}
                                        aria-invalid={!!errors.password}
                                        placeholder="อย่างน้อย 8 ตัวอักษร"
                                        className="h-10.5 rounded-md pr-9"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        className="absolute inset-y-0 right-3 flex items-center text-muted-foreground cursor-pointer"
                                        aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </InputField>

                            <InputField label="ยืนยันรหัสผ่าน" labelClassName="font-semibold tracking-wider" error={errors.confirmPassword?.message}>
                                <div className="relative">
                                    <Input
                                        {...register("confirmPassword")}
                                        type={showConfirmPassword ? "text" : "password"}
                                        aria-invalid={!!errors.confirmPassword}
                                        placeholder="กรอกรหัสผ่านอีกครั้ง"
                                        className="h-10.5 rounded-md pr-9"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                                        className="absolute inset-y-0 right-3 flex items-center text-muted-foreground cursor-pointer"
                                        aria-label={showConfirmPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </InputField>

                        </TabsContent>

                        {/* บุคคลธรรมดา */}
                        <TabsContent value="individual" className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-3.5">

                            <InputField label="ชื่อ – นามสกุล" labelClassName="font-semibold tracking-wider" full error={errors.fullName?.message}>
                                <Input
                                    {...register("fullName")}
                                    aria-invalid={!!errors.fullName}
                                    placeholder="เช่น นายสมชาย ใจดี"
                                    className="h-10.5 rounded-md"
                                />
                            </InputField>

                            <InputField label="เลขบัตรประชาชน" labelClassName="font-semibold tracking-wider" error={errors.idCard?.message}>
                                <MaskedInput
                                    control={control}
                                    name="idCard"
                                    format={formatCitizenId}
                                    aria-invalid={!!errors.idCard}
                                    placeholder="X-XXXX-XXXXX-XX-X"
                                    className="h-10.5 rounded-md"
                                />
                            </InputField>

                            <InputField label="เบอร์ติดต่อ" labelClassName="font-semibold tracking-wider" error={errors.phone?.message}>
                                <MaskedInput
                                    control={control}
                                    name="phone"
                                    format={formatPhone}
                                    aria-invalid={!!errors.phone}
                                    placeholder="0X-XXX-XXXX"
                                    className="h-10.5 rounded-md"
                                />
                            </InputField>

                            <InputField label="ชื่อผู้ใช้ (Username)" labelClassName="font-semibold tracking-wider" error={errors.username?.message}>
                                <Input
                                    {...register("username")}
                                    aria-invalid={!!errors.username}
                                    placeholder="เช่น siamheavy หรือ somchai.p"
                                    className="h-10.5 rounded-md"
                                />
                            </InputField>

                            <InputField label="อีเมล" labelClassName="font-semibold tracking-wider" error={errors.email?.message}>
                                <Input
                                    {...register("email")}
                                    aria-invalid={!!errors.email}
                                    placeholder="name@gmail.com"
                                    className="h-10.5 rounded-md"
                                />
                            </InputField>

                            <InputField label="รหัสผ่าน" labelClassName="font-semibold tracking-wider" error={errors.password?.message}>
                                <div className="relative">
                                    <Input
                                        {...register("password")}
                                        type={showPassword ? "text" : "password"}
                                        aria-invalid={!!errors.password}
                                        placeholder="อย่างน้อย 8 ตัวอักษร"
                                        className="h-10.5 rounded-md pr-9"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        className="absolute inset-y-0 right-3 flex items-center text-muted-foreground cursor-pointer"
                                        aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </InputField>

                            <InputField label="ยืนยันรหัสผ่าน" labelClassName="font-semibold tracking-wider" error={errors.confirmPassword?.message}>
                                <div className="relative">
                                    <Input
                                        {...register("confirmPassword")}
                                        type={showConfirmPassword ? "text" : "password"}
                                        aria-invalid={!!errors.confirmPassword}
                                        placeholder="กรอกรหัสผ่านอีกครั้ง"
                                        className="h-10.5 rounded-md pr-9"
                                    />

                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                                        className="absolute inset-y-0 right-3 flex items-center text-muted-foreground cursor-pointer"
                                        aria-label={showConfirmPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </InputField>

                        </TabsContent>
                    </Tabs>

                    <FieldGroup className="mt-4 mb-5">
                        <Field orientation="horizontal" className="items-start md:items-center">
                            <Controller
                                control={control}
                                name="terms"
                                render={({ field: { value, onChange, ...field } }) => (
                                    <Checkbox
                                        id="terms-checkbox-basic"
                                        checked={value}
                                        onCheckedChange={onChange}
                                        aria-invalid={!!errors.terms}
                                        className="cursor-pointer data-checked:bg-red-700 data-checked:border-red-700 data-checked:text-white"
                                        {...field}
                                    />
                                )}
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

                        {errors.terms && <p className="text-xs text-destructive">{errors.terms.message}</p>}
                    </FieldGroup>
                </CardContent>

                <CardFooter className="flex flex-col bg-white border-none pt-0 px-0 animate-in duration-200">
                    <Button
                        disabled={!termsAccepted || isSubmitting}
                        type="submit"
                        className="text-white text-lg font-medium bg-red-700 w-full px-1.5 h-11 hover:bg-red-600"
                    >
                        {isSubmitting ? "กำลังสร้างบัญชี..." : "สร้างบัญชีผู้ค้า"}
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
            </form>
        </>
    )
}
