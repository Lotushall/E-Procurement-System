import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { LoginSchema, LoginValues } from "../_schemas/schema";

export function useLoginForm() {
    return useForm<LoginValues>({
        resolver: zodResolver(LoginSchema),
        defaultValues: {
            identifier: "",
            password: "",
            remember: false,
        },
    });
}
