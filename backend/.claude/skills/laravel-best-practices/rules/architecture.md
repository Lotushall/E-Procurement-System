# DDD Architecture Rules

These rules define the default architecture for this project. Unless explicitly instructed otherwise, always generate code following these guidelines.

---

# Core Principles

- Organize code by business domain, not by technical layer.
- Follow Domain-Driven Design (DDD) with a Clean Architecture approach.
- Keep business logic inside the Domain layer.
- The Domain layer must remain framework-independent.
- The Application layer orchestrates use cases without containing business rules.
- The Infrastructure layer implements technical details.
- The Presentation layer handles HTTP concerns only.

---

# Project Structure

Organize the application by business domain.

```
app/
    Http/
    Modules/
        User/
            Application/
                Commands/
                Queries/
                DTOs/
                Handlers/

            Domain/
                Entities/
                ValueObjects/
                Enums/
                Events/
                Exceptions/
                Repositories/
                Services/

            Infrastructure/
                Persistence/
                    Eloquent/
                    Repositories/

                External/
                Services/

            Presentation/
                Http/
                    Controllers/
                    Requests/
                    Resources/
    Providers/
```

Each business domain must live inside `app/Modules`.

Every module should contain its own:

- Application
- Domain
- Infrastructure
- Interfaces

Do not create shared folders like

```
app/
    Services/
    Helpers/
    Repositories/
    Models/
```

unless they are true cross-domain components.

Keep all business logic inside the corresponding module.

Only framework bootstrapping belongs in:

```
app/Http
app/Providers
bootstrap/
routes/
```

---

# Domain Layer

The Domain layer must contain only business logic.

The Domain layer must **never** depend on Laravel.

Forbidden imports:

```php
Illuminate\Database\Eloquent\Model
Illuminate\Http\Request
Illuminate\Support\Facades\DB
Illuminate\Support\Facades\Cache
Illuminate\Support\Facades\Auth
Illuminate\Support\Facades\Mail
Illuminate\Support\Facades\Queue
```

The Domain layer should contain:

- Entities
- Value Objects
- Domain Events
- Enums
- Exceptions
- Repository Interfaces
- Domain Services

---

# Entities

Entities are responsible for their own behavior.

Incorrect

```php
$order->status = OrderStatus::Paid;
```

Correct

```php
$order->markAsPaid($payment);
```

Avoid Anemic Domain Models.

---

# Value Objects

Prefer Value Objects whenever a value has business meaning.

Examples

- Email
- Money
- PhoneNumber
- VatNumber
- TaxId
- TenderNumber
- CustomerId

Value Objects should

- be immutable
- validate themselves
- implement value equality

---

# Repository Pattern

Repository interfaces belong to the Domain.

Example

```php
interface TenderRepository
{
    public function save(Tender $tender): void;

    public function find(TenderId $id): ?Tender;
}
```

Implementations belong to Infrastructure.

---

# Application Layer

The Application layer coordinates use cases.

Responsibilities

- Load aggregates
- Execute business operations
- Persist changes
- Publish events

The Application layer should not contain business rules.

---

# Commands & Queries

Prefer CQRS.

Commands

- Create
- Update
- Delete
- Approve
- Publish

Queries

- Find
- Search
- List
- Report

Examples

```
CreateTenderCommand

CreateTenderHandler

FindTenderQuery

FindTenderHandler
```

---

# DTOs

Never pass Request objects outside the Presentation layer.

Always convert HTTP requests into Commands or DTOs.

Incorrect

```php
$this->handler->handle($request);
```

Correct

```php
$this->handler->handle(
    new CreateTenderCommand(...)
);
```

---

# Domain Services

Create Domain Services only when business logic spans multiple entities.

Examples

- BidEvaluationService
- VendorQualificationService
- AwardCalculationService

Do not create generic services like

```
TenderService
CommonService
UtilityService
Helper
```

---

# Controllers

Controllers should only

- Validate requests
- Build Commands or DTOs
- Execute Handlers
- Return Resources or Responses

Controllers must never contain business logic.

---

# Infrastructure

Infrastructure contains

- Eloquent
- Cache
- Queue
- Mail
- External APIs
- Redis
- File Storage

Infrastructure implements Domain contracts.

---

# Dependency Injection

Always use constructor injection.

Incorrect

```php
app(Service::class);

resolve(Service::class);

new Repository();
```

Correct

```php
public function __construct(
    private TenderRepository $repository
) {}
```

Depend on interfaces whenever possible.

---

# Transactions

Transactions belong to the Application layer.

Example

```php
DB::transaction(function () use ($command) {

    $this->handler->handle($command);

});
```

Entities should never manage transactions.

---

# Domain Events

Prefer Domain Events over direct coupling.

Examples

- TenderPublished
- BidSubmitted
- ContractAwarded
- PurchaseOrderApproved

Listeners should perform side effects only.

---

# Eloquent

Eloquent is an Infrastructure concern.

Never expose Eloquent models to the Domain layer.

Repositories should map Eloquent models to Domain Entities.

---

# Naming

Prefer explicit names.

Good

```
CreateTenderHandler

ApproveTenderHandler

PublishTenderHandler

SubmitBidHandler

BidEvaluationService
```

Avoid

```
Service

Helper

Utils

CommonService

BaseService
```

---

# Laravel Conventions

Use Laravel conventions whenever they do not conflict with DDD.

Preferred

- Constructor Dependency Injection
- Form Requests
- API Resources
- Policies
- Route Model Binding (Presentation only)
- Service Providers

Avoid unnecessary configuration.

---

# General Rules

Always

- Write expressive code.
- Keep classes focused on a single responsibility.
- Prefer composition over inheritance.
- Prefer immutable objects.
- Prefer explicit dependencies.
- Use interfaces at system boundaries.
- Keep methods short and intention-revealing.

Never

- Put business logic inside Controllers.
- Put business logic inside Form Requests.
- Put business logic inside Eloquent Models.
- Call `DB::table()` from Controllers.
- Access repositories directly from Views.
- Create generic Helper classes.
- Create God Services.
- Depend on Laravel inside the Domain.
