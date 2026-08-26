"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { useTranslation } from "@/i18n/useTranslation";
import { BrandMark } from "@/components/shared/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/services/api";
import { useAuthStore } from "@/store/useAuthStore";
import type { ApiError } from "@/types";

const registerSchema = z.object({
  fullName: z.string().min(1, "Enter your full name"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9._]+$/,
      "Only letters, numbers, periods and underscores allowed",
    ),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", username: "", email: "", password: "" },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      const response = await authApi.register(values);
      setAuth(response);
      toast.success(t("auth.registerSuccess"));
      router.replace("/feed");
    } catch (error) {
      const message =
        (error instanceof AxiosError &&
          (error.response?.data as ApiError | undefined)?.message) ||
        t("auth.registerError");
      toast.error(message);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-4">
      <div className="brand-glow enter-pop glass rounded-2xl border border-border/60 px-10 py-12 shadow-float">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandMark className="size-16 shadow-lifted rounded-2xl" />
          <h1 className="brand-gradient text-4xl font-bold tracking-tight">
            Instagramm
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("auth.signupTagline")}
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="stagger space-y-3"
          style={{ ["--stagger" as string]: "60ms" }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="sr-only">
              {t("auth.fullName")}
            </Label>
            <Input
              id="fullName"
              placeholder={t("auth.fullName")}
              autoComplete="name"
              aria-invalid={!!errors.fullName}
              {...register("fullName")}
            />
            {errors.fullName && (
              <p className="text-xs text-destructive">
                {errors.fullName.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="username" className="sr-only">
              {t("auth.username")}
            </Label>
            <Input
              id="username"
              placeholder={t("auth.username")}
              autoComplete="username"
              aria-invalid={!!errors.username}
              {...register("username")}
            />
            {errors.username && (
              <p className="text-xs text-destructive">
                {errors.username.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="sr-only">
              {t("auth.email")}
            </Label>
            <Input
              id="email"
              type="email"
              placeholder={t("auth.email")}
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="sr-only">
              {t("auth.password")}
            </Label>
            <Input
              id="password"
              type="password"
              placeholder={t("auth.password")}
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
            {errors.password && (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            variant="gradient"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="size-4 animate-spin" />}
            {t("auth.signup")}
          </Button>
        </form>
      </div>

      <div className="enter-up glass rounded-2xl border border-border/60 px-10 py-5 text-center text-sm shadow-lifted [animation-delay:200ms]">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="font-semibold text-primary">
          {t("auth.login")}
        </Link>
      </div>
    </div>
  );
}
