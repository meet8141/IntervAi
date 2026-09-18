import { NextResponse } from "next/server";

// Firebase Auth is client-side only — route protection is handled
// by the <ProtectedRoute> component wrapping /dashboard.
// This middleware is kept as a passthrough for Next.js compatibility.
export default function middleware(req) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};