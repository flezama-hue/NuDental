import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import { randomBytes } from 'node:crypto';
import type { Database } from './db.js';
import { hashPassword, verifyPassword } from './passwords.js';
import { asyncRoute, cookieName, digest, fail, legacyCookieName, publicUser, rawCookie, sessionLife, text } from './support.js';
import { registerCoreRoutes } from './routes/core.js';
import { registerAdminRoutes } from './routes/admin.js';

export async function createApp(db: Database, options: { origin?: string; secure?: boolean } = {}) {
  const app = express();
  const origin = options.origin || process.env.APP_ORIGIN || 'http://localhost:3000';
  const secure = options.secure ?? process.env.NODE_ENV === 'production';
  const cookieOptions = { httpOnly: true, secure, sameSite: 'lax' as const, path: '/api' };
  const dummyHash = await hashPassword(randomBytes(32).toString('hex'));

  app.disable('x-powered-by');
  app.use('/api', (_req, res, next) => {
    res.set({ 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=()' }); next();
  });
  app.use('/api', (req, res, next) => {
    if (!['GET','HEAD','OPTIONS'].includes(req.method)) {
      if (req.get('Origin') !== origin) return fail(res,403,'ORIGIN_REJECTED','Origen de la solicitud no permitido.');
      if (!req.is('application/json')) return fail(res,415,'JSON_REQUIRED','Envía application/json.');
    }
    next();
  });
  app.use(express.json({ limit:'256kb' }));
  app.get('/api/health', asyncRoute(async (_req,res)=>{ await db.query('SELECT 1'); res.json({status:'ok',stage:'nudental-v0.2-views-1-2'}); }));

  const attempts = new Map<string,{count:number;until:number}>();
  const allowAttempt = (key:string) => { const now=Date.now(); for(const [k,v] of attempts) if(v.until<=now) attempts.delete(k); if(attempts.size>=5000&&!attempts.has(key)) return false; const v=attempts.get(key)||{count:0,until:now+15*60*1000}; v.count++; attempts.set(key,v); return v.count<=10; };

  app.post('/api/auth/login', asyncRoute(async (req,res)=>{
    const email=text(req.body?.email,254).toLowerCase(), password=req.body?.password;
    if(!email||typeof password!=='string'||password.length<1||password.length>128) return fail(res,400,'INVALID_INPUT','Revisa correo y contraseña.');
    if(!allowAttempt(`ip:${req.ip}`)||!allowAttempt(`email:${digest(email)}`)){res.set('Retry-After','900');return fail(res,429,'RATE_LIMITED','Espera 15 minutos antes de volver a intentar.');}
    const {rows}=await db.query('SELECT * FROM app_users WHERE email=$1 AND active=true',[email]); const user=rows[0];
    if(!user||!await verifyPassword(password,user.password_hash||dummyHash)) return fail(res,401,'INVALID_CREDENTIALS','Correo o contraseña incorrectos.');
    const raw=randomBytes(32).toString('hex'), old=rawCookie(req); if(old) await db.query('DELETE FROM auth_sessions WHERE token_hash=$1',[digest(old)]);
    await db.query('DELETE FROM auth_sessions WHERE expires_at<=now()'); await db.query('INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)',[digest(raw),user.id,new Date(Date.now()+sessionLife).toISOString()]);
    res.cookie(cookieName,raw,{...cookieOptions,maxAge:sessionLife});res.clearCookie(legacyCookieName,cookieOptions);res.json({user:publicUser(user)});
  }));
  app.post('/api/auth/logout',asyncRoute(async(req,res)=>{const raw=rawCookie(req);if(raw)await db.query('DELETE FROM auth_sessions WHERE token_hash=$1',[digest(raw)]);res.clearCookie(cookieName,cookieOptions);res.clearCookie(legacyCookieName,cookieOptions);res.status(204).end();}));

  const authenticated=asyncRoute(async(req,res,next)=>{const raw=rawCookie(req);if(!raw)return fail(res,401,'UNAUTHENTICATED','Inicia sesión para continuar.');const {rows}=await db.query(`SELECT u.* FROM auth_sessions s JOIN app_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true`,[digest(raw)]);if(!rows[0])return fail(res,401,'UNAUTHENTICATED','Tu sesión terminó; inicia sesión otra vez.');res.locals.user=rows[0];next();});
  const clinical:RequestHandler=(_req,res,next)=>{const u=res.locals.user;if(!u.clinic_id||!['clinic_admin','dentist'].includes(u.role))return fail(res,403,'FORBIDDEN','Tu rol no permite esta acción clínica.');next();};
  const laboratory:RequestHandler=(_req,res,next)=>{const u=res.locals.user;if(!u.laboratory_id||!['lab_manager','lab_technician'].includes(u.role))return fail(res,403,'FORBIDDEN','Tu rol no permite esta acción de laboratorio.');next();};
  const manager:RequestHandler=(_req,res,next)=>{const u=res.locals.user;if(!u.laboratory_id||u.role!=='lab_manager')return fail(res,403,'FORBIDDEN','Esta acción requiere administración del laboratorio.');next();};

  registerCoreRoutes(app,db,{authenticated,clinical});
  registerAdminRoutes(app,db,{authenticated,laboratory,manager});
  app.use('/api',(_req,res)=>fail(res,404,'NOT_IMPLEMENTED','La ruta solicitada no está implementada.'));
  const errors:ErrorRequestHandler=(error:any,_req,res,_next)=>{if(error.status&&error.code){fail(res,error.status,error.code,error.message);return;}if(error.code==='23505'){fail(res,409,'CONFLICT','Ya existe un registro con esa referencia.');return;}if(error.code==='23503'){fail(res,409,'RELATION_CONFLICT','La operación referencia un registro no disponible.');return;}if(error.code==='23514'){fail(res,400,'CONSTRAINT_ERROR','Los datos no cumplen una regla del sistema.');return;}if(error.type==='entity.parse.failed'||error.type==='entity.too.large'){fail(res,error.status||400,'INVALID_INPUT','Solicitud JSON inválida o demasiado grande.');return;}console.error('API failure',{code:error.code||error.name||'unknown'});fail(res,500,'INTERNAL_ERROR','No se pudo completar la operación.');};
  app.use(errors); return app;
}
