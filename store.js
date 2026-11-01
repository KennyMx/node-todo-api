// use array to store todos in memory and incrementing ids
const todos = [];
let nextId = 1;

// return all todos
function listTodos() {
  return todos;
}

// find a todo by id
function findTodo(id) {
  return todos.find(item => item.id === id);
}

// create and store a todo
function createTodo(title, ownerId) {
  const todo = {
    id: nextId++,
    title,
    ownerId,
    completed: false // by default
  };

  todos.push(todo);
  return todo;
}

// remove a todo by id
function deleteTodo(id) {
  const index = todos.findIndex(item => item.id === id);

  // check if todo exists
  if (index === -1) {
    return false;
  }

  todos.splice(index, 1);
  return true;
}

module.exports = { listTodos, findTodo, createTodo, deleteTodo };
