<?php

use App\Console\Commands\ModuleMakeCommand;
use Nwidart\Modules\Activators\FileActivator;
use Nwidart\Modules\Commands\Make\ModuleMakeCommand as BaseModuleMakeCommand;
use Nwidart\Modules\Providers\ConsoleServiceProvider;

return [

    /*
    |--------------------------------------------------------------------------
    | Module Namespace
    |--------------------------------------------------------------------------
    |
    | Default module namespace.
    |
    */
    'namespace' => 'App\\Modules',

    /*
    |--------------------------------------------------------------------------
    | Vapor Maintenance Mode
    |--------------------------------------------------------------------------
    |
    | Indicates if the application is running on Laravel Vapor.
    | When enabled, cached services path will be set to a writable location.
    |
    */
    'vapor_maintenance_mode' => env('VAPOR_MAINTENANCE_MODE', false),

    /*
    |--------------------------------------------------------------------------
    | Module Stubs
    |--------------------------------------------------------------------------
    |
    | Default module stubs.
    |
    */
    'stubs' => [
        'enabled' => true,
        'path' => base_path('stubs/nwidart-stubs'),
        'files' => [
            // ไม่ต้องการ config/resources/routes/composer.json/package.json/vite.config.js
            // ต่อ module อีกต่อไป — ปล่อยว่างไว้ตรงนี้ก็พอ (generateFiles() แค่ loop array
            // ว่างแล้วไม่ทำอะไร ไม่ error)
        ],
        'replacements' => [
            /**
             * Define custom replacements for each section.
             * You can now specify a class name that extends
             * \Nwidart\Modules\Support\ReplacementKeyCommand for dynamic values.
             *
             * Example:
             *
             * 'composer' => [
             *      // Map the UPPERCASE token to your command class
             *      'CUSTOM_KEY' => \App\Modules\Support\Replacements\CustomKey::class,
             *      // You can still list built-in tokens by their names
             *      'LOWER_NAME',
             *      'STUDLY_NAME',
             *      // ...
             * ],
             *
             * The command class must extend ReplacementKeyCommand and implement handle(): string
             * to return the replacement text.
             *
             * Note: Keys should be in UPPERCASE.
             */
            'routes/web' => ['LOWER_NAME', 'STUDLY_NAME', 'PLURAL_LOWER_NAME', 'KEBAB_NAME', 'MODULE_NAMESPACE', 'CONTROLLER_NAMESPACE'],
            'routes/api' => ['LOWER_NAME', 'STUDLY_NAME', 'PLURAL_LOWER_NAME', 'KEBAB_NAME', 'MODULE_NAMESPACE', 'CONTROLLER_NAMESPACE'],
            'vite' => ['LOWER_NAME', 'STUDLY_NAME', 'KEBAB_NAME'],
            'json' => ['LOWER_NAME', 'STUDLY_NAME', 'KEBAB_NAME', 'MODULE_NAMESPACE', 'PROVIDER_NAMESPACE'],
            'views/index' => ['LOWER_NAME'],
            'views/master' => ['LOWER_NAME', 'STUDLY_NAME', 'KEBAB_NAME'],
            'scaffold/config' => ['STUDLY_NAME'],
            'composer' => [
                'LOWER_NAME',
                'STUDLY_NAME',
                'VENDOR',
                'AUTHOR_NAME',
                'AUTHOR_EMAIL',
                'MODULE_NAMESPACE',
                'PROVIDER_NAMESPACE',
                'APP_FOLDER_NAME',
            ],
        ],
        'gitkeep' => true,
    ],
    'paths' => [
        /*
        |--------------------------------------------------------------------------
        | Modules path
        |--------------------------------------------------------------------------
        |
        | This path is used to save the generated module.
        | This path will also be added automatically to the list of scanned folders.
        |
        */
        'modules' => app_path('Modules'),

        /*
        |--------------------------------------------------------------------------
        | Modules assets path
        |--------------------------------------------------------------------------
        |
        | Here you may update the modules' assets path.
        |
        */
        'assets' => public_path('modules'),

        /*
        |--------------------------------------------------------------------------
        | The migrations' path
        |--------------------------------------------------------------------------
        |
        | Where you run the 'module:publish-migration' command, where do you publish the
        | the migration files?
        |
        */
        'migration' => base_path('database/migrations'),

        /*
        |--------------------------------------------------------------------------
        | The app path
        |--------------------------------------------------------------------------
        |
        | app folder name
        | for example can change it to 'src' or 'App'
        */
        'app_folder' => '',

        /*
        |--------------------------------------------------------------------------
        | Generator path
        |--------------------------------------------------------------------------
        | Customise the paths where the folders will be generated.
        | Setting the generate key to false will not generate that folder
        */
        'generator' => [
            // Domain — framework-agnostic
            // key ชื่อ 'interfaces' ห้ามเปลี่ยน (nwidart hardcode ชื่อ key นี้ใน InterfaceMakeCommand)
            // แต่ path/namespace ชี้ไป Domain/Repositories ได้ตาม DDD convention (repository
            // interface อยู่ฝั่ง Domain, ส่วน implementation จริงอยู่ Infrastructure/Repositories)
            'interfaces' => ['path' => 'Domain/Repositories', 'namespace' => 'Domain/Repositories', 'generate' => true], // module:make-interface — ต้องมี 'namespace' เอง เพราะ InterfaceMakeCommand ไม่ fallback ไปใช้ 'path' ให้
            'entities' => ['path' => 'Domain/Entities', 'generate' => true],       // ยังไม่มีคำสั่ง ต้องเขียนเอง (ข้อ 2)
            'valueobjects' => ['path' => 'Domain/ValueObjects', 'generate' => true], // ยังไม่มีคำสั่ง ต้องเขียนเอง (ข้อ 2)
            // 'event'      => ['path' => 'Domain/Events', 'generate' => false],
            // 'enums'      => ['path' => 'Domain/Enums', 'generate' => false],
            // 'exceptions' => ['path' => 'Domain/Exceptions', 'generate' => false],
            // 'policies'   => ['path' => 'Domain/Policies', 'generate' => false],

            // Application — orchestration
            'dto' => ['path' => 'Application/DTOs', 'generate' => true],      // ยังไม่มีคำสั่ง ต้องเขียนเอง (ข้อ 2)
            'usecases' => ['path' => 'Application/UseCases', 'generate' => true],  // ยังไม่มีคำสั่ง ต้องเขียนเอง (ข้อ 2)

            // Infrastructure — persistence
            'model' => ['path' => 'Infrastructure/Models', 'generate' => true],
            'repository' => ['path' => 'Infrastructure/Repositories', 'namespace' => 'Infrastructure/Repositories', 'generate' => true], // key ถูกต้องคือเอกพจน์ — ต้องมี 'namespace' เอง เหตุผลเดียวกับ interfaces
            'migration' => ['path' => 'Infrastructure/Database/migrations', 'generate' => false], // ไม่เอา folder Database เปล่า ๆ — path ยังอยู่เผื่อรัน module:make-migration เอง
            'seeder' => ['path' => 'Infrastructure/Database/seeders', 'generate' => false],
            'factory' => ['path' => 'Infrastructure/Database/factories', 'generate' => false],

            // Presentation
            'controller' => ['path' => 'Presentation/Http/Controllers', 'generate' => true],
            'request' => ['path' => 'Presentation/Http/Requests', 'generate' => true],
            'routes' => ['path' => 'Presentation/routes', 'generate' => false],

            // Module-level — จำเป็นต่อการ boot โมดูล ห้าม comment ทิ้ง
            'provider' => ['path' => 'Providers', 'generate' => true],
            // ไม่ generate route-provider/event-provider แล้ว (แก้ scaffold/provider.stub คู่กัน
            // ไม่ reference RouteServiceProvider::class / EventServiceProvider::class อีกต่อไป —
            // ถ้าลบแค่ตรงนี้แต่ไม่แก้ stub จะพัง "Class not found" ตอน boot เหมือนเคส route มาก่อน)
            'route-provider' => ['path' => 'Providers', 'generate' => false],
            'event-provider' => ['path' => 'Providers', 'generate' => false],
            'config' => ['path' => 'config', 'generate' => false],

            // ต้องมี path เสมอ (ห้ามลบทิ้ง) — ModuleServiceProvider::boot() ของ nwidart
            // อ่าน key พวกนี้ตรง ๆ แบบไม่มี fallback ทุกครั้งที่ module boot (ไม่ใช่แค่ตอน
            // module:make) ถ้า path เป็น null จะได้ TypeError จาก module_path() ทันที
            'lang' => ['path' => 'lang', 'generate' => false],
            'views' => ['path' => 'resources/views', 'generate' => false],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Auto Discover of Modules
    |--------------------------------------------------------------------------
    |
    | Here you configure auto discover of module
    | This is useful for simplify module providers.
    |
    */
    'auto-discover' => [
        /*
        |--------------------------------------------------------------------------
        | Migrations
        |--------------------------------------------------------------------------
        |
        | This option for register migration automatically.
        |
        */
        'migrations' => true,

        /*
        |--------------------------------------------------------------------------
        | Translations
        |--------------------------------------------------------------------------
        |
        | This option for register lang file automatically.
        |
        */
        'translations' => false,

    ],

    /*
    |--------------------------------------------------------------------------
    | Package commands
    |--------------------------------------------------------------------------
    |
    | Here you can define which commands will be visible and used in your
    | application. You can add your own commands to merge section.
    |
    */
    'commands' => ConsoleServiceProvider::defaultCommands()
        ->reject(fn (string $command) => $command === BaseModuleMakeCommand::class)
        ->merge([
            ModuleMakeCommand::class,
        ])->toArray(),

    /*
    |--------------------------------------------------------------------------
    | Scan Path
    |--------------------------------------------------------------------------
    |
    | Here you define which folder will be scanned. By default will scan vendor
    | directory. This is useful if you host the package in packagist website.
    |
    */
    'scan' => [
        'enabled' => false,
        'paths' => [
            base_path('vendor/*/*'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Composer File Template
    |--------------------------------------------------------------------------
    |
    | Here is the config for the composer.json file, generated by this package
    |
    */
    'composer' => [
        'vendor' => env('MODULE_VENDOR', 'nwidart'),
        'author' => [
            'name' => env('MODULE_AUTHOR_NAME', 'Nicolas Widart'),
            'email' => env('MODULE_AUTHOR_EMAIL', 'n.widart@gmail.com'),
        ],
        'composer-output' => false,
    ],

    /*
    |--------------------------------------------------------------------------
    | Choose what laravel-modules will register as custom namespaces.
    | Setting one to false will require you to register that part
    | in your own Service Provider class.
    |--------------------------------------------------------------------------
    */
    'register' => [
        'translations' => true,
        /**
         * load files on boot or register method
         */
        'files' => 'register',
    ],

    /*
    |--------------------------------------------------------------------------
    | Activators
    |--------------------------------------------------------------------------
    |
    | You can define new types of activators here, file, database, etc. The only
    | required parameter is 'class'.
    | The file activator will store the activation status in storage/installed_modules
    */
    'activators' => [
        'file' => [
            'class' => FileActivator::class,
            'statuses-file' => base_path('modules_statuses.json'),
        ],
    ],

    'activator' => 'file',

    /*
    |--------------------------------------------------------------------------
    | Inertia
    |--------------------------------------------------------------------------
    |
    | Default Inertia frontend framework used by make commands when no
    | framework flag (--vue, --react, --svelte) is provided.
    |
    | Supported: "vue", "react", "svelte"
    |
    */
    'inertia' => [
        'frontend' => 'vue',
    ],
];
