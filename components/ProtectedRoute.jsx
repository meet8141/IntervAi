"use client";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Client-side route protection wrapper.
 * Replaces Clerk's middleware-based protection.
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/sign-in");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#faf6f1] via-[#f5ebe0] to-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-[#2d5f5f] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#4b5563] font-light">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}
