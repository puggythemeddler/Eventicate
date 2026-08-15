import { NextResponse } from "next/server";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const config = await prisma.systemConfig.findUnique({ where: { id: "default" } });
  return NextResponse.json({
    logoLight: config?.logoLight || null,
    logoDark: config?.logoDark || null,
    logoInvoice: config?.logoInvoice || null,
    appName: config?.appName || "Eventicate",
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const formData = await request.formData();
  const updates: Record<string, string | null> = {};

  for (const key of ["logoLight", "logoDark", "logoInvoice"] as const) {
    const file = formData.get(key) as File | null;
    if (file && file.size > 0) {
      const ext = file.name.split(".").pop() || "png";
      const filename = `${key}-${Date.now()}.${ext}`;
      const filepath = path.join(process.cwd(), "public", "uploads", "logos", filename);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filepath, buffer);
      updates[key] = `/uploads/logos/${filename}`;
    }
  }

  if (Object.keys(updates).length > 0) {
    await prisma.systemConfig.upsert({
      where: { id: "default" },
      update: updates,
      create: { id: "default", appName: "Eventicate", ...updates },
    });
  }

  const config = await prisma.systemConfig.findUnique({ where: { id: "default" } });
  return NextResponse.json({
    logoLight: config?.logoLight || null,
    logoDark: config?.logoDark || null,
    logoInvoice: config?.logoInvoice || null,
  });
}

export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (!type || !["logoLight", "logoDark", "logoInvoice"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const config = await prisma.systemConfig.findUnique({ where: { id: "default" } });
  const oldPath = config?.[type as keyof typeof config] as string | null;

  if (oldPath) {
    const fullPath = path.join(process.cwd(), "public", oldPath);
    try { await unlink(fullPath); } catch {}
  }

  await prisma.systemConfig.upsert({
    where: { id: "default" },
    update: { [type]: null },
    create: { id: "default", appName: "Eventicate" },
  });

  return NextResponse.json({ success: true });
}
