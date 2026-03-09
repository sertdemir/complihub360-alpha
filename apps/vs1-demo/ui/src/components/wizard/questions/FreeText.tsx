import { useState } from "react";

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
                <div>
                    {label && <p className="text-sm font-semibold text-slate-200">{label}</p>}
                    {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
                </div>
            )}
            <div className={`relative rounded-xl border transition-all duration-200 ${
                focused ? "border-[#137fec] shadow-sm shadow-[#137fec]/10" : "border-slate-700"
            } bg-slate-900`}>
                <textarea
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    placeholder={placeholder}
                    maxLength={maxLength}
                    rows={4}
                    className="w-full bg-transparent text-slate-300 text-sm placeholder-slate-600 rounded-xl p-4 resize-none focus:outline-none leading-relaxed"
                />
                <div className="absolute bottom-3 right-3 text-[10px] text-slate-600">
                    {remaining}/{maxLength}
                </div>
            </div>
        </div>
    );
}
