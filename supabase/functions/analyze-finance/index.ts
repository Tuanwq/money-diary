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
  analysis?: unknown;
};

function extractOutputText(data: unknown) {
  if (
    data &&
    typeof data === "object" &&
    "output_text" in data &&
    typeof data.output_text === "string"
  ) {
    return data.output_text;
  }

  if (!data || typeof data !== "object" || !("output" in data)) {
    return "";
  }

  const output = data.output;
  if (!Array.isArray(output)) return "";

  return output
    .flatMap((item) => {
      if (!item || typeof item !== "object" || !("content" in item)) {
        return [];
      }

      const content = item.content;
      if (!Array.isArray(content)) return [];

      return content
        .map((part) => {
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

async function getOpenAiError(response: Response) {
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
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1-mini";

    if (!apiKey) {
      return Response.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500, headers: corsHeaders }
      );
    }

    const body = (await req.json()) as AiFinanceRequest;

    if (!body.analysis) {
      return Response.json(
        { error: "Missing analysis payload" },
        { status: 400, headers: corsHeaders }
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
        instructions:
          "Bạn là trợ lý phân tích tài chính cá nhân cho người làm theo ca Hub. Trả lời bằng tiếng Việt, ngắn gọn, thực tế, có số liệu cụ thể. Không đưa lời khuyên đầu tư. Tập trung vào thu nhập, chi tiêu, tiền/giờ, tiến độ mục tiêu, rủi ro dữ liệu và việc nên làm tiếp.",
        input: [
          {
            role: "user",
            content:
              "Hãy phân tích dữ liệu tài chính đã được app tổng hợp. Trả về theo 4 phần: Tổng quan, Điểm tốt, Cần chú ý, Việc nên làm tiếp.\n\n" +
              JSON.stringify(
                {
                  range: body.range,
                  analysis: body.analysis,
                },
                null,
                2
              ),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorMessage = await getOpenAiError(response);

      return Response.json(
        { error: `OpenAI ${response.status}: ${errorMessage}` },
        { status: response.status, headers: corsHeaders }
      );
    }

    const data = await response.json();
    const text = extractOutputText(data);

    return Response.json(
      { text: text || "AI chưa trả về nội dung." },
      { headers: corsHeaders }
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500, headers: corsHeaders }
    );
  }
});
