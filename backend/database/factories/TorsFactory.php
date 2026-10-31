<?php

namespace Database\Factories;

use App\Modules\InternalProfiles\Infrastructure\Models\Department;
use App\Modules\Tender\Domain\States\TorStatus;
use App\Modules\Tender\Domain\States\TorStatus\Approved;
use App\Modules\Tender\Domain\States\TorStatus\Awarded;
use App\Modules\Tender\Domain\States\TorStatus\Bidding;
use App\Modules\Tender\Domain\States\TorStatus\Cancelled;
use App\Modules\Tender\Domain\States\TorStatus\Closed;
use App\Modules\Tender\Domain\States\TorStatus\Completed;
use App\Modules\Tender\Domain\States\TorStatus\Draft;
use App\Modules\Tender\Domain\States\TorStatus\InReview;
use App\Modules\Tender\Domain\States\TorStatus\NoBidder;
use App\Modules\Tender\Domain\States\TorStatus\Published;
use App\Modules\Tender\Domain\States\TorStatus\RevisionRequired;
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
     * Statuses a TOR can only reach after internal approval.
     *
     * @var list<class-string<TorStatus>>
     */
    private const array APPROVED_STATUSES = [Approved::class, Published::class, Bidding::class, Closed::class, NoBidder::class, Awarded::class, Completed::class];

    /**
     * Statuses before publishing: the bidding window is drafted and approved
     * with the TOR, so it lies ahead of today.
     *
     * @var list<class-string<TorStatus>>
     */
    private const array PRE_PUBLISH_STATUSES = [Draft::class, InReview::class, RevisionRequired::class, Approved::class];

    /**
     * Statuses whose bidding period has already ended.
     *
     * @var list<class-string<TorStatus>>
     */
    private const array BIDDING_ENDED_STATUSES = [Closed::class, NoBidder::class, Awarded::class, Completed::class];

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $tor = fake()->randomElement(self::TORS);

        return [
            'status' => fake()->randomElement(TorStatus::all()->keys()->all()),
            // Drawn up front so start and end agree: a pre-publish TOR with an
            // end date may also have a start date (none means "at publish").
            'bidding_end_at' => fn (array $attributes) => match (true) {
                $this->statusIs($attributes, Published::class) => fake()->dateTimeBetween('+15 days', '+45 days'),
                $this->statusIs($attributes, Bidding::class) => fake()->dateTimeBetween('+3 days', '+30 days'),
                $this->statusIs($attributes, ...self::BIDDING_ENDED_STATUSES) => fake()->dateTimeBetween('-44 days', '-1 day'),
                $this->statusIs($attributes, Approved::class) => fake()->dateTimeBetween('+30 days', '+60 days'),
                $this->statusIs($attributes, ...self::PRE_PUBLISH_STATUSES) => fake()->boolean(70) ? fake()->dateTimeBetween('+30 days', '+60 days') : null,
                default => null,
            },
            'bidding_start_at' => fn (array $attributes) => match (true) {
                $this->statusIs($attributes, Published::class) => fake()->dateTimeBetween('+1 day', '+14 days'),
                $this->statusIs($attributes, Bidding::class) => fake()->dateTimeBetween('-14 days', '-1 day'),
                $this->statusIs($attributes, ...self::BIDDING_ENDED_STATUSES) => fake()->dateTimeBetween('-90 days', '-45 days'),
                $this->statusIs($attributes, ...self::PRE_PUBLISH_STATUSES) => $attributes['bidding_end_at'] !== null && fake()->boolean()
                    ? fake()->dateTimeBetween('+7 days', '+21 days')
                    : null,
                default => null,
            },
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
            'remark' => fn (array $attributes) => match (true) {
                $this->statusIs($attributes, RevisionRequired::class) => 'กรุณาระบุคุณสมบัติผู้ยื่นข้อเสนอและเงื่อนไขการรับประกันให้ชัดเจน',
                $this->statusIs($attributes, Cancelled::class) => 'ยกเลิกเนื่องจากได้รับการจัดสรรงบประมาณไม่เพียงพอ',
                default => null,
            },
        ];
    }

    /**
     * A TOR explicitly in the given status, by name ('draft') or state class.
     *
     * @param  string|class-string<TorStatus>  $status
     */
    public function status(string $status): static
    {
        return $this->state(['status' => $status]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     * @param  class-string<TorStatus>  ...$statuses
     */
    private function statusIs(array $attributes, string ...$statuses): bool
    {
        return in_array(TorStatus::resolveStateClass($attributes['status']), $statuses, true);
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
        return $this->statusIs($attributes, ...self::APPROVED_STATUSES);
    }

    private function randomInternalUserId(): ?int
    {
        $ids = User::where('user_type', 'internal')->pluck('id');

        return $ids->isNotEmpty() ? $ids->random() : null;
    }
}
