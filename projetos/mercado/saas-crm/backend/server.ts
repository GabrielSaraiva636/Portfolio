import express from "express";
import cors from "cors";
import { z } from "zod";

const app = express();
app.use(cors());
app.use(express.json());

const ticketSchema = z.object({
  company: z.string().min(2),
  owner: z.string().min(2),
  source: z.enum(["Outbound", "Inbound", "Indicacao", "Evento"]),
  value: z.number().positive(),
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "saas-crm-api" });
});

app.post("/api/tickets", (req, res) => {
  const parsed = ticketSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Payload invalido", issues: parsed.error.issues });
  }

  const savedTicket = {
    id: crypto.randomUUID(),
    stage: "lead",
    createdAt: new Date().toISOString(),
    ...parsed.data,
  };

  return res.status(201).json(savedTicket);
});

app.listen(3333, () => {
  console.log("SaaS CRM API running on http://localhost:3333");
});
