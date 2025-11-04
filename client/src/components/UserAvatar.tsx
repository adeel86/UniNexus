import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@shared/schema";

interface UserAvatarProps {
  user: Pick<User, "firstName" | "lastName" | "profileImageUrl">;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function UserAvatar({ user, size = "md", className = "" }: UserAvatarProps) {
  const sizeClasses = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  const getInitials = () => {
    const first = user.firstName?.charAt(0) || "";
    const last = user.lastName?.charAt(0) || "";
    return (first + last).toUpperCase() || "U";
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      <AvatarImage 
        src={user.profileImageUrl || undefined} 
        alt={`${user.firstName} ${user.lastName}`}
        className="object-cover"
      />
      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold">
        {getInitials()}
      </AvatarFallback>
    </Avatar>
  );
}
