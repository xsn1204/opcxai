import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, signToken, COOKIE_NAME, MAX_AGE } from "@/lib/auth";
import { isEmailVerified, consumeEmailVerified } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      role,
      username,
      company_name,
      contact_name,
      specialty,
      capability_modules,
      tool_stack,
      delivery_pref,
      business_tracks,
      bio,
      referral_code,
      is_student,
      edu_email,
      student_metadata,
      company_size,
    } = body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "该邮箱已注册" }, { status: 400 });
    }

    // ── Email verification check ──────────────────────────────────────────────
    if (!isEmailVerified(email)) {
      return NextResponse.json({ error: "邮箱未验证，请先完成邮箱验证码校验" }, { status: 400 });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        ...(role === "talent"
          ? {
              talent_profile: {
                create: {
                  username: username || email.split("@")[0],
                  specialty: specialty || "",
                  capability_modules: JSON.stringify(capability_modules ?? []),
                  tool_stack: JSON.stringify(tool_stack ?? []),
                  delivery_pref: delivery_pref || "result_bet",
                  bio: bio || "",
                  is_student: is_student ?? false,
                  edu_email: is_student ? (edu_email ?? "") : "",
                  student_metadata: is_student ? (student_metadata ?? "{}") : "{}",
                  tags: JSON.stringify(is_student ? ["Student"] : []),
                },
              },
            }
          : {
              corp_profile: {
                create: {
                  company_name: company_name || "",
                  contact_name: contact_name || "",
                  business_tracks: JSON.stringify(business_tracks ?? []),
                  company_size: company_size || "startup",
                },
              },
            }),
      },
    });

    // ── Referral reward ─────────────────────────────────────────────────
    if (referral_code) {
      const referrer = await prisma.corpProfile.findUnique({
        where: { referral_code },
        select: { id: true },
      });

      if (referrer) {
        // Prevent double-counting (unique constraint on new_user_id guarantees it,
        // but we guard here to avoid transaction noise on duplicate attempts)
        const alreadyLogged = await prisma.referralLog.findUnique({
          where: { new_user_id: user.id },
        });

        if (!alreadyLogged) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const txOps: any[] = [
            prisma.referralLog.create({
              data: { referrer_id: referrer.id, new_user_id: user.id },
            }),
            prisma.corpProfile.update({
              where: { id: referrer.id },
              data: { referral_bonus: { increment: 3 } },
            }),
          ];

          // New corp user also receives +3 permanent bonus
          if (role === "corp") {
            txOps.push(
              prisma.corpProfile.update({
                where: { user_id: user.id },
                data: { referral_bonus: { increment: 3 } },
              })
            );
          }

          await prisma.$transaction(txOps);
        }
      }
    }

    const token = await signToken({ sub: user.id, role: user.role as "talent" | "corp" });
    consumeEmailVerified(email);
    const response = NextResponse.json({ role: user.role }, { status: 201 });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: MAX_AGE,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
