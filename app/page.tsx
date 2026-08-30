import ChatSidebar from "@/modules/chat/components/chat-sidebar";
import ChatMessageView from "@/modules/chat/components/chat-view/chat-message-view";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session?.user) {
    redirect("/sign-in");
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <ChatSidebar user={session.user} />
      <main className="flex-1 overflow-y-auto">
        <ChatMessageView user={session.user} />
      </main>
    </div>
  );
}
