declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(
    handler: (req: Request) => Response | Promise<Response>
  ): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type AiFinanceRequest = {
  range?: string;
  mode?: string;
  question?: string;
  analysis?: unknown;
  automation?: unknown;
};

type AiProvider = "gemini" | "openai";

const systemInstruction =
  "Bạn là trợ lý phân tích tài chính cá nhân cho người làm theo ca Hub. Trả lời bằng tiếng Việt, ngắn gọn, thực tế, có số liệu cụ thể. Không đưa lời khuyên đầu tư. Tập trung vào thu nhập, chi tiêu, tiền/giờ, tiến độ mục tiêu, rủi ro dữ liệu và việc nên làm tiếp.";

function buildPrompt(body: AiFinanceRequest) {
  return (
    "Hãy xử lý yêu cầu AI tài chính dựa trên dữ liệu app đã tổng hợp. " +
    "Nếu mode là report thì viết báo cáo tuần/tháng dạng văn bản. " +
    "Nếu mode là plan thì lập kế hoạch ngày mai. " +
    "Nếu mode là anomalies thì chỉ ra bất thường. " +
    "Nếu mode là qa thì trả lời trực tiếp câu hỏi của người dùng. " +
    "Nếu không rõ, trả về theo 4 phần: Tổng quan, Điểm tốt, Cần chú ý, Việc nên làm tiếp.\n\n" +
    JSON.stringify(
      {
        range: body.range,
        mode: body.mode,
        question: body.question,
        analysis: body.analysis,
        automation: body.automation,
      },
      null,
      2
    )
  );
}

function getAiProvider(): AiProvider {
  const configuredProvider = Deno.env.get("AI_PROVIDER")?.toLowerCase();

  if (configuredProvider === "gemini" || configuredProvider === "openai") {
    return configuredProvider;
  }

  return Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_API_KEY")
    ? "gemini"
    : "openai";
}

function extractOutputText(data: unknown) {
  if (
    data &&
    typeof data === "object" &&
    "output_text" in data &&
    typeof data.output_text === "string"
  ) {
    return data.output_text;
  }

  if (data && typeof data === "object" && "candidates" in data) {
    const candidates = data.candidates;

    if (Array.isArray(candidates)) {
      const text = candidates
        .flatMap((candidate: unknown) => {
          if (
            !candidate ||
            typeof candidate !== "object" ||
            !("content" in candidate)
          ) {
            return [];
          }

          const content = candidate.content;

          if (
            !content ||
            typeof content !== "object" ||
            !("parts" in content) ||
            !Array.isArray(content.parts)
          ) {
            return [];
          }

          return content.parts
            .map((part: unknown) => {
              if (!part || typeof part !== "object" || !("text" in part)) {
                return "";
              }

              return typeof part.text === "string" ? part.text : "";
            })
            .filter(Boolean);
        })
        .join("\n")
        .trim();

      if (text) return text;
    }
  }

  if (data && typeof data === "object" && "steps" in data) {
    const steps = data.steps;
    if (Array.isArray(steps)) {
      const text = steps
        .flatMap((step: unknown) => {
          if (!step || typeof step !== "object" || !("content" in step)) {
            return [];
          }

          const content = step.content;
          if (!Array.isArray(content)) return [];

          return content
            .map((part: unknown) => {
              if (!part || typeof part !== "object" || !("text" in part)) {
                return "";
              }

              return typeof part.text === "string" ? part.text : "";
            })
            .filter(Boolean);
        })
        .join("\n")
        .trim();

      if (text) return text;
    }
  }

  if (!data || typeof data !== "object" || !("output" in data)) {
    return "";
  }

  const output = data.output;
  if (!Array.isArray(output)) return "";

  return output
    .flatMap((item: unknown) => {
      if (!item || typeof item !== "object" || !("content" in item)) {
        return [];
      }

      const content = item.content;
      if (!Array.isArray(content)) return [];

      return content
        .map((part: unknown) => {
          if (!part || typeof part !== "object" || !("text" in part)) {
            return "";
          }

          return typeof part.text === "string" ? part.text : "";
        })
        .filter(Boolean);
    })
    .join("\n")
    .trim();
}

async function getProviderError(response: Response) {
  const errorText = await response.text();

  try {
    const payload = JSON.parse(errorText) as {
      error?: {
        code?: string;
        message?: string;
        type?: string;
      };
      message?: string;
    };
    const message =
      payload.error?.message ?? payload.message ?? errorText;
    const code = payload.error?.code ?? payload.error?.type;

    return code ? `${message} (${code})` : message;
  } catch {
    return errorText || "OpenAI request failed";
  }
}

async function callOpenAi(body: AiFinanceRequest) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1-mini";

  if (!apiKey) {
    return Response.json(
      { error: "Missing OPENAI_API_KEY" },
      { status: 500, headers: corsHeaders }
    );
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: systemInstruction,
      input: buildPrompt(body),
    }),
  });

  if (!response.ok) {
    const errorMessage = await getProviderError(response);

    return Response.json(
      { error: `OpenAI ${response.status}: ${errorMessage}` },
      { status: response.status, headers: corsHeaders }
    );
  }

  const data = await response.json();
  const text = extractOutputText(data);

  return Response.json(
    { provider: "openai", text: text || "AI chưa trả về nội dung." },
    { headers: corsHeaders }
  );
}

async function callGemini(body: AiFinanceRequest) {
  const apiKey = Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GOOGLE_API_KEY");
  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";

  if (!apiKey) {
    return Response.json(
      { error: "Missing GEMINI_API_KEY" },
      { status: 500, headers: corsHeaders }
    );
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: buildPrompt(body) }],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorMessage = await getProviderError(response);

    return Response.json(
      { error: `Gemini ${response.status}: ${errorMessage}` },
      { status: response.status, headers: corsHeaders }
    );
  }

  const data = await response.json();
  const text = extractOutputText(data);

  return Response.json(
    { provider: "gemini", text: text || "AI chưa trả về nội dung." },
    { headers: corsHeaders }
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const body = (await req.json()) as AiFinanceRequest;

    if (!body.analysis) {
      return Response.json(
        { error: "Missing analysis payload" },
        { status: 400, headers: corsHeaders }
      );
    }

    return getAiProvider() === "gemini"
      ? await callGemini(body)
      : await callOpenAi(body);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
});
