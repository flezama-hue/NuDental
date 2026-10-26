import 'dotenv/config';
import { connectDb } from './db.js';
import { createApp } from './app.js';
const db = await connectDb();
const app = await createApp(db);
const port = Number(process.env.API_PORT || 3001);
const server = app.listen(port, '127.0.0.1', () => console.log(`API local: http://127.0.0.1:${port}/api/health`));
for(const event of ['SIGINT','SIGTERM'] as const) process.on(event,()=>server.close(async()=>{await db.close();process.exit(0);}));
