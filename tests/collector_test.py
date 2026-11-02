import sys,unittest
from pathlib import Path
from types import SimpleNamespace
from decimal import Decimal
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from fetch_prices import apply_delta
class DeltaTests(unittest.TestCase):
 def product(self,code,price,weighted=False):
  return SimpleNamespace(item_code=code,gtin=code.zfill(14),price=Decimal(price),is_weighted=weighted,name='מוצר בדיקה',price_update_time=None,unit_of_measure=None,manufacturer=None,allow_discount=False,status=None)
 def test_zero_delta_removes_previously_eligible_price(self):
  rows={'07290000042435':{'price':680},'other':{'price':500}}
  apply_delta(rows,SimpleNamespace(items=[self.product('7290000042435','0')]),'test')
  self.assertNotIn('07290000042435',rows);self.assertIn('other',rows)
 def test_positive_delta_changes_only_exact_product(self):
  rows={'07290000042435':{'price':680},'other':{'price':500}}
  apply_delta(rows,SimpleNamespace(items=[self.product('7290000042435','6.9')]),'test')
  self.assertEqual(rows['07290000042435']['price'],690);self.assertEqual(rows['other']['price'],500)
 def test_weighted_codes_remain_chain_local(self):
  rows={};apply_delta(rows,SimpleNamespace(items=[self.product('123','7.5',True)]),'retailer')
  self.assertIn('retailer:123',rows);self.assertIsNone(rows['retailer:123']['barcode'])
if __name__=='__main__':unittest.main()
