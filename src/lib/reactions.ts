import { supabase } from "@/lib/supabase";
import type { Reaction } from "@/lib/types";

type Row = {
  id: string;
  created_at: string;
  memory_id: string;
  author: string;
  body: string;
};

const toReaction = (r: Row): Reaction => ({
  id: r.id,
  createdAt: r.created_at,
  memoryId: r.memory_id,
  author: r.author,
  body: r.body,
});

export async function listReactions(memoryId: string): Promise<Reaction[]> {
  const { data, error } = await supabase
    .from("reactions")
    .select("*")
    .eq("memory_id", memoryId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Row[]).map(toReaction);
}

export async function addReaction(
  memoryId: string,
  body: string,
): Promise<Reaction> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("You are not signed in.");

  const { data, error } = await supabase
    .from("reactions")
    .insert({ memory_id: memoryId, author: userId, body })
    .select("*")
    .single();
  if (error) throw error;
  return toReaction(data as Row);
}

/** Dengarkan reaction baru dari pasangan secara realtime. */
export function subscribeReactions(
  memoryId: string,
  onInsert: (reaction: Reaction) => void,
): () => void {
  const channel = supabase
    .channel(`reactions:${memoryId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "reactions",
        filter: `memory_id=eq.${memoryId}`,
      },
      (payload) => onInsert(toReaction(payload.new as Row)),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
