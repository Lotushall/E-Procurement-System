import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ForgotPasswordSchema, ForgotPasswordValues } from "../_schemas/schema";

export function useForgotPasswordForm() {
    return useForm<ForgotPasswordValues>({
        resolver: zodResolver(ForgotPasswordSchema),
        defaultValues: { email: "" },
    });
}
