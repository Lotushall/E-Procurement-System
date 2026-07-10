<?php

use App\Modules\Vendor\Domain\Entities\VendorDocument;
use App\Modules\Vendor\Domain\States\DocumentStatus\Pending;
use Carbon\CarbonImmutable;

test('holds the given values', function () {
    $status = new Pending(null);
    $verifiedAt = CarbonImmutable::parse('2026-07-10 10:00:00');

    $document = new VendorDocument(
        id: 1,
        vendorProfileId: 10,
        documentType: 'id_card',
        fileName: 'id-card.pdf',
        filePath: 'documents/id-card.pdf',
        status: $status,
        verifiedBy: 2,
        verifiedAt: $verifiedAt,
        remark: 'Clear copy',
    );

    expect($document->id)->toBe(1)
        ->and($document->vendorProfileId)->toBe(10)
        ->and($document->documentType)->toBe('id_card')
        ->and($document->fileName)->toBe('id-card.pdf')
        ->and($document->filePath)->toBe('documents/id-card.pdf')
        ->and($document->status)->toBe($status)
        ->and($document->verifiedBy)->toBe(2)
        ->and($document->verifiedAt)->toBe($verifiedAt)
        ->and($document->remark)->toBe('Clear copy');
});
