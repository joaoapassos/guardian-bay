import { SystemState } from "@/components/shared/system-state";

export default function Forbidden() {
  return <SystemState kind="access-denied" />;
}
