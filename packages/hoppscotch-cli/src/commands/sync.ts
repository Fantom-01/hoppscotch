import { Command } from "commander";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import fs from "fs";
import { convertOpenApiDocsToHopp } from "@hoppscotch/data/importers/openapi/index";
import SwaggerParser from "@apidevtools/swagger-parser";
import { OpenAPI } from "openapi-types";
import { URL } from "url";

export const syncCmd = new Command("sync")
  .argument("<url>", "URL to the Swagger/OpenAPI definition")
  .description("Sync a Hoppscotch collection from an OpenAPI URL file")
  .action(async (url) => {
    console.log(`🚀 INITIALIZING SYNC FROM: ${url}`);

    try {
      // 1. EXTRACT FALLBACK BASE URL
      let fallbackBaseUrl = "";
      try {
        const parsedUrl = new URL(url);
        fallbackBaseUrl = parsedUrl.origin; // e.g., "https://server.hireava.xyz"
        console.log(`📍 Source origin detected: ${fallbackBaseUrl}`);
      } catch (urlError) {
        console.warn("⚠️  Could not parse source URL for base URL extraction");
      }

      const parser = new SwaggerParser();
      const api = await parser.validate(url);

      // 2. PASS THE FALLBACK TO THE CONVERTER
      // We pass fallbackBaseUrl as the second argument
      const result = await convertOpenApiDocsToHopp(
        [api as OpenAPI.Document],
        fallbackBaseUrl
      )();

      if (E.isRight(result)) {
        const collections = result.right;
        const outputFileName = "hoppscotch-collection.json";

        fs.writeFileSync(outputFileName, JSON.stringify(collections, null, 2));
        console.log(`✅ SUCCESS: Collection saved to ${outputFileName}`);
      } else {
        console.error("❌ CONVERSION FAILED:", result.left);
        process.exit(1);
      }
    } catch (e) {
      console.error("❌ SYNC ERROR:", e);
      process.exit(1);
    }
  });
