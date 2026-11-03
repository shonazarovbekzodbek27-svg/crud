const http = require("node:http");
const bcrypt = require("bcrypt");
const { read_file, write_file } = require("./fs/file-manager");

const PORT = 3000;

function send(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function get_body(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error("Request body is too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

function public_user(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

const app = http.createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    // GET / — brauzerda server ishlayotganini ko'rsatish
    if (method === "GET" && pathname === "/") {
      return send(res, 200, {
        message: "Server ishlayapti!",
        endpoints: {
          register: "POST /register",
          login: "POST /login",
          allUsers: "GET /users",
          oneUser: "GET /users/:id",
          updateUser: "PUT /users/:id",
          changePassword: "PATCH /change_password/:id",
          deleteUser: "DELETE /users/:id"
        },
        note: "POST, PUT, PATCH va DELETE so'rovlarini Postman yoki Thunder Client orqali yuboring."
      });
    }

    // GET /users — barcha foydalanuvchilar
    if (method === "GET" && pathname === "/users") {
      const users = await read_file();
      return send(res, 200, users.map(public_user));
    }

    // GET /users/:id — bitta foydalanuvchi
    if (method === "GET" && /^\/users\/\d+$/.test(pathname)) {
      const id = Number(pathname.split("/")[2]);
      const users = await read_file();
      const user = users.find((item) => item.id === id);

      if (!user) return send(res, 404, { message: "User not found" });
      return send(res, 200, public_user(user));
    }

    // POST /register — ro'yxatdan o'tish, parol bcrypt bilan hash qilinadi
    if (method === "POST" && pathname === "/register") {
      const body = await get_body(req);
      const { name, email, password } = body;

      if (!name || !email || !password) {
        return send(res, 400, { message: "name, email va password majburiy" });
      }
      if (String(password).length < 6) {
        return send(res, 400, { message: "Parol kamida 6 ta belgidan iborat bo'lsin" });
      }

      const users = await read_file();
      const exists = users.some(
        (user) => user.email.toLowerCase() === String(email).trim().toLowerCase()
      );
      if (exists) return send(res, 409, { message: "Bu email avval ro'yxatdan o'tgan" });

      const hashedPassword = await bcrypt.hash(String(password), 10);
      const newUser = {
        id: users.length ? Math.max(...users.map((user) => user.id)) + 1 : 1,
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
        password: hashedPassword
      };

      users.push(newUser);
      await write_file(users);
      return send(res, 201, {
        message: "Registration successful",
        user: public_user(newUser)
      });
    }

    // POST /login — parolni bcrypt.compare bilan tekshirish
    if (method === "POST" && pathname === "/login") {
      const body = await get_body(req);
      const { email, password } = body;

      if (!email || !password) {
        return send(res, 400, { message: "email va password majburiy" });
      }

      const users = await read_file();
      const user = users.find(
        (item) => item.email === String(email).trim().toLowerCase()
      );

      if (!user) return send(res, 401, { message: "Email yoki parol noto'g'ri" });

      const passwordIsCorrect = await bcrypt.compare(String(password), user.password);
      if (!passwordIsCorrect) {
        return send(res, 401, { message: "Email yoki parol noto'g'ri" });
      }

      return send(res, 200, {
        message: "Login successful",
        user: public_user(user)
      });
    }

    // PATCH /change_password/:id — parolni almashtirish
    if (method === "PATCH" && /^\/change_password\/\d+$/.test(pathname)) {
      const id = Number(pathname.split("/")[2]);
      const body = await get_body(req);
      const { oldPassword, newPassword } = body;

      if (!oldPassword || !newPassword) {
        return send(res, 400, { message: "oldPassword va newPassword majburiy" });
      }
      if (String(newPassword).length < 6) {
        return send(res, 400, { message: "Yangi parol kamida 6 ta belgidan iborat bo'lsin" });
      }

      const users = await read_file();
      const userIndex = users.findIndex((item) => item.id === id);
      if (userIndex === -1) return send(res, 404, { message: "User not found" });

      const oldPasswordIsCorrect = await bcrypt.compare(
        String(oldPassword),
        users[userIndex].password
      );
      if (!oldPasswordIsCorrect) {
        return send(res, 401, { message: "Eski parol noto'g'ri" });
      }

      users[userIndex].password = await bcrypt.hash(String(newPassword), 10);
      await write_file(users);
      return send(res, 200, { message: "Password changed successfully" });
    }

    // PUT /users/:id — ism yoki emailni yangilash
    if (method === "PUT" && /^\/users\/\d+$/.test(pathname)) {
      const id = Number(pathname.split("/")[2]);
      const body = await get_body(req);
      const users = await read_file();
      const userIndex = users.findIndex((item) => item.id === id);

      if (userIndex === -1) return send(res, 404, { message: "User not found" });
      if (body.name !== undefined) users[userIndex].name = String(body.name).trim();
      if (body.email !== undefined) {
        const email = String(body.email).trim().toLowerCase();
        const emailExists = users.some((user) => user.id !== id && user.email === email);
        if (emailExists) return send(res, 409, { message: "Bu email band" });
        users[userIndex].email = email;
      }

      await write_file(users);
      return send(res, 200, {
        message: "User updated",
        user: public_user(users[userIndex])
      });
    }

    // DELETE /users/:id — foydalanuvchini o'chirish
    if (method === "DELETE" && /^\/users\/\d+$/.test(pathname)) {
      const id = Number(pathname.split("/")[2]);
      const users = await read_file();
      const userIndex = users.findIndex((item) => item.id === id);

      if (userIndex === -1) return send(res, 404, { message: "User not found" });

      users.splice(userIndex, 1);
      await write_file(users);
      return send(res, 200, { message: "Deleted user" });
    }

    return send(res, 404, { message: "Route not found" });
  } catch (error) {
    console.error(error);
    const status = error.message === "Invalid JSON" ? 400 : 500;
    return send(res, status, { message: error.message || "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running at: http://localhost:${PORT}`);
});
