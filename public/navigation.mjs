export function createNavigation({getView,render,modalOpen,closeModal,win=window}){
 const positions=new Map();let closing=false,queued=null;
 win.history.scrollRestoration='manual';
 win.history.replaceState({...(win.history.state||{}),meView:getView(),meModal:false},'');
 function show(next){positions.set(getView(),win.scrollY);render(next);win.scrollTo({top:positions.get(next)||0,behavior:'instant'});}
 function go(next){if(closing){queued=next;return;}if(next===getView()){render(next);return;}win.history.pushState({meView:next,meModal:false},'');show(next);}
 function opened(){if(!win.history.state?.meModal)win.history.pushState({meView:getView(),meModal:true},'');}
 function closed(){if(win.history.state?.meModal&&!closing){closing=true;win.history.back();}}
 win.addEventListener('popstate',e=>{closing=false;if(modalOpen())closeModal(false);const next=e.state?.meView||'search';if(next!==getView())show(next);if(queued){const target=queued;queued=null;go(target);}});
 return {go,opened,closed};
}
