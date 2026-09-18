"use client";
import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";

export default function UserButton() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!user) return null;

  const initials = (user.displayName || user.email || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleSignOut = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-10 h-10 rounded-full ring-2 ring-[#e5d5c8] hover:ring-[#4a6b5b] transition-all overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#2d5f5f] to-[#4a6b5b] text-white text-sm font-medium"
      >
        {user.photoURL ? (
          <img
            src={user.photoURL}
            alt="avatar"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          initials
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-lg border-2 border-[#e5d5c8]/50 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-[#f0e6db]">
            <p className="text-sm font-medium text-[#1a4d4d] truncate">
              {user.displayName || "User"}
            </p>
            <p className="text-xs text-[#6b7280] truncate">{user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-[#4b5563] hover:bg-[#f5ebe0] hover:text-[#2d5f5f] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
