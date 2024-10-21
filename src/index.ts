import { ActorRefFrom, StateFrom, assign, createActor, createMachine } from 'xstate';
import { deepMerge, getNestedValue, removeNestedProperty } from "./utils";

export type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

export type CRUDEvent =
  | { type: 'CREATE'; data: any }
  | { type: 'READ'; path?: string }
  | { type: 'UPDATE'; data: any }
  | { type: 'DELETE'; path: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | {
    type: string;
    [key: string]: any
  };

export interface VersionedData<T> {
  data: T;
  timestamp: Date;
}

export interface CRUDContext<T> {
  data: T;
  versions: VersionedData<T>[];
  currentVersion: number;
}

export interface CRUDOptions<T> {
  id?: string;
  initialData: T;
  enableVersioning?: boolean;
  maxVersions?: number;
  transitions?: Record<string, (context: CRUDContext<T>, event: any) => Partial<CRUDContext<T>>>;
}

type CRUDMachine<T extends object> = ReturnType<typeof CRUDMachineClass.prototype.createCRUDMachine>;
type CRUDActor<T extends object> = ActorRefFrom<CRUDMachine<T>>;
type CRUDState<T extends object> = StateFrom<CRUDMachine<T>>;

export interface CRUDMachineInterface<T extends object> {
  create(data: DeepPartial<T>): void;
  read(path?: string): any;
  update(data: DeepPartial<T>): void;
  delete(path: string): void;
  undo(): void;
  redo(): void;
  subscribe(callback: (state: CRUDState<T>) => void): () => void;
  send(event: CRUDEvent): void;
  getContextData(): T;
  getVersionHistory(): VersionedData<T>[];
}

export default class CRUDMachineClass<T extends object> implements CRUDMachineInterface<T> {
  private readonly actor: CRUDActor<T>;

  constructor(options: CRUDOptions<T>) {
    const machine = this.createCRUDMachine(options);
    this.actor = createActor(machine);
    this.actor.start();
  }

  createCRUDMachine(options: CRUDOptions<T>) {
    const {
      id = 'genericCRUD',
      initialData,
      enableVersioning = false,
      maxVersions = 5,
      transitions = {}
    } = options;

    const latestVersion = { data: initialData, timestamp: new Date() };

    return createMachine(
      {
        id,
        initial: 'idle',
        context: {
          data: initialData,
          versions: enableVersioning ? [latestVersion] : [],
          currentVersion: 0
        },
        schemas: {
          context: {} as CRUDContext<T>,
          events: {} as CRUDEvent
        },
        states: {
          idle: {
            on: {
              CREATE: { actions: 'create' },
              READ: { actions: 'read' },
              UPDATE: { actions: 'update' },
              DELETE: { actions: 'delete' },
              UNDO: { actions: 'undo', guard: 'canUndo' },
              REDO: { actions: 'redo', guard: 'canRedo' },
              ...Object.fromEntries(
                Object.entries(transitions).map(([key]) => [key, { actions: key }])
              )
            }
          }
        }
      },
      {
        actions: {
          create: assign(({ context, event }) => {
            if (event.type !== 'CREATE' || !event.data) return context;
            const newData = deepMerge(context.data, event.data);
            return this.updateContextAndVersion(context, newData, enableVersioning, maxVersions);
          }),
          update: assign(({ context, event }) => {
            if (event.type !== 'UPDATE' || !event.data) return context;
            const updatedData = deepMerge(context.data, event.data);
            return this.updateContextAndVersion(context, updatedData, enableVersioning, maxVersions);
          }),
          delete: assign(({ context, event }) => {
            if (event.type !== 'DELETE' || !event.path) return context;
            const updatedData = removeNestedProperty(context.data, event.path);
            return this.updateContextAndVersion(context, updatedData, enableVersioning, maxVersions);
          }),
          undo: assign(({ context }) => {
            if (context.currentVersion > 0) {
              return {
                ...context,
                currentVersion: context.currentVersion - 1,
                data: context.versions[context.currentVersion - 1].data
              };
            }
            return context;
          }),
          redo: assign(({ context }) => {
            if (context.currentVersion < context.versions.length - 1) {
              return {
                ...context,
                currentVersion: context.currentVersion + 1,
                data: context.versions[context.currentVersion + 1].data
              };
            }
            return context;
          }),
          ...Object.fromEntries(
            Object.entries(transitions).map(([name, callback]) => [
              name,
              assign(({ context, event }) => callback(context as any, event))
            ])
          )
        },
        guards: {
          canUndo: ({ context }) => enableVersioning && context.currentVersion > 0,
          canRedo: ({ context }) => enableVersioning && context.currentVersion < context.versions.length - 1
        }
      }
    );
  }

  private updateContextAndVersion(context: CRUDContext<T>, newData: T, enableVersioning: boolean, maxVersions: number): CRUDContext<T> {
    if (enableVersioning) {
      const newVersions = [...context.versions.slice(0, context.currentVersion + 1), { data: newData, timestamp: new Date() }];
      return {
        ...context,
        data: newData,
        versions: newVersions.slice(-maxVersions),
        currentVersion: Math.min(context.currentVersion + 1, maxVersions - 1)
      };
    }
    return { ...context, data: newData };
  }

  private getSnapshot() {
    return this.actor.getSnapshot();
  }

  create(data: DeepPartial<T>) {
    if (!data) return;
    this.actor.send({ type: 'CREATE', data });
  }

  read(path?: string) {
    return getNestedValue(this.getContextData(), path ?? "");
  }

  update(data: DeepPartial<T>) {
    if (!data) return;
    this.actor.send({ type: 'UPDATE', data });
  }

  delete(path: string) {
    if (!path) return;
    this.actor.send({ type: 'DELETE', path });
  }

  undo() {
    this.actor.send({ type: 'UNDO' });
  }

  redo() {
    this.actor.send({ type: 'REDO' });
  }

  subscribe(callback: (state: CRUDState<T>) => void) {
    const subscription = this.actor.subscribe(callback);
    return () => subscription.unsubscribe();
  }

  send(event: CRUDEvent) {
    if (!event || !event.type) return;
    this.actor.send(event);
  }

  getContext() {
    return this.getSnapshot().context;
  }

  getContextData() {
    return this.getSnapshot().context.data;
  }

  getVersionHistory() {
    return this.getSnapshot().context.versions;
  }
}