import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AddContactSchema, AddContactValues } from "../_schemas/schema";

export function useAddContactForm(onSubmitted: () => void) {
  const form = useForm<AddContactValues>({
    resolver: zodResolver(AddContactSchema),
    defaultValues: {
      contactName: "",
      contactPosition: "",
      contactPhone: "",
      contactEmail: "",
      lineId: "",
      otherContact: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    console.log(values);
    form.reset();
    onSubmitted();
  });

  return { ...form, onSubmit };
}
