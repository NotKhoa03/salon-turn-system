"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarIcon, ChevronDown, Settings, LogOut, Scissors } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";

interface TopNavProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

export function TopNav({ selectedDate, onDateChange }: TopNavProps) {
  const { profile, signOut, isAdmin } = useAuth();

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  return (
    <header className="border-b border-[#e8e4df] bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="flex h-16 items-center justify-between px-6 lg:px-8">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#b76e79] to-[#d4a5ab] flex items-center justify-center shadow-lg shadow-[#b76e79]/20 group-hover:shadow-[#b76e79]/30 transition-shadow">
            <Scissors className="w-5 h-5 text-white" />
          </div>
          <div className="hidden sm:block">
            <div className="font-semibold text-lg text-[#2d2d2d]" style={{ fontFamily: 'var(--font-cormorant), serif' }}>
              Salon POS
            </div>
            <div className="text-xs text-[#6b6b6b] -mt-0.5">Turn Management</div>
          </div>
        </Link>

        {/* Center: Date Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="min-w-[200px] lg:min-w-[280px] justify-center h-11 rounded-xl border-[#e8e4df] bg-white hover:bg-[#f7e7ce]/30 hover:border-[#b76e79]/30 transition-all"
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-[#b76e79]" />
              <span className="font-medium text-[#2d2d2d]" style={{ fontFamily: 'var(--font-cormorant), serif' }}>
                {format(selectedDate, "EEEE, MMMM d")}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 text-[#6b6b6b]" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 rounded-xl border-[#e8e4df] shadow-salon-lg" align="center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && onDateChange(date)}
              initialFocus
              className="rounded-xl"
            />
          </PopoverContent>
        </Popover>

        {/* Right: Admin Link & User Menu */}
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Button
              variant="ghost"
              className="hidden sm:flex rounded-xl text-[#6b6b6b] hover:text-[#b76e79] hover:bg-[#f7e7ce]/30"
              asChild
            >
              <Link href="/admin">
                <Settings className="mr-2 h-4 w-4" />
                Admin
              </Link>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 rounded-xl hover:bg-[#f7e7ce]/30"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#b76e79] to-[#d4a5ab] flex items-center justify-center text-white text-sm font-medium">
                  {initials}
                </div>
                <span className="hidden sm:inline text-[#2d2d2d] font-medium">
                  {profile?.full_name?.split(' ')[0]}
                </span>
                <ChevronDown className="h-4 w-4 text-[#6b6b6b]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl border-[#e8e4df] shadow-salon-lg">
              {isAdmin && (
                <DropdownMenuItem asChild className="rounded-lg sm:hidden">
                  <Link href="/admin" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    Admin Panel
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={signOut}
                className="rounded-lg text-red-500 focus:text-red-600 focus:bg-red-50"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
