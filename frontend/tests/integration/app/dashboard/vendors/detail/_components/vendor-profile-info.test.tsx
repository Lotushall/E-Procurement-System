import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VendorProfileInfo } from "@/app/dashboard/vendors/detail/_components/vendor-profile-info";
import { makeCompanyVendorProfile, makeIndividualVendorProfile } from "@/tests/fixtures/vendor-profile";

// ค่าของช่องหนึ่ง = ข้อความใต้ label ในกล่องเดียวกัน
function valueOf(label: string) {
  const labelEl = screen.getByText(label);
  return within(labelEl.parentElement as HTMLElement).getAllByText(/.*/).at(-1);
}

describe("VendorProfileInfo — company", () => {
  it("shows the company fields with their values", () => {
    const { detail } = makeCompanyVendorProfile({
      detail: {
        companyName: "บริษัท เอ บี ซี จำกัด",
        businessType: "ก่อสร้าง",
        branchNo: "00001",
        businessRegistrationNo: "0105511111111",
        taxId: "0105522222222",
        address: "99 หมู่ 1",
        province: "นนทบุรี",
        postalCode: "11000",
      },
    });
    render(<VendorProfileInfo detail={detail} />);

    expect(screen.getByRole("heading", { name: "ข้อมูลผู้ค้า" })).toBeInTheDocument();
    expect(valueOf("ชื่อบริษัท / นิติบุคคล")).toHaveTextContent("บริษัท เอ บี ซี จำกัด");
    expect(valueOf("ประเภทธุรกิจ")).toHaveTextContent("ก่อสร้าง");
    expect(valueOf("สาขา")).toHaveTextContent("00001");
    expect(valueOf("เลขทะเบียนนิติบุคคล")).toHaveTextContent("0105511111111");
    expect(valueOf("เลขผู้เสียภาษี")).toHaveTextContent("0105522222222");
    expect(valueOf("ที่อยู่")).toHaveTextContent("99 หมู่ 1");
    expect(valueOf("จังหวัด")).toHaveTextContent("นนทบุรี");
    expect(valueOf("รหัสไปรษณีย์")).toHaveTextContent("11000");
  });

  it("does not show individual-only fields", () => {
    render(<VendorProfileInfo detail={makeCompanyVendorProfile().detail} />);

    for (const label of ["ชื่อร้านค้า", "คำนำหน้า", "ชื่อ", "นามสกุล", "เลขบัตรประชาชน"]) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });

  it("shows a dash for every empty value", () => {
    const { detail } = makeCompanyVendorProfile({
      detail: {
        companyName: "",
        businessRegistrationNo: "",
        taxId: "",
        businessType: "",
        branchNo: "",
        address: "",
        province: "",
        postalCode: "",
      },
    });
    render(<VendorProfileInfo detail={detail} />);

    const labels = [
      "ชื่อบริษัท / นิติบุคคล",
      "ประเภทธุรกิจ",
      "สาขา",
      "เลขทะเบียนนิติบุคคล",
      "เลขผู้เสียภาษี",
      "ที่อยู่",
      "จังหวัด",
      "รหัสไปรษณีย์",
    ];
    for (const label of labels) {
      expect(valueOf(label)).toHaveTextContent(/^-$/);
    }
  });
});

describe("VendorProfileInfo — individual", () => {
  it("shows the individual fields with their values", () => {
    const { detail } = makeIndividualVendorProfile({
      detail: {
        storeName: "ร้านสมหมาย",
        businessType: "ค้าปลีก",
        prefix: "นางสาว",
        firstname: "สมหญิง",
        lastname: "รักดี",
        citizenId: "1101700011111",
        taxId: "1101700022222",
        address: "5 ซอย 2",
        province: "เชียงใหม่",
        postalCode: "50000",
      },
    });
    render(<VendorProfileInfo detail={detail} />);

    expect(valueOf("ชื่อร้านค้า")).toHaveTextContent("ร้านสมหมาย");
    expect(valueOf("ประเภทธุรกิจ")).toHaveTextContent("ค้าปลีก");
    expect(valueOf("คำนำหน้า")).toHaveTextContent("นางสาว");
    expect(valueOf("ชื่อ")).toHaveTextContent("สมหญิง");
    expect(valueOf("นามสกุล")).toHaveTextContent("รักดี");
    expect(valueOf("เลขบัตรประชาชน")).toHaveTextContent("1101700011111");
    expect(valueOf("เลขผู้เสียภาษี")).toHaveTextContent("1101700022222");
    expect(valueOf("ที่อยู่")).toHaveTextContent("5 ซอย 2");
    expect(valueOf("จังหวัด")).toHaveTextContent("เชียงใหม่");
    expect(valueOf("รหัสไปรษณีย์")).toHaveTextContent("50000");
  });

  it("does not show company-only fields", () => {
    render(<VendorProfileInfo detail={makeIndividualVendorProfile().detail} />);

    for (const label of ["ชื่อบริษัท / นิติบุคคล", "สาขา", "เลขทะเบียนนิติบุคคล"]) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
  });

  it("shows a dash for empty citizen id and tax id", () => {
    const { detail } = makeIndividualVendorProfile({ detail: { citizenId: "", taxId: "" } });
    render(<VendorProfileInfo detail={detail} />);

    expect(valueOf("เลขบัตรประชาชน")).toHaveTextContent(/^-$/);
    expect(valueOf("เลขผู้เสียภาษี")).toHaveTextContent(/^-$/);
  });
});
