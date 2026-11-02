<?php

use App\Modules\Shared\Domain\ValueObjects\Money;
use App\Modules\Tender\Domain\Entities\Tor\Tor;
use App\Modules\Tender\Domain\States\TorStatus;
use App\Modules\Tender\Domain\States\TorStatus\Approved;
use App\Modules\Tender\Domain\States\TorStatus\Bidding;
use App\Modules\Tender\Domain\States\TorStatus\Cancelled;
use App\Modules\Tender\Domain\States\TorStatus\Draft;
use App\Modules\Tender\Domain\States\TorStatus\InReview;
use App\Modules\Tender\Domain\States\TorStatus\Published;
use App\Modules\Tender\Domain\States\TorStatus\RevisionRequired;
use App\Modules\Tender\Domain\ValueObjects\Tor\TorCode;
use Carbon\CarbonImmutable;
use Spatie\ModelStates\Exceptions\TransitionNotFound;

function makeTor(): Tor
{
    return Tor::create(
        torCode: TorCode::fromString('TOR-2569-0001'),
        title: 'จัดซื้อคอมพิวเตอร์ 50 เครื่อง',
        scopeOfWork: 'ขอบเขตงานจัดซื้อคอมพิวเตอร์',
        departmentId: 1,
        tenderProjectId: null,
        budgetEstimate: Money::fromString('500000'),
        procurementMethod: 'e-bidding',
        fiscalYear: 2569,
        biddingStartAt: null,
        biddingEndAt: null,
        createdBy: 3,
    );
}

test('create builds a new draft TOR with no id', function () {
    $tor = makeTor();

    expect($tor->id())->toBeNull()
        ->and($tor->torCode()->value)->toBe('TOR-2569-0001')
        ->and($tor->title())->toBe('จัดซื้อคอมพิวเตอร์ 50 เครื่อง')
        ->and($tor->departmentId())->toBe(1)
        ->and($tor->tenderProjectId())->toBeNull()
        ->and($tor->budgetEstimate()->amount)->toBe('500000.00')
        ->and($tor->procurementMethod())->toBe('e-bidding')
        ->and($tor->fiscalYear())->toBe(2569)
        ->and($tor->status())->toBeInstanceOf(Draft::class)
        ->and($tor->createdBy())->toBe(3)
        ->and($tor->approvedBy())->toBeNull()
        ->and($tor->approvedAt())->toBeNull()
        ->and($tor->remark())->toBeNull();
});

test('reconstitute rebuilds a TOR from persisted values', function () {
    $torCode = TorCode::fromString('TOR-2569-0001');
    $approvedAt = CarbonImmutable::parse('2026-08-01 10:00:00');
    $status = new Approved(null);

    $tor = Tor::reconstitute(
        id: 1,
        torCode: $torCode,
        title: 'จัดซื้อคอมพิวเตอร์ 50 เครื่อง',
        scopeOfWork: 'ขอบเขตงานจัดซื้อคอมพิวเตอร์',
        departmentId: 1,
        tenderProjectId: 9,
        budgetEstimate: Money::fromString('500000'),
        procurementMethod: 'specific',
        fiscalYear: 2570,
        biddingStartAt: null,
        biddingEndAt: null,
        status: $status,
        createdBy: 3,
        approvedBy: 4,
        approvedAt: $approvedAt,
        remark: 'อนุมัติแล้ว',
    );

    expect($tor->id())->toBe(1)
        ->and($tor->torCode())->toBe($torCode)
        ->and($tor->tenderProjectId())->toBe(9)
        ->and($tor->procurementMethod())->toBe('specific')
        ->and($tor->fiscalYear())->toBe(2570)
        ->and($tor->status())->toBe($status)
        ->and($tor->approvedBy())->toBe(4)
        ->and($tor->approvedAt())->toBe($approvedAt)
        ->and($tor->remark())->toBe('อนุมัติแล้ว');
});

test('update replaces the editable TOR fields', function () {
    $tor = makeTor();
    $newCode = TorCode::fromString('TOR-2569-0002');
    $newBudget = Money::fromString('600000');

    $tor->update(
        torCode: $newCode,
        title: 'จัดซื้อคอมพิวเตอร์ 60 เครื่อง',
        scopeOfWork: 'ขอบเขตงานใหม่',
        departmentId: 2,
        tenderProjectId: 9,
        budgetEstimate: $newBudget,
        procurementMethod: 'specific',
        fiscalYear: 2570,
        biddingStartAt: null,
        biddingEndAt: null,
    );

    expect($tor->torCode())->toBe($newCode)
        ->and($tor->title())->toBe('จัดซื้อคอมพิวเตอร์ 60 เครื่อง')
        ->and($tor->departmentId())->toBe(2)
        ->and($tor->tenderProjectId())->toBe(9)
        ->and($tor->budgetEstimate())->toBe($newBudget)
        ->and($tor->procurementMethod())->toBe('specific')
        ->and($tor->fiscalYear())->toBe(2570);
});

test('approve moves an in-review TOR to approved with approver, timestamp, and remark', function () {
    $tor = makeTor();
    $tor->changeStatus(new InReview(null));

    $tor->approve(approvedBy: 4, remark: 'อนุมัติแล้ว');

    expect($tor->status())->toBeInstanceOf(Approved::class)
        ->and($tor->approvedBy())->toBe(4)
        ->and($tor->remark())->toBe('อนุมัติแล้ว')
        ->and($tor->approvedAt())->not->toBeNull();
});

test('approve rejects a TOR that has not been sent for review', function () {
    $tor = makeTor();

    expect(fn () => $tor->approve(approvedBy: 4))->toThrow(TransitionNotFound::class);

    expect($tor->status())->toBeInstanceOf(Draft::class)
        ->and($tor->approvedBy())->toBeNull();
});

test('changeStatus updates the status and remark', function () {
    $tor = makeTor();
    $tor->changeStatus(new InReview(null));

    $tor->changeStatus(new RevisionRequired(null), 'กรุณาแก้ไขขอบเขตงาน');

    expect($tor->status())->toBeInstanceOf(RevisionRequired::class)
        ->and($tor->remark())->toBe('กรุณาแก้ไขขอบเขตงาน');
});

function makeTorIn(TorStatus $status): Tor
{
    return Tor::reconstitute(
        id: 1,
        torCode: TorCode::fromString('TOR-2569-0001'),
        title: 'จัดซื้อคอมพิวเตอร์ 50 เครื่อง',
        scopeOfWork: 'ขอบเขตงานจัดซื้อคอมพิวเตอร์',
        departmentId: 1,
        tenderProjectId: null,
        budgetEstimate: Money::fromString('500000'),
        procurementMethod: 'e-bidding',
        fiscalYear: 2569,
        biddingStartAt: null,
        biddingEndAt: null,
        status: $status,
        createdBy: 3,
        approvedBy: $status instanceof Approved ? 4 : null,
        approvedAt: $status instanceof Approved ? CarbonImmutable::parse('2026-08-01 10:00:00') : null,
        remark: null,
    );
}

test('isEditable is true only while drafting, sent back, or approved', function (string $statusClass, bool $editable) {
    expect(makeTorIn(new $statusClass(null))->isEditable())->toBe($editable);
})->with([
    'draft' => [Draft::class, true],
    'revision required' => [RevisionRequired::class, true],
    'approved' => [Approved::class, true],
    'in review' => [InReview::class, false],
    'published' => [Published::class, false],
    'bidding' => [Bidding::class, false],
    'cancelled' => [Cancelled::class, false],
]);

test('isDeletable is true only while drafting or sent back', function (string $statusClass, bool $deletable) {
    expect(makeTorIn(new $statusClass(null))->isDeletable())->toBe($deletable);
})->with([
    'draft' => [Draft::class, true],
    'revision required' => [RevisionRequired::class, true],
    'in review' => [InReview::class, false],
    'approved' => [Approved::class, false],
    'bidding' => [Bidding::class, false],
    'cancelled' => [Cancelled::class, false],
]);

test('sendBackForReview moves an approved TOR to in review and clears the approval and its remark', function () {
    $tor = makeTorIn(new InReview(null));
    $tor->approve(approvedBy: 4, remark: 'อนุมัติตามเสนอ');

    $tor->sendBackForReview();

    expect($tor->status())->toBeInstanceOf(InReview::class)
        ->and($tor->approvedBy())->toBeNull()
        ->and($tor->approvedAt())->toBeNull()
        ->and($tor->remark())->toBeNull();
});

/**
 * Calls update() with the TOR's current values, overriding the given ones.
 *
 * @param  array<string, mixed>  $overrides
 */
function updateTorWith(Tor $tor, array $overrides = []): bool
{
    return $tor->update(...array_merge([
        'torCode' => $tor->torCode(),
        'title' => $tor->title(),
        'scopeOfWork' => $tor->scopeOfWork(),
        'departmentId' => $tor->departmentId(),
        'tenderProjectId' => $tor->tenderProjectId(),
        'budgetEstimate' => $tor->budgetEstimate(),
        'procurementMethod' => $tor->procurementMethod(),
        'fiscalYear' => $tor->fiscalYear(),
        'biddingStartAt' => $tor->biddingStartAt(),
        'biddingEndAt' => $tor->biddingEndAt(),
    ], $overrides));
}

test('update reports no change and keeps the approval when given the same values', function () {
    $tor = makeTorIn(new Approved(null));

    expect(updateTorWith($tor, ['budgetEstimate' => Money::fromString('500000.00')]))->toBeFalse()
        ->and($tor->status())->toBeInstanceOf(Approved::class)
        ->and($tor->approvedBy())->toBe(4);
});

test('update reports a change and sends an approved TOR back for review', function (array $overrides) {
    $tor = makeTorIn(new Approved(null));

    expect(updateTorWith($tor, $overrides))->toBeTrue()
        ->and($tor->status())->toBeInstanceOf(InReview::class)
        ->and($tor->approvedBy())->toBeNull();
})->with([
    'title' => [['title' => 'ชื่อใหม่']],
    'budget' => [['budgetEstimate' => Money::fromString('500000.01')]],
    'bidding start' => [['biddingStartAt' => CarbonImmutable::parse('2026-12-01 09:00:00')]],
    'project' => [['tenderProjectId' => 9]],
]);

test('update reports a change but keeps the status of a TOR that is not approved', function () {
    $tor = makeTorIn(new RevisionRequired(null));

    expect(updateTorWith($tor, ['title' => 'ชื่อใหม่']))->toBeTrue()
        ->and($tor->status())->toBeInstanceOf(RevisionRequired::class);
});

test('hasBiddingWindowForProgress checks the window a published or bidding TOR needs', function (string $statusClass, ?string $start, ?string $end, bool $expected) {
    $now = CarbonImmutable::parse('2026-11-02 12:00:00');
    $tor = makeTorIn(new $statusClass(null));
    updateTorWith($tor, [
        'biddingStartAt' => $start !== null ? CarbonImmutable::parse($start) : null,
        'biddingEndAt' => $end !== null ? CarbonImmutable::parse($end) : null,
    ]);

    expect($tor->hasBiddingWindowForProgress($now))->toBe($expected);
})->with([
    'published with a future window' => [Published::class, '2026-11-10', '2026-11-20', true],
    'published without a start' => [Published::class, null, '2026-11-20', false],
    'published with a start already passed' => [Published::class, '2026-11-01', '2026-11-20', false],
    'published without a deadline' => [Published::class, '2026-11-10', null, false],
    'bidding with a future deadline' => [Bidding::class, '2026-10-20', '2026-11-20', true],
    'bidding with a deadline already passed' => [Bidding::class, '2026-10-20', '2026-11-01', false],
    'bidding without a deadline' => [Bidding::class, '2026-10-20', null, false],
    'bidding without a start' => [Bidding::class, null, '2026-11-20', false],
    'draft without any window' => [Draft::class, null, null, true],
    'cancelled with a past window' => [Cancelled::class, '2026-01-01', '2026-01-02', true],
]);

test('sendBackForReview rejects a TOR whose progress does not allow it', function () {
    $tor = makeTorIn(new Bidding(null));

    expect(fn () => $tor->sendBackForReview())->toThrow(TransitionNotFound::class);

    expect($tor->status())->toBeInstanceOf(Bidding::class);
});

test('changeStatus rejects a step the TOR progress does not allow', function () {
    $tor = makeTor();

    expect(fn () => $tor->changeStatus(new Bidding(null)))->toThrow(TransitionNotFound::class);

    expect($tor->status())->toBeInstanceOf(Draft::class);
});
