# Principles and evidence

Read the section for the decision in front of you. Each entry gives the rule,
the evidence, and when it stops holding. Effect sizes are pooled estimates
from meta-analyses unless marked as a single study. Mayer's medians come mostly
from his own lab and run higher than independent re-analyses (compare the
modality row below). Treat every number as a sign
of direction and rough size, not a promise.

Contents: 1 why understanding is the target, 2 the learner, 3 sequencing,
4 making the learner think, 5 checks, 6 presentation, 7 video and dialogue,
8 sources.

## 1. Why understanding is the target

- AI now produces code and explanations faster than people can understand
  them. Geoffrey Litt calls understanding the new bottleneck: people need it
  to check output and, more importantly, to come up with the next step of the
  work. His own practice is an explainer that gives background and intuition
  before detail, and a short quiz he must pass before sharing the work [1].
  Margaret-Anne Storey names the loss "cognitive debt": a team that cannot
  explain its own system can no longer change it safely [2].
- Assistance that hands over answers lowers unaided skill. In an Anthropic
  RCT, developers learning a new library with an AI assistant scored 50% on a
  later quiz against 67% without it, with the largest gap on debugging. The
  few who kept their scores asked conceptual questions or asked for
  explanations with the code [3]. In a field experiment with about 1,000
  students, unrestricted ChatGPT practice raised practice scores 48% and
  lowered the later unaided exam 17%; a hint-giving tutor largely removed the harm [4].
  After brief AI use, people did worse and gave up sooner once it was
  removed [5].
- Feeling that you understood is not evidence. A fluent lecturer raises
  students' predicted learning without changing what they learn [6][7].
  People overrate their grasp of mechanisms more than of facts or
  procedures, and visible mechanisms make it worse [8]. AI users overestimate
  their own performance [9].

Consequence for design: the learner has to do the thinking at planned
points, and the material is judged by unaided checks.

## 2. The learner

- **Prior knowledge decides the method.** Working memory holds about four new
  chunks at once; a learner with a schema for the domain treats a whole
  pattern as one chunk. The same page is heavy for a novice and light for an
  expert.
- **Expertise reversal.** Support that helps novices (worked steps,
  annotations, integrated text) becomes a burden for experienced learners
  who must read past what they already know. Fade support as competence
  grows (Kalyuga 2007) [10].
- **Pre-training.** Teaching the names and characteristics of the parts
  before the mechanism helps when the mechanism is complex (Mayer median
  d = 0.46) [11].

## 3. Sequencing

- **Worked examples first for novices.** Studying complete solutions beats
  solving unaided while the schema does not exist yet, then fade the steps
  [10][12].
- **Problem first, when the learner can engage.** Productive failure (attempt,
  then full instruction, then compare) beat instruction-first for conceptual
  understanding and transfer (g = 0.36 across 53 studies), but not for young
  children or generic skills, and the order can reverse with low prior
  knowledge. Instruction must always follow the attempt [13][14].
- **Pretesting.** Questions asked before instruction improve later memory and
  transfer even when most answers are wrong, provided the learner then sees
  the correct answers [15].
- **Concreteness fading.** Start concrete, then move explicitly and gradually
  to the abstract form [16].
- **Contrasting cases.** Comparing cases helps (d = 0.50), most when learners
  look for what is shared and differs, and when the principle is stated after
  the comparison [17][18].
- **Analogies.** They need explicit support: make the mapped relations
  visible, keep other load low, and state differences as well as
  similarities [19].
- **Refutation.** Stating a misconception, refuting it, and then explaining
  the correct idea changes conceptions more than plain exposition (g = 0.41)
  [20][21]. In video, a refutation script and a student-tutor dialogue each
  beat a concise exposition (d of about 0.8), most for low prior knowledge,
  without harming others [22].

## 4. Making the learner think

- **Retrieval.** Recalling beats rereading for retention a week later, while
  rereading feels more effective; feedback strengthens the effect [23][24].
- **Spacing.** Gaps between reviews improve long-term retention; the best gap
  grows with how long the knowledge must last [25].
- **Self-explanation prompts.** Asking learners to explain why a step works
  helps across subjects (g = 0.55) [26].
- **Generative activities.** Summarizing, mapping, drawing, imagining,
  self-testing, self-explaining, teaching, and enacting each help under their
  own conditions [27].
- **Desirable difficulty has conditions.** Effortful practice helps only when
  it triggers the right processing and the learner can respond. Difficulty
  from missing prerequisites or bad explanation is only cost. Learners
  mistake effort for poor learning and avoid it [28].

## 5. Checks

- **Alignment.** A check tests the objective at its level. A recall item
  cannot show that someone can choose between options in a new case.
- **Plausible distractors.** Multiple choice triggers useful retrieval when
  the wrong options are plausible, and it also improves recall of the
  material behind the wrong options [29].
- **Elaborated feedback.** Explaining why beats showing the correct answer,
  which beats right or wrong alone (0.49, 0.32, 0.05), most for higher-order
  outcomes [30].
- **Interleaving.** Mixing problem types trains choosing the right method,
  most for similar, easily confused categories (g = 0.42 overall); for
  unrelated items, blocking can win [31].

## 6. Presentation

Mayer's principles with their median effects and limits [11][32]:

| Principle | Rule | Limits |
| --- | --- | --- |
| Coherence | Cut extraneous material (d = 0.70) | Interesting but irrelevant details lower learning across 58 studies [33] |
| Signaling | Cue the organization (d = 0.46) | Mostly helps low prior knowledge |
| Spatial contiguity | Words next to the picture part (g = 0.63) | Robust across moderators [34] |
| Temporal contiguity | Narration with the matching visual (d = 1.30) | |
| Segmenting | Meaningful segments with pauses (small to medium) | Holds for system-paced pauses too [35] |
| Modality | Graphic plus narration over graphic plus text | Re-analysis shrinks it to d = 0.20 to 0.38; strongest when system-paced [36] |
| Redundancy | Do not add identical on-screen text to narration plus graphic | Applies when fast-paced; see captions below |
| Personalization | Conversational register (d = 0.79) | Fades in lessons over about 35 minutes [37] |
| Emotional design | Pleasant color and friendly faces on the content itself (g = 0.27 to 0.35) | Decoration added beside the content is a seductive detail [38] |
| Instructor image | Showing the speaker does not raise learning | Adds load, raises motivation [39] |

Good design matters most for complex material and for system-paced media
such as auto-playing video [40].

**Captions with narration.** Verbatim on-screen text added to narration over
graphics hurts when the pace is fast. Spoken plus written text helped
learners with low prior knowledge, system-paced material, and material
without pictures, and short key terms beat verbatim text [41]. Slightly
abridged text helped where verbatim text hurt [42]. Captions help learners
listening in a second language [43]. Default: key terms on screen for dense
scenes, full captions available and switchable.

## 7. Video and dialogue

- Shorter videos and informal styles hold attention better than polished
  lecture recordings. This measures engagement, not learning [44].
- Learner control (pause, seek, chapters) helps [45].
- **Vicarious learning.** Overhearing a tutee ask deep questions improved
  recall over monologue; shallow comments did not [46]. Observers learned
  from tutoring videos when the tutee constructed knowledge, not when the
  tutor only told [47].
- **On-screen characters.** A simple 2D agent gives a small benefit (g = 0.38
  for 2D, 0.11 for 3D) [48]. A friendly human voice is preferred; evidence
  for modern text-to-speech is mixed.
- **Humor.** Learners feel humor improves learning, but measured gains are
  slight. Humor tied to the content goes with learning; off-topic humor acts
  like a seductive detail [49]. Replacing a lesson's examples with humorous
  ones made the lesson feel funnier and lowered retention and transfer [50].
  Its clearer benefit is attention and willingness to keep watching.

## 8. Sources

1. Litt, G. (2026). Understanding is the new bottleneck. https://www.geoffreylitt.com/2026/07/02/understanding-is-the-new-bottleneck
2. Storey, M.-A. (2026). How generative and agentic AI shift concern from technical debt to cognitive debt. https://margaretstorey.com/blog/2026/02/09/cognitive-debt/
3. Shen, J. & Tamkin, A. (2026). How AI impacts skill formation. https://arxiv.org/abs/2601.20245
4. Bastani, H. et al. (2025). Generative AI without guardrails can harm learning. PNAS 122(26). https://doi.org/10.1073/pnas.2422633122
5. Liu et al. (2026). AI assistance reduces persistence and hurts independent performance. https://arxiv.org/abs/2604.04721
6. Carpenter, S. K. et al. (2013). Appearances can be deceiving: instructor fluency increases perceptions of learning without increasing actual learning. https://pubmed.ncbi.nlm.nih.gov/23645413/
7. Toftness, A. R. et al. (2018). Instructor fluency leads to higher confidence in learning, but not better learning. https://eric.ed.gov/?id=EJ1172606
8. Rozenblit, L. & Keil, F. (2002). The misunderstood limits of folk science: an illusion of explanatory depth. https://doi.org/10.1207/s15516709cog2605_1
9. Fernandes, D. et al. (2024). Performance and metacognition disconnect when reasoning in human-AI interaction. https://arxiv.org/abs/2409.16708
10. Kalyuga, S. (2007). Expertise reversal effect and its implications for learner-tailored instruction. https://doi.org/10.1007/s10648-007-9054-3
11. Mayer, R. E. (2017). Using multimedia for e-learning. JCAL 33(5). https://doi.org/10.1111/jcal.12197
12. Sweller, J., van Merriënboer, J. & Paas, F. (2019). Cognitive architecture and instructional design: 20 years later. https://doi.org/10.1007/s10648-019-09465-5
13. Sinha, T. & Kapur, M. (2021). When problem solving followed by instruction works. https://doi.org/10.3102/00346543211019105
14. He, Fiorella & Lemons (2025). Does instruction-first or problem-solving-first depend on learners' prior knowledge? https://doi.org/10.1007/s10648-025-09993-3
15. Pan, S. C. & Carpenter, S. K. (2023). Prequestioning and pretesting effects: a review. https://doi.org/10.1007/s10648-023-09814-5
16. Fyfe, E. R. et al. (2014). Concreteness fading in mathematics and science instruction. https://eric.ed.gov/?id=EJ1036777
17. Alfieri, L., Nokes-Malach, T. & Schunn, C. (2013). Learning through case comparisons. https://doi.org/10.1080/00461520.2013.775712
18. Schwartz, D. L. et al. (2011). Practicing versus inventing with contrasting cases. https://eric.ed.gov/?id=EJ952343
19. Richland, L. E. & Simms, N. (2015). Analogy, higher order thinking, and education. https://doi.org/10.1002/wcs.1336
20. Tippett, C. D. (2010). Refutation text in science education: a review. https://eric.ed.gov/?id=EJ905216
21. Schroeder, N. L. & Kucera, A. C. (2022). Refutation text facilitates learning: a meta-analysis. https://eric.ed.gov/?id=EJ1334754
22. Muller, D. A. et al. (2008). Saying the wrong thing: improving learning with multimedia by including misconceptions. https://eric.ed.gov/?id=EJ788046
23. Roediger, H. L. & Karpicke, J. D. (2006). Test-enhanced learning. https://doi.org/10.1111/j.1467-9280.2006.01693.x
24. Rowland, C. A. (2014). The effect of testing versus restudy on retention. https://doi.org/10.1037/a0037559
25. Cepeda, N. J. et al. (2008). Spacing effects in learning. https://doi.org/10.1111/j.1467-9280.2008.02209.x
26. Bisra, K. et al. (2018). Inducing self-explanation: a meta-analysis. https://eric.ed.gov/?id=EJ1186664
27. Fiorella, L. & Mayer, R. E. (2016). Eight ways to promote generative learning. https://eric.ed.gov/?id=EJ1120458
28. Bjork, E. L. & Bjork, R. A. (2011). Making things hard on yourself, but in a good way: creating desirable difficulties to enhance learning. In Gernsbacher et al. (Eds.), Psychology and the Real World (pp. 56-64). Worth. ; Kirk-Johnson, A., Galla, B. M. & Fraundorf, S. H. (2019). Perceiving effort as poor learning. https://doi.org/10.1016/j.cogpsych.2019.101237
29. Little, J. L. et al. (2012). Multiple-choice tests exonerated, at least of some charges. https://doi.org/10.1177/0956797612443370
30. Van der Kleij, F. M. et al. (2015). Effects of feedback in a computer-based learning environment on students' learning outcomes: a meta-analysis. https://eric.ed.gov/?id=EJ1081708
31. Brunmair, M. & Richter, T. (2019). Similarity matters: a meta-analysis of interleaved learning. https://doi.org/10.1037/bul0000209
32. Mayer, R. E. (2020). Multimedia Learning, 3rd ed. Cambridge University Press.
33. Sundararajan, N. & Adesope, O. (2020). Keep it coherent: a meta-analysis of the seductive details effect. https://eric.ed.gov/?id=EJ1263249
34. Schroeder, N. L. & Cenkci, A. T. (2018). Spatial contiguity and spatial split-attention effects in multimedia learning environments: a meta-analysis. https://eric.ed.gov/?id=EJ1186641
35. Rey, G. D. et al. (2019). A meta-analysis of the segmenting effect. https://eric.ed.gov/?id=EJ1217373
36. Ginns, P. (2005). Meta-analysis of the modality effect. https://eric.ed.gov/?id=EJ723937 ; Reinwein, J. (2012). Does the modality effect exist? https://eric.ed.gov/?id=EJ953633
37. Ginns, P., Martin, A. J. & Marsh, H. W. (2013). Designing instructional text in a conversational style: a meta-analysis. https://eric.ed.gov/?id=EJ1036785
38. Wong, R. M. & Adesope, O. O. (2021). Meta-analysis of emotional designs in multimedia learning. https://eric.ed.gov/?id=EJ1295978
39. Alemdag, E. (2022). Effects of instructor-present videos on learning, cognitive load, motivation, and social presence: a meta-analysis. https://eric.ed.gov/?id=EJ1356668
40. Noetel, M. et al. (2022). Multimedia design for learning: an overview of reviews with meta-meta-analysis. https://doi.org/10.3102/00346543211052329
41. Adesope, O. O. & Nesbit, J. C. (2012). Verbal redundancy in multimedia learning environments: a meta-analysis. J. Educ. Psychol. 104(1). https://doi.org/10.1037/a0026147
42. Yue, C. L., Bjork, E. L. & Bjork, R. A. (2013). Reducing verbal redundancy in multimedia learning: an undesired desirable difficulty? J. Educ. Psychol. https://doi.org/10.1037/a0031971
43. Mayer, R. E., Fiorella, L. & Stull, A. (2020). Five ways to increase the effectiveness of instructional video. https://eric.ed.gov/?id=EJ1256250
44. Guo, P. J., Kim, J. & Rubin, R. (2014). How video production affects student engagement. https://doi.org/10.1145/2556325.2566239
45. Schroeder, N. L., Chin, J. M. & Craig, S. D. (2020). Learner control aids learning from instructional videos with a virtual human. https://eric.ed.gov/?id=EJ1272471
46. Driscoll, D. M. et al. (2003). Vicarious learning: effects of overhearing dialog and monologue-like discourse in a virtual tutoring session. https://doi.org/10.2190/Q8CM-FH7L-6HJU-DT9W
47. Chi, M. T. H., Roy, M. & Hausmann, R. G. M. (2008). Observing tutorial dialogues collaboratively. https://eric.ed.gov/?id=EJ789293
48. Castro-Alonso, J. C., Wong, R. M. & Adesope, O. O. (2021). Effectiveness of multimedia pedagogical agents predicted by diverse theories: a meta-analysis. https://eric.ed.gov/?id=EJ1310158
49. Wanzer, M. B. et al. (2010). An explanation of the relationship between instructor humor and student learning: instructional humor processing theory. https://eric.ed.gov/?id=EJ875339
50. Bolkan, S., Griffin, D. J. & Goodboy, A. K. (2018). Humor in the classroom: the effects of integrated humor on student learning. Communication Education 67(2). https://doi.org/10.1080/03634523.2017.1413199
