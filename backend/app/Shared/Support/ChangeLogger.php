<?php

namespace App\Shared\Support;

final class ChangeLogger
{
    /**
     * Log an entity update, including a from/to diff of every changed field.
     *
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     * @param  array<string, mixed>  $context
     * @param  list<string>  $sensitiveFields  Field names whose values must be masked before they reach the logs.
     */
    public function log(
        string $message,
        array $before,
        array $after,
        array $context = [],
        array $sensitiveFields = [],
        string $level = 'info',
        ?string $channel = null,
    ): void {
        $changes = [];

        foreach ($after as $field => $value) {
            $previous = $before[$field] ?? null;

            if ($previous === $value) {
                continue;
            }

            $changes[$field] = [
                'from' => $this->presentValue($field, $previous, $sensitiveFields),
                'to' => $this->presentValue($field, $value, $sensitiveFields),
            ];
        }

        if ($changes === []) {
            return;
        }

        app_log($message, [...$context, 'changes' => $changes], $level, $channel);
    }

    /**
     * @param  list<string>  $sensitiveFields
     */
    private function presentValue(string $field, mixed $value, array $sensitiveFields): mixed
    {
        if ($value === null || ! in_array($field, $sensitiveFields, true)) {
            return $value;
        }

        return $this->maskSensitiveId((string) $value);
    }

    /**
     * Mask all but the last 4 characters of a sensitive identifier.
     */
    private function maskSensitiveId(string $value): string
    {
        if (strlen($value) <= 4) {
            return str_repeat('x', strlen($value));
        }

        return str_repeat('x', strlen($value) - 4).substr($value, -4);
    }
}
