import { ChevronDownIcon } from 'lucide-react';
import { motion } from 'motion/react';
import * as React from 'react';

import { cn } from '@/lib/utils';

type AccordionContextType = {
    value: string[];
    toggleValue: (itemValue: string) => void;
    type: 'single' | 'multiple';
};

const AccordionContext = React.createContext<AccordionContextType | null>(null);

type AccordionProps = {
    type?: 'single' | 'multiple';
    value?: string[];
    defaultValue?: string[];
    onValueChange?: (value: string[]) => void;
    className?: string;
    children: React.ReactNode;
};

function Accordion({ type = 'single', value, defaultValue = [], onValueChange, className, children }: AccordionProps) {
    const [internalValue, setInternalValue] = React.useState<string[]>(defaultValue);
    const controlled = value !== undefined;
    const currentValue = controlled ? value : internalValue;

    const handleValueChange = React.useCallback(
        (newValue: string[]) => {
            if (!controlled) {
                setInternalValue(newValue);
            }
            onValueChange?.(newValue);
        },
        [controlled, onValueChange],
    );

    const toggleValue = React.useCallback(
        (itemValue: string) => {
            if (type === 'single') {
                handleValueChange(currentValue.includes(itemValue) ? [] : [itemValue]);
            } else {
                handleValueChange(currentValue.includes(itemValue) ? currentValue.filter(v => v !== itemValue) : [...currentValue, itemValue]);
            }
        },
        [type, currentValue, handleValueChange],
    );

    return (
        <AccordionContext.Provider value={{ value: currentValue, toggleValue, type }}>
            <div className={className} data-slot="accordion">
                {children}
            </div>
        </AccordionContext.Provider>
    );
}

type AccordionItemProps = {
    value: string;
    className?: string;
    children: React.ReactNode;
};

function AccordionItem({ value, className, children }: AccordionItemProps) {
    return (
        <div className={cn('border-b last:border-b-0', className)} data-slot="accordion-item">
            {React.Children.map(children, child => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child, { value } as { value: string });
                }
                return child;
            })}
        </div>
    );
}

type AccordionTriggerProps = {
    value?: string;
    className?: string;
    children: React.ReactNode;
};

function AccordionTrigger({ value, className, children }: AccordionTriggerProps) {
    const context = React.useContext(AccordionContext);
    if (!context) throw new Error('AccordionTrigger must be used within Accordion');

    const isOpen = context.value.includes(value || '');

    const handleClick = () => {
        if (value) {
            context.toggleValue(value);
        }
    };

    return (
        <button
            className={cn(
                'focus-visible:border-ring focus-visible:ring-ring/50 flex w-full flex-1 items-center gap-2 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50',
                className,
            )}
            data-slot="accordion-trigger"
            type="button"
            onClick={handleClick}
        >
            <motion.div
                className="pointer-events-none flex shrink-0 items-center justify-center"
                animate={{ rotate: isOpen ? 0 : -90 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
                <ChevronDownIcon className="size-4 translate-y-0.5" />
            </motion.div>
            {children}
        </button>
    );
}

type AccordionContentProps = {
    value?: string;
    className?: string;
    children: React.ReactNode;
};

function AccordionContent({ value, className, children }: AccordionContentProps) {
    const context = React.useContext(AccordionContext);
    if (!context) throw new Error('AccordionContent must be used within Accordion');

    const isOpen = context.value.includes(value || '');
    const contentRef = React.useRef<HTMLDivElement>(null);
    const [height, setHeight] = React.useState(0);

    React.useEffect(() => {
        if (contentRef.current) {
            if (isOpen) {
                // 测量内容高度
                const measuredHeight = contentRef.current.scrollHeight;
                setHeight(measuredHeight);
            } else {
                setHeight(0);
            }
        }
    }, [isOpen, children]);

    return (
        <motion.div
            className="text-sm"
            data-slot="accordion-content"
            initial={false}
            animate={{
                height: height,
                opacity: isOpen ? 1 : 0,
            }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
        >
            <div className={cn('pt-0 pb-4', className)} ref={contentRef}>
                {children}
            </div>
        </motion.div>
    );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
