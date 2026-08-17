import { Suspense } from "react";
import ResetPasswordClient from "./ResetPasswordClient";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background px-4"><div className="w-full max-w-sm bg-surface-container-lowest rounded-xl shadow-sm p-8 border border-outline-variant"><h1 className="text-2xl font-extrabold text-on-surface mb-1">TC Professional Services</h1><p className="text-sm text-on-surface-variant">Validating your password reset link...</p></div></div>}>
      <ResetPasswordClient />
    </Suspense>
  );
}
