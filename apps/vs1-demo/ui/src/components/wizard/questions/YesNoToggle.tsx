import { OptionCard } from "../../ui/OptionCard";
import { Typography } from "../../ui/Typography";

interface YesNoToggleProps {
    value: "yes" | "no" | "";
    onChange: (value: "yes" | "no") => void;
    label?: string;
    description?: string;
}

export function YesNoToggle({ value, onChange, label, description }: YesNoToggleProps) {
    return (
        <div className="flex flex-col gap-4">
            {(label || description) && (
                <div className="flex flex-col gap-1">
                    {label && <Typography variant="body" weight="semibold">{label}</Typography>}
                    {description && <Typography variant="ui-small" className="text-neutral-600">{description}</Typography>}
                </div>
            )}
            <div className="grid grid-cols-2 gap-4">
                <OptionCard
                    type="radio"
                    title="Yes"
                    icon={<span className="material-symbols-outlined text-emerald-500">check_circle</span>}
                    selected={value === "yes"}
                    onSelect={() => onChange("yes")}
                />
                <OptionCard
                    type="radio"
                    title="No"
                    icon={<span className="material-symbols-outlined text-rose-500">cancel</span>}
                    selected={value === "no"}
                    onSelect={() => onChange("no")}
                />
            </div>
        </div>
    );
}
