export type FileKind = "pdf" | "image";

export const FILE_KIND_CONFIG: Record<FileKind, {
  accept: string;
  extensions: string[];
  errorMessage: string;
}> = {
  pdf: {
    accept: ".pdf",
    extensions: [".pdf"],
    errorMessage: "ไฟล์ต้องเป็น PDF เท่านั้น",
  },
  image: {
    accept: ".jpg,.jpeg,.png",
    extensions: [".jpg", ".jpeg", ".png"],
    errorMessage: "ไฟล์ต้องเป็นรูปภาพ (JPG, JPEG, PNG) เท่านั้น",
  },
};

export type RequiredDocument = {
  key: string;
  label: string;
  required: boolean;
  fileKind: FileKind;
};

export const REQUIRED_DOCUMENTS: Record<"company" | "individual", RequiredDocument[]> = {
  company: [
    { key: "company_certificate", label: "หนังสือรับรองบริษัท", required: true, fileKind: "pdf" },
    { key: "authorized_person_id", label: "สำเนาบัตรประชาชนกรรมการผู้มีอำนาจ", required: true, fileKind: "image" },
    { key: "vat_registration", label: "ใบทะเบียนภาษีมูลค่าเพิ่ม (ภ.พ.20)", required: true, fileKind: "pdf" },
    { key: "shareholder_list", label: "บัญชีรายชื่อผู้ถือหุ้น (บอจ.5)", required: true, fileKind: "pdf" },
    { key: "financial_statement", label: "งบการเงิน / หนังสือรับรองฐานะการเงิน", required: true, fileKind: "pdf" },
  ],
  individual: [
    { key: "citizen_id", label: "สำเนาบัตรประชาชน", required: true, fileKind: "image" },
    { key: "house_registration", label: "สำเนาทะเบียนบ้าน", required: true, fileKind: "image" },
    { key: "commercial_registration", label: "ทะเบียนพาณิชย์ (ถ้ามี)", required: false, fileKind: "pdf" },
    { key: "vat_registration", label: "ใบทะเบียนภาษีมูลค่าเพิ่ม (ถ้ามี)", required: false, fileKind: "pdf" },
  ],
};
