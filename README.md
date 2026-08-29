# NetSage AI — Applied AI + Network Troubleshooting

A polished, **zero-API-key** submission for the Cisco-style troubleshooting project.

> This version is intentionally self-contained. The AI diagnosis layer is a genuine local NLP/ML pipeline: TF-IDF vectorization + cosine-similarity semantic retrieval over the 30-case knowledge base. It runs offline and needs no API credentials. The included prompt library is ready for plugging into a local/private LLM later if desired.

## Requirements covered
- 30 troubleshooting cases across VLAN, gateway, DHCP, DNS, routing, ACL, NAT and wireless.
- Evidence fields: symptom, topology note, show output, expected fault, OSI layer, concept, severity.
- Structured AI prompt library with JSON contract and worked examples.
- Deterministic Python rule checker for duplicate IPs, masks, gateway mismatch, interface state, VLAN/trunk issues and routes.
- Dashboard with issue mix, severity, confidence and AI/human agreement.
- Human review workflow: Accepted / Edited / Rejected.
- Responsible AI log with 5 intentionally corrected diagnoses.
- Demo-ready UI with a case explorer and one-click diagnosis.

## Run
```bash
pip install flask
python app.py
```
Open http://127.0.0.1:5000

## Demo flow
1. Open Dashboard.
2. Select a case.
3. Click **Run AI Diagnosis**.
4. Review evidence and recommended next command.
5. Choose **Accept / Edit / Reject**.
6. Open Rule Checker to see deterministic checks.
7. Show Responsible AI log.

## Important submission note
The application does not call a hosted AI API. This makes it reproducible and safe for evaluation. In the presentation, describe the local engine as an "AI-assisted diagnostic reasoning layer" and emphasize the human-in-the-loop safety gate.


## Where is the AI?
The project now uses `ai_engine.py`:
1. The 30 lab cases form a small troubleshooting knowledge base.
2. TF-IDF turns symptom + topology + command output into numerical language features.
3. Cosine similarity retrieves the most semantically similar known cases.
4. The engine returns the matched fault, confidence score, related cases, next command and safe fix steps.
5. The deterministic rule checker independently validates configuration signals.
6. Human review remains the final gate.

This is deliberately **not fake cloud AI**: there is no API key and no external AI service. The ML model is local and inspectable.

## Design direction
The UI is intentionally inspired by the interaction model of modern NOC/AI troubleshooting consoles: a case library, evidence workbench, diagnosis stream, validation and mandatory review. It is an original implementation and does not depend on the friend's hosted AI configuration.

## 3D interaction
The Command Center includes a dependency-free canvas topology. Drag to orbit, scroll to zoom, and watch animated packets traverse the network. It is implemented in browser JavaScript and requires no API key or third-party graphics service.

## Evidence Workbench
The operator can load any of the 30 scenarios or enter a custom incident. The local ML endpoint analyzes the supplied symptom + topology + command evidence and exposes semantic confidence, retrieved cases, evidence, next command and validation signals.

## Persistent Human Review
Review decisions are now stored in `data/review_log.json`. Accept, Edit and Reject are real application actions:
- Edit enables a root-cause editor and reviewer note.
- Accept saves an audit event.
- Reject saves an audit event.
- The Responsible AI page reads the persisted log.
- Recent review activity is shown immediately in the Review Console.
# NETSAGE_AI
