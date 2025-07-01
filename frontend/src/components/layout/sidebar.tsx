"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  FileText,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Settings,
  Menu,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavigationItem {
  href: string;
  icon: React.ElementType;
  label: string;
}

const navigationItems: NavigationItem[] = [
  {
    href: "/projects",
    icon: LayoutDashboard,
    label: "Dashboard",
  },
  {
    href: "/applications",
    icon: FileText,
    label: "Applications",
  },
  {
    href: "/settings",
    icon: Settings,
    label: "Settings",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 bg-[#faf9fb] p-0">
        <SheetHeader className="p-4 border-b border-[#e1dfeb]">
          <div className="flex items-center gap-2">
            <div className="bg-[#1e13f8] rounded size-8 flex items-center justify-center">
              <div className="text-white font-bold text-sm">G</div>
            </div>
            <h2 className="text-lg font-semibold">GrantFlow</h2>
          </div>
        </SheetHeader>
        <div className="flex flex-col justify-between h-full">
          <nav className="flex flex-col gap-2 p-4">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  href={item.href}
                  key={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[#e1dfeb] text-[#1e13f8]"
                      : "text-[#636170] hover:bg-[#e1dfeb] hover:text-[#2e2d36]"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-[#e1dfeb]">
            <div className="flex flex-col gap-2">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-[#636170] hover:bg-[#e1dfeb] hover:text-[#2e2d36]"
              >
                <HelpCircle className="h-5 w-5" />
                Help
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-[#636170] hover:bg-[#e1dfeb] hover:text-[#2e2d36]"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}