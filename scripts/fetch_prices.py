"""Fetch published supermarket prices into a small, verifiable snapshot.

Requires: pip install israeli-prices
Outputs only real records. A failed chain is reported, never replaced by fake data.
"""
import json
from datetime import datetime, timezone
from pathlib import Path
import israeli_prices as ilp

CHAINS = ["shufersal", "rami-levy"]
OUT = Path("public/prices.json")
OUT.parent.mkdir(parents=True, exist_ok=True)
result = {"updated_at": datetime.now(timezone.utc).isoformat(), "stores": [], "errors": []}

def field(value, *names):
    for name in names:
        if isinstance(value, dict) and value.get(name) is not None:
            return value[name]
        v = getattr(value, name, None)
        if v is not None:
            return v
    return None

for chain in CHAINS:
    try:
        stores_file = ilp.get_stores(chain)
        stores = field(stores_file, "stores") or []
        candidates = []
        for store in stores:
            city = str(field(store, "city", "city_name", "store_city") or "")
            sid = field(store, "store_id", "storeid", "id")
            name = str(field(store, "store_name", "name") or "")
            if sid is not None:
                candidates.append((("חיפה" in city or "חיפה" in name), str(sid), name, city))
        candidates.sort(reverse=True)
        if not candidates:
            raise RuntimeError("No store IDs in published store list")
        _, sid, name, city = candidates[0]
        prices = ilp.get_prices(chain, store_id=sid)
        products = []
        for item in field(prices, "items") or []:
            price = field(item, "price", "item_price")
            title = field(item, "item_name", "name", "item_nm")
            code = field(item, "gtin", "item_code")
            try:
                amount = float(price)
            except (TypeError, ValueError):
                continue
            if title and code and amount >= 0:
                products.append({"name": str(title), "barcode": str(code), "price": amount})
        if not products:
            raise RuntimeError("No priced products returned")
        result["stores"].append({"chain": chain, "store_id": sid, "name": name, "city": city, "products": products})
    except Exception as exc:
        result["errors"].append({"chain": chain, "error": str(exc)[:250]})
if result["stores"]:
    OUT.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("Saved", len(result["stores"]), "stores")
else:
    raise SystemExit("No real data retrieved; existing snapshot preserved")
