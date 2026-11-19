# Training data for train.py

Drop your examples here (sub-folders are fine), then run `python train.py` from the `local-ai` folder.

| What | Files |
|---|---|
| Text Q&A | `name.prompt.txt` + `name.txt` |
| Image | `name.png` (or jpg/webp/...) + `name.txt` (+ optional `name.prompt.txt`) |
| Audio | `name.wav` (or mp3/m4a/...) + `name.txt` (+ optional `name.prompt.txt`) |
| Code | `name.prompt.txt` + `name.py` (or js/ts/html/css/...) |
| Many at once | `anything.jsonl`, one `{"prompt": "...", "response": "...", "image": "pic.png", "audio": "clip.wav"}` per line |

The trained adapter goes to `local-ai/my_adapter` and is used automatically from the next start.
Delete that folder to go back to the plain models.
