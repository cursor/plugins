% design.pl -- constraint search over ability layouts for a two-hero co-op toy.
%
% Question: which hero owns which of 8 abilities, so that six obstacles and a
% two-phase boss force the heroes to cooperate, without making either of them
% dead weight?  Every design rule is a named hypothesis.  SWI-Prolog + clpfd.
%
%   swipl design.pl -- search      all counts, ranking, writes out/*.cfg
%   swipl design.pl -- fix         the same after adding the rule TLC taught us
%
% Hero 0 is the Runner, hero 1 is the Brute (TLA+ calls them 1 and 2).

:- use_module(library(clpfd)).
:- use_module(library(lists)).
:- use_module(library(apply)).
:- initialization(main, main).

abilities([jump, dash, climb, swim, smash, shield, grapple, revive]).

% An obstacle is cleared by ANY ability in its list.
obstacles([ ledge  - [climb, grapple],
            gap    - [jump, dash],
            river  - [swim],
            wall   - [smash],
            spikes - [shield, jump],
            tower  - [climb, dash] ]).

% ---------------------------------------------------------------- variables
% Own[i] = the hero (0 or 1) who owns ability i.
layout_vars(Own) :-
    abilities(As), length(As, N), length(Own, N), Own ins 0..1.

own_of(Ability, Own, V) :-
    abilities(As), nth0(I, As, Ability), nth0(I, Own, V).

% B = 1 iff hero H owns Ability.  Reified, so it works on unbound layouts.
holds(Own, H, Ability, B) :- own_of(Ability, Own, V), B #<==> (V #= H).

holds_all([], _, _, []).
holds_all([A|As], Own, H, [B|Bs]) :- holds(Own, H, A, B), holds_all(As, Own, H, Bs).

% B = 1 iff hero H owns at least one ability of Reqs.
can_clear(Own, H, Reqs, B) :-
    holds_all(Reqs, Own, H, Bs), sum(Bs, #=, S), B #<==> (S #>= 1).

clear_flags([], _, _, []).
clear_flags([_-Reqs|Os], Own, H, [B|Bs]) :-
    can_clear(Own, H, Reqs, B), clear_flags(Os, Own, H, Bs).

solo_count(Own, H, N)  :- obstacles(Os), clear_flags(Os, Own, H, Fs), sum(Fs, #=, N).
owned_count(Own, H, N) :- abilities(As), holds_all(As, Own, H, Bs), sum(Bs, #=, N).

% Obstacles both heroes can clear on their own: a choice for the players.
overlap(Own, N) :-
    obstacles(Os), clear_flags(Os, Own, 0, F0), clear_flags(Os, Own, 1, F1),
    both(F0, F1, Bs), sum(Bs, #=, N).
both([], [], []).
both([A|As], [B|Bs], [C|Cs]) :- C #<==> (A #= 1 #/\ B #= 1), both(As, Bs, Cs).

% -------------------------------------------------------------- hypotheses
% Each one is a design rule the author can argue with.
hyp(balance, Own) :-                       % H1 nobody carries 6 abilities, nobody 2
    owned_count(Own, 0, A), owned_count(Own, 1, B), A in 3..5, B in 3..5.
hyp(not_dead_weight, Own) :-               % H2 each hero clears 2+ obstacles alone
    solo_count(Own, 0, A), solo_count(Own, 1, B), A #>= 2, B #>= 2.
hyp(needs_partner, Own) :-                 % H3 each hero is stuck on 2+ obstacles alone
    solo_count(Own, 0, A), solo_count(Own, 1, B), A #=< 4, B #=< 4.
hyp(phase1_split, Own) :-                  % H4 boss phase 1 needs both heroes
    own_of(smash, Own, S), own_of(dash, Own, D), S #\= D.
% Learned from the TLC counterexample (see run.md), not guessed up front:
hyp(strand_free, Own) :-                   % H5 the reviver holds no phase 2 ability
    own_of(revive, Own, R), own_of(shield, Own, Sh), own_of(grapple, Own, G),
    R #\= Sh, R #\= G.
% Heroes are interchangeable in the rules, so every design appears twice.
hyp(symmetry, Own) :- own_of(jump, Own, 0).

post_all([], _).
post_all([H|Hs], Own) :- hyp(H, Own), post_all(Hs, Own).

solutions(Hyps, Layouts) :-
    layout_vars(Own), post_all(Hyps, Own),
    findall(Own, labeling([ff], Own), Layouts).

% ------------------------------------------------------------------ ranking
% Lower is better: balanced, evenly loaded, with some overlap.
cost(Own, Cost) :-
    solo_count(Own, 0, SA), solo_count(Own, 1, SB),
    owned_count(Own, 0, NA), owned_count(Own, 1, NB),
    overlap(Own, Ov),
    Cost #= 10*abs(SA-SB) + 3*abs(NA-NB) - Ov.

ranked(Layouts, Ranked) :-
    findall(C-L, (member(L, Layouts), cost(L, C)), Pairs),
    keysort(Pairs, Ranked).             % keysort is stable: ties keep layout order

% ------------------------------------------------------------------ output
hero_name(0, 'Runner').
hero_name(1, 'Brute').

show_layout(Own) :-
    abilities(As),
    forall(member(H, [0,1]),
           ( findall(A, (nth0(I, As, A), nth0(I, Own, H)), Mine),
             solo_count(Own, H, Solo), hero_name(H, N),
             format("    ~w~t~8|~w  (clears ~w/6 alone)~n", [N, Mine, Solo]) )).

% Ability lists as TLC constants: hero 0 -> Abil1, hero 1 -> Abil2.
tla_set(Items, S) :-
    quote_all(Items, Qs),
    atomic_list_concat(Qs, ',', Body), format(atom(S), '{~w}', [Body]).
quote_all([], []).
quote_all([I|Is], [Q|Qs]) :- format(atom(Q), '"~w"', [I]), quote_all(Is, Qs).

emit_cfg(Own, File, Mode) :-
    abilities(As),
    findall(A, (nth0(I, As, A), nth0(I, Own, 0)), M0),
    findall(A, (nth0(I, As, A), nth0(I, Own, 1)), M1),
    tla_set(M0, S1), tla_set(M1, S2),
    setup_call_cleanup(open(File, write, Out), cfg_text(Out, S1, S2, Mode), close(Out)).

cfg_head(Out, S1, S2) :-
    format(Out, "SPECIFICATION Spec~nCONSTANTS~n  Abil1 = ~w~n  Abil2 = ~w~n  Hits1 = 2~n  Hits2 = 2~n",
           [S1, S2]).
cfg_text(Out, S1, S2, check) :-
    cfg_head(Out, S1, S2),
    format(Out, "INVARIANTS TypeOK NoSingleHeroWin NoStrand~nPROPERTY Terminates~n", []).
cfg_text(Out, S1, S2, reach) :-
    cfg_head(Out, S1, S2),
    format(Out, "\\* expected to FAIL: the trace is a witness that a mixed win exists~n", []),
    format(Out, "INVARIANT NoMixedWin~n", []).

% Writes a TLC config for EVERY ranked layout, prints only the first Show.
emit_top(Ranked, Show, Prefix) :- emit_each(Ranked, 1, Show, Prefix).
emit_each([], _, _, _).
emit_each([C-Own|T], K, Show, Prefix) :-
    ( K =< Show -> format("  #~d  cost ~d~n", [K, C]), show_layout(Own) ; true ),
    format(atom(F1), 'out/~w~d.cfg', [Prefix, K]),
    format(atom(F2), 'out/~w~d-reach.cfg', [Prefix, K]),
    emit_cfg(Own, F1, check), emit_cfg(Own, F2, reach),
    K1 is K + 1, emit_each(T, K1, Show, Prefix).

% ----------------------------------------------------------------- reports
count_stages(_, []).
count_stages(Acc, [H|T]) :-
    append(Acc, [H], Now), solutions(Now, L), length(L, N),
    format("  + ~w~t~24|~d~n", [H, N]), count_stages(Now, T).

main(['search']) :- !,
    make_directory_path(out),
    solutions([], Raw), length(Raw, NRaw),
    format("raw layouts: ~d~n~nlayouts left after each hypothesis (cumulative):~n", [NRaw]),
    count_stages([], [balance, not_dead_weight, needs_partner, phase1_split, symmetry]),
    solutions([balance, not_dead_weight, needs_partner, phase1_split, symmetry], Surv),
    ranked(Surv, Ranked),
    Ranked = [Best-_|_],
    findall(x, member(Best-_, Ranked), Ties), length(Ties, NTies),
    format("~nbest cost ~d, shared by ~d layouts~n~ntop 8:~n", [Best, NTies]),
    emit_top(Ranked, 8, 'cand'),
    deliberately_bad.
main(['fix']) :- !,
    make_directory_path(out),
    Hyps = [balance, not_dead_weight, needs_partner, phase1_split, strand_free, symmetry],
    solutions(Hyps, Surv), length(Surv, N),
    format("layouts left with strand_free added: ~d~n", [N]),
    ranked(Surv, Ranked),
    format("top 4:~n", []),
    emit_top(Ranked, 4, 'fixed').
main(_) :- format("usage: swipl design.pl -- search | fix~n"), halt(2).

% A layout the hypotheses forbid on purpose: the Runner owns every boss ability.
deliberately_bad :-
    abilities(As),
    Bad = [jump-0, dash-0, climb-1, swim-1, smash-0, shield-0, grapple-0, revive-1],
    findall(V, (member(A, As), member(A-V, Bad)), Own),
    format("~ndeliberately bad layout (violates phase1_split):~n", []),
    show_layout(Own),
    emit_cfg(Own, 'out/bad.cfg', check),
    emit_cfg(Own, 'out/bad-reach.cfg', reach).
