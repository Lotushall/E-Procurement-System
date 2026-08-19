<?php

namespace App\Modules\User\Application\UseCases;

use App\Modules\Shared\Domain\ValueObjects\Email;
use App\Modules\User\Application\DTOs\UpdateAccountData;
use App\Modules\User\Domain\Entities\User;
use App\Modules\User\Domain\Repositories\UserRepositoryInterface;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

final class UpdateAccountUseCase
{
    public function __construct(
        private readonly UserRepositoryInterface $users,
    ) {}

    public function execute(int $id, UpdateAccountData $data): User
    {
        return DB::transaction(function () use ($id, $data): User {
            $user = $this->users->findById($id) ?? throw (new ModelNotFoundException)->setModel(User::class, [$id]);

            $user->changeUsername($data->username);
            $user->changeEmail(Email::fromString($data->email));

            if ($data->password !== null) {
                $user->changePassword(Hash::make($data->password));
            }

            $user = $this->users->save($user);

            app_log('User account updated', [
                'user_id' => $id,
            ], 'info', 'user');

            return $user;
        });
    }
}
