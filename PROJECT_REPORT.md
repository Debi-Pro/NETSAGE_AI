# NetSage AI — Project Report

## Abstract
NetSage AI is an offline AI-assisted troubleshooting platform for Cisco-style networking labs. It accepts a symptom, topology note and show-command output, retrieves semantically similar troubleshooting cases using a local NLP model, produces an evidence-backed diagnosis and confidence score, independently validates common configuration errors, and requires a human reviewer before any remediation is accepted.

## AI Method
The AI layer uses scikit-learn TF-IDF vectorization and cosine similarity. Each of the 30 structured lab cases is represented as a searchable evidence document. A new incident is vectorized and compared with the knowledge base. The highest-similarity cases provide the diagnostic context and confidence signal.

## Why No API Key?
The project was intentionally designed without a hosted AI dependency. This makes judging reproducible, avoids credential leakage, and keeps the diagnostic process inspectable. The model is local rather than a simulated API integration.

## Safety
The system follows a human-in-the-loop pattern:
1. AI recommends.
2. Independent rules validate.
3. Human accepts, edits or rejects.
4. No automatic network configuration change is performed.

## Dataset
30 cases span VLAN, gateway, DHCP, DNS, routing, ACL, NAT, wireless, interface and IP-addressing faults. Each case includes symptom, topology note, command evidence, expected fault, OSI layer, concept and severity.

## Responsible AI
Five cases are documented where the initial AI direction was corrected by a human. These examples demonstrate that the product is designed to expose uncertainty and learn from review rather than hide mistakes.

## Evaluation
The dashboard reports:
- 30 scenarios
- 10 fault concepts represented
- 5 documented human corrections
- AI/human baseline agreement metric
- severity distribution

## Limitations
This is a small lab-focused retrieval model rather than a general-purpose language model. Its value comes from transparent retrieval and evidence grounding. A future version could use a local open-source LLM for richer natural-language explanations while retaining the same rule checker and human gate.
