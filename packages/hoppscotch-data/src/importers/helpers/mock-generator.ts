
import { faker } from "@faker-js/faker"
import { OpenAPIV3, OpenAPIV3_1 } from "openapi-types"

type SchemaObject = OpenAPIV3.SchemaObject | OpenAPIV3_1.SchemaObject

export const generateMockFromSchema = (schema: SchemaObject): any => {
  if (!schema) return null

  // Handle specific types
  if (schema.type === "string") {
    if (schema.format === "email") return faker.internet.email()
    if (schema.format === "uuid") return faker.string.uuid()
    if (schema.format === "date") return faker.date.past().toISOString().split("T")[0]
    if (schema.format === "date-time") return faker.date.past().toISOString()
    if (schema.enum && schema.enum.length > 0) return faker.helpers.arrayElement(schema.enum)
    return faker.lorem.word()
  }

  if (schema.type === "number" || schema.type === "integer") {
    if (schema.minimum !== undefined && schema.maximum !== undefined) {
      return faker.number.int({ min: schema.minimum, max: schema.maximum })
    }
    return faker.number.int({ max: 100 })
  }

  if (schema.type === "boolean") {
    return faker.datatype.boolean()
  }

  if (schema.type === "array") {
    const itemSchema = schema.items as SchemaObject
    if (!itemSchema) return []
    
    // Generate 1-5 items
    const count = faker.number.int({ min: 1, max: 5 })
    return Array.from({ length: count }, () => generateMockFromSchema(itemSchema))
  }

  if (schema.type === "object") {
    const props = schema.properties
    if (!props) return {}

    const result: Record<string, any> = {}
    for (const [key, propSchema] of Object.entries(props)) {
      result[key] = generateMockFromSchema(propSchema as SchemaObject)
    }
    return result
  }

  // Fallback
  return null
}
