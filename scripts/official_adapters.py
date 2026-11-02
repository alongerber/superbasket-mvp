"""Small corrections to the pinned client, based on the official portal responses."""
import html,re
from israeli_prices.chains.shufersal import ShufersalAdapter
from israeli_prices.chains.base import parse_filename,same_store
from israeli_prices.models import FileRef,FileType

class FilteredShufersal(ShufersalAdapter):
 def iter_files(self,file_type=None,store_id=None):
  categories={None:0,FileType.PRICE:1,FileType.PRICE_FULL:2,FileType.PROMO:3,FileType.PROMO_FULL:4,FileType.STORES:5}
  page=1;seen=set()
  while True:
   response=self.client.get('https://prices.shufersal.co.il/FileObject/UpdateCategory',params={'catID':categories[file_type],'storeId':int(store_id or 0),'page':page})
   links=re.findall(r'href="(https://[^\"]+?\.gz[^\"]*)"',response.text);new=0
   for raw in links:
    url=html.unescape(raw);name=url.split('?')[0].rsplit('/',1)[-1]
    if name in seen:continue
    seen.add(name);new+=1;kind,branch,published=parse_filename(name)
    if file_type and kind!=file_type:continue
    if store_id and not same_store(branch,store_id):continue
    yield FileRef(chain='shufersal',name=name,file_type=kind or FileType.PRICE,url=url,store_id=branch,published_at=published)
   if not new:return
   page+=1
