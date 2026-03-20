import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RequestBody {
  attempt_id: string;
  answers: Record<string, string>;
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

    // 2. Parse request
    const { attempt_id, answers }: RequestBody = await req.json();

    const { data: attempt, error: attemptErr } = await supabase
      .from("user_assessment_attempts")
      .select("*")
      .eq("id", attempt_id)
      .eq("user_id", user.id)
      .single();

    if (attemptErr || !attempt) {
      return new Response(
        JSON.stringify({ error: "Attempt not found" }),
        { status: 404 }
      );
    }

    const questionIds: string[] = attempt.questions;
    const { data: questions, error: questionsErr } = await supabase
      .from("assessment_questions")
      .select("id, correct_answer, explanation")
      .in("id", questionIds);

    if (questionsErr) {
      return new Response(
        JSON.stringify({ error: "Failed to load questions", detail: questionsErr.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
    if (!questions?.length) {
      return new Response(
        JSON.stringify({ error: "Questions not found" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const results = questions.map((q) => {
      const userAnswer = answers[q.id] ?? "";
      const correct = userAnswer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
      return {
        question_id: q.id,
        correct,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
      };
    });

    const correctCount = results.filter((r) => r.correct).length;
    const score = (correctCount / results.length) * 100;
    const passed = score >= 70;

    const { error: updateErr } = await supabase
      .from("user_assessment_attempts")
      .update({
        answers,
        score,
        passed,
        completed_at: new Date().toISOString(),
      })
      .eq("id", attempt_id);

    if (updateErr) {
      return new Response(
        JSON.stringify({ error: "Failed to save attempt results", detail: updateErr.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    let skillMastered = false;
    if (passed) {
      const { data: markResult, error: markErr } = await supabase.rpc("mark_skill_complete", {
        p_user_id: user.id,
        p_skill_id: attempt.skill_id,
      });
      if (markErr) {
        return new Response(
          JSON.stringify({ error: "Failed to update skill status", detail: markErr.message }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
      skillMastered = markResult?.success === true;
    }

    return new Response(
      JSON.stringify({
        score: Math.round(score * 100) / 100,
        passed,
        results,
        skill_mastered: skillMastered,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
    });
  }
});
