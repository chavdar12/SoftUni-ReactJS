import {type FieldValues, type Path, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import type {z} from 'zod';

/** react-hook-form validated by `schema`; `field(name)` spreads straight onto an MUI TextField. */
export default function useZodForm<In extends FieldValues, Out extends FieldValues>(schema: z.ZodType<Out, In>) {
    const form = useForm<In, unknown, Out>({resolver: zodResolver(schema)});

    const field = (name: Path<In>, options?: Parameters<typeof form.register>[1]) => {
        const {ref, ...rest} = form.register(name, options);
        const error = form.formState.errors[name]?.message as string | undefined;
        return {...rest, inputRef: ref, error: !!error, helperText: error};
    };

    return {...form, field};
}
