const { randomBytes, scryptSync, timingSafeEqual } = require("node:crypto");

// create a user with a hashed password
function createUser(id, username, password) {
  const salt = randomBytes(16).toString("hex");

  return {
    id,
    username,
    salt,
    passwordHash: scryptSync(password, salt, 64)
  };
}

// demo users for the exercise
const users = [
  createUser(1, "alice", "alice-password"),
  createUser(2, "bob", "bob-password")
];

// store login sessions in memory
const sessions = new Map();

// check credentials and create a session
function login(username, password) {
  const user = users.find(item => item.username === username);

  if (!user) {
    return null;
  }

  // hash the supplied password using the same salt
  const passwordHash = scryptSync(password, user.salt, 64);

  if (!timingSafeEqual(passwordHash, user.passwordHash)) {
    return null;
  }

  // create a random token that expires after one hour
  const token = randomBytes(32).toString("hex");

  sessions.set(token, {
    userId: user.id,
    expiresAt: Date.now() + 60 * 60 * 1000
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username
    }
  };
}

// get the logged in user from the bearer token
function authenticate(req) {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer ([a-f0-9]{64})$/i);

  if (!match) {
    return null;
  }

  const token = match[1];
  const session = sessions.get(token);

  if (!session) {
    return null;
  }

  // remove expired sessions
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }

  const user = users.find(item => item.id === session.userId);

  return user ? { id: user.id, username: user.username } : null;
}

module.exports = { login, authenticate };
