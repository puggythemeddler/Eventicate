import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { hashPassword, createToken, setSessionCookie } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(["CUSTOMER", "PROVIDER"]).default("CUSTOMER"),
  businessName: z.string().optional(),
  category: z
    .enum([
      "VENUE", "PA_SYSTEM", "CATERING", "TRANSPORT",
      "PHOTOGRAPHY", "VIDEOGRAPHY", "DECORATION", "ENTERTAINMENT", "OTHER",
    ])
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
        ...(data.role === "CUSTOMER"
          ? { customerProfile: { create: {} } }
          : {
              providerProfile: {
                create: {
                  businessName: data.businessName || `${data.firstName}'s Business`,
                  category: data.category || "OTHER",
                },
              },
            }),
      },
      include: { customerProfile: true, providerProfile: true },
    });

    const token = await createToken({
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    await setSessionCookie(token);

    sendWelcomeEmail(user.email, user.firstName).catch((e) => console.error("Welcome email failed:", e));

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Register error:", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
