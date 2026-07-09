import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { RegisterSchema, RegisterValues } from "../_schemas/schema";

export function useRegisterForm() {
    const form = useForm<RegisterValues>({
        resolver: zodResolver(RegisterSchema),
        defaultValues: {
            vendorType: "company",
            companyName: "",
            taxId: "",
            fullName: "",
            idCard: "",
            phone: "",
            username: "",
            email: "",
            password: "",
            confirmPassword: "",
            terms: false,
        },
    });

    const vendorType = useWatch({ control: form.control, name: "vendorType" });
    const termsAccepted = useWatch({ control: form.control, name: "terms" });

    return { ...form, vendorType, termsAccepted };
}
