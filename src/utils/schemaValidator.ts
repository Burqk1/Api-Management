// Simple JSON Schema validator (subset of JSON Schema Draft 7)
// Validates: type, required, properties, items, enum, minimum, maximum, minLength, maxLength, pattern

interface SchemaError {
  path: string;
  message: string;
}

export function validateSchema(data: any, schema: any, path = ''): SchemaError[] {
  const errors: SchemaError[] = [];

  if (!schema || typeof schema !== 'object') return errors;

  // Type check
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actualType = getType(data);
    if (!types.includes(actualType) && !(actualType === 'integer' && types.includes('number'))) {
      errors.push({ path: path || '$', message: `Expected ${types.join('|')} but got ${actualType}` });
      return errors;
    }
  }

  // Enum
  if (schema.enum && !schema.enum.includes(data)) {
    errors.push({ path: path || '$', message: `Value must be one of: ${schema.enum.join(', ')}` });
  }

  // String validations
  if (typeof data === 'string') {
    if (schema.minLength !== undefined && data.length < schema.minLength) {
      errors.push({ path: path || '$', message: `String length must be >= ${schema.minLength}` });
    }
    if (schema.maxLength !== undefined && data.length > schema.maxLength) {
      errors.push({ path: path || '$', message: `String length must be <= ${schema.maxLength}` });
    }
    if (schema.pattern) {
      try {
        if (!new RegExp(schema.pattern).test(data)) {
          errors.push({ path: path || '$', message: `String must match pattern: ${schema.pattern}` });
        }
      } catch {}
    }
  }

  // Number validations
  if (typeof data === 'number') {
    if (schema.minimum !== undefined && data < schema.minimum) {
      errors.push({ path: path || '$', message: `Value must be >= ${schema.minimum}` });
    }
    if (schema.maximum !== undefined && data > schema.maximum) {
      errors.push({ path: path || '$', message: `Value must be <= ${schema.maximum}` });
    }
  }

  // Object validations
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    // Required
    if (schema.required) {
      for (const key of schema.required) {
        if (!(key in data)) {
          errors.push({ path: `${path}.${key}`, message: `Required property "${key}" is missing` });
        }
      }
    }

    // Properties
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in data) {
          errors.push(...validateSchema(data[key], propSchema, `${path}.${key}`));
        }
      }
    }

    // additionalProperties
    if (schema.additionalProperties === false && schema.properties) {
      const allowed = new Set(Object.keys(schema.properties));
      for (const key of Object.keys(data)) {
        if (!allowed.has(key)) {
          errors.push({ path: `${path}.${key}`, message: `Additional property "${key}" is not allowed` });
        }
      }
    }
  }

  // Array validations
  if (Array.isArray(data)) {
    if (schema.minItems !== undefined && data.length < schema.minItems) {
      errors.push({ path: path || '$', message: `Array must have >= ${schema.minItems} items` });
    }
    if (schema.maxItems !== undefined && data.length > schema.maxItems) {
      errors.push({ path: path || '$', message: `Array must have <= ${schema.maxItems} items` });
    }
    if (schema.items) {
      data.forEach((item, i) => {
        errors.push(...validateSchema(item, schema.items, `${path}[${i}]`));
      });
    }
  }

  return errors;
}

function getType(value: any): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number' && Number.isInteger(value)) return 'integer';
  return typeof value;
}

export function tryValidateSchema(responseBody: string, schemaStr: string): { valid: boolean; errors: string[] } {
  try {
    const data = JSON.parse(responseBody);
    const schema = JSON.parse(schemaStr);
    const errors = validateSchema(data, schema);
    return {
      valid: errors.length === 0,
      errors: errors.map((e) => `${e.path}: ${e.message}`),
    };
  } catch (err: any) {
    return { valid: false, errors: [`Parse error: ${err.message}`] };
  }
}
