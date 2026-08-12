import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { hashPassword, comparePassword } from "../utils/hash";
import { signToken } from "../utils/jwt";
import { HttpError } from "../middleware/error.middleware";
import { AuthedRequest } from "../middleware/auth.middleware";
import { RegisterInput, LoginInput } from "../validators/auth.validator";

function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  trustScore: number;
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? undefined,
    bio: user.bio ?? undefined,
    location: user.location ?? undefined,
    avatarUrl: user.avatarUrl ?? undefined,
    trustScore: user.trustScore,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function register(
  req: Request<unknown, unknown, RegisterInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { name, email, phone, role, password } = req.body;

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: { name, email, phone, role, passwordHash },
    });

    const token = signToken({ userId: user.id, role: user.role });

    res.status(201).json({ token, user: toPublicUser(user) });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return next(new HttpError(409, "Email already registered"));
    }
    next(err);
  }
}

export async function login(
  req: Request<unknown, unknown, LoginInput>,
  res: Response,
  next: NextFunction
) {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return next(new HttpError(401, "Invalid email or password"));
    }

    const passwordMatches = await comparePassword(password, user.passwordHash);
    if (!passwordMatches) {
      return next(new HttpError(401, "Invalid email or password"));
    }

    const token = signToken({ userId: user.id, role: user.role });

    res.json({ token, user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId } = req as AuthedRequest;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return next(new HttpError(401, "Invalid or expired session"));
    }

    res.json({ user: toPublicUser(user) });
  } catch (err) {
    next(err);
  }
}
