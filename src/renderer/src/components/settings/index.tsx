import { useState } from 'react';

import Switch from '@/components/switch';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import type { InputField, SelectField, SettingsField, SwitchField } from './field';

export default function Settings() {
    const [modalVisible, setModalVisible] = useState(false);

    const closeModal = () => {
        setModalVisible(false);
    };

    const fields = [
        {
            type: 'select',
            id: 'language',
            description: '设置界面显示语言。',
            title: '语言',
            value: 'zh-CN',
            options: [
                {
                    label: '中文',
                    value: 'zh-CN',
                },
                {
                    label: '英文',
                    value: 'en-US',
                },
            ],
        },
        {
            type: 'input',
            id: 'avatarProxy',
            title: '头像代理地址',
            description: '设置头像代理地址，避免头像无法显示。',
            placeholder: 'https://unavatar.webp.se/${url}',
        },
        {
            type: 'input',
            id: 'rsshubSource',
            title: 'RSSHub 源地址',
            description: '设置 RSSHub 源地址，避免无法获取 RSS 源。',
            placeholder: 'https://rsshub.app',
        },
        {
            type: 'switch',
            id: 'autoRefreshSource',
            title: '自动刷新订阅源',
            description: '自动刷新订阅源，每隔一段时间自动刷新订阅源，避免订阅源过期。',
        },
    ] satisfies SettingsField[];

    const renderFields = fields.map(field => {
        if (field.type === 'input') {
            return <SettingInput field={field} key={field.id} />;
        }
        if (field.type === 'switch') {
            return <SettingSwitch field={field} key={field.id} />;
        }
        if (field.type === 'select') {
            return <SettingSelect field={field} key={field.id} />;
        }
        return null;
    });

    return (
        <Dialog onOpenChange={setModalVisible} open={modalVisible}>
            <Tooltip>
                <DialogTrigger asChild>
                    <Button size="icon" variant="ghost">
                        <TooltipTrigger asChild>
                            <i className="i-mingcute-settings-3-fill text-lg opacity-75"></i>
                        </TooltipTrigger>
                    </Button>
                </DialogTrigger>
                <TooltipContent sideOffset={10}>
                    <p>设置</p>
                </TooltipContent>
            </Tooltip>
            <DialogContent className="min-h-[70vh] max-w-none px-0 sm:w-225 sm:max-w-none" onCloseAutoFocus={closeModal}>
                <div>
                    <DialogHeader className="px-6">
                        <DialogTitle>设置</DialogTitle>
                        <DialogDescription>管理您的文件夹和订阅源设置</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="flex-1">
                        <FieldGroup className="mt-4 px-6">{renderFields}</FieldGroup>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}

function SettingInput({ field }: { field: InputField }) {
    return (
        <Field orientation="horizontal">
            <FieldContent>
                <FieldLabel htmlFor="avatarProxy">{field.title}</FieldLabel>
                <FieldDescription>{field.description}</FieldDescription>
            </FieldContent>
            <Input className="w-80" id={field.id} placeholder={field.placeholder} type="text" />
        </Field>
    );
}

function SettingSwitch({ field }: { field: SwitchField }) {
    return (
        <Field orientation="horizontal">
            <FieldContent>
                <FieldLabel htmlFor={field.id}>{field.title}</FieldLabel>
                <FieldDescription>{field.description}</FieldDescription>
            </FieldContent>
            <Switch />
        </Field>
    );
}

function SettingSelect({ field }: { field: SelectField }) {
    const [value, setValue] = useState(field.value);

    const handleValueChange = (value: string) => {
        setValue(value);
        field.onValueChange?.(value);
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
