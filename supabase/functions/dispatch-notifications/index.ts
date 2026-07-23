import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

type AppIdentifier = "daymark" | "money_diary";

type NotificationJob = {
  id: string;
  user_id: string;
  app_identifier: AppIdentifier;
  notification_type: string;
  dedupe_key: string;
  payload: Record<string, unknown>;
  attempt_count: number;
};

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  failure_count: number;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const APP_CONFIG = {
  daymark: {
    badge: "/icons/daymark-badge-96.png",
    icon: "/icons/daymark-192.png",
    startUrl: "/daymark/today",
    title: "DayMark",
  },
  money_diary: {
    badge: "/icons/money-diary-badge-v2-96.png",
    icon: "/icons/money-diary-v2-192.png",
    startUrl: "/money",
    title: "Money Diary",
  },
} satisfies Record<
  AppIdentifier,
  { badge: string; icon: string; startUrl: string; title: string }
>;

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function normalizePayload(job: NotificationJob) {
  const config = APP_CONFIG[job.app_identifier];
  const payload = job.payload ?? {};
  const data =
    payload.data && typeof payload.data === "object"
      ? payload.data
      : {
          app: job.app_identifier,
          targetUrl: config.startUrl,
          type: job.notification_type,
        };

  return {
    ...payload,
    app: job.app_identifier,
    badge: payload.badge ?? config.badge,
    data: {
      ...data,
      app: job.app_identifier,
      targetUrl:
        "targetUrl" in data && typeof data.targetUrl === "string"
          ? data.targetUrl
          : config.startUrl,
    },
    icon: payload.icon ?? config.icon,
    tag: payload.tag ?? job.dedupe_key,
    title: payload.title ?? config.title,
  };
}

function getPushStatusCode(error: unknown) {
  if (!error || typeof error !== "object" || !("statusCode" in error)) {
    return 0;
  }

  return Number(error.statusCode);
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed" },
      { headers: corsHeaders, status: 405 }
    );
  }

  try {
    const cronSecret = getRequiredEnv("CRON_SECRET");
    if (request.headers.get("x-cron-secret") !== cronSecret) {
      return Response.json(
        { error: "Unauthorized" },
        { headers: corsHeaders, status: 401 }
      );
    }

    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const vapidPublicKey = getRequiredEnv("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = getRequiredEnv("VAPID_PRIVATE_KEY");
    const vapidSubject =
      Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const { data: dueJobs, error: jobsError } = await supabase
      .from("notification_jobs")
      .select(
        "id,user_id,app_identifier,notification_type,dedupe_key,payload,attempt_count"
      )
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(100);

    if (jobsError) throw jobsError;

    const results: Array<{
      id: string;
      status: "failed" | "sent" | "skipped";
    }> = [];

    for (const job of (dueJobs ?? []) as NotificationJob[]) {
      const { data: claimedRows, error: claimError } = await supabase
        .from("notification_jobs")
        .update({
          status: "processing",
          attempt_count: job.attempt_count + 1,
          last_error: null,
        })
        .eq("id", job.id)
        .eq("status", "pending")
        .select("id");

      if (claimError || !claimedRows?.length) {
        results.push({ id: job.id, status: "skipped" });
        continue;
      }

      const { data: subscriptions, error: subscriptionsError } = await supabase
        .from("push_subscriptions")
        .select("id,endpoint,p256dh,auth,failure_count")
        .eq("user_id", job.user_id)
        .eq("app_identifier", job.app_identifier)
        .eq("is_active", true);

      if (subscriptionsError) {
        await supabase
          .from("notification_jobs")
          .update({
            status: "failed",
            last_error: subscriptionsError.message,
          })
          .eq("id", job.id);
        results.push({ id: job.id, status: "failed" });
        continue;
      }

      let sentCount = 0;
      const errors: string[] = [];
      const payload = JSON.stringify(normalizePayload(job));

      for (const subscription of (subscriptions ?? []) as PushSubscriptionRow[]) {
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                auth: subscription.auth,
                p256dh: subscription.p256dh,
              },
            },
            payload,
            {
              TTL: 60 * 60 * 24,
              urgency: "normal",
            }
          );
          sentCount += 1;

          await supabase
            .from("push_subscriptions")
            .update({
              failure_count: 0,
              last_seen_at: new Date().toISOString(),
            })
            .eq("id", subscription.id);
        } catch (error) {
          const statusCode = getPushStatusCode(error);
          const message =
            error instanceof Error ? error.message : "Web Push failed";
          errors.push(message);

          await supabase
            .from("push_subscriptions")
            .update({
              failure_count: subscription.failure_count + 1,
              is_active: statusCode !== 404 && statusCode !== 410,
            })
            .eq("id", subscription.id);
        }
      }

      const sent = sentCount > 0;
      await supabase
        .from("notification_jobs")
        .update({
          status: sent ? "sent" : "failed",
          sent_at: sent ? new Date().toISOString() : null,
          last_error: sent
            ? null
            : errors.join("; ") || "Không có subscription đang hoạt động.",
        })
        .eq("id", job.id);

      results.push({ id: job.id, status: sent ? "sent" : "failed" });
    }

    return Response.json(
      {
        processed: results.length,
        results,
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { headers: corsHeaders, status: 500 }
    );
  }
});
