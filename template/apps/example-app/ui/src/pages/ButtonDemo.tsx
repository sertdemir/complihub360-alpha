import { BaseButton } from "../components/primitives/BaseButton";

export default function ButtonDemo() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Button</h1>
                <p className="mt-1 text-white/60">
                    Erste Basis-Komponente mit Varianten.
                </p>
            </div>

            <div className="flex flex-wrap gap-3">
                <BaseButton>Primary</BaseButton>
                <BaseButton variant="secondary">Secondary</BaseButton>
                <BaseButton variant="ghost">Ghost</BaseButton>
                <BaseButton disabled>Disabled</BaseButton>
            </div>
        </div>
    );
}