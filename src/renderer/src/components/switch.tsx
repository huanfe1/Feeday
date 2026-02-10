import { motion } from 'motion/react';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

type SwitchProps = {
    disabled?: boolean;
    defaultChecked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
};

export default function Switch({ disabled = false, defaultChecked = false, onCheckedChange }: SwitchProps) {
    const [checked, setChecked] = useState(defaultChecked);

    const handleClick = () => {
        setChecked(!checked);
        onCheckedChange?.(!checked);
    };

    return (
        <button
            className={cn('flex h-6 w-12 items-center rounded-full px-1 transition-colors duration-200', checked ? 'bg-primary justify-end' : 'bg-input justify-start', {
                'opacity-50': disabled,
            })}
            data-disabled={disabled}
            disabled={disabled}
            onClick={handleClick}
        >
            <motion.div
                className="bg-background size-4 rounded-full"
                layout
                transition={{
                    type: 'spring',
                    visualDuration: 0.2,
                    bounce: 0.2,
                }}
            />
        </button>
    );
}
