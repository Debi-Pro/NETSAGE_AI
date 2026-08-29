from flask import Flask, render_template, jsonify, request
import csv, re, json, os
from rule_checker import check_case
from ai_engine import diagnose as ml_diagnose

BASE = os.path.dirname(__file__)
app = Flask(__name__)

def load_csv(name):
    with open(os.path.join(BASE, "data", name), encoding="utf-8") as f:
        return list(csv.DictReader(f))

CASES = load_csv("cases.csv")
RAI = load_csv("responsible_ai.csv")


REVIEW_FILE = os.path.join(BASE, "data", "review_log.json")

def load_reviews():
    try:
        with open(REVIEW_FILE, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []

def save_reviews(rows):
    tmp = REVIEW_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(rows, f, indent=2)
    os.replace(tmp, REVIEW_FILE)


CONCEPT_HINTS = {
    "VLAN": ["vlan", "trunk", "access mode", "dot1q", "native vlan"],
    "Routing": ["no route", "route", "next hop", "ospf", "area"],
    "DHCP": ["dhcp", "helper", "169.254", "pool exhausted", "default-router"],
    "DNS": ["dns", "nslookup", "name"],
    "ACL": ["access-list", "acl", "permit", "deny"],
    "NAT": ["nat", "translation", "overload"],
    "Wireless": ["ssid", "wireless", "wi-fi", "wifi", "authentication"],
    "Gateway": ["gateway"],
    "Interface": ["administratively down", "disabled", "down/down"],
    "IP Addressing": ["duplicate ip", "subnet mask", "arp"]
}

def diagnose(case):
    return ml_diagnose(case)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/cases")
def api_cases():
    return jsonify(CASES)

@app.route("/api/cases/<case_id>")
def api_case(case_id):
    c = next((x for x in CASES if x["case_id"] == case_id), None)
    if not c: return jsonify({"error":"Case not found"}), 404
    return jsonify(c)

@app.route("/api/diagnose/<case_id>")
def api_diagnose(case_id):
    c = next((x for x in CASES if x["case_id"] == case_id), None)
    if not c: return jsonify({"error":"Case not found"}), 404
    result = diagnose(c)
    result["rule_checks"] = check_case(c)
    result["expected_fault"] = c["expected_fault"]
    return jsonify(result)


@app.route("/api/analyze", methods=["POST"])
def api_analyze():
    payload = request.json or {}
    case = {
        "case_id": payload.get("case_id", "LIVE"),
        "symptom": payload.get("symptom", ""),
        "topology_note": payload.get("topology_note", ""),
        "show_outputs": payload.get("show_outputs", ""),
        "expected_fault": payload.get("expected_fault", "Unknown until validated"),
        "osi_layer": payload.get("osi_layer", "Pending"),
        "concept": payload.get("concept", "Unknown"),
        "severity": payload.get("severity", "Medium"),
    }
    result = diagnose(case)
    result["rule_checks"] = check_case(case)
    result["expected_fault"] = case["expected_fault"]
    return jsonify(result)

@app.route("/api/review", methods=["POST"])
def review():
    payload = request.json or {}
    case_id = payload.get("case_id", "LIVE")
    action = payload.get("action", "Edited")
    note = payload.get("note", "")
    rows = load_reviews()
    rows.append({
        "case_id": case_id,
        "action": action,
        "note": note or f"Human reviewer selected {action}.",
        "timestamp": __import__("datetime").datetime.now().isoformat(timespec="seconds")
    })
    save_reviews(rows)
    return jsonify({"ok": True, "message": f"Review saved: {action}.", "review": rows[-1], "total": len(rows)})

@app.route("/api/reviews")
def api_reviews():
    return jsonify(load_reviews())

@app.route("/api/rai")
def api_rai():
    return jsonify({"initial": RAI, "reviews": load_reviews()})

@app.route("/api/stats")
def api_stats():
    concepts = {}
    severity = {}
    for c in CASES:
        concepts[c["concept"]] = concepts.get(c["concept"],0)+1
        severity[c["severity"]] = severity.get(c["severity"],0)+1
    return jsonify({"total":len(CASES), "concepts":concepts, "severity":severity, "rai_corrections":len(RAI), "agreement_rate": round((1-len(RAI)/len(CASES))*100,1)})

if __name__ == "__main__":
    app.run(debug=True)
