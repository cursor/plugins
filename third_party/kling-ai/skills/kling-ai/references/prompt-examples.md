# Prompt and usage examples

## Suggested prompts

- Use Kling Image 4.0 to generate a series of three 8K images in one request. Show the same red panda in a vintage spacesuit exiting a space station, drifting past a porthole, and turning to look at the blue Earth.
- Use Kling 4.0 to generate a 20‑second cinematic video: a mech warrior slams down from height onto the ground, sending out a shockwave that instantly blasts apart rubble and dust, with the camera rapidly pushing in for a powerful impact.
- Use Kling 4.0 Flash to turn my sneaker product photo into a 20-second, 720p video. Start from the photo, slowly orbit the shoe, and end on a close-up of the upper.
- Use Kling AI to browse the motion library and preview saved motions; after I select one, apply it to my subject image with an available motion-control model to generate a video.
- Use Kling AI to save the front and side views of my character as my first reusable Element, named “Xiaobai”, to help keep the character consistent in later creations.

## 推荐提示词

- 使用可灵图片 4.0 一次生成 3 张 8K 连续组图。让同一只身穿复古宇航服的小熊猫依次从空间站出舱、掠过舷窗、转身望向蓝色地球
- 使用可灵 4.0 生成一段 20 秒电影感视频：机甲战士从高空重砸地面，冲击波瞬间震开碎石与尘雾，镜头快速推近，充满力量感
- 使用可灵 4.0 Flash，把我提供的运动鞋商品图作为首帧，生成一段 20 秒、720p 的视频，镜头缓慢绕过鞋身，最后停在鞋面细节上
- 使用可灵AI查看动作库，预览已保存的动作；选定后，用可用的动作控制模型将该动作应用到我提供的主体图片生成视频
- 使用可灵AI将我提供的角色正面图和侧面图保存为第一个可复用主体，命名为“小白”，方便后续创作时保持角色一致

## Natural-language requests

Text-to-video:

> Use Kling AI to create a 5-second, 16:9 cinematic video: outside a convenience store on a rainy night, a vintage motorcycle slowly pulls to a stop as the camera smoothly pushes in from a wide shot. Keep this turn active after submission until the result appears.

Image-to-video:

> Turn my attached image into a 5-second video. Keep the subject's identity, facial features, and clothing consistent; only let the camera slowly orbit from the left to the front. Use 720p.

Multi-shot VIDEO 3.0:

> Create a 7-second, four-shot product video: a 1.5-second wide establishing shot, a 2-second push-in on the product, a 2-second side orbit, and a 1.5-second hold on the brand detail. Enable multi-shot mode and use natural transitions between shots.

Text-to-image:

> Use Kling AI to create a 16:9 hero image for a poster: a transparent glass teapot in a minimalist white studio with soft side lighting and negative space for a headline on the right.

Immediate submission with explicit approval:

> Submit immediately without asking for confirmation again: use Kling AI to create a 5-second, 16:9, 720p single-shot video. Outside a convenience store on a rainy night, a vintage motorcycle slowly pulls to a stop.

Status check:

> Check the current status of this Kling generationId once. Do not poll repeatedly.

Motion-library browsing:

> List my saved motions with their names, IDs, and durations. Do not generate anything.

Motion control:

> Use my attached subject image with the motion named "Walking" from my library. Resolve the motion and show the supported model and final settings before submitting.

Element creation:

> Save these reference images as a reusable subject named "Blue sneaker". Show which image will be the cover and use the others as secondary views.

Element update:

> Update only the description of "Blue sneaker" to "Blue suede sneaker with white sole". Keep its cover, secondary images, and tags unchanged.

Element reuse:

> Use my "Blue sneaker" Element in a product image. Check its resource type and model compatibility first, and tell me if another source image is required.

## Prompt construction

Prefer concrete direction in this order:

1. subject and setting
2. action or transformation
3. camera and shot structure
4. lighting and visual style
5. identity or consistency constraints
6. exclusions only when they prevent a likely failure

Avoid long lists of repeated negatives. For image-to-video, state what must
remain stable and what is allowed to move.

## User-facing submission summary

Use one compact block:

```text
Ready to submit: image-to-video · VIDEO 3.0 Turbo · 5 seconds · 720p · single shot
Action: keep the subject stable while the camera slowly orbits from the left to the front
Submission will consume Kling AI credits.
Reply "Confirm submission" to create one generation task.
```

After acceptance:

```text
The task was submitted once. Any follow-up will only query this generationId; it will not create another task.
You may end this conversation; the task will continue running on Kling AI.
```
