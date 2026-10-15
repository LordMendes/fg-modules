// The auth context now lives in BootstrapProvider. This module only re-exports
// the auth hooks so existing imports keep working.
export { useAuthReady, useAuthUser } from "@/components/bootstrap-provider";
