<?php

use App\Modules\Vendor\Infrastructure\Notifications\Support\DocumentTypeLabels;

test('label returns the Thai label for a known document type', function () {
    expect(DocumentTypeLabels::label('company_certificate'))->toBe('หนังสือรับรองบริษัท');
});

test('label falls back to the raw key for an unknown document type', function () {
    expect(DocumentTypeLabels::label('some_unknown_type'))->toBe('some_unknown_type');
});
