import { Text } from "react-native";

type StatusChipProps = {
    label: string;
    toneClassName: string;
    compact?: boolean;
};

export function StatusChip({ label, toneClassName, compact = false }: StatusChipProps) {
    return (
        <Text
            numberOfLines={2}
            className={`max-w-full overflow-hidden rounded-full px-3 ${compact ? "py-1.5 text-[11px]" : "py-2 text-[11px]"} font-bold leading-4 ${toneClassName}`}
        >
            {label}
        </Text>
    );
}

type MutedPillProps = {
    label: string;
};

export function MutedPill({ label }: MutedPillProps) {
    return (
        <Text numberOfLines={2} className="max-w-full overflow-hidden rounded-full bg-muted px-3 py-1.5 text-[11px] font-bold leading-4 text-muted-foreground">
            {label}
        </Text>
    );
}
