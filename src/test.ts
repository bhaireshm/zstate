import createCRUDInterface from ".";

interface MyData {
  user: {
    name: string;
    age: number;
  };
  settings: {
    theme: string;
  };
}

const initialData: MyData = {
  user: {
    name: 'John Doe',
    age: 30
  },
  settings: {
    theme: 'light'
  }
};

const crudMachine = createCRUDInterface<MyData>({
  initialData,
  enableVersioning: true,
  maxVersions: 5,
  transitions: {
    CUSTOM_ACTION: (context, event) => {
      // Custom action implementation
      return { ...context, /* modified context */ };
    }
  }
});

console.log("start", crudMachine.getContextData());

// Use CRUD operations
crudMachine.create({ user: { name: 'Jane Doe' } });
// const userData = crudMachine.read('user');
crudMachine.update({ settings: { theme: 'dark' } });
crudMachine.delete('user.age');

console.log("settings", crudMachine.read('settings'));

// Undo/Redo
crudMachine.undo();
// crudMachine.redo();

// Subscribe to changes
const unsubscribe = crudMachine.subscribe((state) => {
  console.log('New state:', state.context.data);
});

// Send custom events
crudMachine.send({ type: 'CUSTOM_ACTION', payload: { 1: 2 } });

// Later, when you want to unsubscribe
unsubscribe();

console.log("end", crudMachine.getContextData());
console.log("history", crudMachine.getVersionHistory());