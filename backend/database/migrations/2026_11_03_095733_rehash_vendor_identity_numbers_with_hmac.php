<?php

use App\Shared\Support\IdentityHash;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;

/**
 * Recompute the lookup hashes of the encrypted identification numbers from a
 * plain SHA-256 to an HMAC keyed with IDENTITY_HASH_KEY.
 *
 * A hash is either live (the hash of the number) or a tombstone left by
 * deleting the vendor (the hash of "{hash}-deleted-{vendor_profile_id}"), and
 * each keeps its kind. A hash matching neither is left as it is.
 */
return new class extends Migration
{
    /**
     * @var list<array{table: string, number: string, hash: string}>
     */
    private const array COLUMNS = [
        ['table' => 'vendor_company_details', 'number' => 'tax_id', 'hash' => 'tax_id_hash'],
        ['table' => 'vendor_individual_details', 'number' => 'citizen_id', 'hash' => 'citizen_id_hash'],
        ['table' => 'vendor_individual_details', 'number' => 'tax_id', 'hash' => 'tax_id_hash'],
    ];

    public function up(): void
    {
        $this->rehash(
            from: fn (string $number): string => hash('sha256', $number),
            to: fn (string $number): string => IdentityHash::make($number),
        );
    }

    public function down(): void
    {
        $this->rehash(
            from: fn (string $number): string => IdentityHash::make($number),
            to: fn (string $number): string => hash('sha256', $number),
        );
    }

    /**
     * @param  Closure(string): string  $from
     * @param  Closure(string): string  $to
     */
    private function rehash(Closure $from, Closure $to): void
    {
        DB::transaction(function () use ($from, $to): void {
            foreach (self::COLUMNS as $column) {
                DB::table($column['table'])
                    ->whereNotNull($column['number'])
                    ->select(['id', 'vendor_profile_id', $column['number'], $column['hash']])
                    ->chunkById(500, function ($rows) use ($column, $from, $to): void {
                        foreach ($rows as $row) {
                            $rehashed = $this->rehashed($row, $column, $from, $to);

                            if ($rehashed === null) {
                                app_log('Identity hash left unchanged: it matches neither a live hash nor a tombstone.', [
                                    'table' => $column['table'],
                                    'column' => $column['hash'],
                                    'id' => $row->id,
                                ], 'warning', 'vendor');

                                continue;
                            }

                            DB::table($column['table'])->where('id', $row->id)->update([$column['hash'] => $rehashed]);
                        }
                    });
            }
        });
    }

    /**
     * @param  array{table: string, number: string, hash: string}  $column
     * @param  Closure(string): string  $from
     * @param  Closure(string): string  $to
     */
    private function rehashed(object $row, array $column, Closure $from, Closure $to): ?string
    {
        $number = Crypt::decryptString($row->{$column['number']});
        $stored = $row->{$column['hash']};
        $tombstone = fn (string $hash): string => hash('sha256', "{$hash}-deleted-{$row->vendor_profile_id}");

        return match ($stored) {
            $from($number) => $to($number),
            $tombstone($from($number)) => $tombstone($to($number)),
            default => null,
        };
    }
};
