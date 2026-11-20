# Audit an implemented interface

Review only what can be observed in the implementation or rendered result. Do not invent missing requirements or turn personal taste into a defect.

Inspect:

- task clarity and hierarchy;
- consistency with the product's existing system;
- layout, overflow, media treatment, and responsive behavior;
- interaction feedback and necessary loading, empty, error, success, disabled, and recovery states;
- labels, focus, keyboard access, target size, and contrast;
- obvious performance problems visible in the experience.

Return material findings ordered by user impact; lead with the most important without hiding additional release-blocking defects. For each, name the observed screen/state, evidence and smallest concrete correction. Distinguish confirmed defects from checks that could not run. If nothing material is visible, say so at the scope actually inspected. An audit does not modify the product unless the user also asked for fixes.
