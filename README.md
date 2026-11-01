**Todo API built with Node.js**

Requires Node.js 22 or newer, so no packages need to be installed.

**Clone the repo:**

```bash
git clone https://github.com/KennyMx/node-todo-api.git
cd node-todo-api
```

**Start the server:**

```bash
npm start
```

The server runs at http://localhost:3000.
Keep it running and use a second terminal for the commands below.

**Run the automated tests:**

```bash
npm test
```

**Login as alice:**

```bash
curl -i -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"alice-password"}'
```

Expected: 200 with a token and user details.

**Copy the token value and save it in your terminal:**

```bash
ALICE_TOKEN="paste_alices_token_here"
```

**Login as bob:**

```bash
curl -i -X POST http://localhost:3000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"bob","password":"bob-password"}'
```

**Save bob's token:**

```bash
BOB_TOKEN="paste_bobs_token_here"
```

Tokens expire after one hour.

**Create a todo as alice:**

```bash
curl -i -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{"title":"Buy milk","category":"shopping"}'
```

Expected: 201 with the new todo.
If you leave out category it defaults to general, and new todos
have completed set to false.

**Copy the returned id and save it:**

```bash
TODO_ID=1
```

Replace 1 with the actual id if it is different.

**List todos without logging in:**

```bash
curl -i http://localhost:3000/todos
```

Expected: 200 with the list of todos.

**Get one todo:**

```bash
curl -i "http://localhost:3000/todos/$TODO_ID"
```

Expected: 200 with the todo.

**Search todos:**

```bash
curl -i "http://localhost:3000/todos?title=milk&category=shopping&completed=false"
```

Expected: 200 with matching todos.
Each filter can also be used on its own.
Title uses partial matches and category uses exact matches.
Capitalization doesn't matter for title or category searches.

**Update the todo as alice:**

```bash
curl -i -X PATCH "http://localhost:3000/todos/$TODO_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{"title":"Buy bread","category":"groceries","completed":true}'
```

Expected: 200 with the updated todo.
You can update one field or several at once.

**Try updating alice's todo as bob:**

```bash
curl -i -X PATCH "http://localhost:3000/todos/$TODO_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -d '{"completed":false}'
```

Expected: 403 because bob is not the owner.

**Try deleting alice's todo as bob:**

```bash
curl -i -X DELETE "http://localhost:3000/todos/$TODO_ID" \
  -H "Authorization: Bearer $BOB_TOKEN"
```

Expected: 403. The todo is not deleted.

**Try creating a todo without logging in:**

```bash
curl -i -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy milk"}'
```

Expected: 401 because a valid token is required.

**Try creating a todo with an empty title:**

```bash
curl -i -X POST http://localhost:3000/todos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -d '{"title":""}'
```

Expected: 400 because the title is required.

**Delete the todo as alice:**

```bash
curl -i -X DELETE "http://localhost:3000/todos/$TODO_ID" \
  -H "Authorization: Bearer $ALICE_TOKEN"
```

Expected: 204 with no response body.

**Check that it was deleted:**

```bash
curl -i "http://localhost:3000/todos/$TODO_ID"
```

Expected: 404 because the todo no longer exists.

**Storage:**

Todos and login sessions are stored in memory as a stand-in for the database layer, and you can clear by restarting the server.
