import Image from "next/image";

export function Forbidden() {
  return (
    <div className="flex h-full w-full flex-1 flex-col items-center justify-center gap-12 py-8">
      <div className="relative min-h-0 w-full flex-1">
        <Image
          src="/images/403.svg"
          alt="Forbidden"
          fill
          sizes="100vw"
          className="object-contain"
        />
      </div>

      <div className="flex flex-col items-center gap-4">
        <h1 className="text-center text-3xl font-medium">
          คุณไม่มีสิทธิ์เข้าถึงหน้านี้
        </h1>

        <p className="text-center text-xl">
          คุณพยายามเข้าถึงหน้าที่คุณไม่ได้รับอนุญาตให้เข้าถึง
        </p>
      </div>
    </div>
  );
}
