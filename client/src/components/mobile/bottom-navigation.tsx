import { Link } from "wouter";
import { Home, BookOpen, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomNavItem {
  icon: LucideIcon;
  label: string;
  href: string;
}

interface BottomNavigationProps {
  items?: BottomNavItem[];
  currentPath?: string;
}

const defaultPatientItems: BottomNavItem[] = [
  { icon: Home, label: "Início", href: "/dashboard" },
  { icon: BookOpen, label: "Diário", href: "/diary" },
  { icon: User, label: "Perfil", href: "/profile" },
];

export function BottomNavigation({ items = defaultPatientItems, currentPath = "" }: BottomNavigationProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-around items-center h-[72px] px-2 z-50 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.05)] md:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          currentPath === item.href ||
          (item.href !== "/dashboard" && currentPath.startsWith(item.href));

        return (
          <Link key={item.href} href={item.href}>
            <a className="flex flex-col items-center justify-center w-full h-full gap-1 pt-1">
              <div
                className={cn(
                  "p-2 rounded-xl transition-all duration-200",
                  isActive ? "bg-[#4E9F87]/10 text-[#4E9F87]" : "text-gray-400",
                )}
              >
                <Icon className={cn("w-6 h-6", isActive ? "text-[#4E9F87]" : "text-gray-400")} />
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium transition-colors",
                  isActive ? "text-[#4E9F87]" : "text-gray-400",
                )}
              >
                {item.label}
              </span>
            </a>
          </Link>
        );
      })}
    </nav>
  );
}

export default BottomNavigation;
