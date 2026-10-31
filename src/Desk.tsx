import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { ArrowLeft, BookOpen, ChevronDown, Feather, LibraryBig, Search, X } from 'lucide-react';

// A paper can be moved without confusing a drag with the action of opening it.
function DeskPaper({className, onOpen, children}:{className:string;onOpen:()=>void;children:ReactNode}){
 const [offset,setOffset]=useState({x:0,y:0});
 const drag=useRef<{id:number;x:number;y:number;ox:number;oy:number;moved:boolean}|null>(null);
 const skipClick=useRef(false);
 return <button className={'desk-paper '+className} style={{translate:`${offset.x}px ${offset.y}px`}}
  aria-description="اضغط للفتح، أو اسحب الورقة لتحريكها. استخدم الأسهم لتحريكها وHome لإعادتها."
  onPointerDown={e=>{if(e.button!==0)return; skipClick.current=false;drag.current={id:e.pointerId,x:e.clientX,y:e.clientY,ox:offset.x,oy:offset.y,moved:false};e.currentTarget.setPointerCapture(e.pointerId)}}
  onPointerMove={e=>{const d=drag.current;if(!d||d.id!==e.pointerId)return;const dx=e.clientX-d.x,dy=e.clientY-d.y;if(Math.hypot(dx,dy)>6)d.moved=true;if(d.moved){const r=e.currentTarget.getBoundingClientRect();const x=Math.max(8-r.left,Math.min(window.innerWidth-8-r.right,dx+d.ox-offset.x))+offset.x;const y=Math.max(8-r.top,Math.min(window.innerHeight-8-r.bottom,dy+d.oy-offset.y))+offset.y;setOffset({x,y})}}}
  onPointerUp={e=>{const d=drag.current;if(!d||d.id!==e.pointerId)return;skipClick.current=d.moved;drag.current=null}}
  onPointerCancel={()=>{drag.current=null;skipClick.current=true}}
  onKeyDown={e=>{const moves:Record<string,[number,number]>={ArrowLeft:[-10,0],ArrowRight:[10,0],ArrowUp:[0,-10],ArrowDown:[0,10]};if(e.key==='Home'){e.preventDefault();setOffset({x:0,y:0})}else if(moves[e.key]){e.preventDefault();const [x,y]=moves[e.key];setOffset(o=>({x:Math.max(-80,Math.min(80,o.x+x)),y:Math.max(-80,Math.min(80,o.y+y))}))}}}
  onClick={()=>{if(skipClick.current){skipClick.current=false;return}onOpen()}}>{children}</button>
}

type DeskStory = {title:string;author:string;category:string;emoji:string};
export function Desk({stories, open, openStory, write}:{stories:DeskStory[];open:(page?:number)=>void;openStory:(index:number)=>void;write:()=>void}){
 const [catalog,setCatalog]=useState(false); const [query,setQuery]=useState(''); const [opening,setOpening]=useState(false);
 const [shelfOpen,setShelfOpen]=useState(false); const [onDesk,setOnDesk]=useState(true);
 type CarriedBook={from:'desk'|'shelf';left:number;top:number;width:number;height:number;settling:boolean};
 const [drag,setDrag]=useState<CarriedBook|null>(null); const [dropReady,setDropReady]=useState(false);
 const shelfRef=useRef<HTMLDivElement>(null); const deskRef=useRef<HTMLElement>(null);
 const gesture=useRef<{pointerId:number;from:'desk'|'shelf';x:number;y:number;left:number;top:number;width:number;height:number;moved:boolean}|null>(null);
 const settleTimer=useRef<number|null>(null); const suppressClick=useRef(false);
 useEffect(()=>()=>{if(settleTimer.current!==null)window.clearTimeout(settleTimer.current)},[]);
 useEffect(()=>{if(!catalog)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setCatalog(false)};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close)},[catalog]);
 const startDrag=(e:PointerEvent<HTMLButtonElement>,from:'desk'|'shelf')=>{
  if(e.button!==0||drag?.settling||gesture.current)return;
  suppressClick.current=false;
  const rect=e.currentTarget.querySelector('img')?.getBoundingClientRect() ?? e.currentTarget.getBoundingClientRect();
  gesture.current={pointerId:e.pointerId,from,x:e.clientX,y:e.clientY,left:rect.left,top:rect.top,width:rect.width,height:rect.height,moved:false};
  e.currentTarget.setPointerCapture(e.pointerId);
 };
 const moveDrag=(e:PointerEvent<HTMLButtonElement>)=>{
  const g=gesture.current;if(!g||g.pointerId!==e.pointerId)return;
  if(!g.moved&&Math.hypot(e.clientX-g.x,e.clientY-g.y)>5){g.moved=true;if(g.from==='desk')setShelfOpen(true)}
  // Keep the exact point where the book was held under the finger as it shrinks.
  if(g.moved){const target=(g.from==='desk'?shelfRef.current:deskRef.current)?.getBoundingClientRect();setDropReady(!!target&&e.clientX>=target.left&&e.clientX<=target.right&&e.clientY>=target.top&&e.clientY<=target.bottom);const scale=.85;setDrag({from:g.from,left:e.clientX-(g.x-g.left)*scale,top:e.clientY-(g.y-g.top)*scale,width:g.width*scale,height:g.height*scale,settling:false})}
 
 };
 const endDrag=(e:PointerEvent<HTMLButtonElement>,cancelled=false)=>{
  const g=gesture.current;if(!g||g.pointerId!==e.pointerId)return;gesture.current=null;setDropReady(false);if(!g.moved)return;
  suppressClick.current=true;window.setTimeout(()=>{suppressClick.current=false},0);
  const area=g.from==='desk'?shelfRef.current:deskRef.current;
  const rect=area?.getBoundingClientRect();
  const accepted=!cancelled&&!!rect&&e.clientX>=rect.left&&e.clientX<=rect.right&&e.clientY>=rect.top&&e.clientY<=rect.bottom;
  let destination={left:g.left,top:g.top,width:g.width,height:g.height};
  if(accepted&&g.from==='desk'){
   const slot=shelfRef.current?.querySelector('.shelf-placeholder')?.getBoundingClientRect();
   if(slot){const width=Math.min(slot.width,window.innerWidth<=650?66:81);const height=width*1024/724;destination={left:slot.left+(slot.width-width)/2,top:slot.bottom-height,width,height}}
  }else if(accepted&&g.from==='shelf'&&rect){
   const width=window.innerWidth<=650?Math.min(window.innerWidth*.68,280):Math.min(window.innerWidth*.33,370);
   const height=width*1024/724;
   destination={left:rect.left+(rect.width-width)/2,top:rect.top+(rect.height-height)/2,width,height};
  }
  setDrag({from:g.from,...destination,settling:true});
  const delay=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:280;
  settleTimer.current=window.setTimeout(()=>{if(accepted)setOnDesk(g.from==='shelf');setDrag(null);settleTimer.current=null},delay);
 };
 const matches=stories.map((story,index)=>({story,index})).filter(({story})=>`${story.title} ${story.author} ${story.category}`.includes(query.trim()));
 const openCover=()=>{if(opening)return; if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){open(1);return}setOpening(true);window.setTimeout(()=>open(1),420)};
 return <main className={'immersive-desk '+(opening?'is-opening':'')}>
  <button className="shelf-toggle" aria-expanded={shelfOpen} aria-controls="editions-shelf" onClick={()=>setShelfOpen(!shelfOpen)}><LibraryBig size={18}/> رف الإصدارات <ChevronDown size={16} className={shelfOpen?'turned':''}/></button>
  <div id="editions-shelf" ref={shelfRef} className={'editions-shelf '+(shelfOpen?'shelf-open':'')+(dropReady&&drag?.from==='desk'?' drop-ready':'')} inert={!shelfOpen}>
   <div className="shelf-inner"><div className="shelf-heading"><strong>رف الإصدارات</strong><span>اختر كتاباً وضعه على الطاولة</span></div><div className="shelf-books">{!onDesk?<button className={'shelf-book '+(drag?.from==='shelf'?'book-being-carried':'')} onPointerDown={e=>startDrag(e,'shelf')} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={e=>endDrag(e,true)} onClick={()=>{if(!suppressClick.current)setOnDesk(true)}} aria-label="ضع المجلد الأول على الطاولة"><img src="/user-book-cover.png" alt="" draggable="false"/><span>المجلد الأول</span></button>:<div className="shelf-placeholder">مكان المجلد الأول<br/><small>الكتاب على الطاولة</small></div>}</div><div className="shelf-note">{onDesk?'اسحب الكتاب إلى الرف أو اضغط إعادته':'اسحب الكتاب إلى الطاولة أو اضغط عليه'}</div></div><div className="shelf-ledge"/>
  </div>
  {drag&&<div className={'dragged-book '+(drag.settling?'is-settling':'')} style={{left:drag.left,top:drag.top,width:drag.width,height:drag.height}} aria-hidden="true"><img src="/user-book-cover.png" alt="" draggable="false"/></div>}
  <div className="desk-identity"><span>✦</span><div><strong>مكتبة المبدعين الصغار</strong><small>حكايات صغيرة، أحلام كبيرة</small></div></div>
  <div className="desk-paper-links"><DeskPaper className="catalog-paper" onOpen={()=>setCatalog(true)}><span className="paper-tape"/><BookOpen size={23}/><strong>فهرس الحكايات</strong><small>اختر حكايتك</small></DeskPaper><DeskPaper className="creator-paper" onOpen={write}><span className="paper-tape"/><Feather size={23}/><strong>اكتب حكايتك</strong><small>مساحة المبدع</small></DeskPaper></div>
  <section ref={deskRef} className={'immersive-center '+(dropReady&&drag?.from==='shelf'?'drop-ready':'')} aria-label="الكتاب على طاولة القراءة">{onDesk?<><div className={'desk-book-wrap '+(drag?.from==='desk'?'book-being-carried':'')}><div className="book-ribbon" aria-hidden="true"/><button className="desk-book" onPointerDown={e=>startDrag(e,'desk')} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={e=>endDrag(e,true)} onClick={()=>{if(!suppressClick.current)openCover()}} aria-label="افتح كتاب المجلد الأول"><div className="desk-book-cover user-book-cover"><img src="/user-book-cover.png" alt="غلاف قصص المبدعين الصغار" draggable="false"/></div></button></div><button className="table-open-hint" onClick={openCover}><span>☝</span> اضغط على الكتاب لفتحه</button><button className="return-book" onClick={()=>{setShelfOpen(true);setOnDesk(false)}}>أعِد الكتاب إلى الرف</button></>:<div className="empty-desk"><BookOpen size={35}/><strong>مكان كتابك هنا</strong><span>اختر كتاباً من رف الإصدارات</span><button onClick={()=>setShelfOpen(true)}>افتح الرف</button></div>}</section>
  <div className="table-demo">نسخة تجريبية · بيانات هذا الجهاز فقط</div>
  {catalog&&<div className="drawer-backdrop" onClick={()=>setCatalog(false)}><section className="desk-drawer" onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-label="فهرس الحكايات"><div className="drawer-head"><div><span>✦ &nbsp; المجلد الأول</span><h2>فهرس الحكايات</h2><p>أي حكاية سنقرأ اليوم؟</p></div><button onClick={()=>setCatalog(false)} aria-label="إغلاق"><X size={20}/></button></div><label className="drawer-search"><Search size={18}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث عن حكاية أو كاتب..."/></label><div className="drawer-list">{matches.map(({story,index})=><button key={index} onClick={()=>{setCatalog(false);openStory(index)}}><span className="drawer-emoji">{story.emoji}</span><span><strong>{story.title}</strong><small>{story.author} · {story.category}</small></span><ArrowLeft size={17}/></button>)}{!matches.length&&<p className="drawer-empty">لم نجد حكاية بهذا الاسم، جرّب البحث مرة أخرى.</p>}</div></section></div>}
 </main>
}
