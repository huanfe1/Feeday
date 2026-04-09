import type { SettingsSchema } from '@shared/types/settings';
import { useEffect, useMemo, useState } from 'react';

import Switch from '@/components/switch';
import { Button } from '@/components/ui/button';
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type KeysByType<TValue> = {
    [K in keyof SettingsSchema]-?: SettingsSchema[K] extends TValue ? K : never;
}[keyof SettingsSchema];

type StorageTarget<TValue> =
    | {
          type: 'db';
          key: KeysByType<TValue>;
          fallback?: TValue;
      }
    | {
          type: 'localStorage';
          key: string;
          fallback?: TValue;
          serialize?: (value: TValue) => string;
          deserialize?: (raw: string | null) => TValue | undefined;
      };

type ChangeContext = {
    schema: SettingsFieldType[];
};

interface BaseSettingField<TType extends string, TValue> {
    id: string;
    type: TType;
    title: string;
    description?: string;
    disabled?: boolean;
    storage: StorageTarget<TValue>;
    onValueChange?: (value: TValue, context: ChangeContext) => void | Promise<void>;
}

export interface InputSettingField extends BaseSettingField<'input', string> {
    placeholder?: string;
}

export interface TextareaSettingField extends BaseSettingField<'textarea', string> {
    placeholder?: string;
    rows?: number;
}

export interface SwitchSettingField extends BaseSettingField<'switch', boolean> {}

export interface SelectSettingField extends BaseSettingField<'select', string> {
    placeholder?: string;
    options: Array<{
        label: string;
        value: string;
    }>;
}

export interface ButtonSettingField {
    id: string;
    type: 'button';
    title: string;
    description?: string;
    label: React.ReactNode;
    variant?: React.ComponentProps<typeof Button>['variant'];
    disabled?: boolean;
    onClick: () => void | Promise<void>;
}

export type SettingsFieldType = InputSettingField | TextareaSettingField | SwitchSettingField | SelectSettingField | ButtonSettingField;
type ValueSettingField = InputSettingField | TextareaSettingField | SwitchSettingField | SelectSettingField;

type FieldValueMap = Record<string, string | boolean | undefined>;

function safeReadLocalStorage<TValue>(storage: Extract<StorageTarget<TValue>, { type: 'localStorage' }>): TValue | undefined {
    try {
        if (storage.deserialize) {
            return storage.deserialize(localStorage.getItem(storage.key));
        }

        const raw = localStorage.getItem(storage.key);
        if (raw == null) {
            return undefined;
        }

        try {
            return JSON.parse(raw) as TValue;
        } catch {
            return raw as TValue;
        }
    } catch {
        return undefined;
    }
}

function safeWriteLocalStorage<TValue>(storage: Extract<StorageTarget<TValue>, { type: 'localStorage' }>, value: TValue): void {
    try {
        const serialized = storage.serialize ? storage.serialize(value) : JSON.stringify(value);
        localStorage.setItem(storage.key, serialized);
    } catch {
        // Ignore localStorage write errors (private mode/quota exceeded).
    }
}

async function readStorageValue<TValue>(storage: StorageTarget<TValue>): Promise<TValue | undefined> {
    if (storage.type === 'db') {
        const data = await window.electron.ipcRenderer.invoke('settings-get', storage.key);
        return (data as TValue | undefined) ?? storage.fallback;
    }

    const localValue = safeReadLocalStorage(storage);
    return localValue ?? storage.fallback;
}

async function writeStorageValue<TValue>(storage: StorageTarget<TValue>, value: TValue): Promise<void> {
    if (storage.type === 'db') {
        await window.electron.ipcRenderer.invoke('settings-update', storage.key, value as SettingsSchema[typeof storage.key]);
        return;
    }

    safeWriteLocalStorage(storage, value);
}

function hasStorageField(field: SettingsFieldType): field is ValueSettingField {
    return field.type !== 'button';
}

export function SettingsField({ fields }: { fields: SettingsFieldType[] }) {
    const [values, setValues] = useState<FieldValueMap>({});
    const schemaContext = useMemo<ChangeContext>(() => ({ schema: fields }), [fields]);

    useEffect(() => {
        let active = true;

        async function loadValues() {
            const entries = await Promise.all(
                fields.filter(hasStorageField).map(async field => {
                    const value = field.type === 'switch' ? await readStorageValue<boolean>(field.storage) : await readStorageValue<string>(field.storage);
                    return [field.id, value] as const;
                }),
            );

            if (!active) return;
            setValues(Object.fromEntries(entries));
        }

        void loadValues();
        return () => {
            active = false;
        };
    }, [fields]);

    async function updateValue(field: ValueSettingField, value: string | boolean) {
        setValues(prev => ({ ...prev, [field.id]: value }));

        if (field.type === 'switch') {
            const normalized = Boolean(value);
            await writeStorageValue<boolean>(field.storage, normalized);
            await field.onValueChange?.(normalized, schemaContext);
            return;
        }

        const normalized = String(value);
        await writeStorageValue<string>(field.storage, normalized);
        await field.onValueChange?.(normalized, schemaContext);
    }

    return (
        <FieldGroup className="p-6">
            {fields.map(field => {
                if (field.type === 'button') {
                    return (
                        <Field key={field.id} orientation="horizontal">
                            <FieldContent>
                                <FieldLabel>{field.title}</FieldLabel>
                                {field.description ? <FieldDescription>{field.description}</FieldDescription> : null}
                            </FieldContent>
                            <Button disabled={field.disabled} onClick={() => void field.onClick()} variant={field.variant ?? 'outline'}>
                                {field.label}
                            </Button>
                        </Field>
                    );
                }

                if (field.type === 'input') {
                    const value = typeof values[field.id] === 'string' ? (values[field.id] as string) : '';
                    return (
                        <Field key={field.id} orientation="horizontal">
                            <FieldContent>
                                <FieldLabel htmlFor={field.id}>{field.title}</FieldLabel>
                                {field.description ? <FieldDescription>{field.description}</FieldDescription> : null}
                            </FieldContent>
                            <Input
                                className="w-80"
                                id={field.id}
                                disabled={field.disabled}
                                onChange={event => void updateValue(field, event.target.value)}
                                placeholder={field.placeholder}
                                type="text"
                                value={value}
                            />
                        </Field>
                    );
                }

                if (field.type === 'textarea') {
                    const value = typeof values[field.id] === 'string' ? (values[field.id] as string) : '';
                    return (
                        <Field key={field.id} orientation="horizontal">
                            <FieldContent>
                                <FieldLabel htmlFor={field.id}>{field.title}</FieldLabel>
                                {field.description ? <FieldDescription>{field.description}</FieldDescription> : null}
                            </FieldContent>
                            <Textarea
                                className="w-80 resize-y"
                                id={field.id}
                                disabled={field.disabled}
                                onChange={event => void updateValue(field, event.target.value)}
                                placeholder={field.placeholder}
                                rows={field.rows ?? 3}
                                value={value}
                            />
                        </Field>
                    );
                }

                if (field.type === 'select') {
                    const value = typeof values[field.id] === 'string' ? (values[field.id] as string) : '';
                    return (
                        <Field key={field.id} orientation="horizontal">
                            <FieldContent>
                                <FieldLabel htmlFor={field.id}>{field.title}</FieldLabel>
                                {field.description ? <FieldDescription>{field.description}</FieldDescription> : null}
                            </FieldContent>
                            <Select disabled={field.disabled} onValueChange={next => void updateValue(field, next)} value={value}>
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

                const checked = Boolean(values[field.id]);
                return (
                    <Field key={field.id} orientation="horizontal">
                        <FieldContent>
                            <FieldLabel htmlFor={field.id}>{field.title}</FieldLabel>
                            {field.description ? <FieldDescription>{field.description}</FieldDescription> : null}
                        </FieldContent>
                        <Switch defaultChecked={checked} key={`${field.id}-${checked ? '1' : '0'}`} onCheckedChange={next => void updateValue(field, next)} />
                    </Field>
                );
            })}
        </FieldGroup>
    );
}
