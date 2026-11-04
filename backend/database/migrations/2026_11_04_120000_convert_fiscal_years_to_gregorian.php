<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Buddhist and Gregorian years are 543 apart (ปีงบประมาณ 2570 = fiscal year 2027).
     */
    private const OFFSET = 543;

    /**
     * Any year at or above this is still Buddhist; Gregorian fiscal years stay far below it.
     */
    private const FIRST_BUDDHIST_YEAR = 2400;

    /**
     * Fiscal years move from the Buddhist to the Gregorian calendar, together
     * with the year inside every project and TOR code (TP-2570-0001 →
     * TP-2027-0001) and the per-year TOR code counters. Rows already in the
     * Gregorian calendar are left alone, so the migration can run on partly
     * converted data.
     */
    public function up(): void
    {
        DB::transaction(function () {
            $this->convertCodes('tenders_projects', 'project_code', 'TP', -self::OFFSET);
            $this->convertCodes('tors', 'tor_code', 'TOR', -self::OFFSET);
            $this->convertTorCodeSequences(-self::OFFSET);
        });
    }

    public function down(): void
    {
        DB::transaction(function () {
            $this->convertCodes('tenders_projects', 'project_code', 'TP', self::OFFSET);
            $this->convertCodes('tors', 'tor_code', 'TOR', self::OFFSET);
            $this->convertTorCodeSequences(self::OFFSET);
        });
    }

    private function convertCodes(string $table, string $codeColumn, string $prefix, int $shift): void
    {
        DB::table($table)
            ->where('fiscal_year', $shift < 0 ? '>=' : '<', self::FIRST_BUDDHIST_YEAR)
            ->select(['id', 'fiscal_year', $codeColumn])
            ->chunkById(500, function ($rows) use ($table, $codeColumn, $prefix, $shift) {
                foreach ($rows as $row) {
                    $year = $row->fiscal_year + $shift;

                    DB::table($table)->where('id', $row->id)->update([
                        'fiscal_year' => $year,
                        // Only a code whose year matches the row's fiscal year is rewritten.
                        $codeColumn => str_starts_with($row->{$codeColumn}, "{$prefix}-{$row->fiscal_year}-")
                            ? "{$prefix}-{$year}-".substr($row->{$codeColumn}, strlen("{$prefix}-{$row->fiscal_year}-"))
                            : $row->{$codeColumn},
                    ]);
                }
            });
    }

    private function convertTorCodeSequences(int $shift): void
    {
        $rows = DB::table('tor_code_sequences')
            ->where('fiscal_year', $shift < 0 ? '>=' : '<', self::FIRST_BUDDHIST_YEAR)
            ->get();

        foreach ($rows as $row) {
            $year = $row->fiscal_year + $shift;
            $existing = DB::table('tor_code_sequences')->where('fiscal_year', $year)->value('last_sequence');

            // fiscal_year is the primary key: write the converted row, keeping the higher
            // counter if that year already has one, so no issued code is handed out again.
            DB::table('tor_code_sequences')->updateOrInsert(
                ['fiscal_year' => $year],
                [
                    'last_sequence' => max($row->last_sequence, (int) $existing),
                    'created_at' => $row->created_at,
                    'updated_at' => now(),
                ],
            );
            DB::table('tor_code_sequences')->where('fiscal_year', $row->fiscal_year)->delete();
        }
    }
};
