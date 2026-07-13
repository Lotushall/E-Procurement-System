<?php

namespace App\Modules\Auth\Presentation\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Auth\Application\DTOs\LoginData;
use App\Modules\Auth\Application\DTOs\RegisterVendorData;
use App\Modules\Auth\Application\UseCases\LoginUseCase;
use App\Modules\Auth\Application\UseCases\RegisterVendorUseCase;
use App\Modules\Auth\Application\UseCases\ResendVerificationEmailUseCase;
use App\Modules\Auth\Application\UseCases\VerifyEmailUseCase;
use App\Modules\Auth\Presentation\Http\Requests\LoginRequest;
use App\Modules\Auth\Presentation\Http\Requests\RegisterRequest;
use App\Modules\Auth\Presentation\Http\Requests\ResendVerificationRequest;
use App\Modules\Auth\Presentation\Http\Requests\ResetPasswordRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use InvalidArgumentException;

class AuthController extends Controller
{
    public function __construct(
        private readonly RegisterVendorUseCase $registerVendor,
        private readonly LoginUseCase $login,
        private readonly VerifyEmailUseCase $verifyEmail,
        private readonly ResendVerificationEmailUseCase $resendVerificationEmail,
    ) {}

    public function registerVendor(RegisterRequest $request): JsonResponse
    {
        try {
            $user = $this->registerVendor->execute(RegisterVendorData::from($request->validated()));

            app_log('Register successful', [
                'data' => [
                    'id' => $user->id(),
                    'username' => $user->username(),
                    'email' => (string) $user->email(),
                    'userType' => $user->userType()->value,
                ],
            ], 'error', 'auth');

            return response()->json([
                'message' => 'Registration successful.',
                'data' => [
                    'id' => $user->id(),
                    'username' => $user->username(),
                    'email' => (string) $user->email(),
                    'userType' => $user->userType()->value,
                ],
            ], 201);
        } catch (\Throwable $th) {

            app_log('Registration failed.', [
                'error' => $th,
            ], 'error', 'auth');

            return response()->json([
                'message' => 'Registration failed.',
            ], 500);
        }
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = $this->login->execute(LoginData::from([
            ...$request->validated(),
            'identifierField' => $request->identifierField(),
            'remember' => $request->boolean('remember'),
        ]));

        Auth::guard('web')->loginUsingId($user->id(), remember: $request->boolean('remember'));
        $request->session()->regenerate();

        return response()->json([
            'message' => 'Login successful.',
            'data' => [
                'id' => $user->id(),
                'username' => $user->username(),
                'email' => (string) $user->email(),
                'userType' => $user->userType()->value,
            ],
        ]);
    }

    public function ResetPassword(ResetPasswordRequest $request) {}

    public function verifyEmail(int $id, string $hash): JsonResponse
    {
        try {
            $user = $this->verifyEmail->execute($id, $hash);

            return response()->json([
                'message' => 'Email verified successfully.',
                'data' => [
                    'id' => $user->id(),
                    'email' => (string) $user->email(),
                    'verifiedAt' => $user->emailVerifiedAt()?->toIso8601String(),
                ],
            ]);
        } catch (InvalidArgumentException $e) {
            app_log('Email verification failed.', ['error' => $e], 'warning', 'auth');

            return response()->json(['message' => 'Invalid or expired verification link.'], 403);
        } catch (\Throwable $th) {
            app_log('Email verification failed.', ['error' => $th], 'error', 'auth');

            return response()->json(['message' => 'Email verification failed.'], 500);
        }
    }

    public function resendVerificationEmail(ResendVerificationRequest $request): JsonResponse
    {
        try {
            $this->resendVerificationEmail->execute($request->string('email')->toString());
        } catch (\Throwable $th) {
            app_log('Resend verification email failed.', ['error' => $th], 'error', 'auth');

            return response()->json(['message' => 'Unable to resend verification email.'], 500);
        }

        return response()->json([
            'message' => 'If an account with that email exists and is not yet verified, a new verification link has been sent.',
        ]);
    }
}
