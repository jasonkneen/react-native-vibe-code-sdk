import { Sandbox } from "@e2b/code-interpreter";
import { NextResponse } from "next/server";

export const maxDuration = 300;

export async function POST() {
  let sandbox: Sandbox | null = null;

  try {
    console.log("[Test Expo] Creating new sandbox from template...");

    // Create sandbox from the expo template using template ID
    sandbox = await Sandbox.create(
      "sm3r39vktkmu37lna0qa",{
      timeoutMs: 120000,
    });

    console.log("[Test Expo] Sandbox created:", sandbox.sandboxId);

    // Generate a unique ngrok subdomain
    const ngrokSubdomain = `test-${Date.now()}`;
    console.log("[Test Expo] Using ngrok subdomain:", ngrokSubdomain);

    // Configure ngrok auth token (already done in Dockerfile, but just in case)
    const authResult = await sandbox.commands.run(
      `ngrok config add-authtoken ${process.env.NGROK_AUTHTOKEN}`
    );
    console.log("[Test Expo] Ngrok configured:", authResult.stdout);


    console.log('before bun install')
    const bunInstall = await sandbox.commands.run('cd /home/user/app && bun install')
    console.log('after bun install')
    // Start the Expo server with --ngrokurl flag
    console.log("[Test Expo] Starting Expo server with --ngrokurl flag...");
    const expoCommand = `cd /home/user/app && CI=false bun run start -- --ngrokurl ${ngrokSubdomain} --tunnel --web`;

    // Run command in background and capture output
    const expoProcess = await sandbox.commands.run(expoCommand, {
      timeoutMs: parseInt(process.env.E2B_SANDBOX_TIMEOUT_MS || '3600000'), // Use env var, default to 1 hour
      background: true,
      onStdout: (data) => {
        console.log("[Test Expo] STDOUT:", data);
      },
      onStderr: (data) => {
        console.log("[Test Expo] STDERR:", data);
      },
    });


    await sandbox.setTimeout(3600000)

    // Wait 30 seconds to collect output
    console.log("[Test Expo] Waiting 30 seconds for server to start...");
    await new Promise((resolve) => setTimeout(resolve, 30000));

    // Get the logs from the sandbox
    console.log("[Test Expo] Fetching logs...");
    const logsResult = await sandbox.commands.run(
      `cat /tmp/*.log 2>/dev/null || echo "No logs found"`
    );

    // Try to get recent process output
    const psResult = await sandbox.commands.run(
      `ps aux | grep -E "(expo|ngrok)" | grep -v grep`
    );

    // Check if ngrok is running
    const ngrokCheck = await sandbox.commands.run(
      `curl -s http://localhost:4040/api/tunnels 2>/dev/null || echo "ngrok not running"`
    );

    let ngrokUrl = "";
    try {
      const tunnelData = JSON.parse(ngrokCheck.stdout);
      if (tunnelData.tunnels && tunnelData.tunnels.length > 0) {
        ngrokUrl = tunnelData.tunnels[0].public_url;
        console.log("[Test Expo] Found ngrok URL:", ngrokUrl);
      }
    } catch (e) {
      console.log("[Test Expo] Could not parse ngrok API response");
    }

    // Check if the --ngrokurl flag was recognized
    const hasError =
      expoProcess.stderr?.includes("unknown or unexpected option: --ngrokurl") ||
      false;
    const hasTunnelReady =
      expoProcess.stdout?.includes("Tunnel ready") ||
      expoProcess.stdout?.includes("Tunnel connected") ||
      ngrokUrl !== "";

    const result = {
      success: !hasError && hasTunnelReady,
      sandboxId: sandbox.sandboxId,
      ngrokSubdomain,
      ngrokUrl,
      hasError,
      hasTunnelReady,
      processes: psResult.stdout,
      ngrokApiResponse: ngrokCheck.stdout,
      stdout: expoProcess.stdout?.slice(-2000) || "",
      stderr: expoProcess.stderr?.slice(-2000) || "",
      message: hasError
        ? "❌ Patch NOT applied - --ngrokurl flag not recognized"
        : hasTunnelReady
        ? "✅ Patch working! Tunnel connected successfully"
        : "⚠️ Patch recognized but tunnel not ready yet",
    };

    console.log("[Test Expo] Result:", result);

    // Store sandbox with keep-alive mechanism
    // if (sandbox && ngrokUrl) {
    //   storeSandbox(sandbox.sandboxId, sandbox, ngrokUrl);
    //   console.log("[Test Expo] Sandbox stored with keep-alive mechanism");
    // }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Test Expo] Error:", error);

    // Don't close sandbox on error, might be useful for debugging
    if (sandbox) {
      console.log("[Test Expo] Sandbox kept alive despite error:", sandbox.sandboxId);
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        sandboxId: sandbox?.sandboxId,
      },
      { status: 500 }
    );
  }
}
