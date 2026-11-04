import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export const digitsOnly = (value: string) => value.replace(/\D/g, "");

const formatWithGroups = (digits: string, groups: number[]) => {
  const parts: string[] = [];
  let index = 0;
  for (const size of groups) {
    if (index >= digits.length) break;
    parts.push(digits.slice(index, index + size));
    index += size;
  }
  return parts.join("-");
};

// เลขประจำตัวผู้เสียภาษี / เลขบัตรประชาชน: X-XXXX-XXXXX-XX-X (13 หลัก)
export const formatCitizenId = (value: string) =>
  formatWithGroups(digitsOnly(value).slice(0, 13), [1, 4, 5, 2, 1]);

// เลข 13 หลักของไทย (บัตรประชาชน / เลขผู้เสียภาษี / เลขทะเบียนนิติบุคคล): หลักที่ 13 เป็น check digit
// mod 11 ของ 12 หลักแรก ถ่วงน้ำหนัก 13 ลงไปถึง 2 — ตรงกับ ThaiIdNumber ฝั่ง backend
export const isValidThaiId = (value: string) => {
  const digits = digitsOnly(value);
  if (digits.length !== 13) return false;
  const sum = [...digits.slice(0, 12)].reduce((total, digit, index) => total + Number(digit) * (13 - index), 0);
  return (11 - (sum % 11)) % 10 === Number(digits[12]);
};

// ข้อความ error ของเลข 13 หลัก (null = ถูกต้อง) — แยกเคสจำนวนหลักผิดกับ check digit ผิดเหมือน ThaiIdNumberRule ฝั่ง backend
export const thaiIdError = (value: string, label: string): string | null => {
  if (digitsOnly(value).length !== 13) return `${label}ต้องมี 13 หลัก`;
  return isValidThaiId(value) ? null : `${label}ไม่ถูกต้อง กรุณาตรวจสอบเลขอีกครั้ง`;
};

// เลขบัตรประชาชนแบบปกปิดกลาง: X-XXXX-*****-XX-X
export const maskCitizenId = (value: string) => {
  const digits = digitsOnly(value).slice(0, 13);
  return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-*****-${digits.slice(10, 12)}-${digits.slice(12, 13)}`;
};

// เบอร์ติดต่อ: 0X-XXX-XXXX (9 หลัก) หรือ 0XX-XXX-XXXX (10 หลัก)
export const formatPhone = (value: string) => {
  const digits = digitsOnly(value).slice(0, 10);
  return formatWithGroups(digits, digits.length > 9 ? [3, 3, 4] : [2, 3, 4]);
};

// เบอร์ติดต่อที่ถูกต้อง: ขึ้นต้นด้วย 0 และมี 9-10 หลัก (พิมพ์มีขีดหรือเว้นวรรคได้)
export const isValidPhone = (value: string) => /^0\d{8,9}$/.test(digitsOnly(value));

// จำนวนเงิน: 45,000,000 หรือ 1,234.56 (แสดงสตางค์ไม่เกิน 2 ตำแหน่ง ใส่ ฿ เองตรงที่แสดงผล)
export const formatCurrency = (value: number) =>
  `${new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value)}`;