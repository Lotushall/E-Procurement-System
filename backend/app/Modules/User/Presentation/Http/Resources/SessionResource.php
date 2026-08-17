<?php

namespace App\Modules\User\Presentation\Http\Resources;

use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Jenssegers\Agent\Agent;

class SessionResource extends JsonResource
{
    public static $wrap = false;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $agent = new Agent;
        $agent->setUserAgent($this->user_agent ?? '');

        return [
            'id' => $this->id,
            'device' => match (true) {
                $agent->isMobile() => 'Mobile',
                $agent->isTablet() => 'Tablet',
                $agent->isDesktop() => 'Desktop',
                default => 'Unknown',
            },
            'browser' => $agent->browser() ?: 'Unknown',
            'os' => $agent->platform() ?: 'Unknown',
            'ipAddress' => $this->ip_address,
            'lastActiveAt' => CarbonImmutable::createFromTimestamp((int) $this->last_activity)->toIso8601String(),
            'current' => $this->id === $request->session()->getId(),
        ];
    }
}
