import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, getConfiguredPassword, getExpectedAuthToken } from "@/lib/auth";

export async function POST(request: Request) {
  const formData = await request.formData();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  const configuredPassword = getConfiguredPassword();

  if (!configuredPassword) {
    redirect("/login?error=config");
  }

  if (password !== configuredPassword) {
    redirect(`/login?error=invalid&next=${encodeURIComponent(next)}`);
  }

  const token = await getExpectedAuthToken();
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token ?? "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect(next || "/");
}
