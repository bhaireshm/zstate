import CRUDMachineClass from "..";
import initialData from "./sample.json";

const crudMachine = new CRUDMachineClass<any>({
  initialData,
  enableVersioning: true,
  maxVersions: 15,
  transitions: {
    CUSTOM_ACTION: (context, event) => {
      // Custom action implementation
      return { ...context, /* modified context */ };
    }
  }
});

console.log("initial context", crudMachine.getContext());

// Use CRUD operations
crudMachine.create({ "config": { "theme": {}, "redux": {} } });

console.log("read template", crudMachine.read("template"));
crudMachine.update({ config: { theme: { mode: 'dark' } } });

console.log("updated config", crudMachine.read('config'));

crudMachine.undo();
console.log("config data after undoing update", crudMachine.read('config'));

// crudMachine.delete('config.redux');
console.log("config data after delete", crudMachine.read('config'));

crudMachine.undo();
console.log("config data after undoing delete", crudMachine.read('config'));

crudMachine.redo();
console.log("config data after redoing delete", crudMachine.read('config'));

// const unsubscribe = crudMachine.subscribe((state) => {
//   console.log('New state:', state.context.data);
// });
// crudMachine.send({ type: 'CUSTOM_ACTION', payload: { 1: 2 } });
// unsubscribe();

// console.log("final context", crudMachine.getContextData());
console.log("history", crudMachine.getVersionHistory());