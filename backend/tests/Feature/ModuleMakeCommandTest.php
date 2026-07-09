<?php

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Nwidart\Modules\Facades\Module;

const TEST_MODULE = 'PestDddScaffold';

function cleanUpPestDddScaffoldModule(): void
{
    File::deleteDirectory(app_path('Modules/'.TEST_MODULE));

    $statusesPath = base_path('modules_statuses.json');
    $statuses = json_decode(File::get($statusesPath), true);

    if (array_key_exists(TEST_MODULE, $statuses)) {
        unset($statuses[TEST_MODULE]);
        File::put($statusesPath, json_encode($statuses, JSON_PRETTY_PRINT).PHP_EOL);
    }

    Module::resetModules();
}

beforeEach(function () {
    cleanUpPestDddScaffoldModule();
    Process::fake();
});

afterEach(function () {
    cleanUpPestDddScaffoldModule();
});

test('module:make scaffolds the full DDD skeleton for its primary entity', function () {
    $this->artisan('module:make', ['name' => [TEST_MODULE]])
        ->assertSuccessful();

    $base = app_path('Modules/'.TEST_MODULE);

    expect(File::exists("{$base}/Presentation/Http/Controllers/".TEST_MODULE.'Controller.php'))->toBeTrue()
        ->and(File::exists("{$base}/Infrastructure/Models/".TEST_MODULE.'.php'))->toBeTrue()
        ->and(File::exists("{$base}/Infrastructure/Repositories/".TEST_MODULE.'Repository.php'))->toBeTrue()
        ->and(File::exists("{$base}/Domain/Repositories/".TEST_MODULE.'RepositoryInterface.php'))->toBeTrue()
        ->and(File::exists("{$base}/Presentation/Http/Requests/Store".TEST_MODULE.'Request.php'))->toBeTrue()
        ->and(File::exists("{$base}/Presentation/Http/Requests/Update".TEST_MODULE.'Request.php'))->toBeTrue();

    expect(File::get("{$base}/Domain/Repositories/".TEST_MODULE.'RepositoryInterface.php'))
        ->toContain('namespace App\Modules\\'.TEST_MODULE.'\Domain\Repositories;');

    expect(File::get("{$base}/Infrastructure/Repositories/".TEST_MODULE.'Repository.php'))
        ->toContain('namespace App\Modules\\'.TEST_MODULE.'\Infrastructure\Repositories;');

    expect(File::get("{$base}/Presentation/Http/Controllers/".TEST_MODULE.'Controller.php'))
        ->toContain('namespace App\Modules\\'.TEST_MODULE.'\Presentation\Http\Controllers;');
});

test('module:make refuses to overwrite an existing module without --force', function () {
    $this->artisan('module:make', ['name' => [TEST_MODULE]])
        ->assertSuccessful();

    $this->artisan('module:make', ['name' => [TEST_MODULE]])
        ->assertFailed();
});
