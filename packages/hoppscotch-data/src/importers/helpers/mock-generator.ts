import { faker } from "@faker-js/faker"
import { OpenAPIV3, OpenAPIV3_1 } from "openapi-types"

type SchemaObject = OpenAPIV3.SchemaObject | OpenAPIV3_1.SchemaObject

const BINARY_STUBS = {
  png: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
  jpg: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  jpeg: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  pdf: "JVBERi0xLjAKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqMiAwIG9iajw8L1R5cGUvUGFnZXMvS2lkc1szIDAgUl0vQ291bnQgMT4+ZW5kb2JqMyAwIG9iajw8L1R5cGUvUGFnZS9QYXJlbnQgMiAwIFIvTWVkaWFCb3hbMCAwIDYxMiA3OTJdPj5lbmRvYmoKdHJhaWxlcjw8L1Jvb3QgMSAwIFI+Pgplb2YK",
  txt: "U2VsZi1IZWFsaW5nIEFQSSBNb2NrIERhdGE=",
}

export const generateMockFromSchema = (
  schema: any,
  visited = new Set(),
  fieldName?: string
): any => {
  // Prevent infinite recursion for circular schemas
  if (visited.has(schema)) return {}
  visited.add(schema)

  if (!schema) return null

  // Binary/File detection
  if (schema.format === "binary" || schema.type === "file") {
    // Determine file type from multiple sources
    let ext = "png"
    let mimeType = "image/png"

    // Check contentMediaType (OpenAPI 3.0+)
    if (schema.contentMediaType) {
      if (schema.contentMediaType.includes("pdf")) {
        ext = "pdf"
        mimeType = "application/pdf"
      } else if (
        schema.contentMediaType.includes("image/jpeg") ||
        schema.contentMediaType.includes("image/jpg")
      ) {
        ext = "jpg"
        mimeType = "image/jpeg"
      } else if (schema.contentMediaType.includes("image/png")) {
        ext = "png"
        mimeType = "image/png"
      } else if (schema.contentMediaType.includes("text/plain")) {
        ext = "txt"
        mimeType = "text/plain"
      }
    }
    // Fallback to field name hints
    else if (fieldName) {
      const lowerName = fieldName.toLowerCase()
      if (lowerName.includes("pdf")) {
        ext = "pdf"
        mimeType = "application/pdf"
      } else if (lowerName.includes("jpg") || lowerName.includes("jpeg")) {
        ext = "jpg"
        mimeType = "image/jpeg"
      } else if (lowerName.includes("txt") || lowerName.includes("text")) {
        ext = "txt"
        mimeType = "text/plain"
      }
    }

    const base64 =
      BINARY_STUBS[ext as keyof typeof BINARY_STUBS] || BINARY_STUBS.png

    // Return a Data URI which Hoppscotch can interpret as a file stream
    return `data:${mimeType};base64,${base64}`
  }

  // Handle direct value types
  if (schema.type === "string") {
    // Respect Regex Patterns
    if (schema.pattern) {
      try {
        return faker.helpers.fromRegExp(schema.pattern)
      } catch (e) {
        // Fallback if the regex is too complex for Faker
        return faker.word.noun()
      }
    }

    // Handle Min/Max Length
    if (schema.minLength || schema.maxLength) {
      return faker.string.alphanumeric({
        length: { min: schema.minLength || 1, max: schema.maxLength || 20 },
      })
    }

    // Handle format-specific strings
    if (schema.format === "date-time") return faker.date.recent().toISOString()
    if (schema.format === "date")
      return faker.date.recent().toISOString().split("T")[0]
    if (schema.format === "email") return faker.internet.email()
    if (schema.format === "uri") return faker.internet.url()
    if (schema.format === "uuid") return faker.string.uuid()

    // Handle enums
    if (schema.enum) return faker.helpers.arrayElement(schema.enum)

    return faker.word.noun()
  }

  if (schema.type === "integer" || schema.type === "number") {
    const min = schema.minimum ?? 1
    const max = schema.maximum ?? 100

    if (schema.type === "integer") {
      return faker.number.int({ min, max })
    }
    return faker.number.float({ min, max, fractionDigits: 2 })
  }

  if (schema.type === "boolean") {
    return faker.datatype.boolean()
  }

  // Handle Arrays
  if (schema.type === "array" && schema.items) {
    // Generate between 1-3 items by default
    const count = schema.minItems ?? 1
    const items = []
    for (let i = 0; i < count; i++) {
      items.push(
        generateMockFromSchema(schema.items, new Set(visited), fieldName)
      )
    }
    return items
  }

  // Handle Objects
  if (schema.type === "object" || schema.properties) {
    const mockObj: Record<string, any> = {}
    const props = schema.properties || {}

    for (const [key, value] of Object.entries(props)) {
      // Pass the property key as fieldName for nested schema generation
      mockObj[key] = generateMockFromSchema(value, visited, key)
    }
    return mockObj
  }

  // Handle allOf, oneOf, anyOf
  if (schema.allOf) {
    // Merge all schemas
    const merged: Record<string, any> = {}
    for (const subSchema of schema.allOf) {
      const generated = generateMockFromSchema(subSchema, visited, fieldName)
      Object.assign(merged, generated)
    }
    return merged
  }

  if (schema.oneOf || schema.anyOf) {
    // Pick the first option
    const options = schema.oneOf || schema.anyOf
    return generateMockFromSchema(options[0], visited, fieldName)
  }

  return null
}
