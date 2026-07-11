<?php

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

if (! function_exists('app_cache_remember')) {
    /**
     * Remember a value in cache and return it.
     */
    function app_cache_remember(
        string $key,
        DateTimeInterface|DateInterval|int|null $ttl,
        Closure $callback,
        ?string $store = null
    ): mixed {
        $cacheStore = $store ? Cache::store($store) : Cache::store();

        if ($ttl === null) {
            return $cacheStore->rememberForever($key, $callback);
        }

        return $cacheStore->remember($key, $ttl, $callback);
    }
}

if (! function_exists('app_cache_forget')) {
    /**
     * Forget one or many cache keys.
     */
    function app_cache_forget(string|array $keys, ?string $store = null): bool
    {
        $cacheStore = $store ? Cache::store($store) : Cache::store();
        $keyList = is_array($keys) ? $keys : [$keys];

        $allForgotten = true;

        foreach ($keyList as $key) {
            $allForgotten = $cacheStore->forget($key) && $allForgotten;
        }

        return $allForgotten;
    }
}

if (! function_exists('app_cache_flush')) {
    /**
     * Flush all keys in the selected cache store.
     */
    function app_cache_flush(?string $store = null): bool
    {
        $cacheStore = $store ? Cache::store($store) : Cache::store();

        return $cacheStore->getStore()->flush();
    }
}

if (! function_exists('app_log')) {
    /**
     * Write a log entry to the selected channel.
     */
    function app_log(
        string $message,
        array $context = [],
        string $level = 'info',
        ?string $channel = null
    ): void {
        $allowedLevels = [
            'debug',
            'info',
            'notice',
            'warning',
            'error',
            'critical',
            'alert',
            'emergency',
        ];

        if (! in_array($level, $allowedLevels, true)) {
            $level = 'info';
        }

        if (app()->runningInConsole() === false) {
            $request = request();

            $requestContext = [
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'url' => $request->fullUrl(),
                'method' => $request->method(),
            ];

            // optional: user info
            if (auth()->check()) {
                $requestContext['user_id'] = auth()->id();
                $requestContext['user_name'] = auth()->user()->eng_name ?? null;
            }

            // merge โดยไม่ overwrite key เดิม
            $context = array_merge($requestContext, $context);
        }

        $logger = $channel
            ? Log::channel($channel)
            : Log::channel(config('logging.default'));

        $logger->log($level, $message, $context);
    }
}
