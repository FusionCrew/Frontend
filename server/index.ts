// server/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ── 기본 미들웨어 ─────────────────────────────────────────
app.use(cors({ origin: "*" })); // 프로덕션: 모든 origin 허용
app.use(express.json({ limit: "2mb" }));

// ── 정적 파일 제공 (프로덕션) ─────────────────────────────
// dist 폴더의 정적 파일 제공
app.use(express.static(path.join(__dirname, "..", "dist")));
// public 폴더의 정적 파일 제공 (Live2D 모델 등)
app.use("/models", express.static(path.join(__dirname, "..", "public", "models")));
app.use("/libs", express.static(path.join(__dirname, "..", "public", "libs")));

// ── OpenAI 클라이언트 ─────────────────────────────────────
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── 업로드: 메모리 저장 ────────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

// ──────────────────────────────────────────────────────────
// 1) STT: 오디오 -> 텍스트
// form-data: audio(Blob/File), model(선택), inputLang(선택)
// ──────────────────────────────────────────────────────────
app.post("/api/stt", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file?.buffer) return res.status(400).json({ text: "", error: "No audio" });

    const model = (req.body?.model as string) || "gpt-4o-transcribe"; // 또는 "whisper-1"
    const inputLang = (req.body?.inputLang as string) || "";
    const lang2 = inputLang.split("-")[0] || undefined;

    const file = await toFile(
      req.file.buffer,
      req.file.originalname || "speech.webm",
      { type: req.file.mimetype || "audio/webm" }
    );

    const tr = await openai.audio.transcriptions.create({
      file,
      model,
      ...(lang2 ? { language: lang2 } : {}),
      temperature: 0,
    });

    const text = (tr as any).text ?? (tr as any).output_text ?? "";
    res.json({ text: (text || "").trim() });
  } catch (e) {
    const err = e as any;
    console.error("[/api/stt] error:", err);
    res.status(500).json({ text: "", error: err?.message ?? "STT failed" });
  }
});

// ──────────────────────────────────────────────────────────
// 1-2) /api/transcribe: useMicStreamer가 사용하는 STT 엔드포인트
// /api/stt와 동일하지만 추가 파라미터 (stats, sttModel) 수용
// ──────────────────────────────────────────────────────────
app.post("/api/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file?.buffer) return res.status(400).json({ text: "", error: "No audio" });

    const model = (req.body?.sttModel as string) || (req.body?.model as string) || "gpt-4o-transcribe";
    const inputLang = (req.body?.inputLang as string) || "";
    const lang2 = inputLang.split("-")[0] || undefined;
    // stats는 디버깅용이므로 로그만 출력
    const stats = req.body?.stats ? JSON.parse(req.body.stats) : null;
    if (stats) {
      console.log("[/api/transcribe] audio stats:", stats);
    }

    const file = await toFile(
      req.file.buffer,
      req.file.originalname || "segment.wav",
      { type: req.file.mimetype || "audio/wav" }
    );

    const tr = await openai.audio.transcriptions.create({
      file,
      model,
      ...(lang2 ? { language: lang2 } : {}),
      temperature: 0,
    });

    const text = (tr as any).text ?? (tr as any).output_text ?? "";
    res.json({ text: (text || "").trim() });
  } catch (e) {
    const err = e as any;
    console.error("[/api/transcribe] error:", err);
    res.status(500).json({ text: "", error: err?.message ?? "STT failed" });
  }
});

// server/index.ts (기존 파일의 /api/llm 라우트만 교체)

  app.post("/api/llm", async (req, res) => {
    try {
      // 레거시: prompt로 받을 수도 있음
      const userText = (req.body?.prompt as string) ?? "";
      const model = (req.body?.model as string) || "gpt-4o-mini";
  
      // ✅ 프론트에서 보내주는 재고
      // 키는 아래 MENU_IDS를 그대로 쓰도록 맞추자 (프론트/서버 동일)
      const clientStock = (req.body?.stock as Record<string, number>) || {};
      // 서버에서도 허용 메뉴와 id를 명시 (모델에 강한 가이드 제공)
      const MENU = [
        { id: "classic",     name_ko: "클래식 버거" },
        { id: "cheese",      name_ko: "치즈 버거" },
        { id: "bacon",       name_ko: "베이컨 버거" },
        { id: "double",      name_ko: "더블 버거" },
        { id: "chicken",     name_ko: "치킨 버거" },
        { id: "shrimp",      name_ko: "쉬림프 버거" },
        { id: "bulgogi",     name_ko: "불고기 버거" },
        { id: "teriyaki",    name_ko: "테리야키 버거" },
        { id: "bbq",         name_ko: "바비큐 버거" },
        { id: "mushroom",    name_ko: "머쉬룸 버거" },
        { id: "jalapeno",    name_ko: "할라피뇨 버거" },
        { id: "avocado",     name_ko: "아보카도 버거" },
        { id: "veggie",      name_ko: "베지 버거" },
        { id: "chili",       name_ko: "칠리 버거" },
        { id: "truffle",     name_ko: "트러플 버거" },
        { id: "signature",   name_ko: "시그니처 버거" },
      ] as const;
  
      // 정책: 아이템당 최대 주문 수 / 한 번에 총 주문 수
      const MAX_PER_ITEM = 3;
      const MAX_TOTAL_QTY = 5;
  
      const stockTable = Object.fromEntries(
        MENU.map(m => [m.id, Math.max(0, Number(clientStock[m.id] ?? 0))])
      );
  
      // ===== 모델 시스템 프롬프트: 재고·정책·출력포맷 강제 =====
      const systemPrompt = `
You are an AI kiosk order agent for a burger restaurant.
Allowed menu (id:name):
${MENU.map(m => `- ${m.id}:${m.name_ko}`).join("\n")}

Rules:
- Use ONLY the allowed menu above. Map user's mention to the correct id.
- Match menu names flexibly and ALWAYS find a match:
  "베이컨 버거" → bacon, "치즈버거" → cheese, "클래식 버거" → classic,
  "불고기 버거" → bulgogi, "쉬림프 버거" → shrimp, "테리야키 버거" → teriyaki,
  "바비큐 버거" → bbq, "더블 버거" → double, "치킨 버거" → chicken, etc.
- If user says ANY menu name from the list above, process the order with the correct id.
- Respect inventory: current remaining stock (per item) is provided.
- Hard limits: max ${MAX_PER_ITEM} per single item, max ${MAX_TOTAL_QTY} items total.
- If user asks more than stock or the limits, reduce quantity to the maximum allowed.

IMPORTANT - Distinguish Questions from Orders:
- If user mentions ANY menu name from the allowed list (e.g., "불고기 버거 1개 주세요", "베이컨 버거", "치킨버거", "쉬림프 버거"), this is ALWAYS a NEW ORDER.
- Process the order immediately with the correct id from the menu list.
  Examples:
  "불고기 버거 1개 주세요" → items:[{"id":"bulgogi","qty":1}], message:"불고기 버거 1개를 주문하셨습니다."
  "베이컨 버거 1개 주세요" → items:[{"id":"bacon","qty":1}], message:"베이컨 버거 1개를 주문하셨습니다."
  "치즈 버거 주세요" → items:[{"id":"cheese","qty":1}], message:"치즈 버거 1개를 주문하셨습니다."
  "쉬림프 버거" → items:[{"id":"shrimp","qty":1}], message:"쉬림프 버거 1개를 주문하셨습니다."
- NEVER respond with "담을 수 없는 항목이 없습니다" for valid menu items.
- If user asks ABOUT past orders (e.g., "what did I order?", "내가 뭐 시켰지?"), this is a QUESTION - return empty items:[] and look for [주문내역: ...] in history.

For Questions About Past Orders:
- Search previous assistant messages for [주문내역: ...] tag
- Parse the information (e.g., "classic 1개" means they ordered 1 classic burger)
- Return items:[] and provide answer in message field
- Example: If you find [주문내역: classic 1개], respond with items:[] and message:"클래식 버거 1개를 주문하셨습니다."

For New Orders:
- User requests specific menu items → process as normal order with items array
- Apply stock limits and respond with appropriate items array

Order Processing:
- If the user's input is NOT related to ordering food (e.g., greetings only, random phrases, off-topic comments), return empty "items" and politely respond or ask them to place an order.
- Ignore STT hallucinations like "오늘 영상은 여기까지입니다", "감사합니다" (without order context), or unrelated phrases.
- If the user makes an unclear or invalid order request (e.g., menu items not on the list, vague requests), recommend a random available menu item from the list with stock > 0.
- If nothing valid, return empty "items".
- Keep a short, polite user-facing reply in the same language as the user text.

Response Format - Respond ONLY in the following JSON (no extra text):
{
  "items": [{"id":"classic","qty":2}, ...],
  "message": "string",
  "notes": ["optional", "warnings"]
}

Current stock (id:qty):
${Object.entries(stockTable).map(([k,v]) => `- ${k}:${v}`).join("\n")}
`.trim();
  
      // ===== 대화 히스토리 처리 =====
      // 클라이언트가 messages 배열을 보내면 그걸 사용, 아니면 userText만 사용
      const clientMessages = req.body?.messages;
      let conversationMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
      
      if (Array.isArray(clientMessages) && clientMessages.length > 0) {
        // 클라이언트가 이미 messages 형식으로 보낸 경우
        console.log('[/api/llm] 받은 messages:', JSON.stringify(clientMessages, null, 2));
        conversationMessages = clientMessages.map((msg: any) => ({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: String(msg.content || "")
        }));
      } else if (userText.trim()) {
        // 레거시: userText만 있는 경우
        console.log('[/api/llm] 레거시 prompt 모드:', userText);
        conversationMessages = [{ role: "user", content: userText }];
      } else {
        // 둘 다 없으면 에러
        console.error('[/api/llm] messages도 없고 prompt도 없음');
        return res.status(400).json({ text: "No messages or prompt provided" });
      }
      
      console.log('[/api/llm] 최종 conversationMessages:', JSON.stringify(conversationMessages, null, 2));

      // ===== 모델 호출 =====
      const r = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationMessages,
        ],
        temperature: 0.2, // 보수적으로
      });
  
      const raw = r.choices?.[0]?.message?.content?.trim() ?? "{}";
  
      // ===== 안전 파싱 =====
      function safeParse<T>(s: string): T | null {
        try { return JSON.parse(s) as T; } catch { return null; }
      }
      type Draft = { items?: { id: string; qty: number }[]; message?: string; notes?: string[] };
      const draft = safeParse<Draft>(raw) || { items: [], message: "" };
  
      // ===== 서버에서 2차 검증/보정 =====
      const sanitized: { id: string; qty: number }[] = [];
      let total = 0;
      for (const it of (draft.items || [])) {
        const id = String(it.id || "");
        const reqQty = Math.max(0, Math.floor(Number(it.qty || 0)));
        const stock = stockTable[id];
        const allowedId = MENU.some(m => m.id === id);
        if (!allowedId || reqQty <= 0) continue;
  
        // 정책: 아이템당 캡
        let q = Math.min(reqQty, MAX_PER_ITEM);
        // 재고 반영
        q = Math.min(q, Math.max(0, stock));
        // 총량 캡
        const remainTotal = Math.max(0, MAX_TOTAL_QTY - total);
        q = Math.min(q, remainTotal);
  
        if (q > 0) {
          sanitized.push({ id, qty: q });
          total += q;
        }
        if (total >= MAX_TOTAL_QTY) break;
      }
  
      // 경고/노트 구성
      const notes: string[] = Array.isArray(draft.notes) ? [...draft.notes] : [];
      if ((draft.items?.length || 0) && sanitized.length === 0) {
        notes.push("재고/정책 제한으로 인해 담을 수 있는 품목이 없습니다.");
      }
      // 재고/정책으로 줄어든 항목을 알려주기 (선택)
      for (const it of (draft.items || [])) {
        const s = sanitized.find(x => x.id === it.id);
        if (!s && (it.qty ?? 0) > 0) {
          notes.push(`${it.id} 요청 수량이 제한/재고로 인해 0개로 조정됨`);
        } else if (s && s.qty < it.qty) {
          notes.push(`${it.id} ${it.qty} → ${s.qty}개로 조정됨`);
        }
      }
  
      const message = (draft.message || "").trim() || (sanitized.length
        ? "주문을 확인했습니다."
        : "담을 수 있는 항목이 없습니다.");
  
      // 프론트가 재고 차감까지 하려면, 적용 후 재고를 돌려주면 편리
      const newStock = { ...stockTable };
      for (const it of sanitized) newStock[it.id] = Math.max(0, newStock[it.id] - it.qty);
  
      return res.json({
        text: message,
        order: sanitized,  // [{id, qty}]
        notes,
        // 프런트가 원하면 이걸로 즉시 차감 적용 가능
        updatedStock: newStock,
        // 디버깅용(원본)
        // raw: draft,
      });
    } catch (e: any) {
      res.status(500).json({ text: "", error: e.message });
    }
  });
  
 
// ──────────────────────────────────────────────────────────
// 자유 추천용 LLM 라우트: 클라이언트가 '한 문장 추천' 등 자유 텍스트 응답을 요청할 때 사용
app.post("/api/recommend", async (req, res) => {
  try {
    const model = (req.body?.model as string) || "gpt-4o-mini";
    
    // 클라이언트가 messages 배열을 보내면 그걸 사용
    const clientMessages = req.body?.messages;
    let conversationMessages: Array<{ role: "user" | "assistant"; content: string }> = [];
    
    if (Array.isArray(clientMessages) && clientMessages.length > 0) {
      conversationMessages = clientMessages.map((msg: any) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: String(msg.content || "")
      }));
    } else {
      // 레거시: prompt만 있는 경우
      const userPrompt = (req.body?.prompt as string) || "";
      if (!userPrompt.trim()) return res.status(400).json({ text: "" });
      conversationMessages = [{ role: "user", content: userPrompt }];
    }

    const r = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: "You are a helpful assistant that returns a short recommendation sentence. Always speak in Korean (Hangul), using polite (formal) expressions." },
        ...conversationMessages,
      ],
      // GPT-5 모델은 temperature와 max_completion_tokens 커스터마이징 불가 (기본값만 지원)
      ...(model.startsWith('gpt-5') ? {} : { temperature: 0.8, max_completion_tokens: 60 }),
    });
    const out = r.choices?.[0]?.message?.content?.trim() ?? "";
    res.json({ text: out });
  } catch (e: any) {
    console.error("[/api/recommend] error:", e);
    res.status(500).json({ text: "", error: e?.message ?? "recommend failed" });
  }
});

// ──────────────────────────────────────────────────────────
// Naver Clova TTS integration (proxy)
// Requires environment variables: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET
// ──────────────────────────────────────────────────────────
app.get("/api/clova-voices", async (_req, res) => {
  try {
    // If the deploy has an explicit CLOVA_VOICES env (comma-separated id:name),
    // parse and return it as authoritative list. Otherwise return a curated
    // list based on common Clova Korean voices.
    const envList = process.env.CLOVA_VOICES;
    let speakers: { id: string; name: string }[] = [];
    if (envList && typeof envList === "string") {
      speakers = envList.split(",").map(s => {
        const [id, ...rest] = s.split(":");
        return { id: id.trim(), name: rest.join(":").trim() || id.trim() };
      }).filter(x => x.id);
    }
    if (!speakers.length) {
      // curated fallback list (common Korean speakers / example names)
      speakers = [
        { id: "nara", name: "Nara (Korean, female)" },
        { id: "mijin", name: "Mijin (Korean, female)" },
        { id: "jinho", name: "Jinho (Korean, male)" },
        { id: "yuna", name: "Yuna (Korean, female)" },
        { id: "clara", name: "Clara (Korean, female)" },
        { id: "sora", name: "Sora (Korean, female)" },
      ];
    }
    res.json({ voices: speakers });
  } catch (e: any) {
    console.error("[/api/clova-voices] error:", e);
    res.status(500).json({ voices: [] });
  }
});

app.post("/api/clova-tts", express.json(), async (req, res) => {
  try {
    const { text, speaker = "nara", speed = "0", format = "mp3" } = req.body || {};
    if (!text || typeof text !== "string") return res.status(400).json({ error: "text required" });

    const clientId = process.env.NAVER_CLIENT_ID || process.env.NCLOUD_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET || process.env.NCLOUD_CLIENT_SECRET;
    if (!clientId || !clientSecret) return res.status(500).json({ error: "Clova credentials not configured" });

    const apiUrl = "https://naveropenapi.apigw.ntruss.com/tts-premium/v1/tts";
    // Build form-urlencoded body
    const body = new URLSearchParams();
    body.append("speaker", speaker);
    body.append("speed", String(speed));
    body.append("text", text);
    body.append("format", format);

    const r = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "x-ncp-apigw-api-key-id": clientId,
        "x-ncp-apigw-api-key": clientSecret,
      },
      body: body.toString(),
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      console.error("[/api/clova-tts] upstream error:", r.status, errText);
      return res.status(502).json({ error: "Clova TTS request failed", status: r.status, detail: errText });
    }

    const arrayBuffer = await r.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = format === "wav" ? "audio/wav" : "audio/mpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", String(buffer.length));
    res.send(buffer);
  } catch (e: any) {
    console.error("[/api/clova-tts] error:", e);
    res.status(500).json({ error: e?.message || "clova tts failed" });
  }
});

// ──────────────────────────────────────────────────────────
// 워밍업: useMicStreamer가 초기화할 때 호출
// ──────────────────────────────────────────────────────────
app.post("/api/warmup", async (req, res) => {
  try {
    const { sttModel, llmModel, warmupLanguage } = req.body;
    console.log("[/api/warmup] Models ready:", { sttModel, llmModel, warmupLanguage });
    // 실제 워밍업이 필요하면 여기서 모델을 미리 호출할 수 있음
    // 지금은 단순히 OK 응답
    res.json({ ok: true });
  } catch (e) {
    console.error("[/api/warmup] error:", e);
    res.status(500).json({ ok: false });
  }
});

// ──────────────────────────────────────────────────────────
// 번역: useMicStreamer가 사용하는 번역 엔드포인트
// 우리는 번역을 사용하지 않지만 (outputs=[]), 에러 방지를 위해 더미 구현
// ──────────────────────────────────────────────────────────
app.post("/api/translate", async (req, res) => {
  try {
    const { text, target, source, model } = req.body;
    console.log("[/api/translate] Translation request (not implemented):", { text, target, source, model });
    // 번역이 필요하면 여기서 OpenAI API를 호출해 번역 처리
    // 지금은 단순히 원문 반환
    res.json({ text: text || "" });
  } catch (e) {
    console.error("[/api/translate] error:", e);
    res.status(500).json({ text: "", error: "Translation failed" });
  }
});

// ──────────────────────────────────────────────────────────
// 헬스 체크 (서버 자체)
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/api/health", (_req, res) => res.json({ ok: true })); // 프록시용 별칭

// OpenAI 연결 여부 핑 (프런트 패널의 'LLM(OpenAI)' 불빛용)
app.get("/api/ping-openai", async (_req, res) => {
  try {
    // 가벼운 호출: 모델 목록 조회
    await openai.models.list();
    res.json({ ok: true });
  } catch (e) {
    console.error("[/api/ping-openai] error:", e);
    res.status(500).json({ ok: false });
  }
});

// ── SPA 폴백: 모든 경로를 index.html로 라우팅 (프로덕션) ──
// API 라우트가 아닌 모든 GET 요청을 index.html로
app.use((_req, res, next) => {
  if (!_req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
  } else {
    next();
  }
});

// ──────────────────────────────────────────────────────────
// 서버 시작
// ──────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`🚀 API server ready on http://localhost:${PORT}`);
});

export default app;
