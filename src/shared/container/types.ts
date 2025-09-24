/**
 * Service container types
 */

export interface IServiceContainer {
  // Service registration
  register<T>(name: string, factory: ServiceFactory<T>): void;
  registerSingleton<T>(name: string, factory: ServiceFactory<T>): void;
  registerInstance<T>(name: string, instance: T): void;

  // Service resolution
  resolve<T>(name: string): T;
  tryResolve<T>(name: string): T | undefined;

  // Service management
  isRegistered(name: string): boolean;
  unregister(name: string): void;
  clear(): void;

  // Service introspection
  getRegisteredServices(): string[];
  getServiceInfo(name: string): ServiceInfo | undefined;
}

export type ServiceFactory<T> = (container: IServiceContainer) => T;

export interface ServiceInfo {
  name: string;
  type: ServiceType;
  isSingleton: boolean;
  isInstance: boolean;
  dependencies?: string[];
}

export type ServiceType = 'factory' | 'singleton' | 'instance';

export interface ServiceRegistration<T = any> {
  name: string;
  factory?: ServiceFactory<T>;
  instance?: T;
  type: ServiceType;
  created?: boolean;
}

export class ServiceNotFoundError extends Error {
  constructor(serviceName: string) {
    super(`Service '${serviceName}' is not registered`);
    this.name = 'ServiceNotFoundError';
  }
}

export class CircularDependencyError extends Error {
  constructor(serviceName: string, chain: string[]) {
    super(`Circular dependency detected: ${chain.join(' -> ')} -> ${serviceName}`);
    this.name = 'CircularDependencyError';
  }
}
