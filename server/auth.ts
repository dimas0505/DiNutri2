// Arquivo: server/auth.ts

import passport from "passport";
import { Strategy as Auth0Strategy, Profile } from "passport-auth0";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage.js";
import type { User } from "../shared/schema.js";

// Função para configurar a sessão, reutilizada do código anterior
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Check if we have the required environment variables
  if (!process.env.DATABASE_URL || !process.env.SESSION_SECRET) {
    console.warn('Missing session configuration, using memory store (not recommended for production)');
    // Fallback to memory store for development or when DB is not available
    return session({
      secret: process.env.SESSION_SECRET || 'fallback-secret-key-dev-only',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: sessionTtl,
      },
    });
  }

  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  return session({
    secret: process.env.SESSION_SECRET,
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

// Middleware que verifica se o usuário está logado
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  // Se não estiver autenticado, retorna 401 Unauthorized
  res.status(401).json({ message: "Unauthorized" });
};

// Função principal que configura toda a autenticação
export async function setupAuth(app: Express) {
  // Validação das variáveis de ambiente do Auth0
  const requiredVars = ['AUTH0_DOMAIN', 'AUTH0_CLIENT_ID', 'AUTH0_CLIENT_SECRET', 'BASE_URL'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    
    // In development, we can provide fallback routes
    if (process.env.NODE_ENV === 'development') {
      console.warn('Setting up development auth fallback...');
      // Add basic development auth routes
      app.get('/api/login', (req, res) => {
        res.status(501).json({ message: 'Auth0 not configured. Please set environment variables.' });
      });
      app.get('/api/logout', (req, res) => {
        res.status(501).json({ message: 'Auth0 not configured. Please set environment variables.' });
      });
      app.get('/api/callback', (req, res) => {
        res.status(501).json({ message: 'Auth0 not configured. Please set environment variables.' });
      });
      return;
    } else {
      throw new Error(`Auth0 environment variables are not fully configured: ${missingVars.join(', ')}`);
    }
  }

  // Função de verificação que o Passport-Auth0 usará
  const verify = async (
    accessToken: string,
    refreshToken: string,
    extraParams: any,
    profile: Profile,
    done: (error: any, user?: any) => void
  ) => {
    try {
      // Extraímos os dados do perfil do Auth0
      const userData = {
        email: profile.emails?.[0]?.value,
        firstName: profile.name?.givenName || profile.displayName,
        lastName: profile.name?.familyName,
        profileImageUrl: profile.photos?.[0]?.value, // CORREÇÃO: Usando profile.photos
        // Vamos atribuir o papel de nutricionista por padrão para testes.
        role: "nutritionist" as const,
      };

      if (!userData.email) {
        return done(new Error("Email not found in Auth0 profile"));
      }

      // Salvamos ou atualizamos o usuário no nosso banco de dados
      const user = await storage.upsertUser(userData);
      
      // Passamos o usuário para o Passport, que o salvará na sessão
      return done(null, user);
    } catch (error) {
      return done(error as Error);
    }
  };

  // Configuração da estratégia de autenticação do Auth0
  const strategy = new Auth0Strategy(
    {
      domain: process.env.AUTH0_DOMAIN,
      clientID: process.env.AUTH0_CLIENT_ID,
      clientSecret: process.env.AUTH0_CLIENT_SECRET,
      callbackURL: `${process.env.BASE_URL}/api/callback`,
      // A propriedade 'scope' foi removida daqui
    },
    verify
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

  // Rota de Login: redireciona o usuário para a página de login do Auth0
  app.get(
    "/api/login",
    passport.authenticate("auth0", {
      scope: "openid email profile", // CORREÇÃO: 'scope' movido para cá
    })
  );

  // Rota de Callback: o Auth0 redireciona para cá após o login
  app.get(
    "/api/callback",
    passport.authenticate("auth0", {
      successRedirect: "/", // Se o login der certo, vai para a home
      failureRedirect: "/api/login", // Se falhar, tenta logar de novo
    })
  );

  // Rota de Logout
  app.get("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) { return next(err); }
      // Monta a URL de logout do Auth0 para invalidar a sessão lá também
      const logoutURL = new URL(`https://${process.env.AUTH0_DOMAIN}/v2/logout`);
      logoutURL.searchParams.set("client_id", process.env.AUTH0_CLIENT_ID!);
      logoutURL.searchParams.set("returnTo", process.env.BASE_URL!);
      res.redirect(logoutURL.toString());
    });
  });
}