# 3-dars — Node.js HTTP + bcrypt

## Papkalar tartibi

```text
3-dars/
├── fs/
│   └── file-manager.js
├── module/
│   └── user.json
├── index.js
├── package.json
└── package-lock.json  # npm install bajargandan keyin yaratiladi
```

## Ishga tushirish

Terminalda loyiha papkasiga kiring:

```bash
npm install
npm start
```

Server: http://localhost:3000

## API yo'llari

- `POST /register` — `{ "name": "Ali", "email": "ali@example.com", "password": "123456" }`
- `POST /login` — `{ "email": "ali@example.com", "password": "123456" }`
- `GET /users` — barcha foydalanuvchilar
- `GET /users/1` — ID bo'yicha bitta foydalanuvchi
- `PUT /users/1` — `{ "name": "Ali Valiyev" }` yoki emailni yangilash
- `PATCH /change_password/1` — `{ "oldPassword": "123456", "newPassword": "654321" }`
- `DELETE /users/1` — foydalanuvchini o'chirish

Barcha so'rovlar JSON formatida yuboriladi. Parollar bcrypt bilan hash qilinadi va API javoblarida parol/hash ko'rsatilmaydi.

**Eslatma:** Bu o'quv loyihasi. Haqiqiy ilovada login sessiyasi/token, HTTPS, rate limiting va qo'shimcha validatsiya ham kerak bo'ladi.
