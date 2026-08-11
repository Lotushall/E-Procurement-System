<?php

namespace App\Modules\Vendor\Infrastructure\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

final class VendorProfileRejectedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $remark,
        private readonly bool $sendEmail = true,
    ) {}

    public function via(object $notifiable): array
    {
        return $this->sendEmail ? ['database', 'mail'] : ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'vendor_profile_rejected',
            'message' => "โปรไฟล์ผู้ค้าของคุณถูกปฏิเสธ: {$this->remark}",
            'remark' => $this->remark,
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('โปรไฟล์ผู้ค้าของคุณถูกปฏิเสธ')
            ->greeting("เรียนคุณ {$notifiable->username}")
            ->line('โปรไฟล์ผู้ค้าของคุณถูกปฏิเสธ ด้วยเหตุผลดังนี้')
            ->line($this->remark);
    }
}
