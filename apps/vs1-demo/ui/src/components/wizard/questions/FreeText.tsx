import { useState } from "react";
import { Typography } from "../../ui/Typography";

interface FreeTextProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    maxLength?: number;
    label?: string;
    description?: string;
}

export function FreeText({
    value,
    onChange,
    placeholder = "Add any additional details...",
    maxLength = 500,
    label,
    description,
}: FreeTextProps) {
    const [focused, setFocused] = useState(false);
    const remaining = maxLength - value.length;

    return (
        <div className="flex flex-col gap-2">
            {(label || description) && (
                <div className="flex flex-col gap-1">
                    {label && <Typography variant="body" weight="semibold">{label}</Typography>}
                    {description && <Typography variant="ui-small" className="text-neutral-600">{description}</Typography>}
                </div>
            )}
            <div className={`relative rounded-md border transition-all duration-200 ${
                focused ? "border-primary-500 ring-1 ring-primary-500" : "border-neutral-300"
            } bg-white`}>
                <textarea
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    rows={4}
                    className="w-full bg-transparent text-neutral-900 text-sm placeholder-neutral-500 rounded-md p-4 resize-none focus:outline-none leading-relaxed"
                />
                <div className="absolute bottom-3 right-3 text-[12px] text-neutral-500">
                    {remaining}/{maxLength}
                </div>
            </div>
        </div>
    );
}
