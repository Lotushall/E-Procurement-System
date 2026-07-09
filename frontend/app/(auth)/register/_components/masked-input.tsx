import { Input } from "@/components/ui/input";
import { Control, Controller } from "react-hook-form";
import { RegisterValues } from "../_schemas/schema";

export const MaskedInput = ({
    control,
    name,
    format,
    ...inputProps
}: {
    control: Control<RegisterValues>;
    name: "taxId" | "idCard" | "phone";
    format: (value: string) => string;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "name">) => (
    <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange, ...field } }) => (
            <Input
                {...field}
                {...inputProps}
                value={typeof value === "string" ? value : ""}
                onChange={(e) => onChange(format(e.target.value))}
            />
        )}
    />
)
