<?php

namespace App\Modules\Vendor\Infrastructure\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

final class VendorProfileApprovedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly bool $sendEmail = true,
    ) {}

    public function via(object $notifiable): array
    {
        return $this->sendEmail ? ['database', 'mail'] : ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type' => 'vendor_profile_approved',
            'message' => 'โปรไฟล์ผู้ค้าของคุณได้รับการอนุมัติแล้ว',
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('โปรไฟล์ผู้ค้าของคุณได้รับการอนุมัติ')
            ->greeting("เรียนคุณ {$notifiable->username}")
            ->line('โปรไฟล์ผู้ค้าของคุณได้รับการอนุมัติแล้ว คุณสามารถเข้าใช้งานระบบจัดซื้อได้ตามปกติ');
    }
}
