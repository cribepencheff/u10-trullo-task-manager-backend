# u10 – Trullo Task Manager, Backend
  
  
### Setup and Configuration

Generate a secret key for JWT authentication by running this in the terminal:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

This will output a long string. Copy it and set it as your JWT_SECRET in your environment variables.