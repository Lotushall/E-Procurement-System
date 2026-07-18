export type RequiredDocument = { key: string; label: string; required: boolean };

export const REQUIRED_DOCUMENTS: Record<"company" | "individual", RequiredDocument[]> = {
  company: [
    { key: "company_certificate", label: "หนังสือรับรองบริษัท", required: true },
    { key: "authorized_person_id", label: "สำเนาบัตรประชาชนกรรมการผู้มีอำนาจ", required: true },
    { key: "vat_registration", label: "ใบทะเบียนภาษีมูลค่าเพิ่ม (ภ.พ.20)", required: true },
    { key: "shareholder_list", label: "บัญชีรายชื่อผู้ถือหุ้น (บอจ.5)", required: true },
    { key: "financial_statement", label: "งบการเงิน / หนังสือรับรองฐานะการเงิน", required: true },
  ],
  individual: [
    { key: "citizen_id", label: "สำเนาบัตรประชาชน", required: true },
    { key: "house_registration", label: "สำเนาทะเบียนบ้าน", required: true },
    { key: "commercial_registration", label: "ทะเบียนพาณิชย์ (ถ้ามี)", required: false },
    { key: "vat_registration", label: "ใบทะเบียนภาษีมูลค่าเพิ่ม (ถ้ามี)", required: false },
  ],
};
