
import { Command } from "commander";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import fs from "fs";
import { convertOpenApiDocsToHopp } from "@hoppscotch/data/importers/openapi/index";
import SwaggerParser from "@apidevtools/swagger-parser";
import { OpenAPI } from "openapi-types";

export const syncCmd = new Command("sync")
  .argument("<url>", "URL to the Swagger/OpenAPI definition")
  .description("Sync a Hoppscotch collection from an OpenAPI URL file")
  .action(async (url) => {
    console.log(`Fetching and syncing from: ${url}`);

    try {
        // Use SwaggerParser to validate and dereference (similar to what the worker did, but in Node context)
        // Note: CLI runs in Node, so we can use libraries directly without workers if preferred, 
        // or re-use logic if aligned. For CLI, direct usage is often simpler.
        const parser = new SwaggerParser();
        const api = await parser.validate(url);
        
        // Convert
        const result = await convertOpenApiDocsToHopp([api as OpenAPI.Document])();

        if (E.isRight(result)) {
            const collections = result.right;
            const outputFileName = "hoppscotch-collection.json";
            
            fs.writeFileSync(outputFileName, JSON.stringify(collections, null, 2));
            console.log(`Successfully synced. Collection saved to ${outputFileName}`);
        } else {
            console.error("Failed to convert OpenAPI document:", result.left);
            process.exit(1);
        }

    } catch (e) {
        console.error("Error syncing collection:", e);
        process.exit(1);
    }
  });
