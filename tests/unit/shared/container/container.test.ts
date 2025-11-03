import { ServiceContainer } from '../../../../src/shared/container/container';
import {
  ServiceNotFoundError,
  CircularDependencyError,
} from '../../../../src/shared/container/types';

describe('ServiceContainer', () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  afterEach(() => {
    container.clear();
  });

  describe('Service Registration', () => {
    it('should register factory services', () => {
      const factory = (): { value: string } => ({ value: 'test' });
      container.register('test', factory);
      expect(container.isRegistered('test')).toBe(true);
    });

    it('should register singleton services', () => {
      const factory = (): { value: number } => ({ value: Math.random() });
      container.registerSingleton('random', factory);
      const instance1 = container.resolve('random');
      const instance2 = container.resolve('random');
      expect(instance1).toBe(instance2);
    });

    it('should register instance services', () => {
      const instance = { value: 'direct' };
      container.registerInstance('instance', instance);
      const resolved = container.resolve('instance');
      expect(resolved).toBe(instance);
    });
  });

  describe('Service Resolution', () => {
    it('should resolve factory services', () => {
      container.register('factory', (): { type: string } => ({
        type: 'factory',
      }));
      const result = container.resolve('factory');
      expect(result).toEqual({ type: 'factory' });
    });

    it('should throw error for non-existent service', () => {
      expect(() => container.resolve('nonexistent')).toThrow(
        ServiceNotFoundError,
      );
    });

    it('should return undefined for tryResolve with non-existent service', () => {
      const result = container.tryResolve('nonexistent');
      expect(result).toBeUndefined();
    });

    it('should detect circular dependencies', () => {
      container.register('a', (c) => ({ b: c.resolve('b') }));
      container.register('b', (c) => ({ a: c.resolve('a') }));
      expect(() => container.resolve('a')).toThrow(CircularDependencyError);
    });
  });

  describe('Service Management', () => {
    it('should unregister services', () => {
      container.register('temp', (): Record<string, never> => ({}));
      expect(container.isRegistered('temp')).toBe(true);
      container.unregister('temp');
      expect(container.isRegistered('temp')).toBe(false);
    });

    it('should clear all services', () => {
      container.register('a', (): Record<string, never> => ({}));
      container.register('b', (): Record<string, never> => ({}));
      container.clear();
      expect(container.getRegisteredServices()).toEqual([]);
    });

    it('should list registered services', () => {
      container.register('service1', (): Record<string, never> => ({}));
      container.register('service2', (): Record<string, never> => ({}));
      const services = container.getRegisteredServices();
      expect(services).toEqual(['service1', 'service2']);
    });
  });

  describe('Service Introspection', () => {
    it('should provide service info', () => {
      container.registerSingleton('test', (): Record<string, never> => ({}));
      const info = container.getServiceInfo('test');
      expect(info).toEqual({
        name: 'test',
        type: 'singleton',
        isSingleton: true,
        isInstance: false,
        isCreated: false,
      });
    });

    it('should return undefined for non-existent service info', () => {
      const info = container.getServiceInfo('nonexistent');
      expect(info).toBeUndefined();
    });
  });
});
