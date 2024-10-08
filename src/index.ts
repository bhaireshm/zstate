import { ActorRefFrom, StateFrom, assign, createActor, createMachine } from 'xstate';

type DeepPartial<T> = T extends object ? {
  [P in keyof T]?: DeepPartial<T[P]>;
} : T;

type CRUDEvent =
  | { type: 'CREATE'; data: any }
  | { type: 'READ'; path?: string }
  | { type: 'UPDATE'; data: any }
  | { type: 'DELETE'; path: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: string;[key: string]: any }; // Allow custom actions

interface VersionedData<T> {
  data: T;
  timestamp: Date;
}

interface CRUDContext<T> {
  data: T;
  versions: VersionedData<T>[];
  currentVersion: number;
}

interface CRUDOptions<T> {
  initialData: T;
  enableVersioning?: boolean;
  maxVersions?: number;
  transitions?: Record<string, (context: CRUDContext<T>, event: any) => Partial<CRUDContext<T>>>;
}

type CRUDMachine<T extends object> = ReturnType<typeof createGenericCRUDMachine<T>>;
type CRUDActor<T extends object> = ActorRefFrom<CRUDMachine<T>>;
type CRUDState<T extends object> = StateFrom<CRUDMachine<T>>;

interface CRUDMachineInterface<T extends object> {
  create: (data: DeepPartial<T>) => void;
  read: (path?: string) => any;
  update: (data: DeepPartial<T>) => void;
  delete: (path: string) => void;
  undo: () => void;
  redo: () => void;
  subscribe: (callback: (state: CRUDState<T>) => void) => () => void;
  getSnapshot: () => CRUDState<T>;
  send: (event: CRUDEvent) => void;
  getContextData: () => T;
  getVersionHistory: () => VersionedData<T>[];
}

function createGenericCRUDMachine<T extends object>(options: CRUDOptions<T>) {
  const {
    initialData,
    enableVersioning = false,
    maxVersions = 10,
    transitions = {}
  } = options;

  return createMachine(
    {
      id: 'genericCRUD',
      initial: 'idle',
      context: {
        data: initialData,
        versions: enableVersioning ? [{ data: initialData, timestamp: new Date() }] : [],
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
              Object.entries(transitions).map(([key, action]) => [key, { actions: key }])
            )
          }
        }
      }
    },
    {
      actions: {
        create: assign(({ context, event }) => {
          if (event.type !== 'CREATE') return context;
          const newData = deepMerge(context.data, event.data);
          return updateContextAndVersion(context, newData, enableVersioning, maxVersions);
        }),
        read: assign(({ context, event }) => {
          if (event.type !== 'READ') return context;
          const path = event.path || '';
          const value = getNestedValue(context.data, path);
          return { ...context, data: value };
        }),
        update: assign(({ context, event }) => {
          if (event.type !== 'UPDATE') return context;
          const updatedData = deepMerge(context.data, event.data);
          return updateContextAndVersion(context, updatedData, enableVersioning, maxVersions);
        }),
        delete: assign(({ context, event }) => {
          if (event.type !== 'DELETE') return context;
          const updatedData = removeNestedProperty(context.data, event.path);
          return updateContextAndVersion(context, updatedData, enableVersioning, maxVersions);
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
    });
}

function updateContextAndVersion<T>(context: CRUDContext<T>, newData: T, enableVersioning: boolean, maxVersions: number): CRUDContext<T> {
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

// Helper functions
function deepMerge<T>(target: T, source: DeepPartial<T>): T {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key as keyof DeepPartial<T>])) {
        if (!(key in target)) {
          Object.assign(output as object, { [key]: source[key as keyof DeepPartial<T>] });
        } else {
          output[key as keyof T] = deepMerge(target[key as keyof T], source[key as keyof DeepPartial<T>] as DeepPartial<T[keyof T]>);
        }
      } else {
        Object.assign(output as object, { [key]: source[key as keyof DeepPartial<T>] });
      }
    });
  }
  return output;
}

function isObject(item: unknown): item is object {
  return typeof item === 'object' && item !== null && !Array.isArray(item);
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((prev, curr) => prev?.[curr], obj);
}

function removeNestedProperty(obj: any, path: string): any {
  const parts = path.split('.');
  const last = parts.pop();
  const parent = parts.reduce((prev, curr) => prev?.[curr], obj);
  if (parent && last) {
    delete parent[last];
  }
  return obj;
}

function createCRUDInterface<T extends object>(options: CRUDOptions<T>): CRUDMachineInterface<T> {
  const machine = createGenericCRUDMachine(options);
  const actor = createActor(machine);
  actor.start();

  return {
    create: (data: DeepPartial<T>) => actor.send({ type: 'CREATE', data }),
    read: (path?: string) => actor.send({ type: 'READ', path }),
    update: (data: DeepPartial<T>) => actor.send({ type: 'UPDATE', data }),
    delete: (path: string) => actor.send({ type: 'DELETE', path }),
    undo: () => actor.send({ type: 'UNDO' }),
    redo: () => actor.send({ type: 'REDO' }),
    subscribe: (callback: (state: CRUDState<T>) => void) => {
      const subscription = actor.subscribe(callback);
      return () => subscription.unsubscribe();
    },
    getSnapshot: () => actor.getSnapshot(),
    send: (event: CRUDEvent) => actor.send(event),
    getContextData: () => actor.getSnapshot().context.data,
    getVersionHistory: () => actor.getSnapshot().context.versions
  };
}

export default createCRUDInterface;