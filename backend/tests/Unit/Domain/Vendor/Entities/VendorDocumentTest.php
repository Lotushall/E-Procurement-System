<?php

use App\Modules\Vendor\Domain\Entities\VendorDocument;
use App\Modules\Vendor\Domain\States\DocumentStatus\Approved;
use App\Modules\Vendor\Domain\States\DocumentStatus\Pending;
use App\Modules\Vendor\Domain\States\DocumentStatus\Rejected;
use Carbon\CarbonImmutable;

test('create builds a new pending document with no id', function () {
    $document = VendorDocument::create(
        vendorProfileId: 10,
        documentType: 'id_card',
        fileName: 'id-card.pdf',
        filePath: 'documents/id-card.pdf',
    );

    expect($document->id())->toBeNull()
        ->and($document->vendorProfileId())->toBe(10)
        ->and($document->documentType())->toBe('id_card')
        ->and($document->fileName())->toBe('id-card.pdf')
        ->and($document->filePath())->toBe('documents/id-card.pdf')
        ->and($document->status())->toBeInstanceOf(Pending::class)
        ->and($document->isPending())->toBeTrue()
        ->and($document->verifiedBy())->toBeNull()
        ->and($document->verifiedAt())->toBeNull()
        ->and($document->remark())->toBeNull();
});

test('reconstitute rebuilds a document from persisted values', function () {
    $status = new Approved(null);
    $verifiedAt = CarbonImmutable::parse('2026-07-10 10:00:00');

    $document = VendorDocument::reconstitute(
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

    expect($document->id())->toBe(1)
        ->and($document->status())->toBe($status)
        ->and($document->verifiedBy())->toBe(2)
        ->and($document->verifiedAt())->toBe($verifiedAt)
        ->and($document->remark())->toBe('Clear copy');
});

test('approve transitions a pending document to approved', function () {
    $document = VendorDocument::create(
        vendorProfileId: 10,
        documentType: 'id_card',
        fileName: 'id-card.pdf',
        filePath: 'documents/id-card.pdf',
    );

    $document->approve(verifiedBy: 2, remark: 'Clear copy');

    expect($document->status())->toBeInstanceOf(Approved::class)
        ->and($document->isApproved())->toBeTrue()
        ->and($document->verifiedBy())->toBe(2)
        ->and($document->remark())->toBe('Clear copy')
        ->and($document->verifiedAt())->not->toBeNull();
});

test('reject transitions a pending document to rejected', function () {
    $document = VendorDocument::create(
        vendorProfileId: 10,
        documentType: 'id_card',
        fileName: 'id-card.pdf',
        filePath: 'documents/id-card.pdf',
    );

    $document->reject(verifiedBy: 2, remark: 'Blurry image');

    expect($document->status())->toBeInstanceOf(Rejected::class)
        ->and($document->isRejected())->toBeTrue()
        ->and($document->remark())->toBe('Blurry image');
});

test('reupload replaces the file, resets to pending, and clears verification', function () {
    $document = VendorDocument::create(
        vendorProfileId: 10,
        documentType: 'id_card',
        fileName: 'id-card.pdf',
        filePath: 'documents/id-card.pdf',
    );
    $document->reject(verifiedBy: 2, remark: 'Blurry image');

    $document->reupload('id-card-v2.pdf', 'documents/id-card-v2.pdf');

    expect($document->fileName())->toBe('id-card-v2.pdf')
        ->and($document->filePath())->toBe('documents/id-card-v2.pdf')
        ->and($document->status())->toBeInstanceOf(Pending::class)
        ->and($document->isPending())->toBeTrue()
        ->and($document->verifiedBy())->toBeNull()
        ->and($document->verifiedAt())->toBeNull()
        ->and($document->remark())->toBeNull();
});

test('resubmit transitions a rejected document back to pending and clears verification', function () {
    $document = VendorDocument::create(
        vendorProfileId: 10,
        documentType: 'id_card',
        fileName: 'id-card.pdf',
        filePath: 'documents/id-card.pdf',
    );
    $document->reject(verifiedBy: 2, remark: 'Blurry image');

    $document->resubmit();

    expect($document->status())->toBeInstanceOf(Pending::class)
        ->and($document->isPending())->toBeTrue()
        ->and($document->verifiedAt())->toBeNull()
        ->and($document->verifiedBy())->toBeNull()
        ->and($document->remark())->toBeNull();
});

test('resubmit transitions an approved document back to pending and clears verification', function () {
    $document = VendorDocument::create(
        vendorProfileId: 10,
        documentType: 'id_card',
        fileName: 'id-card.pdf',
        filePath: 'documents/id-card.pdf',
    );
    $document->approve(verifiedBy: 2, remark: 'Clear copy');

    $document->resubmit();

    expect($document->status())->toBeInstanceOf(Pending::class)
        ->and($document->isPending())->toBeTrue()
        ->and($document->verifiedAt())->toBeNull()
        ->and($document->verifiedBy())->toBeNull()
        ->and($document->remark())->toBeNull();
});

test('resubmit is a no-op when already pending', function () {
    $document = VendorDocument::create(
        vendorProfileId: 10,
        documentType: 'id_card',
        fileName: 'id-card.pdf',
        filePath: 'documents/id-card.pdf',
    );
    $pendingState = $document->status();

    $document->resubmit();

    expect($document->status())->toBe($pendingState);
});
