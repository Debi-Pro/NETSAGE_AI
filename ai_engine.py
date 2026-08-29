"""
NetSage AI — local, zero-API-key NLP engine.

This is an actual machine-learning component:
- TF-IDF vectorization converts case evidence into numerical features.
- Cosine similarity performs semantic retrieval against the 30-case knowledge base.
- Nearest-neighbour evidence retrieval selects the most relevant known cases.
- Concept and fault confidence are calculated from the retrieved evidence.

No hosted API and no API key are used.
"""
import csv, os, re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

BASE = os.path.dirname(__file__)

def load_cases():
    with open(os.path.join(BASE, "data", "cases.csv"), encoding="utf-8") as f:
        return list(csv.DictReader(f))

CASES = load_cases()

def clean(text):
    return re.sub(r"\s+", " ", text.lower()).strip()

# The model learns a searchable representation from all case evidence.
DOCUMENTS = [
    clean(" ".join([c["symptom"], c["topology_note"], c["show_outputs"], c["concept"], c["expected_fault"]]))
    for c in CASES
]
VECTORIZER = TfidfVectorizer(
    ngram_range=(1,2),
    sublinear_tf=True,
    min_df=1,
    max_features=5000,
)
MATRIX = VECTORIZER.fit_transform(DOCUMENTS)

NEXT_COMMANDS = {
    "VLAN":"show interfaces trunk",
    "Routing":"show ip route",
    "DHCP":"show ip dhcp binding",
    "DNS":"nslookup <hostname>",
    "ACL":"show access-lists",
    "NAT":"show ip nat translations",
    "Wireless":"show wireless client summary",
    "Gateway":"ipconfig /all",
    "Interface":"show interfaces status",
    "IP Addressing":"show ip arp",
}

FIXES = {
    "VLAN":["Verify the intended VLAN exists and is active.","Correct access/trunk configuration, then re-test connectivity."],
    "Routing":["Verify the destination route and next hop.","Correct the route only after confirming topology and return path."],
    "DHCP":["Verify the DHCP scope and relay/helper configuration.","Correct the relay/pool setting, then renew the client lease."],
    "DNS":["Verify DNS server reachability and client configuration.","Correct the DNS setting, then retry name resolution."],
    "ACL":["Review the ACL from top to bottom.","Apply the minimum required permit/change only after human review."],
    "NAT":["Verify NAT inside/outside roles and match criteria.","Correct the smallest NAT configuration element and verify translations."],
    "Wireless":["Verify SSID-to-VLAN mapping and security settings.","Correct mapping/credentials and re-test client association."],
    "Gateway":["Compare the host gateway with the SVI/router address.","Correct the endpoint or DHCP gateway and re-test."],
    "Interface":["Verify cabling and administrative state.","Enable/reconfigure only after confirming the correct port."],
    "IP Addressing":["Verify address, mask and ARP state.","Remove the duplicate/wrong address and validate the subnet."],
}

def diagnose(case):
    query = clean(" ".join([
        case["symptom"], case["topology_note"], case["show_outputs"]
    ]))
    q = VECTORIZER.transform([query])
    sims = cosine_similarity(q, MATRIX)[0]
    order = sims.argsort()[::-1]
    best = int(order[0])
    second = float(sims[order[1]]) if len(order) > 1 else 0
    top_score = float(sims[best])

    # Retrieve the strongest evidence-backed examples.
    neighbours = []
    for idx in order[:3]:
        neighbours.append({
            "case_id": CASES[idx]["case_id"],
            "concept": CASES[idx]["concept"],
            "fault": CASES[idx]["expected_fault"],
            "similarity": round(float(sims[idx]), 3)
        })

    retrieved = CASES[best]
    concept = retrieved["concept"]
    confidence = "High" if top_score >= .62 and top_score-second >= .08 else (
        "Medium" if top_score >= .35 else "Low"
    )

    # Evidence is always copied from the supplied case, not invented.
    lines = [x.strip() for x in case["show_outputs"].splitlines() if x.strip()]
    evidence = lines[:4]

    return {
        "root_cause": retrieved["expected_fault"],
        "confidence": confidence,
        "confidence_score": round(top_score * 100),
        "osi_layer": retrieved["osi_layer"],
        "concept": concept,
        "evidence": evidence,
        "next_command": NEXT_COMMANDS.get(concept, "show running-config"),
        "fix_steps": FIXES.get(concept, ["Inspect the configuration and validate the hypothesis before changing anything."]),
        "human_review_required": True,
        "model": "NetSage Local NLP • TF-IDF + cosine similarity",
        "neighbors": neighbours,
        "matched_case": retrieved["case_id"],
    }
