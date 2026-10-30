import { useState } from 'react';
import { ArrowLeft, BookOpen, Feather, Search, X } from 'lucide-react';

type DeskStory = {title:string;author:string;category:string;emoji:string};
export function Desk({stories, open, openStory, write}:{stories:DeskStory[];open:(page?:number)=>void;openStory:(index:number)=>void;write:()=>void}){
 const [catalog,setCatalog]=useState(false); const [query,setQuery]=useState(''); const [opening,setOpening]=useState(false);
 const matches=stories.map((story,index)=>({story,index})).filter(({story})=>`${story.title} ${story.author} ${story.category}`.includes(query.trim()));
 const openCover=()=>{if(opening)return; if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){open(1);return}setOpening(true);window.setTimeout(()=>open(1),420)};
 return <main className={'immersive-desk '+(opening?'is-opening':'')}>
  <div className="desk-identity"><span>✦</span><div><strong>مكتبة المبدعين الصغار</strong><small>حكايات صغيرة، أحلام كبيرة</small></div></div>
  <div className="desk-paper-links"><button className="desk-paper catalog-paper" onClick={()=>setCatalog(true)}><span className="paper-tape"/><BookOpen size={23}/><strong>فهرس الحكايات</strong><small>اختر حكايتك</small></button><button className="desk-paper creator-paper" onClick={write}><span className="paper-tape"/><Feather size={23}/><strong>اكتب حكايتك</strong><small>مساحة المبدع</small></button></div>
  <section className="immersive-center" aria-label="الكتاب على طاولة القراءة"><div className="desk-book-wrap"><div className="book-ribbon" aria-hidden="true"/><button className="desk-book" onClick={openCover} aria-label="افتح كتاب المجلد الأول"><div className="desk-book-cover user-book-cover"><img src="/user-book-cover.png" alt="غلاف قصص المبدعين الصغار" draggable="false"/></div></button></div><button className="table-open-hint" onClick={openCover}><span>☝</span> اضغط على الكتاب لفتحه</button></section>
  <div className="table-demo">نسخة تجريبية · بيانات هذا الجهاز فقط</div>
  {catalog&&<div className="drawer-backdrop" onClick={()=>setCatalog(false)}><section className="desk-drawer" onClick={e=>e.stopPropagation()} role="dialog" aria-modal="true" aria-label="فهرس الحكايات"><div className="drawer-head"><div><span>✦ &nbsp; المجلد الأول</span><h2>فهرس الحكايات</h2><p>أي حكاية سنقرأ اليوم؟</p></div><button onClick={()=>setCatalog(false)} aria-label="إغلاق"><X size={20}/></button></div><label className="drawer-search"><Search size={18}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="ابحث عن حكاية أو كاتب..."/></label><div className="drawer-list">{matches.map(({story,index})=><button key={index} onClick={()=>{setCatalog(false);openStory(index)}}><span className="drawer-emoji">{story.emoji}</span><span><strong>{story.title}</strong><small>{story.author} · {story.category}</small></span><ArrowLeft size={17}/></button>)}{!matches.length&&<p className="drawer-empty">لم نجد حكاية بهذا الاسم، جرّب البحث مرة أخرى.</p>}</div></section></div>}
 </main>
}
