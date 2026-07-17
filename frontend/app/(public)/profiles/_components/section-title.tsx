
export default function SectionTitle({ title, desc, children }: { title: string, desc: string, children?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between mb-5">
            <div>
                <h4 className="font-bold text-lg">{title}</h4>
                <p className="font-light text-sm text-gray-600 tracking-wider">{desc}</p>
            </div>

            {children}
        </div>
    )
}
