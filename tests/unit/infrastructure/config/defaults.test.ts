/**
 * Configuration Defaults Tests
 * Tests for password protection default configuration values and environment variable mapping
 */

import { defaultConfig } from '../../../../src/infrastructure/config/defaults';

describe('Configuration Defaults - Password Protection', () => {
  describe('Default Password Protection Configuration', () => {
    it('should have password protection disabled by default', () => {
      expect(defaultConfig.passwordProtection?.enabled).toBe(false);
    });

    it('should have no default passwords set', () => {
      expect(defaultConfig.passwordProtection?.userPassword).toBeUndefined();
      expect(defaultConfig.passwordProtection?.ownerPassword).toBeUndefined();
    });

    it('should have secure default permissions', () => {
      const permissions = defaultConfig.passwordProtection?.permissions;

      expect(permissions).toBeDefined();
      expect(permissions?.printing).toBe(true);
      expect(permissions?.modifying).toBe(false); // Secure by default
      expect(permissions?.copying).toBe(true);
      expect(permissions?.annotating).toBe(true);
      expect(permissions?.fillingForms).toBe(true);
      expect(permissions?.contentAccessibility).toBe(true);
      expect(permissions?.documentAssembly).toBe(false); // Secure by default
    });

    it('should maintain all required permission properties', () => {
      const permissions = defaultConfig.passwordProtection?.permissions;
      const requiredProperties = [
        'printing',
        'modifying',
        'copying',
        'annotating',
        'fillingForms',
        'contentAccessibility',
        'documentAssembly',
      ];

      expect(permissions).toBeDefined();
      requiredProperties.forEach((property) => {
        expect(permissions).toHaveProperty(property);
        expect(typeof permissions![property as keyof typeof permissions]).toBe(
          'boolean',
        );
      });
    });
  });

  describe('Static Defaults Validation', () => {
    it('should have static password protection defaults', () => {
      // These tests verify the static defaults (not environment-dependent)
      expect(defaultConfig.passwordProtection?.enabled).toBe(false);
      expect(defaultConfig.passwordProtection?.userPassword).toBeUndefined();
      expect(defaultConfig.passwordProtection?.ownerPassword).toBeUndefined();
      expect(defaultConfig.passwordProtection?.permissions?.printing).toBe(
        true,
      );
    });

    it('should include password environment variable mappings', () => {
      // Test that environment mappings include password protection keys
      const {
        environmentMappings,
      } = require('../../../../src/infrastructure/config/defaults');

      expect(environmentMappings).toHaveProperty('MD2PDF_PASSWORD_ENABLED');
      expect(environmentMappings).toHaveProperty('MD2PDF_USER_PASSWORD');
      expect(environmentMappings).toHaveProperty('MD2PDF_OWNER_PASSWORD');
      expect(environmentMappings).toHaveProperty('MD2PDF_PERMISSION_PRINTING');
      expect(environmentMappings).toHaveProperty('MD2PDF_PERMISSION_MODIFYING');
      expect(environmentMappings).toHaveProperty('MD2PDF_PERMISSION_COPYING');

      // Verify mappings point to correct config paths
      expect(environmentMappings.MD2PDF_PASSWORD_ENABLED).toBe(
        'passwordProtection.enabled',
      );
      expect(environmentMappings.MD2PDF_USER_PASSWORD).toBe(
        'passwordProtection.userPassword',
      );
      expect(environmentMappings.MD2PDF_OWNER_PASSWORD).toBe(
        'passwordProtection.ownerPassword',
      );
    });
  });

  describe('Configuration Structure Validation', () => {
    it('should have all required top-level configuration sections', () => {
      expect(defaultConfig).toHaveProperty('language');
      expect(defaultConfig).toHaveProperty('pdf');
      expect(defaultConfig).toHaveProperty('logging');
      expect(defaultConfig).toHaveProperty('passwordProtection');
      expect(defaultConfig).toHaveProperty('template');
      expect(defaultConfig).toHaveProperty('toc');
      expect(defaultConfig).toHaveProperty('headersFooters');
      expect(defaultConfig).toHaveProperty('metadata');
    });

    it('should have properly structured password protection section', () => {
      const pwdProtection = defaultConfig.passwordProtection;

      expect(pwdProtection).toBeDefined();
      expect(typeof pwdProtection?.enabled).toBe('boolean');
      expect(typeof pwdProtection?.permissions).toBe('object');
      expect(pwdProtection?.permissions).not.toBeNull();
    });

    it('should not expose sensitive defaults in logs', () => {
      const configString = JSON.stringify(defaultConfig);

      // Should not contain actual passwords (only undefined values should be present)
      expect(configString).not.toMatch(/["\']password["\']:\s*["\']\w+["\']/i);
      expect(configString).not.toMatch(/secret|admin|123/i);
    });

    it('should maintain consistent permission naming convention', () => {
      const permissions = defaultConfig.passwordProtection?.permissions;

      expect(permissions).toBeDefined();
      const permissionNames = Object.keys(permissions!);

      // Check camelCase naming
      permissionNames.forEach((name) => {
        expect(name).toMatch(/^[a-z][a-zA-Z]*$/);
        expect(name.charAt(0)).toBe(name.charAt(0).toLowerCase());
      });
    });
  });

  describe('Security and Best Practices', () => {
    it('should default to secure settings when in doubt', () => {
      // Password protection should be disabled by default (explicit opt-in)
      expect(defaultConfig.passwordProtection?.enabled).toBe(false);

      // Some permissions should be restrictive by default for security
      const permissions = defaultConfig.passwordProtection?.permissions;
      expect(permissions).toBeDefined();

      // User-friendly permissions are enabled by default
      expect(permissions?.printing).toBe(true);
      expect(permissions?.copying).toBe(true);
      expect(permissions?.annotating).toBe(true);
      expect(permissions?.fillingForms).toBe(true);
      expect(permissions?.contentAccessibility).toBe(true);

      // Dangerous permissions are disabled by default
      expect(permissions?.modifying).toBe(false);
      expect(permissions?.documentAssembly).toBe(false);
    });

    it('should maintain accessibility compliance by default', () => {
      // Content accessibility should always be true by default
      expect(
        defaultConfig.passwordProtection?.permissions?.contentAccessibility,
      ).toBe(true);
    });

    it('should not include development or test passwords', () => {
      expect(defaultConfig.passwordProtection?.userPassword).toBeUndefined();
      expect(defaultConfig.passwordProtection?.ownerPassword).toBeUndefined();
    });

    it('should have reasonable defaults for production use', () => {
      // Verify that defaults are suitable for production
      expect(defaultConfig.passwordProtection?.enabled).toBe(false); // Explicit activation required
      expect(defaultConfig.passwordProtection?.permissions?.printing).toBe(
        true,
      ); // User-friendly default
      expect(defaultConfig.passwordProtection?.permissions?.copying).toBe(true); // User-friendly default
    });
  });
});
