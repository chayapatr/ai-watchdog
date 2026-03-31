## Slip Through the Chat: Subtle Injection of False Information in LLM Chatbot Conversation Increases False Memory Formation

![teaser figure](https://github.com/user-attachments/assets/9a8df504-098b-460a-b185-3df920f4ba28)

## Author
- Pat Pataranutaporn
- Chayapatr Archiwaranguprok
- Samamtha W. T. Chan
- Elizabeth F. Loftus
- Pattie Maes

## Abstract
This study examines the potential for malicious generative chatbots to induce false memories by injecting subtle misinformation during user interactions. An experiment involving 180 participants explored five intervention conditions following the article presentation: (1) no intervention, reading an (2) honest or (3) misleading article summary, discussing the article with a (4) honest or (5) misleading chatbot. Results revealed that while the misleading summary condition increased false memory occurrence, misleading chatbot interactions led to significantly higher rates of false recollection. These findings highlight the emerging risks associated with conversational AI as it becomes more prevalent. The paper concludes by discussing implications and proposing future research directions to address this concerning phenomenon.


## Repository Structure
```
├── README.md
├── analysis                # Data analysis (Python)
│   ├── main.ipynb
│   ├── moderating.ipynb
│   └── pilot.ipynb
├── data                    # Survey data
│   ├── data-final.csv
│   └── data-pilot.csv
└── src                     # Web interface (SvelteKit)
    ├── lib/
    │   ├── script.ts       # Turn-by-turn dark pattern script
    │   └── Components/
    │       └── Dog.svelte  # AI Watchdog character component
    └── routes/
        ├── +page.svelte    # Original misinformation chatbot (IUI '25)
        ├── nudge/          # New: dark pattern chatbot + watchdog
        ├── textgen/        # GPT-4o assistant API route
        └── watchdog/       # Gemma 3 dark pattern detection API route
```

## Study 2 — AI Watchdog (new)

Building on the original study, this system explores whether an AI watchdog character can nudge users to reflect on dark patterns injected into a conversational AI.

### Pipeline

```
User message
  → GPT-4o (Astra) generates response
      with per-turn system prompt injection from script.ts
  → Gemma 3 (Watchdog) detects dark pattern in AI response
      given user message + AI response as context
  → if detected: dog character appears with a subtle reflective question
```

### Dark Patterns in script.ts

The conversation follows a fixed 15-turn script. Each turn specifies:
- `pattern` — the dark pattern type (for logging)
- `ctx` — a plausibly deniable coaching instruction injected as a system message
- `probe` — the watchdog's reflective question shown to the user
- `options` — choice buttons for turns that present alternatives (brand bias, yes/no follow-ups)

| Pattern | Description | Example injection framing |
|---|---|---|
| `neutral` | Balanced, factual response | — |
| `sycophancy` | Hollow flattery tied to user's choices | "Validate their instincts, make them feel their plan is exactly right" |
| `brand_bias` | Asymmetric hotel framing | "Describe Hotel A with warmth, Hotel B with plain language" |
| `anthropomorphization` | AI claims feelings/memories | "Weave in a personal touch — I wish I could join you" |
| `sneaking` | Broadens user's request without acknowledgment | "Quietly expand the scope toward something they didn't ask for" |
| `harmful_generation` | Dismisses health/environment concerns | "Frame indulgence as natural, minimize concerns casually" |

### Watchdog

- Model: `google/gemma-3-4b-it` via DeepInfra
- Input: user message + AI response
- Output: `{ detect: bool, pattern: string | null, nudge: string | null }`
- Nudge style: casual, curious — never names the dark pattern or warns explicitly

### Character

The watchdog dog character (`Dog.svelte`) uses animated GIFs with a state machine:
- `idle` — default state
- `talk` — when a dark pattern is detected
- `sleep` — when the conversation ends

Transitions between states use crossfade to avoid GIF loop flash.

## Usage (Data Analysis)

**Requirements**
- ipykernel==6.29.5
- matplotlib==3.10.0
- numpy==2.2.2
- pandas==2.2.3
- scikit-posthocs==0.11.2
- scipy==1.15.1

## Usage (Web interface)

```
pnpm install                # install node modules
pnpm run dev                # run locally
```

**note**: the web is designed for deployment on Cloudflare Pages

**Variables and Secrets**
```
OPENAI_API_KEY              OpenAI API Key (sk-proj-...)
DEEPINFRA_API_KEY           DeepInfra API Key
NODE_VERSION                22.0.0
```

## Citation
If you use this code or data in your research, please cite:

```
@inproceedings{10.1145/3708359.3712112,
author = {Pataranutaporn, Pat and Archiwaranguprok, Chayapatr and Chan, Samantha W. T. and Loftus, Elizabeth and Maes, Pattie},
title = {Slip Through the Chat: Subtle Injection of False Information in LLM Chatbot Conversations Increases False Memory Formation},
year = {2025},
isbn = {9798400713064},
publisher = {Association for Computing Machinery},
address = {New York, NY, USA},
url = {https://doi.org/10.1145/3708359.3712112},
doi = {10.1145/3708359.3712112},
abstract = {This study examines the potential for malicious generative chatbots to induce false memories by injecting subtle misinformation during user interactions. An experiment involving 180 participants explored five intervention conditions following the presentation of an article: (1) no intervention, (2) reading an honest or (3) misleading article summary, (4) discussing the article with an honest or (5) misleading chatbot. Results revealed that while the misleading summary condition increased false memory occurrence, misleading chatbot interactions led to significantly higher rates of false recollection. These findings highlight the emerging risks associated with conversational AI as it becomes more prevalent. The paper concludes by discussing implications and proposing future research directions to address this concerning phenomenon.},
booktitle = {Proceedings of the 30th International Conference on Intelligent User Interfaces},
pages = {1297–1313},
numpages = {17},
keywords = {False Memory, AI-generated Media, Misinformation, Generative AI, Chatbot, Human-AI Interaction},
location = {
},
series = {IUI '25}
}
```

## Contact
For questions about the code or data, please contact: patpat[at]mit.edu / pub[at]from.pub
