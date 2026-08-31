import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface CharacterAvatarProps {
    src?: string | null;
    name: string;
    size?: "sm" | "md" | "lg" | "xl";
    className?: string;
}

export function CharacterAvatar({ src, name, size = "md", className }: CharacterAvatarProps) {
    const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    const sizeClasses = {
        sm: "h-8 w-8 text-xs",
        md: "h-10 w-10 text-sm",
        lg: "h-12 w-12 text-base",
        xl: "h-16 w-16 text-lg",
    };

    return (
        <Avatar className={cn(sizeClasses[size], className)}>
            <AvatarImage src={src || undefined} alt={name} />
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                {initials || "C"}
            </AvatarFallback>
        </Avatar>
    );
}
