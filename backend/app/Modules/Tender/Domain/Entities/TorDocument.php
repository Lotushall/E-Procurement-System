<?php

namespace App\Modules\Tender\Domain\Entities;

final class TorDocument
{
    private function __construct(
        private readonly ?int $id,
        private readonly int $torId,
        private string $label,
        private string $fileName,
        private string $filePath,
        private ?string $documentType,
        private readonly ?int $uploadedBy,
    ) {}

    public static function create(
        int $torId,
        string $label,
        string $fileName,
        string $filePath,
        ?string $documentType,
        ?int $uploadedBy,
    ): self {
        return new self(
            id: null,
            torId: $torId,
            label: $label,
            fileName: $fileName,
            filePath: $filePath,
            documentType: $documentType,
            uploadedBy: $uploadedBy,
        );
    }

    public static function reconstitute(
        int $id,
        int $torId,
        string $label,
        string $fileName,
        string $filePath,
        ?string $documentType,
        ?int $uploadedBy,
    ): self {
        return new self(
            id: $id,
            torId: $torId,
            label: $label,
            fileName: $fileName,
            filePath: $filePath,
            documentType: $documentType,
            uploadedBy: $uploadedBy,
        );
    }

    public function update(string $label, string $fileName, string $filePath, ?string $documentType): void
    {
        $this->label = $label;
        $this->fileName = $fileName;
        $this->filePath = $filePath;
        $this->documentType = $documentType;
    }

    // -----------------------------
    // Getters
    // -----------------------------
    public function id(): ?int
    {
        return $this->id;
    }

    public function torId(): int
    {
        return $this->torId;
    }

    public function label(): string
    {
        return $this->label;
    }

    public function fileName(): string
    {
        return $this->fileName;
    }

    public function filePath(): string
    {
        return $this->filePath;
    }

    public function documentType(): ?string
    {
        return $this->documentType;
    }

    public function uploadedBy(): ?int
    {
        return $this->uploadedBy;
    }
}
