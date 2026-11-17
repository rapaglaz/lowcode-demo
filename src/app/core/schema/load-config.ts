import { ConfigLoadResult, CURRENT_SCHEMA_VERSION } from '../config.types';
import { validateConfig } from './config-validator';
import { detectSchemaVersion, migrateToCurrent } from './migrations';

/**
 * Single entry point for untrusted configuration JSON: detect version, migrate, validate.
 * It never throws, so that callers can always render either the screen or the error panel.
 */
export function loadConfig(raw: unknown): ConfigLoadResult {
  const version = detectSchemaVersion(raw);
  if (version === null) {
    return {
      ok: false,
      issues: [{ path: '$', message: "Missing numeric 'schemaVersion' (or legacy 'version')." }],
    };
  }
  if (version < 1 || version > CURRENT_SCHEMA_VERSION) {
    return {
      ok: false,
      issues: [{ path: '$.schemaVersion', message: `Unsupported schema version ${version}.` }],
    };
  }

  let migrated: unknown;
  try {
    migrated = migrateToCurrent(raw, version);
  } catch (e) {
    // Migrations assume the shape of their source version; a broken legacy file
    // fails here and becomes a readable issue instead of a crash.
    const reason = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      issues: [{ path: '$', message: `Migration from version ${version} failed: ${reason}` }],
    };
  }

  const result = validateConfig(migrated);
  return result.ok
    ? {
        ok: true,
        config: result.config,
        migratedFrom: version < CURRENT_SCHEMA_VERSION ? version : null,
      }
    : result;
}
