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
class FailedSourceTests(unittest.TestCase):
 def test_source_circuit_retains_last_verified_branch(self):
  import tempfile
  import fetch_prices as collector
  from unittest.mock import MagicMock,patch
  with tempfile.TemporaryDirectory() as directory:
   out=Path(directory);(out/'objects').mkdir();(out/'objects'/'keep.json.gz').write_bytes(b'fixture')
   old=[{'id':'test--0','chain':'test','object':'keep.json.gz','store_id':'0','price_count':1}]
   info=SimpleNamespace(slug='test',name_he='test',name='test',portal_url='https://example.invalid',implemented=True,chain_id='1')
   adapter=MagicMock();adapter.latest.side_effect=TimeoutError('metadata unavailable');adapter.download.side_effect=TimeoutError('source unavailable')
   full={str(i):SimpleNamespace(name='PriceFull-new',published_at=None) for i in range(50)}
   with patch.object(collector,'OUT',out),patch.object(collector,'HttpClient'),patch.object(collector.ilp,'get_adapter',return_value=adapter),patch.object(collector,'read_object',return_value={'products':[],'sources':[]}),patch.object(collector,'listing',side_effect=lambda a,k,b:full if k==collector.ilp.FileType.PRICE_FULL else {}):
    result,stores=collector.collect_chain(info,old)
   self.assertGreaterEqual(adapter.download.call_count,6);self.assertLessEqual(adapter.download.call_count,8)
   self.assertTrue(any('repeated failures' in e for e in result['errors']))
   self.assertEqual(next(s for s in stores if s['id']=='test--0')['object'],'keep.json.gz')
   self.assertEqual(result['priced'],1);self.assertEqual(result['status'],'partial')
if __name__=='__main__':unittest.main()
