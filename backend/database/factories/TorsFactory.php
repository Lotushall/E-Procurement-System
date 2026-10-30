<?php

namespace Database\Factories;

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\Tender\Infrastructure\Models\Project\TenderProjects;
use App\Modules\Tender\Infrastructure\Models\Tor\Tors;
use App\Modules\User\Infrastructure\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Attributes are resolved in order, so later closures read the TOR's
 * status and project to keep dates, approval, and budget fields consistent
 * with the TOR's progress.
 *
 * @extends Factory<Tors>
 */
class TorsFactory extends Factory
{
    protected $model = Tors::class;

    /**
     * @var list<array{title: string, scope: string}>
     */
    private const array TORS = [
        ['title' => 'จัดซื้อเครื่องคอมพิวเตอร์โน้ตบุ๊ก 50 เครื่อง', 'scope' => 'จัดซื้อเครื่องคอมพิวเตอร์โน้ตบุ๊กสำหรับเจ้าหน้าที่ พร้อมระบบปฏิบัติการลิขสิทธิ์และรับประกัน 3 ปี'],
        ['title' => 'จัดซื้อเครื่องพิมพ์เลเซอร์ 20 เครื่อง', 'scope' => 'จัดซื้อเครื่องพิมพ์เลเซอร์ขาวดำและสี พร้อมติดตั้งและอบรมการใช้งาน'],
        ['title' => 'จ้างเหมาบริการทำความสะอาดอาคาร 12 เดือน', 'scope' => 'จ้างเหมาทำความสะอาดอาคารสำนักงาน 5 ชั้น วันจันทร์ถึงศุกร์ พร้อมวัสดุอุปกรณ์'],
        ['title' => 'จ้างเหมาบริการรักษาความปลอดภัย 12 เดือน', 'scope' => 'จัดหาพนักงานรักษาความปลอดภัยตลอด 24 ชั่วโมง จำนวน 6 อัตรา'],
        ['title' => 'ปรับปรุงระบบเครือข่ายไร้สายภายในอาคาร', 'scope' => 'ติดตั้งอุปกรณ์กระจายสัญญาณไร้สายครอบคลุมทุกชั้น พร้อมระบบบริหารจัดการส่วนกลาง'],
        ['title' => 'จัดซื้อโต๊ะและเก้าอี้สำนักงาน', 'scope' => 'จัดซื้อโต๊ะทำงานและเก้าอี้สำนักงานตามแบบที่กำหนด จำนวน 80 ชุด'],
        ['title' => 'จ้างพัฒนาระบบสารบรรณอิเล็กทรอนิกส์', 'scope' => 'พัฒนาระบบรับ-ส่งหนังสือราชการอิเล็กทรอนิกส์ พร้อมเชื่อมต่อระบบลงนามดิจิทัล'],
        ['title' => 'ปรับปรุงห้องประชุมใหญ่', 'scope' => 'ปรับปรุงระบบภาพและเสียง ระบบปรับอากาศ และงานตกแต่งภายในห้องประชุมขนาด 100 ที่นั่ง'],
        ['title' => 'จัดซื้อรถยนต์ตรวจการณ์ 2 คัน', 'scope' => 'จัดซื้อรถยนต์กระบะขับเคลื่อนสี่ล้อ ขนาดไม่ต่ำกว่า 2,400 ซีซี พร้อมอุปกรณ์มาตรฐาน'],
        ['title' => 'จัดซื้อวัสดุสำนักงานประจำปี', 'scope' => 'จัดซื้อกระดาษ แฟ้ม และวัสดุสิ้นเปลืองสำนักงานตามรายการแนบท้าย'],
    ];

    /**
     * @var list<string>
     */
    private const array PROCUREMENT_METHODS = ['e-bidding', 'e-market', 'วิธีเฉพาะเจาะจง', 'วิธีคัดเลือก'];

    /**
     * @var list<string>
     */
    public const array STATUSES = [
        'draft',
        'in_review',
        'revision_required',
        'approved',
        'bidding',
        'closed',
        'no_bidder',
        'awarded',
        'completed',
        'cancelled',
    ];

    /**
     * Statuses a TOR can only reach after internal approval.
     *
     * @var list<string>
     */
    private const array APPROVED_STATUSES = ['approved', 'bidding', 'closed', 'no_bidder', 'awarded', 'completed'];

    /**
     * Statuses whose bidding period has already ended.
     *
     * @var list<string>
     */
    private const array BIDDING_ENDED_STATUSES = ['closed', 'no_bidder', 'awarded', 'completed'];

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $tor = fake()->randomElement(self::TORS);

        return [
            'status' => fake()->randomElement(self::STATUSES),
            'tender_project_id' => fn () => fake()->boolean(70) ? TenderProjects::inRandomOrder()->value('id') : null,
            'department_id' => fn (array $attributes) => $this->project($attributes)?->department_id
                ?? Department::inRandomOrder()->value('id')
                ?? Department::firstOrCreate(['name' => 'IT'])->id,
            'fiscal_year' => fn (array $attributes) => $this->project($attributes)?->fiscal_year ?? fake()->numberBetween(2567, 2569),
            'procurement_method' => fn (array $attributes) => $this->project($attributes)?->procurement_method ?? fake()->randomElement(self::PROCUREMENT_METHODS),
            'tor_code' => fn (array $attributes) => 'TOR-'.$attributes['fiscal_year'].'-'.fake()->unique()->numerify('####'),
            'title' => $tor['title'],
            'scope_of_work' => $tor['scope'],
            'budget_estimate' => function (array $attributes) {
                $projectBudget = $this->project($attributes)?->budget;

                return $projectBudget !== null
                    ? round((float) $projectBudget * fake()->randomFloat(2, 0.1, 0.6), 2)
                    : fake()->randomFloat(2, 50000, 5000000);
            },
            'created_by' => fn () => $this->randomInternalUserId(),
            'approved_by' => fn (array $attributes) => $this->isApproved($attributes) ? $this->randomInternalUserId() : null,
            'approved_at' => fn (array $attributes) => $this->isApproved($attributes) ? fake()->dateTimeBetween('-120 days', '-91 days') : null,
            'bidding_start_at' => fn (array $attributes) => match (true) {
                $attributes['status'] === 'bidding' => fake()->dateTimeBetween('-14 days', '-1 day'),
                in_array($attributes['status'], self::BIDDING_ENDED_STATUSES, true) => fake()->dateTimeBetween('-90 days', '-45 days'),
                default => null,
            },
            'bidding_end_at' => fn (array $attributes) => match (true) {
                $attributes['status'] === 'bidding' => fake()->dateTimeBetween('+3 days', '+30 days'),
                in_array($attributes['status'], self::BIDDING_ENDED_STATUSES, true) => fake()->dateTimeBetween('-44 days', '-1 day'),
                default => null,
            },
            'remark' => fn (array $attributes) => match ($attributes['status']) {
                'revision_required' => 'กรุณาระบุคุณสมบัติผู้ยื่นข้อเสนอและเงื่อนไขการรับประกันให้ชัดเจน',
                'cancelled' => 'ยกเลิกเนื่องจากได้รับการจัดสรรงบประมาณไม่เพียงพอ',
                default => null,
            },
        ];
    }

    /**
     * A TOR explicitly in the given status.
     */
    public function status(string $status): static
    {
        return $this->state(['status' => $status]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function project(array $attributes): ?TenderProjects
    {
        return $attributes['tender_project_id'] !== null
            ? TenderProjects::find($attributes['tender_project_id'])
            : null;
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function isApproved(array $attributes): bool
    {
        return in_array($attributes['status'], self::APPROVED_STATUSES, true);
    }

    private function randomInternalUserId(): ?int
    {
        $ids = User::where('user_type', 'internal')->pluck('id');

        return $ids->isNotEmpty() ? $ids->random() : null;
    }
}
