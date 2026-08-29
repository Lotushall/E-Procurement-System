<?php

use App\Modules\Tender\Domain\Entities\TorDocument;

function makeTorDocument(): TorDocument
{
    return TorDocument::create(
        torId: 1,
        label: 'ขอบเขตงานฉบับเต็ม',
        fileName: 'scope.pdf',
        filePath: 'tor-documents/scope.pdf',
        documentType: 'scope',
        uploadedBy: 3,
    );
}

test('create builds a new document with no id', function () {
    $document = makeTorDocument();

    expect($document->id())->toBeNull()
        ->and($document->torId())->toBe(1)
        ->and($document->label())->toBe('ขอบเขตงานฉบับเต็ม')
        ->and($document->fileName())->toBe('scope.pdf')
        ->and($document->filePath())->toBe('tor-documents/scope.pdf')
        ->and($document->documentType())->toBe('scope')
        ->and($document->uploadedBy())->toBe(3);
});

test('reconstitute rebuilds a document from persisted values', function () {
    $document = TorDocument::reconstitute(
        id: 1,
        torId: 1,
        label: 'ขอบเขตงานฉบับเต็ม',
        fileName: 'scope.pdf',
        filePath: 'tor-documents/scope.pdf',
        documentType: 'scope',
        uploadedBy: 3,
    );

    expect($document->id())->toBe(1)
        ->and($document->torId())->toBe(1);
});

test('update replaces the editable document fields', function () {
    $document = makeTorDocument();

    $document->update(
        label: 'ภาคผนวก ก',
        fileName: 'annex-a.pdf',
        filePath: 'tor-documents/annex-a.pdf',
        documentType: 'annex',
    );

    expect($document->label())->toBe('ภาคผนวก ก')
        ->and($document->fileName())->toBe('annex-a.pdf')
        ->and($document->filePath())->toBe('tor-documents/annex-a.pdf')
        ->and($document->documentType())->toBe('annex');
});
