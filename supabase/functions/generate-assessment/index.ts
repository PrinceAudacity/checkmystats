import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RequestBody {
  skill_id: string;
  question_count?: number;
}

interface QuestionOut {
  id: string;
  question_text: string;
  question_type: string;
  choices?: string[];
}

serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth token" }), {
        status: 401,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Server misconfiguration: Supabase credentials not set" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      data: { user },
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
      });
    }

    const { skill_id, question_count = 5 }: RequestBody = await req.json();

    const { data: questions, error: qError } = await supabase
      .from("assessment_questions")
      .select("id, question_text, question_type, choices")
      .eq("skill_id", skill_id)
      .limit(question_count);

    if (qError || !questions?.length) {
      return new Response(
        JSON.stringify({
          error: "No questions found for this skill",
          detail: qError?.message,
        }),
        { status: 404 }
      );
    }

    const { data: attempt, error: aError } = await supabase
      .from("user_assessment_attempts")
      .insert({
        user_id: user.id,
        skill_id,
        questions: questions.map((q: QuestionOut) => q.id),
      })
      .select("id")
      .single();

    if (aError) {
      return new Response(
        JSON.stringify({ error: "Failed to create attempt", detail: aError.message }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        attempt_id: attempt.id,
        questions: questions.map((q: QuestionOut) => ({
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          choices: q.choices,
        })),
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
    });
  }
});
