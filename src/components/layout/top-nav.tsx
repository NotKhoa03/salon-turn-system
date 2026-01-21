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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CalendarIcon, ChevronDown, Settings, LogOut } from "lucide-react";
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
    <header className="border-b bg-white">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left: Logo */}
        <div className="flex items-center gap-2">
          <Link href="/" className="font-bold text-xl text-zinc-900">
            Nail Salon POS
          </Link>
        </div>

        {/* Center: Date Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="min-w-[240px] justify-center text-lg font-semibold"
            >
              <CalendarIcon className="mr-2 h-5 w-5" />
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && onDateChange(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        {/* Right: Admin Link & User Menu */}
        <div className="flex items-center gap-4">
          {isAdmin && (
            <Button variant="ghost" asChild>
              <Link href="/admin">
                <Settings className="mr-2 h-4 w-4" />
                Admin
              </Link>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-zinc-200 text-zinc-700">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline">{profile?.full_name}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={signOut} className="text-red-600">
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
