<?php

use App\Modules\Shared\Domain\ValueObjects\Money;
use App\Modules\Tender\Domain\Entities\Tor\Tor;
use App\Modules\Tender\Domain\States\TorStatus\Approved;
use App\Modules\Tender\Domain\States\TorStatus\Bidding;
use App\Modules\Tender\Domain\States\TorStatus\Draft;
use App\Modules\Tender\Domain\States\TorStatus\InReview;
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

test('changeStatus rejects a step the TOR progress does not allow', function () {
    $tor = makeTor();

    expect(fn () => $tor->changeStatus(new Bidding(null)))->toThrow(TransitionNotFound::class);

    expect($tor->status())->toBeInstanceOf(Draft::class);
});
