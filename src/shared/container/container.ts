/**
 * Simple dependency injection container implementation
 */

import { ServiceNotFoundError, CircularDependencyError } from './types';

import type {
  IServiceContainer,
  ServiceFactory,
  ServiceInfo,
  ServiceRegistration,
} from './types';

export class ServiceContainer implements IServiceContainer {
  private services = new Map<string, ServiceRegistration>();
  private resolutionStack: string[] = [];

  // Service registration
  register<T>(name: string, factory: ServiceFactory<T>): void {
    this.services.set(name, {
      name,
      factory,
      type: 'factory',
    });
  }

  registerSingleton<T>(name: string, factory: ServiceFactory<T>): void {
    this.services.set(name, {
      name,
      factory,
      type: 'singleton',
      created: false,
    });
  }

  registerInstance<T>(name: string, instance: T): void {
    this.services.set(name, {
      name,
      instance,
      type: 'instance',
    });
  }

  // Service resolution
  resolve<T>(name: string): T {
    if (this.resolutionStack.includes(name)) {
      throw new CircularDependencyError(name, [...this.resolutionStack]);
    }
    const registration = this.services.get(name);
    if (!registration) {
      throw new ServiceNotFoundError(name);
    }
    this.resolutionStack.push(name);
    try {
      switch (registration.type) {
        case 'instance':
          return registration.instance as T;
        case 'singleton':
          if (!registration.created && registration.factory) {
            registration.instance = registration.factory(this);
            registration.created = true;
          }
          return registration.instance as T;
        case 'factory':
          if (!registration.factory) {
            throw new ServiceNotFoundError(name);
          }
          return registration.factory(this) as T;
        default:
          throw new ServiceNotFoundError(name);
      }
    } finally {
      this.resolutionStack.pop();
    }
  }

  tryResolve<T>(name: string): T | undefined {
    try {
      return this.resolve<T>(name);
    } catch {
      return undefined;
    }
  }

  // Service management
  isRegistered(name: string): boolean {
    return this.services.has(name);
  }

  unregister(name: string): void {
    this.services.delete(name);
  }

  clear(): void {
    this.services.clear();
    this.resolutionStack = [];
  }

  // Service introspection
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys()).sort();
  }

  getServiceInfo(name: string): ServiceInfo | undefined {
    const registration = this.services.get(name);
    if (!registration) {
      return undefined;
    }
    const dependencies = this.extractDependencies(registration);
    const serviceInfo: ServiceInfo = {
      name: registration.name,
      type: registration.type,
      isSingleton: registration.type === 'singleton',
      isInstance: registration.type === 'instance',
    };
    if (dependencies) {
      serviceInfo.dependencies = dependencies;
    }
    return serviceInfo;
  }

  private extractDependencies(registration: ServiceRegistration): string[] | undefined {
    if (!registration.factory) {
      return undefined;
    }

    // Simple dependency extraction from factory function string
    // This is a basic implementation - in a production system, you might want
    // more sophisticated dependency analysis
    const factoryStr = registration.factory.toString();
    const dependencyPattern = /container\.resolve<[^>]*>\(['"]([^'"]+)['"]\)/g;
    const dependencies: string[] = [];
    let match;

    while ((match = dependencyPattern.exec(factoryStr)) !== null) {
      dependencies.push(match[1]);
    }

    return dependencies.length > 0 ? dependencies : undefined;
  }
}
