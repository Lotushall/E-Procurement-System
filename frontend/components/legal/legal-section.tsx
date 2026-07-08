import { ReactNode } from "react";

export function LegalSection({ title, children }: { title: string; children: ReactNode; }) {
    return (
        <section className="flex flex-col gap-1.5">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <div className="flex flex-col gap-2 text-sm leading-relaxed text-muted-foreground">
                {children}
            </div>
        </section>
    );
}

export function LegalList({ items }: { items: ReactNode[]; }) {
    return (
        <ul className="ml-4 flex list-disc flex-col gap-1">
            {items.map((item, index) => (
                <li key={index}>{item}</li>
            ))}
        </ul>
    );
}
