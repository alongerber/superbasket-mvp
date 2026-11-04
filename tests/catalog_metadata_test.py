import sqlite3,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from catalog_metadata import CATALOG_UPSERT

class MetadataTests(unittest.TestCase):
 def test_fuller_official_name_and_known_manufacturer_replace_truncated_first_source(self):
  db=sqlite3.connect(':memory:')
  db.execute('CREATE TABLE products(id TEXT PRIMARY KEY,barcode TEXT,name TEXT,search TEXT,min_price INTEGER,max_price INTEGER,stores INTEGER,weighted INTEGER,unit TEXT,manufacturer TEXT)')
  def put(id,name,price,maker):db.execute(CATALOG_UPSERT,(id,id,name,name.lower(),price,price,0,'100 גרם',maker))
  put('123','גבינה לבנה 5%',1200,'לא ידוע')
  put('123','גבינה לבנה 5% 250 גרם תנובה',1000,'תנובה')
  put('123','גבינה',1500,None)
  row=db.execute('SELECT name,search,min_price,max_price,stores,manufacturer FROM products').fetchone()
  self.assertEqual(row,('גבינה לבנה 5% 250 גרם תנובה','גבינה לבנה 5% 250 גרם תנובה',1000,1500,3,'תנובה'))
  put('456','גבינה אחרת',800,'יצרן')
  self.assertEqual(db.execute('SELECT count(*) FROM products').fetchone()[0],2)

if __name__=='__main__':unittest.main()
