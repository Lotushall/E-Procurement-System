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

// เลขบัตรประชาชนแบบปกปิดกลาง: X-XXXX-*****-XX-X
export const maskCitizenId = (value: string) => {
  const digits = digitsOnly(value).slice(0, 13);
  return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-*****-${digits.slice(9, 11)}-${digits.slice(11, 13)}`;
};

// เบอร์ติดต่อ: 0X-XXX-XXXX (9 หลัก) หรือ 0XX-XXX-XXXX (10 หลัก)
export const formatPhone = (value: string) => {
  const digits = digitsOnly(value).slice(0, 10);
  return formatWithGroups(digits, digits.length > 9 ? [3, 3, 4] : [2, 3, 4]);
};

// จำนวนเงิน: ฿45,000,000 (ปัดเป็นจำนวนเต็มบาท ไม่แสดงสตางค์)
export const formatCurrency = (value: number) =>
  `${new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(value)}`;