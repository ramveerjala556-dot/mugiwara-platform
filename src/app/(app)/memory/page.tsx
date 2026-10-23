import type { Metadata } from "next";
import { Brain } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listMemories } from "@/lib/queries";
import { PageHeader } from "@/components/layout/page-header";
import { MemoryManager } from "@/components/memory/memory-manager";

export const metadata: Metadata = { title: "Memory" };
export const dynamic = "force-dynamic";

export default async function MemoryPage() {
  const user = await requireUser();
  const memories = await listMemories(user.id);

  return (
    <div>
      <PageHeader
        icon={Brain}
        title="Memory Vault"
        description="What the crew remembers about you and your projects. Retrieved memory is treated as untrusted context — never as instructions — and credentials are refused outright."
      />
      <MemoryManager memories={memories} />
    </div>
  );
}
