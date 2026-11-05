import type { ChangeEvent } from "react";

// ช่องกรอกงบประมาณ: ฟอร์มเก็บค่าดิบ (ตัวเลข + จุด เช่น "1234.5") แต่แสดงแบบมีคอมม่า ("1,234.5")

// Keeps at most one "." and caps the decimal part at 2 digits (matches the backend's decimal:0,2).
export function sanitizeBudgetInput(input: string): string {
  const cleaned = input.replace(/[^\d.]/g, "");
  const dotIndex = cleaned.indexOf(".");
  if (dotIndex === -1) return cleaned;

  const intPart = cleaned.slice(0, dotIndex);
  const decPart = cleaned.slice(dotIndex + 1).replace(/\./g, "").slice(0, 2);
  return `${intPart}.${decPart}`;
}

export function formatBudgetDisplay(raw: string): string {
  if (raw === "") return "";
  const [intPart, decPart] = raw.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart !== undefined ? `${grouped}.${decPart}` : grouped;
}

// Reformatting on every keystroke shifts the comma positions, which would
// otherwise throw a mid-edit cursor to the end of the input — this keeps it
// pinned to the same digit by counting digits (not raw characters) to its left.
export function handleBudgetChange(onChange: (value: string) => void) {
  return (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const cursorPos = input.selectionStart ?? input.value.length;
    const digitsBeforeCursor = input.value.slice(0, cursorPos).replace(/[^\d.]/g, "").length;

    const raw = sanitizeBudgetInput(input.value);
    onChange(raw);

    requestAnimationFrame(() => {
      const formatted = formatBudgetDisplay(raw);
      let count = 0;
      let pos = formatted.length;
      for (let i = 0; i < formatted.length; i++) {
        if (/[\d.]/.test(formatted[i])) count++;
        if (count === digitsBeforeCursor) {
          pos = i + 1;
          break;
        }
      }
      if (digitsBeforeCursor === 0) pos = 0;
      input.setSelectionRange(pos, pos);
    });
  };
}
