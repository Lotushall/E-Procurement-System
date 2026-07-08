import PrivacyContent from "@/components/legal/privacy-content";

export default function PrivacyPage() {
    return (
        <div className="mx-auto max-w-3xl px-5 py-10">
            <h1 className="mb-1 text-2xl font-bold">นโยบายความเป็นส่วนตัว</h1>
            <p className="mb-8 text-sm text-muted-foreground">Lotushall Mining e-Bidding System</p>

            <PrivacyContent />
        </div>
    );
}
