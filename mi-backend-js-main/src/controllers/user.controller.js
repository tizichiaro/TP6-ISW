// Para empezar simple: “DB” en memoria (se puede reemplazar por real luego)
const users = [
  { id: 1, name: 'Ada Lovelace', email: 'ada@example.com' },
  { id: 2, name: 'Alan Turing', email: 'alan@example.com' }
];

let nextId = users.length + 1;

export const getUsers = (_req, res) => {
  res.json(users);
};

export const createUser = (req, res) => {
  const { name, email } = req.body || {};
  if (!name || !email) {
    return res.status(400).json({ message: 'name y email son obligatorios' });
  }
  const user = { id: nextId++, name, email };
  users.push(user);
  res.status(201).json(user);
};

