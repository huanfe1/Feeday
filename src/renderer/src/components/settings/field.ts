type CommonField = {
    id: string;
    title: string;
    description?: string;
};

export type SwitchField = CommonField & {
    type: 'switch';
    value?: boolean;
};

export type InputField = CommonField & {
    type: 'input';
    value?: string;
    placeholder?: string;
};

export type SelectField = CommonField & {
    type: 'select';
    value?: string;
    onValueChange?: (value: string) => void;
    placeholder?: string;
    options: {
        label: string;
        value: string;
    }[];
};

export type SettingsField = SwitchField | InputField | SelectField;
