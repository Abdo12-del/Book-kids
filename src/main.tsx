import React, {useEffect, useState, useRef, useMemo} from 'react';
import HTMLFlipBook, {type BookSnapshot} from '@gullabs/react-flipbook';
import {createRoot} from 'react-dom/client';
import {ArrowLeft, ArrowRight, BookOpen, Bookmark, ChevronDown, ChevronLeft, ChevronRight, Eye, Feather, Heart, LibraryBig, LockKeyhole, Menu, PenLine, Search, Sparkles, Star, X, ZoomIn, Maximize2, List, Send, Info} from 'lucide-react';
import './style.css';
import {DemoDashboard, DemoLogin, type DemoStory} from './Demo';
import {Desk} from './Desk';
import {CreatorDesk} from './CreatorDesk';

type Story = {title:string; author:string; category:string; text:string; color:string; emoji:string};
const seedStories:Story[] = [];
type SoundName = 'page' | 'lift' | 'land';
function PaperSound(){
 const [enabled,setEnabled]=useState(false);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState(false);
 const audio=useRef<AudioContext|null>(null);
 const recordings=useRef<Partial<Record<SoundName,AudioBuffer>>>({});
 useEffect(()=>()=>{void audio.current?.close()},[]);
 useEffect(()=>{
  if(!enabled)return;
  const play=(event:Event)=>{
   const name=(event as CustomEvent<SoundName>).detail;
   const ctx=audio.current;const buffer=recordings.current[name];
   if(!ctx||ctx.state!=='running'||!buffer)return;
   const source=ctx.createBufferSource();const gain=ctx.createGain();
   source.buffer=buffer;gain.gain.value=name==='land'?.28:.35;source.connect(gain).connect(ctx.destination);source.start();
  };
  window.addEventListener('library-sound',play);return()=>window.removeEventListener('library-sound',play);
 },[enabled]);
 const toggle=async()=>{
  if(enabled){setEnabled(false);await audio.current?.suspend();return}
  try{
   setError(false);setLoading(true);const ctx=audio.current ?? new AudioContext();audio.current=ctx;
   await ctx.resume();
   const files:Record<SoundName,string>={page:'page-turn.wav',lift:'book-lift.mp3',land:'book-land.wav'};
   await Promise.all((Object.keys(files) as SoundName[]).map(async name=>{
    if(recordings.current[name])return;
    const response=await fetch('/sounds/'+files[name]);if(!response.ok)throw new Error('Sound unavailable');
    recordings.current[name]=await ctx.decodeAudioData(await response.arrayBuffer());
   }));
   setEnabled(true);
  }catch{setEnabled(false);setError(true)}finally{setLoading(false)}
 };
 return <button className="paper-sound-toggle" onClick={()=>void toggle()} disabled={loading} aria-pressed={enabled} title="أصوات المكتبة اختيارية">{loading?'جارٍ تجهيز الأصوات...':error?'تعذّر تشغيل الصوت، حاول مجدداً':enabled?'♫ أصوات المكتبة مفعّلة':'♪ تفعيل أصوات المكتبة'}</button>
}
function App(){
 const flipBook = useRef<any>(null);
 const cameraRef = useRef<HTMLDivElement>(null);
 const openCoverOnLoad = useRef(false);
 const openingFrame = useRef<number | null>(null);
 const soundPage = useRef<number|null>(null);
 const moveCamera = (progress:number,direction:'next'|'prev') => {
  const camera=cameraRef.current;
  if(!camera || !window.matchMedia('(max-width: 650px)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const movement=Math.sin(Math.PI*Math.max(0,Math.min(1,progress)));
  // The camera moves within a clipped viewport; it must never widen the document.
  const distance=Math.min(camera.clientWidth*0.06,22);
  camera.style.setProperty('--camera-x', `${(direction==='next'?1:-1)*movement*distance}px`);
  camera.style.setProperty('--camera-scale', `${1-movement*0.035}`);
 };
 const resetCamera = () => {
  cameraRef.current?.style.setProperty('--camera-x','0px');
  cameraRef.current?.style.setProperty('--camera-scale','1');
 };
 const [view,setView]=useState<'home'|'reader'|'write'|'login'|'child'|'admin'>('home');
 const [demoStories,setDemoStories]=useState<DemoStory[]>(()=>{try{const saved=localStorage.getItem('little-demo-stories');return saved?JSON.parse(saved):[]}catch{return []}});
 const [commentName,setCommentName]=useState(''); const [commentText,setCommentText]=useState('');
 const stories:Story[]=useMemo(()=>[...seedStories,...demoStories.filter(s=>s.status==='published'&&s.id!=='sample-1').map(s=>({title:s.title,author:'المبدع الصغير',category:s.category,text:s.text,color:'blue',emoji:'✨'}))], [demoStories]);
 // Build real book leaves: preliminary pages, paginated contents, then story leaves.
 const {pages,storyStarts} = useMemo(()=>{
  type BookPage = {label:string;title:string;text:string;kind:'cover'|'title'|'intro'|'contents'|'story'|'blank';cover?:string;author?:string;storyIndex?:number;continuation?:boolean;entries?:Array<{title:string;author:string;page:number}>};
  const result:BookPage[] = [
   {kind:'cover',label:'الغلاف الأمامي',title:'الغلاف الأمامي',text:'',cover:'/user-book-cover.png'}
  ];
  // Keep the empty book readable and turnable without inventing content.
  if(!stories.length)result.push(
   {kind:'blank',label:'صفحة فارغة',title:'',text:''},
   {kind:'blank',label:'صفحة فارغة',title:'',text:''}
  );
  // Reserve enough contents leaves first so every printed page number is accurate.
  const contentsCount=Math.ceil(stories.length/5);
  const contentsStart=result.length;
  for(let i=0;i<contentsCount;i++)result.push({kind:'contents',label:i?'تابع الفهرس':'الفهرس',title:i?'فهرس الحكايات · تابع':'فهرس الحكايات',text:'',entries:[]});
  const starts:number[]=[];
  stories.forEach((story,storyIndex)=>{
   starts.push(result.length);
   const paragraphs=story.text.split(/\n+/); const chunks:string[]=[]; let current='';
   for(const paragraph of paragraphs){
    for(const word of paragraph.trim().split(/\s+/).filter(Boolean)){
     if(current && current.length+word.length+1>190){chunks.push(current);current='';}
     current+=(current&&!current.endsWith('\n')?' ':'')+word;
    }
    if(current) current+='\n\n';
   }
   if(current.trim())chunks.push(current.trim());
   if(!chunks.length)chunks.push('');
   chunks.forEach((text,index)=>result.push({kind:'story',label:index?'تابع الحكاية':story.category,title:story.title,text:text.trim(),author:story.author,storyIndex,continuation:index>0}));
  });
  stories.forEach((story,index)=>result[contentsStart+Math.floor(index/5)].entries!.push({title:story.title,author:story.author,page:starts[index]}));
  result.push({kind:'cover',label:'الغلاف الخلفي',title:'الغلاف الخلفي',text:'',cover:'/user-book-back.png'});
  return {pages:result,storyStarts:starts};
 },[stories]);
 const bookLeaves=useMemo(()=>pages.map((p,i)=><div className="flip-page" key={i}>{p.kind==='cover' ? <div className="reader-cover"><img src={p.cover} alt={p.label}/></div> : <div className={'paper-inner book-paper book-paper--'+p.kind+(p.continuation?' is-continuation':'')}>
  {p.kind==='blank'?<span className="visually-hidden">صفحة فارغة</span>:p.kind==='title'?<div className="book-title-page"><div className="title-flourish" aria-hidden="true">✧ &nbsp; ❧ &nbsp; ✧</div><span className="title-publisher">مكتبة المبدعين الصغار</span><h2>{p.title}</h2><div className="title-rule"/><p>المجلد الأول</p><p className="title-subtitle">{p.text}</p><div className="title-footer">✦ &nbsp; حكاياتٌ من خيال أطفالنا &nbsp; ✦</div></div>:
   <><div className="book-running-head"><span>{p.kind==='story'?p.title:'قصص المبدعين الصغار'}</span><span>✦</span><span>المجلد الأول</span></div>
   {p.kind==='contents'?<><div className="chapter-heading"><span className="chapter-kicker">دليل القارئ</span><h2>{p.title}</h2><div className="chapter-rule" aria-hidden="true">❧</div></div><div className="book-contents" aria-label="فهرس الحكايات">{p.entries?.map(entry=><button key={entry.page} onClick={()=>flipBook.current?.turnToPage(entry.page)} aria-label={`${entry.title}، صفحة ${entry.page+1}`}><span className="contents-title">{entry.title}<small>{entry.author}</small></span><span className="contents-dots" aria-hidden="true"/><span className="contents-number">{(entry.page+1).toLocaleString('ar')}</span></button>)}</div></>:
   <>{!p.continuation&&<div className="chapter-heading"><span className="chapter-kicker">{p.kind==='story'?`حكاية ${((p.storyIndex??0)+1).toLocaleString('ar')}`:'مقدمة'}</span><h2>{p.title}</h2>{p.author&&<span className="chapter-author">بقلم {p.author}</span>}<div className="chapter-rule" aria-hidden="true">❧</div></div>}<div className="paper-text book-prose" tabIndex={0} aria-label="نص الصفحة">{p.text.split(/\n+/).filter(Boolean).map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div></>}
   </>}
  {p.kind!=='blank'&&<div className="page-number"><span>—</span> {(i+1).toLocaleString('ar')} <span>—</span></div>}</div>}</div>),[pages]);

 useEffect(()=>{try{localStorage.setItem('little-demo-stories',JSON.stringify(demoStories))}catch{/* The editor reports storage failures before confirming a save. */}},[demoStories]);
 const [page,setPage]=useState(0); const [initialPage,setInitialPage]=useState(0); const [visiblePages,setVisiblePages]=useState<number[]>([0]); const [portrait,setPortrait]=useState(false); const [search,setSearch]=useState(''); const [showSearch,setShowSearch]=useState(false); const [menu,setMenu]=useState(false); const [zoom,setZoom]=useState(false); const [toc,setToc]=useState(false);  const [notice,setNotice]=useState('');
 const [draft,setDraft]=useState(()=>{try{return JSON.parse(localStorage.getItem('little-draft')||'{}')}catch{return {}}});
 const goPage=(n:number)=>{if(n<0||n>=pages.length)return; const book=flipBook.current; if(!book)return; if(n===page+1) book.flipNext(); else if(n===page-1) book.flipPrev(); else book.turnToPage(n);};
 const syncBook=(snapshot:BookSnapshot)=>{setPage(snapshot.page);setPortrait(snapshot.orientation==='portrait');setVisiblePages(snapshot.visiblePages);};
 const openBook=(n=1,animateCover=false)=>{const animate=animateCover&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;openCoverOnLoad.current=animate;const startPage=animate?0:n;setInitialPage(startPage);setPage(startPage);setVisiblePages([startPage]);setView('reader');window.scrollTo(0,0); const storyIndex=pages[n]?.storyIndex ?? -1; if(storyIndex>=seedStories.length){const match=demoStories.filter(s=>s.status==='published'&&s.id!=='sample-1')[storyIndex-seedStories.length]; if(match){const key='view-'+match.id+'-'+new Date().toISOString().slice(0,10); if(!sessionStorage.getItem(key)){sessionStorage.setItem(key,'1');setDemoStories(prev=>prev.map(s=>s.id===match.id?{...s,views:s.views+1}:s));}}}};
 const readDemo=(id:string)=>{const index=demoStories.filter(s=>s.status==='published'&&s.id!=='sample-1').findIndex(s=>s.id===id); if(index>=0)openBook(storyStarts[seedStories.length+index])};
 const scroll=(id:string)=>{setView('home');setMenu(false);setTimeout(()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth'}),50)};
 const saveDraft=()=>{localStorage.setItem('little-draft',JSON.stringify(draft));setNotice('تم حفظ المسودة على هذا الجهاز.');};
 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),3500);return()=>clearTimeout(t)},[notice]);
 useEffect(()=>{if(view!=='reader')return;return()=>{if(openingFrame.current!==null)cancelAnimationFrame(openingFrame.current);openCoverOnLoad.current=false}},[view]);
 const found=stories.filter(s=>`${s.title} ${s.author} ${s.category}`.includes(search));
 return <div className="app" dir="rtl">
 <PaperSound/>

 {view==='home'&&<Desk stories={stories} open={()=>openBook(1,true)} openStory={(index)=>openBook(storyStarts[index])} write={()=>setView('login')}/>}
 {view==='reader'&&<main className="reader"><div className="reader-table-controls"><button className="reader-close-book" onClick={()=>setView('home')}><ArrowRight size={18}/> إغلاق الكتاب</button><div className="reader-tools"><button onClick={()=>setToc(!toc)} title="الفهرس" aria-label="فهرس الكتاب"><List size={19}/><span>الفهرس</span></button><button onClick={()=>setZoom(!zoom)} aria-label={zoom?"تصغير النص":"تكبير النص"} aria-pressed={zoom} title="تكبير"><ZoomIn size={19}/><span>تكبير</span></button><button onClick={()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.()}} title="ملء الشاشة" aria-label="ملء الشاشة"><Maximize2 size={18}/></button></div></div>{toc&&<div className="toc"><button onClick={()=>setToc(false)} aria-label="إغلاق"><X size={18}/></button><strong>فهرس الكتاب</strong>{pages.map((p,i)=>(p.label==='تابع الحكاية'||p.label==='تابع الفهرس')?null:<button key={i} onClick={()=>{flipBook.current?.turnToPage(i);setToc(false)}}>{p.title}<span>{i+1}</span></button>)}</div>}<div className={'book-stage '+(zoom?'zoom':'')}><button className="side-arrow" disabled={page===0} onClick={()=>goPage(page-1)} aria-label="الصفحة السابقة"><ChevronRight/></button><div className="reader-camera" ref={cameraRef}><HTMLFlipBook ref={flipBook} className="real-flip-book" initialPage={initialPage} sizing="responsive" width={380} height={540} minWidth={220} maxWidth={380} minHeight={315} maxHeight={540} drawShadow={true} flippingTime={1200} usePortrait={true} startZIndex={0} autoSize={true} maxShadowOpacity={0.5} hardCovers={true} allowTouchScroll={false} respectInteractiveContent={true} swipeDistance={25} foldCornerOnHover={true} flipOnClick="corners" pageBackground="#fbf4e5" readingDirection="rtl" respectReducedMotion={true} controls="none" aria-label="المجلد الأول: بداية الحكاية" roleDescription="كتاب" liveRegionText={(_page,count,info)=>`صفحة ${info.pages.map(n=>n+1).join(' و ')} من ${count}`} onTurnProgress={({progress,direction})=>moveCamera(progress,direction)} onChangeState={({state})=>{if(state==='read')resetCamera()}} onLoaded={snapshot=>{soundPage.current=snapshot.page;syncBook(snapshot);if(openCoverOnLoad.current){openCoverOnLoad.current=false;openingFrame.current=requestAnimationFrame(()=>{openingFrame.current=requestAnimationFrame(()=>{openingFrame.current=null;const book=flipBook.current;if(book&&!book.flipNext())book.turnToPage(1)})})}}} onPageChange={snapshot=>{if(soundPage.current!==null&&soundPage.current!==snapshot.page)window.dispatchEvent(new CustomEvent('library-sound',{detail:'page'}));soundPage.current=snapshot.page;syncBook(snapshot)}} onChangeOrientation={(info)=>setPortrait(info.orientation==='portrait')}>{bookLeaves}</HTMLFlipBook></div><button className="side-arrow" disabled={visiblePages.includes(pages.length-1)} onClick={()=>goPage(page+1)} aria-label="الصفحة التالية"><ChevronLeft/></button></div><div className="reader-bottom"><button onClick={()=>goPage(page-1)} disabled={page===0}><ChevronRight size={17}/> السابقة</button><span>صفحة {visiblePages.map(n=>n+1).join(' – ')} من {pages.length}</span><button onClick={()=>goPage(page+1)} disabled={visiblePages.includes(pages.length-1)}>التالية <ChevronLeft size={17}/></button></div><p className="reader-tip">اسحب زاوية الصفحة أو استخدم الأسهم للتنقل &nbsp; ✦</p>{(()=>{const story=visiblePages.map(i=>{const index=pages[i]?.storyIndex;return index!==undefined&&index>=seedStories.length?demoStories.filter(s=>s.status==='published'&&s.id!=='sample-1')[index-seedStories.length]:undefined}).find(Boolean);if(!story)return null;return <div className="reader-comments"><h2>💬 كلمات من القرّاء</h2><p>اترك كلمة لطيفة للمبدع الصغير. تظهر التعليقات بعد مراجعتها.</p>{story.comments.filter(c=>c.approved).map(c=><div className="public-comment" key={c.id}><strong>{c.name}</strong><p>{c.text}</p></div>)}<div className="comment-form"><input placeholder="اسم مستعار" value={commentName} onChange={e=>setCommentName(e.target.value)} maxLength={60}/><textarea placeholder="اكتب تعليقاً لطيفاً..." value={commentText} onChange={e=>setCommentText(e.target.value)} maxLength={1000}/><button className="primary" onClick={()=>{if(!commentName.trim()||!commentText.trim()){setNotice('أضف اسماً مستعاراً وتعليقاً أولاً.');return}setDemoStories(demoStories.map(s=>s.id===story.id?{...s,comments:[...s.comments,{id:crypto.randomUUID(),name:commentName.trim(),text:commentText.trim(),approved:false}]}:s));setCommentName('');setCommentText('');setNotice('وصل تعليقك وهو بانتظار المراجعة.')}}>إرسال التعليق</button></div></div>})()}</main>}
 {(view==='login')&&<DemoLogin exit={()=>setView('home')} child={()=>setView('child')} admin={()=>setView('admin')}/>}
 {(view==='child'||view==='write')&&<CreatorDesk stories={demoStories} update={setDemoStories} exit={()=>setView('home')} read={readDemo}/>}
 {view==='admin'&&<DemoDashboard role="admin" stories={demoStories} update={setDemoStories} exit={()=>setView('home')} read={readDemo}/>}
 {notice&&<div className="toast">{notice}</div>}</div>
}

// Load the two assets needed for the first desk before revealing it. A timeout
// keeps the library usable even on slow connections or when an image fails.
function LibraryEntrance(){
 const [ready,setReady]=useState(false);
 useEffect(()=>{
  let active=true;let assetsDone=false;let minimumDone=false;
  const show=()=>{if(active&&assetsDone&&minimumDone)setReady(true)};
  const minimum=window.setTimeout(()=>{minimumDone=true;show()},window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:700);
  const maximum=window.setTimeout(()=>{if(active)setReady(true)},4000);
  const images=['/library-desk.png','/user-book-cover.png'].map(src=>new Promise<void>(resolve=>{
   const image=new Image();image.onload=()=>resolve();image.onerror=()=>resolve();image.src=src;
  }));
  void Promise.all(images).then(()=>{assetsDone=true;show()});
  return()=>{active=false;window.clearTimeout(minimum);window.clearTimeout(maximum)};
 },[]);
 if(ready)return <App/>;
 return <main className="library-entrance" dir="rtl" aria-busy="true" aria-label="جارٍ تجهيز المكتبة"><div className="entrance-note"><span className="entrance-tape" aria-hidden="true"/><div className="entrance-book" aria-hidden="true"><span className="entrance-book-left"/><span className="entrance-book-right"/><span className="entrance-book-page"/></div><span className="entrance-spark entrance-spark-one" aria-hidden="true">✦</span><span className="entrance-spark entrance-spark-two" aria-hidden="true">✧</span><p className="entrance-kicker">مكتبة المبدعين الصغار</p><h1>حكاياتنا تستيقظ...</h1><p className="entrance-caption" role="status">نرتّب الكتب على الطاولة، لحظة صغيرة!</p><div className="entrance-progress" aria-hidden="true"><span/></div></div></main>
}

createRoot(document.getElementById('root')!).render(<LibraryEntrance/>);
