"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogPortal = DialogPrimitive.Portal;
const DialogClose = DialogPrimitive.Close;

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border border-border/60 bg-background p-0 shadow-float duration-200 ease-smooth data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2 sm:rounded-xl",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close className="glass absolute right-3 top-3 z-10 rounded-full p-1.5 opacity-80 transition-all duration-200 ease-smooth hover:scale-110 hover:opacity-100 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

/**
 * Bottom-sheet variant of the dialog — rises from the bottom edge and stops
 * partway up the viewport (Instagram's reels comment sheet). The caller owns
 * the height; the slide is driven by `.sheet-panel` in globals.css rather than
 * the animate-in utilities so the closing slide plays out before Radix
 * unmounts the node.
 */
function DialogSheetContent({
  className,
  children,
  showCloseButton = true,
  showHandle = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
  showHandle?: boolean;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-sheet-content"
        className={cn(
          "sheet-panel fixed inset-x-0 bottom-0 z-50 mx-auto flex w-full max-w-[520px] flex-col overflow-hidden rounded-t-2xl border border-b-0 border-border/60 bg-background shadow-float focus:outline-none",
          className,
        )}
        {...props}
      >
        {showHandle && (
          <div className="flex shrink-0 justify-center pb-1 pt-2">
            <span className="h-1 w-9 rounded-full bg-muted-foreground/40" />
          </div>
        )}
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-muted-foreground opacity-80 transition-all duration-200 ease-smooth hover:scale-110 hover:bg-accent hover:text-foreground hover:opacity-100 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex items-center justify-center border-b border-border px-4 py-3 text-center",
        className,
      )}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 border-t border-border px-4 py-3 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-base font-semibold leading-none", className)}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogSheetContent,
  DialogTitle,
  DialogTrigger,
};
