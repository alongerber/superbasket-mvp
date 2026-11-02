"""Small verified-data pilot: one Haifa branch per chain, never synthetic prices."""
import json
from datetime import datetime, timezone
from pathlib import Path
import israeli_prices as ilp

CHAINS = ("shufersal", "rami-levy")
OUT = Path("public/prices.json")
OUT.parent.mkdir(parents=True, exist_ok=True)
result = {"updated_at": datetime.now(timezone.utc).isoformat(), "stores": [], "errors": []}

for chain in CHAINS:
    try:
        stores_file = ilp.get_stores(chain)
        candidates = [
            store for store in stores_file.stores
            if "חיפה" in (store.name or "") or "חיפה" in (store.city or "")
            or "חיפה" in (store.address or "")
        ]
        if not candidates:
            raise RuntimeError("No Haifa branch found in published store metadata")
        store = candidates[0]
        price_file = ilp.get_prices(chain, store_id=store.store_id)
        products = [
            {"name": item.name, "barcode": item.gtin, "price": float(item.price)}
            for item in price_file.items
            if item.name and item.gtin and item.price is not None and item.price >= 0
        ]
        if len(products) < 100:
            raise RuntimeError(f"Insufficient real priced products: {len(products)}")
        result["stores"].append({
            "chain": chain, "store_id": store.store_id,
            "name": store.name or store.store_id, "city": "חיפה",
            "address": store.address, "products": products
        })
    except Exception as exc:
        result["errors"].append({"chain": chain, "error": str(exc)[:250]})

if not result["stores"]:
    raise SystemExit("No real prices downloaded; preserving previous snapshot")
OUT.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print("Saved", len(result["stores"]), "real stores,",
      sum(len(s["products"]) for s in result["stores"]), "prices")
if result["errors"]:
    print("Chain errors:", json.dumps(result["errors"], ensure_ascii=False))
