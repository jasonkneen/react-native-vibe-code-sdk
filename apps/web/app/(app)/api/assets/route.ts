import { NextRequest, NextResponse } from "next/server"
import { connectSandbox } from "@/lib/sandbox-connect"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const sandboxId = searchParams.get("sandboxId")

  if (!sandboxId) {
    return NextResponse.json({ error: "sandboxId is required" }, { status: 400 })
  }

  try {
    let sandbox: NonNullable<Awaited<ReturnType<typeof connectSandbox>>>
    try {
      sandbox = await connectSandbox(sandboxId)
    } catch {
      // Sandbox is dead/paused — return empty assets instead of 500
      return NextResponse.json({ assets: [] })
    }

    // Read manifest file
    const manifestPath = "/home/user/app/assets/manifest.json"
    let assets: Array<{ name: string; path: string; type: "image" | "font" | "other"; blobUrl?: string; size?: number }> = []

    try {
      const manifestData = await sandbox.files.read(manifestPath)
      const manifest = JSON.parse(manifestData.toString())

      const allAssets: Array<{ name: string; path: string; type: "image" | "font" | "other"; blobUrl?: string; size?: number }> = Object.values(manifest)
      assets = allAssets.filter(asset => asset.blobUrl)
    } catch {
      // No manifest file — empty assets
    }

    return NextResponse.json({ assets })
  } catch (error) {
    console.error("Error fetching assets:", error)
    return NextResponse.json({ assets: [] })
  }
}
