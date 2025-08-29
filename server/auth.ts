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
      secure: process.env.NODE_ENV === 'production', // Usar cookies seguros em produção
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

// Middleware que verifica se o usuário é nutricionista
export const requireNutritionist: RequestHandler = (req: any, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  if (req.user.role !== "nutritionist") {
    return res.status(403).json({ message: "Access denied: Nutritionist role required" });
  }
  
  return next();
};

// Função principal que configura toda a autenticação
export async function setupAuth(app: Express) {
  // Validação das variáveis de ambiente do Auth0
  if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_CLIENT_ID || !process.env.AUTH0_CLIENT_SECRET || !process.env.BASE_URL) {
    throw new Error("Auth0 environment variables are not fully configured.");
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
      const email = profile.emails?.[0]?.value;
      
      if (!email) {
        return done(new Error("Email not found in Auth0 profile"));
      }

      // Check if this email is authorized to be a nutritionist
      const isAuthorized = await storage.isAuthorizedNutritionist(email);
      
      if (!isAuthorized) {
        // For now, deny access to unauthorized users
        // TODO: Later implement patient invitation flow
        return done(new Error("Access denied: You are not authorized to access this platform"));
      }

      // Extraímos os dados do perfil do Auth0
      const userData = {
        email: email,
        firstName: profile.name?.givenName || profile.displayName,
        lastName: profile.name?.familyName,
        profileImageUrl: profile.photos?.[0]?.value,
        // Only assign nutritionist role if authorized
        role: "nutritionist" as const,
      };

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