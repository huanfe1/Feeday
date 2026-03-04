import type { SettingsSchema } from '@shared/types/settings';
import { useEffect, useState } from 'react';

import Switch from '@/components/switch';
import { Button } from '@/components/ui/button';
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CommonField {
    id: keyof SettingsSchema;
    title: string;
    description?: string;
}

interface SwitchField extends CommonField {
    type: 'switch';
    value?: number | string;
}

interface InputField extends CommonField {
    type: 'input';
    placeholder?: string;
}

interface SelectField extends CommonField {
    type: 'select';
    placeholder?: string;
    options: {
        label: string;
        value: string;
    }[];
}

interface ButtonField extends Omit<CommonField, 'id'> {
    id?: string;
    type: 'button';
    onClick: () => void;
    label: string | React.ReactNode;
}

export type SettingsFieldType = SwitchField | InputField | SelectField | ButtonField;

function InputField({ field }: { field: InputField }) {
    const [value, setValue] = useState<string>('');
    useEffect(() => {
        window.electron.ipcRenderer.invoke('settings-get', field.id).then(value => {
            setValue(value.toString());
        });
    }, [field.id]);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        window.electron.ipcRenderer.invoke('settings-update', field.id, newValue as SettingsSchema[typeof field.id]);
        setValue(newValue);
    };
    return (
        <Field orientation="horizontal">
            <FieldContent>
                <FieldLabel htmlFor={field.id}>{field.title}</FieldLabel>
                <FieldDescription>{field.description}</FieldDescription>
            </FieldContent>
            <Input className="w-80" id={field.id} onChange={handleChange} placeholder={field.placeholder} type="text" value={value} />
        </Field>
    );
}

function SelectField({ field }: { field: SelectField }) {
    const [value, setValue] = useState<string>('');

    useEffect(() => {
        window.electron.ipcRenderer.invoke('settings-get', field.id).then(value => {
            setValue(value.toString());
        });
    }, [field.id]);

    const handleValueChange = (value: string) => {
        setValue(value);
        window.electron.ipcRenderer.invoke('settings-update', field.id, value as SettingsSchema[typeof field.id]);
    };
    return (
        <Field orientation="horizontal">
            <FieldContent>
                <FieldLabel htmlFor={field.id}>{field.title}</FieldLabel>
                <FieldDescription>{field.description}</FieldDescription>
            </FieldContent>
            <Select onValueChange={handleValueChange} value={value}>
                <SelectTrigger className="w-full max-w-48">
                    <SelectValue placeholder={field.placeholder} />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {field.options.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </Field>
    );
}

function SwitchField({ field }: { field: SwitchField }) {
    const [value, setValue] = useState<boolean>(false);

    useEffect(() => {
        window.electron.ipcRenderer.invoke('settings-get', field.id).then(value => {
            setValue(!!value);
        });
    }, [field.id]);

    const handleValueChange = (value: boolean) => {
        setValue(value);
        window.electron.ipcRenderer.invoke('settings-update', field.id, value as SettingsSchema[typeof field.id]);
    };
    return (
        <Field orientation="horizontal">
            <FieldContent>
                <FieldLabel htmlFor={field.id}>{field.title}</FieldLabel>
                <FieldDescription>{field.description}</FieldDescription>
            </FieldContent>
            <Switch defaultChecked={!!value} onCheckedChange={handleValueChange} />
        </Field>
    );
}

function ButtonField({ field }: { field: ButtonField }) {
    const handleClick = () => {
        field.onClick();
    };
    return (
        <Field orientation="horizontal">
            <FieldContent>
                <FieldLabel htmlFor={field.id}>{field.title}</FieldLabel>
                <FieldDescription>{field.description}</FieldDescription>
            </FieldContent>
            {typeof field.label === 'string' ? (
                <Button onClick={handleClick} variant="outline">
                    {field.label}
                </Button>
            ) : (
                field.label
            )}
        </Field>
    );
}

export function SettingsField({ fields }: { fields: SettingsFieldType[] }) {
    return (
        <FieldGroup className="p-6">
            {fields.map(field => {
                if (field.type === 'input') {
                    return <InputField field={field} key={field.id} />;
                }
                if (field.type === 'select') {
                    return <SelectField field={field} key={field.id} />;
                }
                if (field.type === 'switch') {
                    return <SwitchField field={field} key={field.id} />;
                }
                if (field.type === 'button') {
                    return <ButtonField field={field} key={field.id} />;
                }
                return null;
            })}
        </FieldGroup>
    );
}
