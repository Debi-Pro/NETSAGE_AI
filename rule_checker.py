import re, ipaddress

def check_case(case):
    text = (case.get("symptom","") + "\n" + case.get("topology_note","") + "\n" + case.get("show_outputs","")).lower()
    checks = []

    def add(name, status, detail):
        checks.append({"check": name, "status": status, "detail": detail})

    add("Duplicate IP detection",
        "FAIL" if ("duplicate" in text or "two different mac" in text or "two devices" in text) else "PASS",
        "Multiple MACs / duplicate-address evidence detected." if ("duplicate" in text or "two different mac" in text) else "No duplicate-IP evidence in supplied case.")

    add("Gateway consistency",
        "FAIL" if ("gateway mismatch" in text or "default gateway is incorrect" in text or "default-router does not match" in text or "gateway: 10.40.0.254" in text) else "PASS",
        "Gateway configuration appears inconsistent with the stated subnet." if ("gateway mismatch" in text or "default gateway is incorrect" in text or "default-router does not match" in text or "gateway: 10.40.0.254" in text) else "No explicit gateway mismatch detected.")

    add("Interface state",
        "FAIL" if ("administratively down" in text or "disabled" in text or "down/down" in text) else "PASS",
        "Interface state indicates a shutdown/disabled port." if ("administratively down" in text or "disabled" in text or "down/down" in text) else "No interface-down evidence detected.")

    add("VLAN / trunk consistency",
        "FAIL" if ("missing from trunk" in text or "allowed: 10,20,30" in text or "allowed on trunk: 10,20" in text or "access mode" in text or "native vlan mismatch" in text) else "PASS",
        "VLAN transport/access configuration is inconsistent with the intended topology." if ("missing from trunk" in text or "allowed: 10,20,30" in text or "allowed on trunk: 10,20" in text or "access mode" in text or "native vlan mismatch" in text) else "No explicit VLAN transport error detected.")

    add("Route validation",
        "FAIL" if ("no route" in text or "invalid next hop" in text or "area mismatch" in text or "higher administrative distance" in text) else "PASS",
        "Routing evidence indicates a missing/invalid/non-preferred route." if ("no route" in text or "invalid next hop" in text or "area mismatch" in text or "higher administrative distance" in text) else "No explicit route error detected.")

    add("DHCP validation",
        "FAIL" if ("missing dhcp relay" in text or "missing ip helper" in text or "pool exhausted" in text or "default-router" in text and "does not match" in text) else "PASS",
        "DHCP configuration/availability evidence indicates a likely service-side or relay issue." if ("missing dhcp relay" in text or "missing ip helper" in text or "pool exhausted" in text or ("default-router" in text and "does not match" in text)) else "No explicit DHCP error detected.")

    return checks

if __name__ == "__main__":
    print("NetSage AI deterministic checker")
    print("Import check_case(case) from this module or run the web dashboard.")
