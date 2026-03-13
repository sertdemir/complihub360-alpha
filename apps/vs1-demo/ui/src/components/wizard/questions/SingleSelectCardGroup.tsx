import { OptionCard } from "../../ui/OptionCard";

interface Option {
    value: string;
    label: string;
    description?: string;
    icon?: string;
}

interface SingleSelectCardGroupProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
}

export function SingleSelectCardGroup({ options, value, onChange }: SingleSelectCardGroupProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {options.map(opt => (
                    <OptionCard
                        key={opt.value}
                        type="radio"
                        title={opt.label}
                        description={opt.description}
                        icon={
                        opt.icon ? (
                            <span className="material-symbols-outlined">
                                {opt.icon}
                            </span>
                        ) : undefined
                    }
                    selected={value === opt.value}
                    onSelect={() => onChange(opt.value)}
                />
            ))}
        </div>
    );
}
