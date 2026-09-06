alter table public.matches add column if not exists save_payload jsonb;

create or replace function public.save_completed_match(
  p_match_id uuid,
  p_match jsonb,
  p_events jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payload jsonb := jsonb_build_object('match', p_match, 'events', p_events);
  v_existing_payload jsonb;
  v_saved_id uuid;
begin
  if jsonb_typeof(p_match) <> 'object' or jsonb_typeof(p_events) <> 'array' then
    raise exception 'Completed Match payload is invalid' using errcode = 'P0001';
  end if;

  if jsonb_array_length(p_events) <> coalesce((p_match->>'total_duels')::integer, -1) then
    raise exception 'Completed Match total_duels must equal event count' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(p_events) as event(
      winner_name text, loser_name text, winner_team text, loser_team text,
      shielded boolean, winner_cards jsonb, loser_cards jsonb,
      power_ups_used jsonb
    ) where winner_name is null or loser_name is null or winner_team is null
      or loser_team is null or shielded is null or winner_cards is null
      or loser_cards is null or power_ups_used is null
  ) then
    raise exception 'Completed Match contains an invalid Duel Event' using errcode = 'P0001';
  end if;

  insert into public.matches (
    id, winner_team, team1_roster, team2_roster,
    team1_initial_roster, team2_initial_roster,
    team1_powerups, team2_powerups, team1_score, team2_score,
    total_duels, duration_seconds, save_payload
  ) values (
    p_match_id,
    p_match->>'winner_team',
    array(select jsonb_array_elements_text(p_match->'team1_roster')),
    array(select jsonb_array_elements_text(p_match->'team2_roster')),
    array(select jsonb_array_elements_text(p_match->'team1_initial_roster')),
    array(select jsonb_array_elements_text(p_match->'team2_initial_roster')),
    p_match->'team1_powerups', p_match->'team2_powerups',
    (p_match->>'team1_score')::bigint, (p_match->>'team2_score')::bigint,
    (p_match->>'total_duels')::bigint,
    (p_match->>'duration_seconds')::integer,
    v_payload
  ) on conflict (id) do nothing
  returning id into v_saved_id;

  if v_saved_id is null then
    select save_payload into v_existing_payload
    from public.matches where id = p_match_id;
    if v_existing_payload = v_payload then return p_match_id; end if;
    raise exception 'Completed Match id conflicts with a different payload' using errcode = 'P0001';
  end if;

  insert into public.duel_events (
    match_id, round, winner_name, loser_name, winner_team, loser_team,
    shielded, winner_cards, loser_cards, winner_sum, loser_sum, power_ups_used
  )
  select p_match_id, event.round, event.winner_name, event.loser_name,
    event.winner_team, event.loser_team, event.shielded,
    event.winner_cards, event.loser_cards, event.winner_sum, event.loser_sum,
    event.power_ups_used
  from jsonb_to_recordset(p_events) as event(
    round integer, winner_name text, loser_name text, winner_team text,
    loser_team text, shielded boolean, winner_cards jsonb, loser_cards jsonb,
    winner_sum integer, loser_sum integer, power_ups_used jsonb
  );

  return p_match_id;
end;
$$;

revoke all on function public.save_completed_match(uuid, jsonb, jsonb) from public;
grant execute on function public.save_completed_match(uuid, jsonb, jsonb) to anon, authenticated;
