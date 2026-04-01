import express from "express";
import cors from "cors";
import { z } from "zod";
import { randomUUID } from "node:crypto";

const app = express();
app.use(cors());
app.use(express.json());

type Role = "sdr" | "closer" | "manager";
type Stage = "lead" | "proposal" | "negotiation" | "won" | "lost";

type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
};

type Session = {
  token: string;
  userId: string;
  createdAt: string;
};

type Ticket = {
  id: string;
  company: string;
  owner: string;
  source: "Outbound" | "Inbound" | "Indicacao" | "Evento";
  value: number;
  stage: Stage;
  targetDate: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
};

type TicketHistory = {
  id: string;
  ticketId: string;
  fromStage: string;
  toStage: string;
  reason: string;
  changedBy: string;
  changedAt: string;
};

const users: User[] = [
  { id: randomUUID(), name: "Gabriel", email: "gabriel@crm.com", password: "123456", role: "manager" },
  { id: randomUUID(), name: "Ana", email: "ana@crm.com", password: "123456", role: "closer" },
  { id: randomUUID(), name: "Caio", email: "caio@crm.com", password: "123456", role: "sdr" },
];

const sessions = new Map<string, Session>();
const tickets: Ticket[] = [];
const history: TicketHistory[] = [];

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(3),
  role: z.enum(["sdr", "closer", "manager"]),
});

const ticketCreateSchema = z.object({
  company: z.string().min(2),
  owner: z.string().min(2),
  source: z.enum(["Outbound", "Inbound", "Indicacao", "Evento"]),
  value: z.number().positive(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const stageTransitionSchema = z.object({
  stage: z.enum(["lead", "proposal", "negotiation", "won", "lost"]),
  reason: z.string().max(180).optional(),
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "saas-crm-api",
    users: users.length,
    sessions: sessions.size,
    tickets: tickets.length,
  });
});

app.post("/api/auth/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Payload invalido", issues: parsed.error.issues });
  }

  const user = users.find(
    (item) =>
      item.email === parsed.data.email &&
      item.password === parsed.data.password &&
      item.role === parsed.data.role
  );

  if (!user) {
    return res.status(401).json({ message: "Credenciais inválidas" });
  }

  const token = randomUUID();
  sessions.set(token, { token, userId: user.id, createdAt: new Date().toISOString() });

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

app.get("/api/auth/me", (req, res) => {
  const user = authenticate(req);
  if (!user) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  });
});

app.post("/api/tickets", (req, res) => {
  const user = authenticate(req);
  if (!user) {
    return res.status(401).json({ message: "Não autenticado" });
  }

  const parsed = ticketCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Payload invalido", issues: parsed.error.issues });
  }

  const savedTicket: Ticket = {
    id: randomUUID(),
    stage: "lead",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: user.id,
    ...parsed.data,
  };
  tickets.unshift(savedTicket);
  history.unshift({
    id: randomUUID(),
    ticketId: savedTicket.id,
    fromStage: "created",
    toStage: "lead",
    reason: "Ticket criado",
    changedBy: user.id,
    changedAt: new Date().toISOString(),
  });

  return res.status(201).json(savedTicket);
});

app.get("/api/tickets", (req, res) => {
  const user = authenticate(req);
  if (!user) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  return res.json({ items: tickets });
});

app.patch("/api/tickets/:id/stage", (req, res) => {
  const user = authenticate(req);
  if (!user) {
    return res.status(401).json({ message: "Não autenticado" });
  }

  const parsed = stageTransitionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Payload invalido", issues: parsed.error.issues });
  }

  if (!canMoveToStage(user.role, parsed.data.stage)) {
    return res.status(403).json({ message: "Perfil sem permissão para mover para este estágio" });
  }

  const ticket = tickets.find((item) => item.id === req.params.id);
  if (!ticket) {
    return res.status(404).json({ message: "Ticket não encontrado" });
  }

  if (ticket.stage === parsed.data.stage) {
    return res.json(ticket);
  }

  const fromStage = ticket.stage;
  ticket.stage = parsed.data.stage;
  ticket.updatedAt = new Date().toISOString();

  history.unshift({
    id: randomUUID(),
    ticketId: ticket.id,
    fromStage,
    toStage: parsed.data.stage,
    reason: parsed.data.reason || "Atualização de estágio",
    changedBy: user.id,
    changedAt: new Date().toISOString(),
  });

  return res.json(ticket);
});

app.get("/api/tickets/:id/history", (req, res) => {
  const user = authenticate(req);
  if (!user) {
    return res.status(401).json({ message: "Não autenticado" });
  }

  const ticketHistory = history.filter((item) => item.ticketId === req.params.id);
  return res.json({ items: ticketHistory });
});

app.get("/api/history", (req, res) => {
  const user = authenticate(req);
  if (!user) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  return res.json({ items: history });
});

app.listen(3333, () => {
  console.log("SaaS CRM API running on http://localhost:3333");
});

function authenticate(req: express.Request): User | null {
  const header = req.header("authorization");
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.replace("Bearer ", "").trim();
  const session = sessions.get(token);
  if (!session) return null;
  return users.find((item) => item.id === session.userId) || null;
}

function canMoveToStage(role: Role, stage: Stage): boolean {
  const map: Record<Role, Stage[]> = {
    sdr: ["lead", "proposal"],
    closer: ["lead", "proposal", "negotiation", "won", "lost"],
    manager: ["lead", "proposal", "negotiation", "won", "lost"],
  };
  return map[role].includes(stage);
}
