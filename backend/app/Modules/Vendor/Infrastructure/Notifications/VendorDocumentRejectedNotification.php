<?php

namespace App\Modules\Vendor\Infrastructure\Notifications;

use App\Modules\Vendor\Infrastructure\Notifications\Support\DocumentTypeLabels;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

final class VendorDocumentRejectedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $documentType,
        private readonly string $remark,
        private readonly bool $sendEmail = true,
    ) {}

    public function via(object $notifiable): array
    {
        return $this->sendEmail ? ['database', 'mail'] : ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        $label = DocumentTypeLabels::label($this->documentType);

        return [
            'type' => 'vendor_document_rejected',
            'message' => "เอกสาร{$label}ของคุณถูกปฏิเสธ: {$this->remark}",
            'document_type' => $this->documentType,
            'remark' => $this->remark,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $label = DocumentTypeLabels::label($this->documentType);

        return (new MailMessage)
            ->subject("เอกสาร{$label}ของคุณถูกปฏิเสธ")
            ->greeting("เรียนคุณ {$notifiable->username}")
            ->line("เอกสาร{$label}ของคุณถูกปฏิเสธ ด้วยเหตุผลดังนี้")
            ->line($this->remark);
    }
}
