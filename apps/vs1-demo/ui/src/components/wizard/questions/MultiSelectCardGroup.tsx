import { OptionCard } from "../../ui/OptionCard";

interface Option {
    value: string;
    label: string;
    description?: string;
    icon?: string;
}

interface MultiSelectCardGroupProps {
    options: Option[];
    value: string[];
    onChange: (value: string[]) => void;
}

export function MultiSelectCardGroup({ options, value, onChange }: MultiSelectCardGroupProps) {
    const handleSelect = (val: string) => {
        if (value.includes(val)) {
            onChange(value.filter(v => v !== val));
        } else {
            onChange([...value, val]);
        }
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {options.map(opt => (
                <OptionCard
                    key={opt.value}
                    type="checkbox"
                    title={opt.label}
                    description={opt.description}
                    icon={
                        opt.icon ? (
                            <span className="material-symbols-outlined">
                                {opt.icon}
                            </span>
                        ) : undefined
                    }
                    selected={value.includes(opt.value)}
                    onSelect={() => handleSelect(opt.value)}
                />
            ))}
        </div>
    );
}
