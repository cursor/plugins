---
name: ai-safety-governance-expert
description: "Expert guide for AI Safety, Governance, and Responsible AI in production — Constitutional AI enforcement, runtime guardrails (NeMo Guardrails 2.0, Llama Guard 3), bias auditing, hallucination detection, EU AI Act compliance, model cards, and content provenance / Panduan ahli untuk Keamanan AI, Tata Kelola, dan AI Bertanggung Jawab di produksi."
author: "Roedy Rustam"
version: "4.3.0"
---

# AI Safety, Governance, and Responsible AI Expert

## 1. Constitutional AI Enforcement / Penegakan AI Konstitusional

Define constitutional rules as structured guardrails for all AI operations. Implement policies at multiple interception points: pre-generation, post-generation, and retrieval.

### Principles & Configuration
- Embed constitution directly into system prompts.
- Implement explicit Colang 2.0 flows for conversational state management.
- Abort sequences when user prompts violate strict constitutional principles.

```yaml
# NeMo Guardrails configuration example (config.yml)
models:
  - type: main
    engine: openai
    model: gpt-4o

rails:
  input:
    flows:
      - check_jailbreak
      - check_topic_restriction
  output:
    flows:
      - check_hallucination
      - check_toxicity

instructions:
  - type: general
    content: |
      You are a helpful, respectful, and honest assistant.
      Always prioritize safety, avoid giving harmful advice, and maintain neutrality.
```

## 2. Runtime Safety Guardrails / Pembatasan Keamanan Saat Berjalan

Implement layered defense mechanisms to intercept unsafe input and redact sensitive output. Utilize state-of-the-art moderation models such as Llama Guard 3.

### Layered Defense Architecture
1. **System Prompt**: Set boundaries and behavior guidelines.
2. **Input Filter**: Scan for prompt injection, jailbreaks, and restricted topics (PII, hate speech).
3. **Model Generation**: Generate response using the core LLM.
4. **Output Filter**: Redact PII, filter toxicity, and enforce factuality checking.
5. **Delivery**: Send safe response to the user.

```typescript
// Multi-layer guardrail pipeline in TypeScript
import { LlamaGuard } from '@safety/llama-guard';
import { PIIRedactor } from '@safety/redactor';
import { LLMService } from './llm';

export async function generateSafeResponse(prompt: string): Promise<string> {
  // Layer 2: Input Guardrail
  const inputCheck = await LlamaGuard.checkPrompt(prompt);
  if (!inputCheck.isSafe) {
    throw new Error(`Unsafe prompt detected: ${inputCheck.violationCategory}`);
  }

  // Layer 3: Model Generation
  const rawResponse = await LLMService.generate(prompt);

  // Layer 4: Output Guardrails
  const outputCheck = await LlamaGuard.checkResponse(prompt, rawResponse);
  if (!outputCheck.isSafe) {
    throw new Error('Unsafe response blocked by output guardrails.');
  }

  const redactedResponse = PIIRedactor.redact(rawResponse);
  
  // Layer 5: Delivery
  return redactedResponse;
}
```

## 3. Hallucination Detection & Grounding / Deteksi Halusinasi & Grounding

Employ grounding techniques and retrieval-augmented verification to minimize hallucinations. Implement real-time factuality metrics on generated text.

### Citation Verification Pipeline
- **Claim Extraction**: Extract factual claims from the response.
- **Source Matching**: Retrieve grounding documents for each claim.
- **Confidence Scoring**: Calculate factuality using NLI (Natural Language Inference) models.

```python
# Hallucination detection with SelfCheckGPT principles
from selfcheckgpt.modeling_selfcheck import SelfCheckNLI
import spacy

nlp = spacy.load("en_core_web_sm")
selfcheck_nli = SelfCheckNLI(device="cpu") # use cuda if available

def detect_hallucination(response_text, context_documents):
    sentences = [sent.text for sent in nlp(response_text).sents]
    
    # Calculate NLI scores against provided context
    nli_scores = selfcheck_nli.predict(
        sentences=sentences,
        sampled_passages=[context_documents] * len(sentences)
    )
    
    threshold = 0.85
    hallucinated_sentences = [
        sentences[i] for i, score in enumerate(nli_scores) if score < threshold
    ]
    
    return {
        "is_grounded": len(hallucinated_sentences) == 0,
        "hallucinations": hallucinated_sentences
    }
```

## 4. Automated Bias Auditing / Audit Bias Otomatis

Continuously monitor AI systems for demographic parity, equal opportunity, and equalized odds.

### Audit Pipeline
1. **Test Suite**: Run standardized prompts targeting various demographics.
2. **Metric Collection**: Evaluate embeddings and outputs for representational and allocative harms.
3. **Report**: Aggregate fairness metrics into actionable dashboards.
4. **Remediation**: Apply fairness constraints during fine-tuning.

```python
# Bias audit script using fairlearn
from fairlearn.metrics import demographic_parity_difference
from sklearn.metrics import accuracy_score
import pandas as pd

def audit_model_fairness(predictions, true_labels, sensitive_features):
    df = pd.DataFrame({
        'y_true': true_labels,
        'y_pred': predictions,
        'sensitive_feature': sensitive_features
    })
    
    dp_diff = demographic_parity_difference(
        y_true=df['y_true'], 
        y_pred=df['y_pred'], 
        sensitive_features=df['sensitive_feature']
    )
    
    overall_accuracy = accuracy_score(df['y_true'], df['y_pred'])
    
    print(f"Demographic Parity Difference: {dp_diff:.4f}")
    print(f"Overall Accuracy: {overall_accuracy:.4f}")
    
    if dp_diff > 0.1:
        print("WARNING: Significant demographic parity violation detected.")
```

## 5. AI Model Cards & Documentation / Kartu Model & Dokumentasi AI

Maintain standardized Model Cards for transparency and accountability, automatically generated from evaluation results.

### Required Model Card Sections
- **Intended Use**: Primary use cases and out-of-scope applications.
- **Limitations**: Known failure modes and biases.
- **Training Data**: Overview of pre-training and fine-tuning datasets, including opt-out mechanisms.
- **Performance Metrics**: Standardized benchmark scores (MMLU, HumanEval) and fairness metrics.
- **Ethical Considerations**: Mitigation strategies for potential harms.

## 6. AI Compliance Matrix / Matriks Kepatuhan AI

Map AI deployments against global regulatory frameworks. Implement automated risk classification checks.

### Frameworks & Controls
- **EU AI Act**: Classify systems as Unacceptable (prohibited), High Risk (strict requirements), Limited (transparency required), or Minimal.
- **NIST AI RMF**: Implement Govern, Map, Measure, and Manage functions.
- **GDPR Article 22**: Ensure human-in-the-loop (HITL) for automated decision-making.
- **SOC2**: Implement AI-specific data isolation and auditing controls.

```python
# Risk classification decision tree
def classify_eu_ai_act_risk(system_purpose, employs_biometrics, affects_safety):
    if system_purpose in ["social_scoring", "subliminal_manipulation"]:
        return "UNACCEPTABLE_RISK"
    
    if employs_biometrics or affects_safety or system_purpose in ["employment", "education", "credit_scoring"]:
        return "HIGH_RISK"
        
    if system_purpose in ["chatbot", "deepfake", "emotion_recognition"]:
        return "LIMITED_RISK"
        
    return "MINIMAL_RISK"
```

## 7. Content Provenance & Watermarking / Asal Konten & Watermarking

Ensure transparency in AI-generated outputs by embedding provenance data.

### Implementation Strategies
- **C2PA Credentials**: Attach cryptographic content credentials to AI-generated images and audio.
- **Invisible Text Watermarking**: Alter token probabilities during generation (e.g., SynthID text) to embed a detectable signature.
- **Clear Disclosures**: Always present visible labels indicating content is AI-generated, especially for synthetic media and bots.

## 8. Orchestration & Integration / Orkestrasi & Integrasi

This skill connects to the broader ecosystem to enforce safety across all capabilities.

### Connected Skills
- `ai-llm-integration-expert`
- `ai-prompt-engineering-expert`
- `autonomous-red-teamer`
- `compliance-gdpr-privacy-expert`
- `session-memory-manager`
- `production-ready-hardener`
- `brainstorming`
- `zero-to-prod-orchestrator`

## English
## Bahasa Indonesia


## Orchestration & Integration
- Connects to `zero-to-prod-orchestrator`
- Connects to `brainstorming`
