"""Prefer fuller official names for the same product identifier during catalog aggregation."""
CATALOG_UPSERT = '''INSERT INTO products VALUES(?,?,?,?,?,?,1,?,?,?)
ON CONFLICT(id) DO UPDATE SET
 min_price=min(min_price,excluded.min_price),
 max_price=max(max_price,excluded.max_price),
 stores=stores+1,
 name=CASE WHEN length(trim(excluded.name))>length(trim(products.name)) THEN excluded.name ELSE products.name END,
 search=CASE WHEN length(trim(excluded.name))>length(trim(products.name)) THEN excluded.search ELSE products.search END,
 manufacturer=CASE WHEN (products.manufacturer IS NULL OR trim(products.manufacturer) IN ('','לא ידוע','unknown'))
 AND excluded.manufacturer IS NOT NULL AND trim(excluded.manufacturer) NOT IN ('','לא ידוע','unknown')
 THEN excluded.manufacturer ELSE products.manufacturer END'''
