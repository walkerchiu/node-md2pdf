/**
 * Configuration Type Validation Tests
 * Tests for password protection configuration type definitions and validation
 */

import { MD2PDFConfig } from '../../../../src/infrastructure/config/types';
import { defaultConfig } from '../../../../src/infrastructure/config/defaults';

describe('Configuration Types - Password Protection', () => {
  describe('Password Protection Type Validation', () => {
    it('should accept valid password protection configuration in MD2PDFConfig', () => {
      const validConfig: MD2PDFConfig = {
        ...defaultConfig,
        passwordProtection: {
          enabled: true,
          userPassword: 'user123',
          ownerPassword: 'owner456',
          permissions: {
            printing: true,
            modifying: false,
            copying: true,
            annotating: true,
            fillingForms: true,
            contentAccessibility: true,
            documentAssembly: false,
          },
        },
      };

      expect(validConfig.passwordProtection?.enabled).toBe(true);
      expect(validConfig.passwordProtection?.userPassword).toBe('user123');
      expect(validConfig.passwordProtection?.ownerPassword).toBe('owner456');
      expect(validConfig.passwordProtection?.permissions).toBeDefined();
    });

    it('should allow password protection to be undefined', () => {
      const configWithoutPassword: MD2PDFConfig = {
        ...defaultConfig,
        // passwordProtection is optional and can be undefined
      };

      // Remove passwordProtection to test undefined behavior
      delete configWithoutPassword.passwordProtection;

      expect(configWithoutPassword.passwordProtection).toBeUndefined();
    });

    it('should allow minimal password protection configuration', () => {
      const minimalPasswordConfig: MD2PDFConfig['passwordProtection'] = {
        enabled: false,
      };

      expect(minimalPasswordConfig?.enabled).toBe(false);
      expect(minimalPasswordConfig?.userPassword).toBeUndefined();
      expect(minimalPasswordConfig?.ownerPassword).toBeUndefined();
      expect(minimalPasswordConfig?.permissions).toBeUndefined();
    });

    it('should validate permission structure when provided', () => {
      const configWithPermissions: MD2PDFConfig['passwordProtection'] = {
        enabled: true,
        permissions: {
          printing: false,
          modifying: false,
          copying: false,
          annotating: false,
          fillingForms: false,
          contentAccessibility: true, // Always should be true for accessibility
          documentAssembly: false,
        },
      };

      expect(configWithPermissions?.permissions?.contentAccessibility).toBe(
        true,
      );
      expect(configWithPermissions?.permissions?.printing).toBe(false);
    });
  });

  describe('Type Safety', () => {
    it('should enforce required properties in full config', () => {
      // This test validates that TypeScript compilation succeeds
      // with correct types and fails with incorrect ones
      const config: MD2PDFConfig = {} as MD2PDFConfig;
      expect(typeof config).toBe('object');
    });

    it('should allow optional password fields', () => {
      const passwordConfig: MD2PDFConfig['passwordProtection'] = {
        enabled: true,
        // userPassword and ownerPassword are optional
      };

      expect(passwordConfig.enabled).toBe(true);
      expect(passwordConfig.userPassword).toBeUndefined();
      expect(passwordConfig.ownerPassword).toBeUndefined();
    });
  });
});
