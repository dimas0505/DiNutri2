// Arquivo: server/auth.ts

import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage.js";
import type { User } from "../shared/schema.js";

// Função para configurar a sessão (sem alterações)
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

// Middleware que verifica se o usuário está logado (sem alterações)
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Função principal que configura a nova autenticação local
export async function setupAuth(app: Express) {
  // Configuração da estratégia de autenticação local (email/senha)
  const strategy = new LocalStrategy(
    { usernameField: 'email' }, // O campo de "usuário" é o email
    async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);

        // Se o usuário não existe ou não tem senha cadastrada
        if (!user || !user.hashedPassword) {
          return done(null, false, { message: 'Credenciais inválidas.' });
        }

        // Compara a senha fornecida com a senha criptografada no banco
        const isMatch = await bcrypt.compare(password, user.hashedPassword);

        if (!isMatch) {
          return done(null, false, { message: 'Credenciais inválidas.' });
        }

        // Se tudo estiver correto, retorna o usuário
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  );

  // Usa a estratégia no Passport
  passport.use(strategy);

  // Ensina o Passport a salvar o usuário na sessão (apenas o ID)
  passport.serializeUser((user, done) => {
    done(null, (user as User).id);
  });

  // Ensina o Passport a recuperar o usuário da sessão a partir do ID
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  // Configura os middlewares de sessão e do Passport no Express
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());
}