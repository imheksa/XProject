import Dashboard from "@/components/Dashboard";
import { MOCK_ME } from "@/lib/mockData";

export default function DemoPage() {
  return <Dashboard me={MOCK_ME} demo />;
}
