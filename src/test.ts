import CRUDMachineClass from ".";
import initialData from "./sample.json";

const crudMachine = new CRUDMachineClass({
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

// console.log("start", crudMachine.getContextData());

// Use CRUD operations
crudMachine.create({ template: { name: 'new template' } });
// crudMachine.create("newData", { template: { name: 'new template' } });
// crudMachine.create("newData.template", { name: 'from nested' });
// crudMachine.create("newData.newKey", 2);
// crudMachine.update({ config: { theme: 'dark' } });
// crudMachine.delete('user.age');
// console.log("config", crudMachine.read('config'));

// // Undo/Redo
// crudMachine.undo();
// // crudMachine.redo();

// // Subscribe to changes
// const unsubscribe = crudMachine.subscribe((state) => {
//   console.log('New state:', state.context.data);
// });

// // Send custom events
// crudMachine.send({ type: 'CUSTOM_ACTION', payload: { 1: 2 } });

// // Later, when you want to unsubscribe
// unsubscribe();

// console.log("end", crudMachine.getContextData());
// console.log("history", crudMachine.getVersionHistory());