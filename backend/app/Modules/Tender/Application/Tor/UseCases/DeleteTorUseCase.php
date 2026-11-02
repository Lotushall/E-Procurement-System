<?php

namespace App\Modules\Tender\Application\Tor\UseCases;

use App\Modules\Tender\Domain\Repositories\Tor\TorRepositoryInterface;

final class DeleteTorUseCase
{
    public function __construct(
        private readonly TorRepositoryInterface $tors,
    ) {}

    /**
     * Without $ignoresStatusLock only a deletable TOR (Tor::isDeletable())
     * may be deleted; any later TOR has to be cancelled instead.
     *
     * @return string|null an error message if the deletion was rejected, null on success
     */
    public function execute(int $id, int $actingUserId, bool $ignoresStatusLock): ?string
    {
        $tor = $this->tors->findById($id);

        if (! $ignoresStatusLock && ! $tor->isDeletable()) {
            return 'ไม่สามารถลบ TOR ได้ เนื่องจาก TOR ถูกส่งพิจารณาแล้ว กรุณายกเลิก TOR แทน';
        }

        $this->tors->delete($id);

        app_log('TOR deleted', [
            'tor_id' => $id,
            'tor_code' => (string) $tor->torCode(),
            'status' => $tor->status()->getValue(),
            'acting_user_id' => $actingUserId,
            'ignores_status_lock' => $ignoresStatusLock,
        ], 'info', 'tender');

        return null;
    }
}
