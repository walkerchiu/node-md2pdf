/**
 * Tests for Service Container
 */

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

  describe('service registration', () => {
    it('should register a factory service', () => {
      const factory = jest.fn(() => ({ value: 'test' }));

      container.register('testService', factory);

      expect(() => container.resolve('testService')).not.toThrow();
    });

    it('should register a singleton service', () => {
      const factory = jest.fn(() => ({ value: 'singleton' }));

      container.registerSingleton('singletonService', factory);

      const instance1 = container.resolve('singletonService');
      const instance2 = container.resolve('singletonService');

      expect(instance1).toBe(instance2);
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should register an instance service', () => {
      const instance = { value: 'instance' };

      container.registerInstance('instanceService', instance);

      const resolved = container.resolve('instanceService');

      expect(resolved).toBe(instance);
    });
  });

  describe('service resolution', () => {
    it('should resolve factory service and create new instances', () => {
      let counter = 0;
      const factory = jest.fn(() => ({ id: ++counter }));

      container.register('counterService', factory);

      const instance1 = container.resolve<{ id: number }>('counterService');
      const instance2 = container.resolve<{ id: number }>('counterService');

      expect(instance1.id).toBe(1);
      expect(instance2.id).toBe(2);
      expect(factory).toHaveBeenCalledTimes(2);
    });

    it('should resolve singleton service and reuse instance', () => {
      let counter = 0;
      const factory = jest.fn(() => ({ id: ++counter }));

      container.registerSingleton('singletonCounter', factory);

      const instance1 = container.resolve<{ id: number }>('singletonCounter');
      const instance2 = container.resolve<{ id: number }>('singletonCounter');

      expect(instance1.id).toBe(1);
      expect(instance2.id).toBe(1);
      expect(instance1).toBe(instance2);
      expect(factory).toHaveBeenCalledTimes(1);
    });

    it('should resolve instance service directly', () => {
      const instance = { value: 'direct' };

      container.registerInstance('directService', instance);

      const resolved = container.resolve('directService');

      expect(resolved).toBe(instance);
    });

    it('should throw ServiceNotFoundError for unregistered service', () => {
      expect(() => container.resolve('nonExistentService')).toThrow(
        ServiceNotFoundError,
      );
    });
  });

  describe('dependency injection', () => {
    it('should inject container into factory functions', () => {
      const dependencyFactory = jest.fn(() => ({ name: 'dependency' }));
      const serviceFactory = jest.fn((cont) => {
        const dep = cont.resolve('dependency');
        return { dependency: dep, name: 'service' };
      });

      container.register('dependency', dependencyFactory);
      container.register('service', serviceFactory);

      const service = container.resolve<{
        dependency: { name: string };
        name: string;
      }>('service');

      expect(service.dependency.name).toBe('dependency');
      expect(serviceFactory).toHaveBeenCalledWith(container);
    });

    it('should support nested dependencies', () => {
      container.register('levelOne', () => ({ level: 1 }));
      container.register('levelTwo', (cont) => ({
        level: 2,
        dependency: cont.resolve('levelOne'),
      }));
      container.register('levelThree', (cont) => ({
        level: 3,
        dependency: cont.resolve('levelTwo'),
      }));

      const service = container.resolve<{
        level: number;
        dependency: { level: number; dependency: { level: number } };
      }>('levelThree');

      expect(service.level).toBe(3);
      expect(service.dependency.level).toBe(2);
      expect(service.dependency.dependency.level).toBe(1);
    });
  });

  describe('circular dependency detection', () => {
    it('should detect direct circular dependency', () => {
      container.register('serviceA', (cont) => ({
        name: 'A',
        dependency: cont.resolve('serviceA'),
      }));

      expect(() => container.resolve('serviceA')).toThrow(
        CircularDependencyError,
      );
    });

    it('should detect circular dependency in chain', () => {
      container.register('serviceA', (cont) => ({
        name: 'A',
        dependency: cont.resolve('serviceB'),
      }));
      container.register('serviceB', (cont) => ({
        name: 'B',
        dependency: cont.resolve('serviceC'),
      }));
      container.register('serviceC', (cont) => ({
        name: 'C',
        dependency: cont.resolve('serviceA'),
      }));

      expect(() => container.resolve('serviceA')).toThrow(
        CircularDependencyError,
      );
    });

    it('should allow resolving same service in different resolution chains', () => {
      container.register('shared', () => ({ name: 'shared' }));
      container.register('serviceA', (cont) => ({
        name: 'A',
        shared: cont.resolve('shared'),
      }));
      container.register('serviceB', (cont) => ({
        name: 'B',
        shared: cont.resolve('shared'),
      }));

      const serviceA = container.resolve<{
        name: string;
        shared: { name: string };
      }>('serviceA');
      const serviceB = container.resolve<{
        name: string;
        shared: { name: string };
      }>('serviceB');

      expect(serviceA.shared.name).toBe('shared');
      expect(serviceB.shared.name).toBe('shared');
    });
  });

  describe('service information', () => {
    it('should check if service is registered', () => {
      container.register('testService', () => ({}));

      expect(container.isRegistered('testService')).toBe(true);
      expect(container.isRegistered('nonExistentService')).toBe(false);
    });

    it('should get service info for registered services', () => {
      const factory = () => ({ test: true });

      container.register('factoryService', factory);
      container.registerSingleton('singletonService', factory);
      container.registerInstance('instanceService', { value: 'test' });

      expect(container.getServiceInfo('factoryService')).toEqual({
        name: 'factoryService',
        type: 'factory',
        isSingleton: false,
        isInstance: false,
        isCreated: false,
      });

      expect(container.getServiceInfo('singletonService')).toEqual({
        name: 'singletonService',
        type: 'singleton',
        isSingleton: true,
        isInstance: false,
        isCreated: false,
      });

      expect(container.getServiceInfo('instanceService')).toEqual({
        name: 'instanceService',
        type: 'instance',
        isSingleton: false,
        isInstance: true,
        isCreated: true,
      });
    });

    it('should return undefined for unregistered services', () => {
      expect(container.getServiceInfo('nonExistentService')).toBeUndefined();
    });

    it('should update singleton creation status after resolution', () => {
      container.registerSingleton('testSingleton', () => ({ value: 'test' }));

      const infoBefore = container.getServiceInfo('testSingleton');
      expect(infoBefore?.isCreated).toBe(false);

      container.resolve('testSingleton');

      const infoAfter = container.getServiceInfo('testSingleton');
      expect(infoAfter?.isCreated).toBe(true);
    });
  });

  describe('service management', () => {
    it('should list all registered services', () => {
      container.register('service1', () => ({}));
      container.registerSingleton('service2', () => ({}));
      container.registerInstance('service3', {});

      const services = container.getRegisteredServices();

      expect(services).toHaveLength(3);
      expect(services).toContain('service1');
      expect(services).toContain('service2');
      expect(services).toContain('service3');
    });

    it('should clear all services', () => {
      container.register('service1', () => ({}));
      container.registerSingleton('service2', () => ({}));
      container.registerInstance('service3', {});

      expect(container.getRegisteredServices()).toHaveLength(3);

      container.clear();

      expect(container.getRegisteredServices()).toHaveLength(0);
      expect(() => container.resolve('service1')).toThrow(ServiceNotFoundError);
    });

    it('should unregister specific services', () => {
      container.register('service1', () => ({}));
      container.register('service2', () => ({}));

      expect(container.isRegistered('service1')).toBe(true);

      container.unregister('service1');

      expect(container.isRegistered('service1')).toBe(false);
      expect(container.isRegistered('service2')).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should provide meaningful error message for missing service', () => {
      expect(() => container.resolve('missingService')).toThrow(
        "Service 'missingService' is not registered",
      );
    });

    it('should provide meaningful error message for circular dependency', () => {
      container.register('serviceA', (cont) => cont.resolve('serviceB'));
      container.register('serviceB', (cont) => cont.resolve('serviceA'));

      expect(() => container.resolve('serviceA')).toThrow(
        /Circular dependency detected/,
      );
    });

    it('should handle factory function errors gracefully', () => {
      container.register('errorService', () => {
        throw new Error('Factory error');
      });

      expect(() => container.resolve('errorService')).toThrow('Factory error');
    });

    it('should clean up resolution stack after error', () => {
      container.register('errorService', () => {
        throw new Error('Factory error');
      });

      expect(() => container.resolve('errorService')).toThrow();

      // Should be able to resolve other services normally
      container.register('normalService', () => ({ value: 'normal' }));
      expect(() => container.resolve('normalService')).not.toThrow();
    });
  });

  describe('advanced scenarios', () => {
    it('should handle overriding service registrations', () => {
      container.register('service', () => ({ version: 1 }));
      const first = container.resolve<{ version: number }>('service');
      expect(first.version).toBe(1);

      container.register('service', () => ({ version: 2 }));
      const second = container.resolve<{ version: number }>('service');
      expect(second.version).toBe(2);
    });

    it('should handle complex object graphs', () => {
      interface Logger {
        log: (msg: string) => void;
      }
      interface Database {
        query: (sql: string) => any[];
      }
      interface UserService {
        logger: Logger;
        db: Database;
        getUser: (id: string) => any;
      }

      container.register<Logger>('logger', () => ({
        log: jest.fn(),
      }));

      container.registerSingleton<Database>('database', () => ({
        query: jest.fn(() => []),
      }));

      container.register<UserService>('userService', (cont) => ({
        logger: cont.resolve<Logger>('logger'),
        db: cont.resolve<Database>('database'),
        getUser: (id: string) => ({ id, name: 'Test User' }),
      }));

      const userService = container.resolve<UserService>('userService');

      expect(userService.logger).toBeDefined();
      expect(userService.db).toBeDefined();
      expect(userService.getUser('123')).toEqual({
        id: '123',
        name: 'Test User',
      });

      // Verify singleton behavior for database
      const userService2 = container.resolve<UserService>('userService');
      expect(userService2.db).toBe(userService.db);
    });
  });
});
