"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { Camera, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/services/api";
import { useAuthStore } from "@/store/useAuthStore";
import type { ApiError } from "@/types";

const loginSchema = z.object({
  identifier: z.string().min(1, "Enter your email or username"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const response = await authApi.login(values);
      setAuth(response);
      toast.success(`Welcome back, ${response.user.username}!`);
      router.replace("/feed");
    } catch (error) {
      const message =
        (error instanceof AxiosError &&
          (error.response?.data as ApiError | undefined)?.message) ||
        "Invalid credentials. Please try again.";
      toast.error(message);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-4">
      <div className="rounded-lg border border-border bg-background px-10 py-12">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Camera className="size-10" />
          <h1 className="text-2xl font-semibold">Instagramm</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="identifier" className="sr-only">
              Email or username
            </Label>
            <Input
              id="identifier"
              placeholder="Email or username"
              autoComplete="username"
              aria-invalid={!!errors.identifier}
              {...register("identifier")}
            />
            {errors.identifier && (
              <p className="text-xs text-destructive">
                {errors.identifier.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="sr-only">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            Log in
          </Button>
        </form>
      </div>

      <div className="rounded-lg border border-border bg-background px-10 py-5 text-center text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-primary">
          Sign up
        </Link>
      </div>
    </div>
  );
}
