---
name: synthetic-data-finetuning-expert
description: "Expert guide for synthetic dataset generation, LLM-as-a-judge filtering, QLoRA fine-tuning (Unsloth), DPO alignment, and GGUF/Ollama export for local SLMs / Panduan ahli generasi data sintetis, fine-tuning QLoRA, DPO, dan ekspor GGUF/Ollama."
author: "Roedy Rustam"
version: "4.3.0"
---

# Synthetic Data & Fine-Tuning Expert (Custom Domain SLMs)

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English

### Orchestration & Integration
Connects and orchestrates with domain skills like `local-slm-edge-ai-expert`, `ai-prompt-engineering-expert`, `python-programming-expert`, and `llm-finops-router` to build high-performance, cost-effective domain models.

### Description
Production-grade guide for generating synthetic training datasets, curating high-signal instruction pairs, executing Parameter-Efficient Fine-Tuning (QLoRA / LoRA) with **Unsloth** and Hugging Face TRL, performing Direct Preference Optimization (DPO), and quantizing custom Small Language Models (SLMs) to GGUF for edge or on-premise execution.

**Swarm Synergy:** Within the **AI Engineering Swarm**, this skill serves as the Model Specialization Lead. When frontier API costs or latency become prohibitive, it trains, aligns, and deploys hyper-efficient domain SLMs (1B–8B parameters) in Phase 4.

### Trigger Conditions
- Generating domain-specific synthetic training data from seed documents, codebases, or APIs.
- Filtering low-quality or hallucinated synthetic data using LLM-as-a-judge curation pipelines.
- Fine-tuning open-weights models (Llama 3.3, Qwen 2.5, Mistral) on custom tasks using 4-bit QLoRA.
- Aligning model outputs using Direct Preference Optimization (DPO) to enforce specific response styles.
- Quantizing fine-tuned models to GGUF (q4_k_m, q8_0) for zero-latency local inference with Ollama or llama.cpp.

### Synthetic Data & Fine-Tuning Lifecycle

```
1. SEED EXTRACTION & SYNTHESIS
   [Raw Docs / Codebase] ──► [Frontier LLM / Distilabel] ──► Raw Instruction Pairs (10k+)

2. QUALITY FILTERING (LLM-AS-A-JUDGE)
   Raw Instruction Pairs ──► [Rubric Scorer / De-duplication] ──► Curated Gold Dataset (2k-5k)

3. 4-BIT QLORA FINE-TUNING (UNSLOTH)
   Base Model (e.g. Qwen 2.5-Coder) + LoRA Adapters ──► SFT / DPO Training Loop

4. QUANTIZATION & LOCAL DEPLOYMENT
   Merged 16-bit Weights ──► [llama.cpp GGUF Export] ──► Local Ollama Service (<50ms latency)
```

### Core Implementation Guidelines

#### 1. Synthetic Instruction Generation & Rejection Sampling
Use frontier models to generate input-output pairs with strict rejection criteria:
```python
from pydantic import BaseModel, Field
from openai import OpenAI
import json

client = OpenAI()

class SyntheticInstructionPair(BaseModel):
    user_instruction: str = Field(description="Realistic developer query")
    input_context: str = Field(description="Code snippet or API contract")
    ground_truth_response: str = Field(description="Flawless, production-grade output")
    quality_score: int = Field(ge=1, le=5, description="Self-evaluated quality score")

def generate_synthetic_samples(seed_text: str) -> list[SyntheticInstructionPair]:
    response = client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Generate 5 diverse, hard edge-case instruction pairs based on the seed code."},
            {"role": "user", "content": seed_text}
        ],
        response_format=SyntheticInstructionPair,
    )
    # Filter out anything below score 4 (Rejection Sampling)
    return [sample for sample in [response.choices[0].message.parsed] if sample.quality_score >= 4]
```

#### 2. High-Speed 4-Bit QLoRA with Unsloth
Fine-tune on consumer GPUs (e.g., RTX 3090/4090 or single A10G) with 5x faster throughput:
```python
from unsloth import FastLanguageModel
import torch
from trl import SFTTrainer
from transformers import TrainingArguments

# 1. Load Model & Tokenizer in 4-bit
max_seq_length = 2048
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/Qwen2.5-Coder-7B-Instruct-bnb-4bit",
    max_seq_length=max_seq_length,
    load_in_4bit=True,
)

# 2. Add LoRA Adapters
model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_alpha=16,
    lora_dropout=0, # Optimized 0 dropout for Unsloth
    bias="none",
)

# 3. Supervised Fine-Tuning (SFT)
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    dataset_text_field="text",
    max_seq_length=max_seq_length,
    args=TrainingArguments(
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        warmup_steps=10,
        max_steps=100,
        learning_rate=2e-4,
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        logging_steps=1,
        output_dir="outputs",
    ),
)
trainer.train()
```

#### 3. GGUF Export for Local Ollama Deployment
Export merged model to 4-bit or 8-bit quantized GGUF format:
```python
# Save to 16bit or GGUF directly
model.save_pretrained_gguf("custom-domain-coder", tokenizer, quantization_method="q4_k_m")

# Generate Modelfile for Ollama:
# FROM ./custom-domain-coder-q4_k_m.gguf
# PARAMETER temperature 0.2
# SYSTEM You are an expert domain coder.
```

---

<a name="bahasa-indonesia"></a>
## Bahasa Indonesia

### Integrasi Orkestrasi
Terhubung dan mengorkestrasi skill domain yang relevan seperti `local-slm-edge-ai-expert`, `ai-prompt-engineering-expert`, `python-programming-expert`, dan `llm-finops-router` untuk membangun model spesialis domain dengan performa tinggi dan biaya hemat.

### Deskripsi
Panduan produksi untuk menghasilkan dataset pelatihan sintetis, mengurasi pasangan instruksi bernilai tinggi, mengeksekusi Parameter-Efficient Fine-Tuning (QLoRA / LoRA) dengan **Unsloth** dan Hugging Face TRL, menerapkan Direct Preference Optimization (DPO), dan mengkuantisasi Small Language Models (SLM) kustom ke format GGUF untuk inferensi lokal atau on-premise berlatensi ultra-rendah.

**Sinergi Swarm:** Di dalam **AI Engineering Swarm**, skill ini memegang peranan sebagai Pemimpin Spesialisasi Model. Ketika biaya API atau latensi model cloud frontier terlalu tinggi, skill ini melatih, menyelaraskan (*align*), dan men-deploy SLM domain yang sangat efisien (1B–8B parameter) pada Fase 4.

### Kondisi Pemicu
- Menghasilkan data pelatihan sintetis spesifik domain dari dokumen panduan, codebase, atau skema API.
- Menyaring data sintetis berkualitas rendah menggunakan pipeline penilaian otomatis *LLM-as-a-judge*.
- Melakukan fine-tuning model berbobot terbuka (Llama 3.3, Qwen 2.5, Mistral) dengan QLoRA 4-bit secara hemat memori VRAM.
- Menyelaraskan respon model dengan Direct Preference Optimization (DPO) agar mematuhi aturan format dan gaya tertentu.
- Mengkuantisasi model hasil fine-tuning ke format GGUF (q4_k_m, q8_0) untuk inferensi lokal instan di Ollama atau llama.cpp.

---

### Implementasi Pola Kunci (Python)

#### 1. Fine-Tuning Cepat QLoRA 4-Bit dengan Unsloth
```python
from unsloth import FastLanguageModel
import torch
from trl import SFTTrainer
from transformers import TrainingArguments

# 1. Muat Model dan Tokenizer dalam mode 4-bit hemat VRAM
panjang_maksimum = 2048
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/Qwen2.5-Coder-7B-Instruct-bnb-4bit",
    max_seq_length=panjang_maksimum,
    load_in_4bit=True,
)

# 2. Pasang Adapter PEFT LoRA
model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    lora_alpha=16,
    lora_dropout=0,
    bias="none",
)

# 3. Ekspor Langsung ke GGUF untuk Ollama Lokal
model.save_pretrained_gguf("model-koding-kustom", tokenizer, quantization_method="q4_k_m")
```