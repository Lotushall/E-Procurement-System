<?php

test('the tender log channel is configured', function () {
    expect(config('logging.channels.tender'))->not->toBeNull()
        ->and(config('logging.channels.tender.driver'))->toBe('daily')
        ->and(config('logging.channels.tender.path'))->toContain('Tender');
});
