import { AuthGate } from "@/components/layout/AuthGate";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { CallOverlay } from "@/components/messages/CallOverlay";
import { CallProvider } from "@/components/providers/CallProvider";
import { SocketProvider } from "@/components/providers/SocketProvider";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <SocketProvider>
        <CallProvider>
          <div className="flex min-h-screen w-full">
            <Sidebar />
            {/* The margin matches the sidebar's *collapsed* width and never
                changes. The expanded sidebar floats over the content instead
                of pushing it, so hovering the nav doesn't reflow the page. */}
            <div className="flex w-full flex-1 flex-col pb-14 lg:ml-[72px] lg:pb-0">
              {children}
            </div>
            <MobileNav />
          </div>
          <CallOverlay />
        </CallProvider>
      </SocketProvider>
    </AuthGate>
  );
}
