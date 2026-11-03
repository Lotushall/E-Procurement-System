<?php

use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Mockery\MockInterface;

uses(RefreshDatabase::class);

/**
 * Spy on the logger, answering every channel() call with the spy itself so
 * the log() call that follows can be asserted.
 */
function spyOnAppLog(): MockInterface
{
    $logger = Log::spy();
    $logger->shouldReceive('channel')->andReturnSelf();

    return $logger;
}

/**
 * Run the callback as if the app were serving an HTTP request instead of
 * running in the console, as it always does under test.
 */
function asIfServingHttp(Closure $callback): void
{
    $setRunningInConsole = fn (bool $value) => (fn () => $this->isRunningInConsole = $value)->call(app());

    $setRunningInConsole(false);

    try {
        $callback();
    } finally {
        $setRunningInConsole(true);
    }
}

test('app_cache_remember stores the value for the given ttl and serves it afterwards', function () {
    $first = app_cache_remember('helpers-test', 60, fn () => 'computed');
    $second = app_cache_remember('helpers-test', 60, fn () => 'recomputed');

    expect($first)->toBe('computed')
        ->and($second)->toBe('computed');
});

test('app_cache_remember stores the value forever without a ttl in the given store', function () {
    app_cache_remember('helpers-test', null, fn () => 'forever', 'array');

    expect(Cache::store('array')->get('helpers-test'))->toBe('forever');
});

test('app_cache_flush clears the default store or the given one', function (?string $store) {
    Cache::store($store)->put('helpers-test', 'value');

    expect(app_cache_flush($store))->toBeTrue()
        ->and(Cache::store($store)->get('helpers-test'))->toBeNull();
})->with([
    'default store' => [null],
    'named store' => ['array'],
]);

test('app_log writes to the default channel when none is given', function () {
    $logger = spyOnAppLog();

    app_log('Something happened', ['id' => 1]);

    $logger->shouldHaveReceived('channel')->with(config('logging.default'));
    $logger->shouldHaveReceived('log')->once()->with('info', 'Something happened', ['id' => 1]);
});

test('app_log falls back to info for an unknown level', function () {
    $logger = spyOnAppLog();

    app_log('Something happened', [], 'shouting', 'tender');

    $logger->shouldHaveReceived('channel')->with('tender');
    $logger->shouldHaveReceived('log')->once()->with('info', 'Something happened', []);
});

test('app_log adds the request details outside the console without overwriting given keys', function () {
    app()->instance('request', Request::create('https://example.test/api/v1/tors?page=2', 'POST', server: [
        'REMOTE_ADDR' => '203.0.113.5',
        'HTTP_USER_AGENT' => 'PestBrowser/1.0',
    ]));
    $logger = spyOnAppLog();

    asIfServingHttp(fn () => app_log('Something happened', ['method' => 'OVERRIDDEN']));

    $logger->shouldHaveReceived('log')->once()->with('info', 'Something happened', [
        'ip' => '203.0.113.5',
        'user_agent' => 'PestBrowser/1.0',
        'url' => 'https://example.test/api/v1/tors?page=2',
        'method' => 'OVERRIDDEN',
    ]);
});

test('app_log adds the signed-in user outside the console', function () {
    $user = User::factory()->create();
    $this->actingAs($user, 'web');
    app()->instance('request', Request::create('https://example.test/api/v1/tors', 'GET'));
    $logger = spyOnAppLog();

    asIfServingHttp(fn () => app_log('Something happened'));

    $logger->shouldHaveReceived('log')->once()->with('info', 'Something happened', Mockery::on(
        fn (array $context) => $context['user_id'] === $user->id && array_key_exists('user_name', $context)
    ));
});
