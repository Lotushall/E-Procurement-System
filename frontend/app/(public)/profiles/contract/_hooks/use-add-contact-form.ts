import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AddContactSchema, AddContactValues } from "../_schemas/schema";

export function useAddContactForm(onSubmitted: () => void, initialValues?: AddContactValues) {
  const form = useForm<AddContactValues>({
    resolver: zodResolver(AddContactSchema),
    defaultValues: initialValues ?? {
      contactName: "",
      contactPosition: "",
      contactPhone: "",
      contactEmail: "",
      lineId: "",
      otherContact: "",
      isMainContact: false,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    console.log(values);
    form.reset();
    onSubmitted();
  });

  return { ...form, onSubmit };
}
