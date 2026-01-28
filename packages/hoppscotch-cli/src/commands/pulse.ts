import fs from "fs";
import axios from "axios";
import path from "path";
import FormData from "form-data";

export async function runPulseCheck() {
  console.log("🛡️  SENTINEL: INITIALIZING AUTONOMOUS PULSE CHECK...");

  const collectionPath = path.join(process.cwd(), "hoppscotch-collection.json");

  // 1. Verify collection existence
  if (!fs.existsSync(collectionPath)) {
    console.error("❌ ERROR: No collection found. Run 'sync' first.");
    return;
  }

  // 2. Load and Normalize Data
  const rawData = JSON.parse(fs.readFileSync(collectionPath, "utf8"));
  const collections = Array.isArray(rawData) ? rawData : [rawData];

  // 3. Robust Base URL Discovery
  const globalBaseUrl =
    collections.find((c) => c.auth?.baseUrl)?.auth?.baseUrl || "";

  if (globalBaseUrl) {
    console.log(`📍 Using Base URL: ${globalBaseUrl}`);
  } else {
    console.warn("⚠️  WARNING: No base URL found. Relative paths may fail.");
  }

  // 4. Recursive Request Gathering
  const getAllRequests = (items: any[]): any[] => {
    let reqs: any[] = [];
    for (const item of items) {
      if (item.endpoint) reqs.push(item);
      if (item.requests) reqs.push(...item.requests);
      if (item.folders) reqs.push(...getAllRequests(item.folders));
    }
    return reqs;
  };

  const allRequests = getAllRequests(collections);

  if (allRequests.length === 0) {
    console.log("⚠️  No requests found in the collection.");
    return;
  }

  console.log(
    `🩺 Found ${allRequests.length} endpoints. Starting health checks...\n`
  );

  for (const req of allRequests) {
    const { name, method, endpoint, body, auth } = req;

    // 5. Smart URL Resolution
    let finalUrl = endpoint;

    // Check if the endpoint uses the Hoppscotch baseUrl placeholder
    if (endpoint.includes("<<baseUrl>>")) {
      // Replace the placeholder with our saved globalBaseUrl
      finalUrl = endpoint
        .replace("<<baseUrl>>", globalBaseUrl)
        .replace(/\/$/, "");
    }
    // Fallback for relative paths without the placeholder
    else if (endpoint.startsWith("/") && globalBaseUrl) {
      finalUrl = `${globalBaseUrl}${endpoint}`;
    }
    // Fallback for protocol-less URLs
    else if (!endpoint.startsWith("http") && globalBaseUrl) {
      finalUrl = `${globalBaseUrl}/${endpoint}`.replace(/([^:]\/)\/+/g, "$1");
    }

    // This looks for any {{variable}} and attempts to heal it with a mock value
    const variableRegex = /\{\{(.+?)\}\}/g;
    finalUrl = finalUrl.replace(variableRegex, (match: any, varName: any) => {
      // 1. Check if the variable is defined in the collection's variable list
      const foundVar = collections[0].variables?.find(
        (v: any) => v.key === varName
      );
      if (foundVar && foundVar.value) return foundVar.value;

      // 2. SELF-HEALING: If no value exists, generate a smart mock based on the name
      if (varName.toLowerCase().includes("id")) return "1"; // Default to ID 1
      if (varName.toLowerCase().includes("name")) return "sentinel_mock";
      return "mock_value";
    });

    // Clean up any double slashes that might have occurred during joining
    finalUrl = finalUrl.replace(/([^:])\/\//g, "$1/");

    try {
      let requestData: any = null;
      let headers: any = {};

      // Handle Auth
      if (auth?.authType === "api-key") {
        headers[auth.key] = auth.value;
      } else if (auth?.authType === "bearer") {
        headers["Authorization"] = `Bearer ${auth.token}`;
      }

      // Handle Self-Healed Bodies (JSON and Multipart)
      if (body?.contentType === "application/json" && body.body) {
        requestData = JSON.parse(body.body);
        headers["Content-Type"] = "application/json";
      } else if (body?.contentType === "multipart/form-data") {
        const form = new FormData();
        const bodyArray = Array.isArray(body.body) ? body.body : [];

        bodyArray.forEach((param: any) => {
          if (
            param.isFile &&
            typeof param.value === "string" &&
            param.value.startsWith("data:")
          ) {
            const matches = param.value.match(/data:([^;]+);base64,(.+)/);
            if (matches) {
              const buffer = Buffer.from(matches[2], "base64");
              form.append(param.key, buffer, {
                filename: `mock-${param.key}.${matches[1].split("/")[1] || "bin"}`,
                contentType: matches[1],
              });
            }
          } else {
            form.append(param.key, param.value || "");
          }
        });
        requestData = form;
        headers = { ...headers, ...form.getHeaders() };
      }

      const startTime = Date.now();
      const response = await axios({
        method,
        url: finalUrl,
        data: requestData,
        headers,
        timeout: 10000,
        validateStatus: (status) => status < 500,
      });

      const duration = Date.now() - startTime;

      // Classification logic for the summary table
      if (response.status < 300) {
        req.executionStatus = "success";
        console.log(
          `   ✅ [${response.status}] ${method.padEnd(6)} | ${name} (${duration}ms)`
        );
      } else {
        req.executionStatus = "warning";
        console.log(
          `   ⚠️  [${response.status}] ${method.padEnd(6)} | ${name} (${duration}ms) - Client Error`
        );
      }
    } catch (error: any) {
      req.executionStatus = "failure";
      console.log(
        `   ❌ [CONN_ERR] ${method.padEnd(6)} | ${name} -> ${error.message}`
      );
    }
  }

  // 6. Summary Table Logic
  const total = allRequests.length;
  const passed = allRequests.filter(
    (r) => r.executionStatus === "success"
  ).length;
  const warnings = allRequests.filter(
    (r) => r.executionStatus === "warning"
  ).length;
  const failed = allRequests.filter(
    (r) => r.executionStatus === "failure"
  ).length;

  console.log("\n" + "═".repeat(50));
  console.log("📊 SENTINEL PULSE SUMMARY");
  console.log("═".repeat(50));
  console.log(
    `✅ Successful:   ${passed.toString().padEnd(5)} (2xx Responses)`
  );
  console.log(
    `⚠️  Client Errors: ${warnings.toString().padEnd(5)} (4xx Responses)`
  );
  console.log(
    `❌ Failures:      ${failed.toString().padEnd(5)} (5xx / Conn Errors)`
  );
  console.log("─".repeat(50));
  console.log(`📈 Total Endpoints: ${total}`);
  console.log(`🎯 Health Score:    ${((passed / total) * 100).toFixed(1)}%`);
  console.log("═".repeat(50) + "\n");
}
