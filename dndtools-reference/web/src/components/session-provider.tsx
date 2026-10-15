// The session context now lives in BootstrapProvider. This module only re-exports
// the session hooks so existing imports keep working.
export {
  useRefreshSession,
  useSessionNonce,
  useSessionReady,
} from "@/components/bootstrap-provider";
