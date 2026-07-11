<?php

namespace App\Modules\Auth\Providers;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;
use Nwidart\Modules\Support\ModuleServiceProvider;

class AuthServiceProvider extends ModuleServiceProvider
{
    /**
     * The name of the module.
     */
    protected string $name = 'Auth';

    /**
     * The lowercase version of the module name.
     */
    protected string $nameLower = 'auth';

    public function boot(): void
    {
        parent::boot();

        // The signature must stay valid for the backend `verification.verify`
        // route (that's what actually gets called to verify), so we sign
        // against that route and just swap the host for the email link that
        // gets shown to the user — the frontend forwards id/hash/expires/
        // signature back to this same backend route to complete verification.
        VerifyEmail::createUrlUsing(function ($notifiable) {
            $backendUrl = URL::temporarySignedRoute(
                'verification.verify',
                now()->addMinutes(Config::get('auth.verification.expire', 5)),
                [
                    'id' => $notifiable->getKey(),
                    'hash' => sha1($notifiable->getEmailForVerification()),
                ]
            );

            return sprintf(
                '%s/verify-email?id=%s&hash=%s&%s',
                rtrim(Config::get('app.frontend_url'), '/'),
                $notifiable->getKey(),
                sha1($notifiable->getEmailForVerification()),
                parse_url($backendUrl, PHP_URL_QUERY)
            );
        });
    }
}
