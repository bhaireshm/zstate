# zstate

<div id="badges">
<img alt="npm-link" src="https://img.shields.io/npm/v/%40bhaireshm%2Fzstate?link=https%3A%2F%2Fwww.npmjs.com%2Fpackage%2F%40bhaireshm%2Fzstate&color=blue">
<img alt="npm-package-size" src="https://img.shields.io/bundlephobia/min/%40bhaireshm%2Fzstate?label=pkg%20size">
<img alt="total-downloads" src="https://img.shields.io/npm/dt/%40bhaireshm/zstate?color=blue">

</div>

The `CRUDMachine` is a versatile tool for managing data with Create, Read, Update, and Delete operations. It also supports undo and redo functionalities if versioning is enabled. Below is a step-by-step guide on how to use the `CRUDMachine`, including examples and customization options.

## Step-by-Step Procedure

1. **Import the CRUDMachine:**

   First, import the `CRUDMachine` and necessary types from the module.

   ```typescript
   import { CRUDMachine } from "@bhaireshm/zstate";
   import type { CRUDOptions } from "@bhaireshm/zstate";
   ```

2. **Define Your Data Structure:**

   Define the structure of the data you want to manage. For example, if you are managing a list of users:

   ```typescript
   interface User {
     id: string;
     name: string;
     email: string;
   }
   ```

3. **Set Up CRUD Options:**

   Create an options object to configure your `CRUDMachine`. You can specify initial data, enable versioning, and define custom transitions.

   ```typescript
   const options: CRUDOptions<User[]> = {
     initialData: [],
     enableVersioning: true,
     maxVersions: 10,
     transitions: {
       customAction: (context, event) => {
         // Custom transition logic
         return {};
       },
     },
   };
   ```

4. **Initialize the CRUDMachine:**

   Instantiate the `CRUDMachine` with the options defined.

   ```typescript
   const userCRUD = new CRUDMachine(options);
   ```

5. **Perform CRUD Operations:**

   Use the methods provided by the `CRUDMachine` to manipulate your data.

   - **Create:**

     ```typescript
     userCRUD.create([{ id: "1", name: "John Doe", email: "john@example.com" }]);
     ```

   - **Read:**

     ```typescript
     const user = userCRUD.read("0"); // Read the first user
     ```

   - **Update:**

     ```typescript
     userCRUD.update([{ id: "1", name: "John Smith", email: "john.smith@example.com" }]);
     ```

   - **Delete:**

     ```typescript
     userCRUD.delete("0"); // Delete the first user
     ```

6. **Undo and Redo:**

   If versioning is enabled, you can undo and redo changes.

   ```typescript
   userCRUD.undo(); // Undo the last operation
   userCRUD.redo(); // Redo the last undone operation
   ```

7. **Subscribe to State Changes:**

   You can subscribe to state changes to react to data updates.

   ```typescript
   const unsubscribe = userCRUD.subscribe((state) => {
     console.log("State updated:", state);
   });

   // Call unsubscribe() when you no longer need to listen to updates
   ```

8. **Access Version History:**

   Retrieve the version history if versioning is enabled.

   ```typescript
   const history = userCRUD.getVersionHistory();
   console.log("Version History:", history);
   ```

### Customization Options

- **Custom Transitions:**

  You can define custom transitions in the `transitions` option to handle specific events.

- **Versioning:**

  Enable versioning to keep track of changes and allow undo/redo operations.

- **Max Versions:**

  Limit the number of versions stored to manage memory usage.

By following these steps, you can effectively use the `CRUDMachine` to manage your application's data with flexibility and control.
