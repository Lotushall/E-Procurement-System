import TermsContent from "@/components/legal/terms-content";

export default function TermsPage() {
    return (
        <div className="mx-auto max-w-3xl px-5 py-10">
            <h1 className="mb-1 text-2xl font-bold">ข้อกำหนดและเงื่อนไขการใช้งาน</h1>
            <p className="mb-8 text-sm text-muted-foreground">Lotushall Mining e-Bidding System</p>

            <TermsContent />
        </div>
    );
}
