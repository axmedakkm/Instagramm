import { CreatePostModal } from "@/components/feed/CreatePostModal";
import { AuthGate } from "@/components/layout/AuthGate";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { SocketProvider } from "@/components/providers/SocketProvider";
import { CreateStoryModal } from "@/components/stories/CreateStoryModal";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <SocketProvider>
        <div className="flex min-h-screen w-full">
          <Sidebar />
          <div className="flex w-full flex-1 flex-col pb-14 lg:ml-[72px] lg:pb-0 xl:ml-64">
            {children}
          </div>
          <MobileNav />
        </div>
        <CreatePostModal />
        <CreateStoryModal />
      </SocketProvider>
    </AuthGate>
  );
}
