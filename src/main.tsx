import React, {useEffect, useState, useRef, useMemo} from 'react';
import HTMLFlipBook, {type BookSnapshot} from '@gullabs/react-flipbook';
import {createRoot} from 'react-dom/client';
import {ArrowLeft, ArrowRight, BookOpen, Bookmark, ChevronDown, ChevronLeft, ChevronRight, Eye, Feather, Heart, LibraryBig, LockKeyhole, Menu, PenLine, Search, Sparkles, Star, X, ZoomIn, Maximize2, List, Send, Info} from 'lucide-react';
import './style.css';
import {DemoDashboard, DemoLogin, type DemoStory} from './Demo';
import {Desk} from './Desk';

type Story = {title:string; author:string; category:string; text:string; color:string; emoji:string};
const seedStories:Story[] = [
 {title:'رحلة غيمة صغيرة',author:'ليان أحمد',category:'خيال',color:'blue',emoji:'☁️',text:'في صباحٍ جميل، استيقظت غيمة صغيرة فوق المدينة. كانت تتساءل: كيف يمكن لغيمة مثلي أن تجعل العالم أكثر جمالاً؟\n\nحلّقت فوق الحقول، فرأت زهرة عطشى. ابتسمت الغيمة وأرسلت إليها قطراتٍ صغيرة من المطر. رفعت الزهرة رأسها وقالت: شكراً لكِ يا صديقتي!\n\nأدركت الغيمة يومها أن الأشياء الصغيرة قد تصنع فرقاً كبيراً.'},
 {title:'النجمة التي ضلّت طريقها',author:'يوسف خالد',category:'مغامرات',color:'yellow',emoji:'⭐',text:'في ليلة هادئة، سقطت نجمة صغيرة من السماء. بحثت عن طريق العودة بين الأشجار، حتى قابلت عصفوراً لطيفاً.\n\nقال العصفور: لا تقلقي، سنجد الطريق معاً. صعدا إلى أعلى التل، وهناك لمحت النجمة أخواتها يلمعن في السماء.\n\nبمساعدة صديقها الجديد، عادت النجمة إلى مكانها، وأضاءت السماء أكثر من أي وقت مضى.'},
 {title:'حديقة الأحلام',author:'ريم عبدالله',category:'قيم وأخلاق',color:'green',emoji:'🌷',text:'زرعت ريم بذرة صغيرة في حديقة منزلها، وكانت تسقيها كل يوم وتحدثها عن أحلامها.\n\nمرت الأيام ولم تظهر الزهرة، لكنها لم تفقد الأمل. وفي صباح مشمس، وجدت برعماً أخضر يطل من التراب.\n\nتعلمت ريم أن الأحلام، مثل البذور، تحتاج إلى الصبر والعناية حتى تكبر.'},
 {title:'صديقي الأرنب الشجاع',author:'عمر محمد',category:'عالم الحيوانات',color:'peach',emoji:'🐇',text:'كان الأرنب الصغير يخاف من عبور الجسر الخشبي. في يوم من الأيام، سمع صديقه يناديه من الناحية الأخرى.\n\nأخذ نفساً عميقاً، وخطا خطوة صغيرة، ثم أخرى. وحين وصل، اكتشف أن الشجاعة لا تعني ألا نخاف، بل أن نحاول رغم خوفنا.'}
];
function App(){
 const flipBook = useRef<any>(null);
 const cameraRef = useRef<HTMLDivElement>(null);
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
 const [demoStories,setDemoStories]=useState<DemoStory[]>(()=>{try{const saved=localStorage.getItem('little-demo-stories');if(saved)return JSON.parse(saved);const now=new Date().toISOString();return [
 {id:'sample-1',title:'القمر وصديقه الصغير',text:'في ليلة هادئة، نظر سامي إلى القمر وتمنى لو يستطيع زيارته. أغمض عينيه، وترك خياله يحمله بين النجوم.\n\nهناك وجد أن أجمل الرحلات تبدأ بفكرة صغيرة.',original:'في ليلة هادئة، نظر سامي إلى القمر وتمنى لو يستطيع زيارته. أغمض عينيه، وترك خياله يحمله بين النجوم.\n\nهناك وجد أن أجمل الرحلات تبدأ بفكرة صغيرة.',category:'خيال',status:'published',note:'حكاية جميلة ومليئة بالخيال!',views:0,comments:[{id:'sample-comment',name:'قارئ صغير',text:'أحببت هذه الحكاية كثيراً!',approved:true}],created:now},
 {id:'sample-2',title:'مغامرة في الغابة',text:'استيقظ العصفور الصغير وقرر الذهاب في مغامرة بين الأشجار. في الطريق التقى سلحفاة كانت تبحث عن بيتها، فقرر مساعدتها.',original:'استيقظ العصفور الصغير وقرر الذهاب في مغامرة بين الأشجار. في الطريق التقى سلحفاة كانت تبحث عن بيتها، فقرر مساعدتها.',category:'مغامرات',status:'review',note:'',views:0,comments:[],created:now},
 {id:'sample-3',title:'بذرة الأمل',text:'وضعت بذرة في أصيص صغير، وسقيتها كل يوم حتى أزهرت.',original:'وضعت بذرة في أصيص صغير، وسقيتها كل يوم حتى أزهرت.',category:'قيم وأخلاق',status:'revision',note:'قصة جميلة! هل تستطيع إضافة تفاصيل عن شعور البطل عندما ظهرت الزهرة؟',views:0,comments:[],created:now}
 ] as DemoStory[]}catch{return []}});
 const [commentName,setCommentName]=useState(''); const [commentText,setCommentText]=useState('');
 const stories:Story[]=useMemo(()=>[...seedStories,...demoStories.filter(s=>s.status==='published').map(s=>({title:s.title,author:'المبدع الصغير',category:s.category,text:s.text,color:'blue',emoji:'✨'}))], [demoStories]);
 // Keep each story on multiple short leaves instead of hiding long text in a tiny mobile page.
 const {pages,storyStarts} = useMemo(()=>{
  const result:Array<{label:string;title:string;text:string;cover?:string;author?:string;storyIndex?:number}> = [
   {label:'الغلاف الأمامي',title:'الغلاف الأمامي',text:'',cover:'/user-book-cover.png'},
   {label:'صفحة العنوان',title:'مكتبة المبدعين الصغار',text:'المجلد الأول\n\nحكايات صغيرة، وأحلام كبيرة.\n\nهنا تبدأ رحلتنا، بين صفحاتٍ نسجها خيال مبدعين صغار.'},
   {label:'مقدمة',title:'أهلاً بك في عالم الحكايات',text:'لكل طفل حكاية تستحق أن تُروى، ولكل حكاية جناحان يحملانها إلى قلوب القرّاء.\n\nفي هذا المجلد جمعنا حكايات من خيال مبدعينا الصغار. افتح قلبك، ودع خيالك يرافقك في رحلة لا تشبه أي رحلة أخرى.'},
   {label:'الفهرس',title:'فهرس الحكايات',text:stories.map((s,i)=>`${i+1}. ${s.title}  ·  ${s.author}`).join('\n\n')}
  ];
  const starts:number[]=[];
  stories.forEach((story,storyIndex)=>{
   starts.push(result.length);
   const paragraphs=story.text.split(/\n+/); const chunks:string[]=[]; let current='';
   for(const paragraph of paragraphs){
    for(const word of paragraph.trim().split(/\s+/).filter(Boolean)){
     if(current && current.length+word.length+1>210){chunks.push(current);current='';}
     current+=(current&&!current.endsWith('\n')?' ':'')+word;
    }
    if(current) current+='\n\n';
   }
   if(current.trim())chunks.push(current.trim());
   if(!chunks.length)chunks.push('');
   chunks.forEach((text,index)=>result.push({label:index?'تابع الحكاية':story.category,title:story.title,text:text.trim(),author:story.author,storyIndex}));
  });
  result.push({label:'الغلاف الخلفي',title:'الغلاف الخلفي',text:'',cover:'/user-book-back.png'});
  return {pages:result,storyStarts:starts};
 },[stories]);
 const bookLeaves=useMemo(()=>pages.map((p,i)=><div className="flip-page" key={i}>{'cover' in p && p.cover ? <div className="reader-cover"><img src={p.cover} alt={p.label}/></div> : <div className="paper-inner"><div className="paper-ornament">✦ &nbsp; ✧ &nbsp; ✦</div><span className="paper-label">{p.label}</span><h2>{p.title}</h2>{p.author&&<div className="paper-author">بقلم المبدع: {p.author}</div>}<div className="paper-text" tabIndex={0}>{p.text}</div><div className="page-number">{i+1}</div></div>}</div>),[pages]);

 useEffect(()=>{localStorage.setItem('little-demo-stories',JSON.stringify(demoStories))},[demoStories]);
 const [page,setPage]=useState(0); const [initialPage,setInitialPage]=useState(0); const [visiblePages,setVisiblePages]=useState<number[]>([0]); const [portrait,setPortrait]=useState(false); const [search,setSearch]=useState(''); const [showSearch,setShowSearch]=useState(false); const [menu,setMenu]=useState(false); const [zoom,setZoom]=useState(false); const [toc,setToc]=useState(false);  const [notice,setNotice]=useState('');
 const [draft,setDraft]=useState(()=>{try{return JSON.parse(localStorage.getItem('little-draft')||'{}')}catch{return {}}});
 const goPage=(n:number)=>{if(n<0||n>=pages.length)return; const book=flipBook.current; if(!book)return; if(n===page+1) book.flipNext(); else if(n===page-1) book.flipPrev(); else book.turnToPage(n);};
 const syncBook=(snapshot:BookSnapshot)=>{setPage(snapshot.page);setPortrait(snapshot.orientation==='portrait');setVisiblePages(snapshot.visiblePages);};
 const openBook=(n=1)=>{setInitialPage(n);setPage(n);setVisiblePages([n]);setView('reader');window.scrollTo(0,0); const item=stories[pages[n]?.storyIndex ?? -1]; if(item){const match=demoStories.find(s=>s.status==='published'&&s.title===item.title); if(match){const key='view-'+match.id+'-'+new Date().toISOString().slice(0,10); if(!sessionStorage.getItem(key)){sessionStorage.setItem(key,'1');setDemoStories(prev=>prev.map(s=>s.id===match.id?{...s,views:s.views+1}:s));}}}};
 const readDemo=(id:string)=>{const item=demoStories.find(s=>s.id===id);const index=item?stories.findIndex(s=>s.title===item.title&&s.author==='المبدع الصغير'):-1; if(index>=0)openBook(storyStarts[index])};
 const scroll=(id:string)=>{setView('home');setMenu(false);setTimeout(()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth'}),50)};
 const saveDraft=()=>{localStorage.setItem('little-draft',JSON.stringify(draft));setNotice('تم حفظ المسودة على هذا الجهاز.');};
 useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),3500);return()=>clearTimeout(t)},[notice]);
 const found=stories.filter(s=>`${s.title} ${s.author} ${s.category}`.includes(search));
 return <div className="app" dir="rtl">
 {view!=='home'&&view!=='reader'&&<header className="library-bar"><button className="library-brand" onClick={()=>setView('home')}><span className="library-brand-mark"><BookOpen size={23}/><i>✦</i></span><span><strong>مكتبة المبدعين الصغار</strong><small>حكايات صغيرة، أحلام كبيرة</small></span></button><div className="library-center-label"><span>✦</span> مكانٌ يكبر فيه الخيال <span>✦</span></div><div className="library-bar-actions"><span className="demo-badge">نسخة تجريبية</span><button className="library-home" onClick={()=>setView('home')}><BookOpen size={17}/> المكتبة</button><button className="library-creator" onClick={()=>setView('login')}><span>✎</span> مساحة المبدع</button></div></header>}
 {view==='home'&&<Desk stories={stories} open={openBook} openStory={(index)=>openBook(storyStarts[index])} write={()=>setView('login')}/>}
 {view==='reader'&&<main className="reader"><div className="reader-table-controls"><button className="reader-close-book" onClick={()=>setView('home')}><ArrowRight size={18}/> إغلاق الكتاب</button><div className="reader-tools"><button onClick={()=>setToc(!toc)} title="الفهرس" aria-label="فهرس الكتاب"><List size={19}/><span>الفهرس</span></button><button onClick={()=>setZoom(!zoom)} aria-label={zoom?"تصغير النص":"تكبير النص"} aria-pressed={zoom} title="تكبير"><ZoomIn size={19}/><span>تكبير</span></button><button onClick={()=>{if(!document.fullscreenElement)document.documentElement.requestFullscreen?.();else document.exitFullscreen?.()}} title="ملء الشاشة" aria-label="ملء الشاشة"><Maximize2 size={18}/></button></div></div>{toc&&<div className="toc"><button onClick={()=>setToc(false)} aria-label="إغلاق"><X size={18}/></button><strong>فهرس الكتاب</strong>{pages.map((p,i)=>p.label==='تابع الحكاية'?null:<button key={i} onClick={()=>{flipBook.current?.turnToPage(i);setToc(false)}}>{p.title}<span>{i+1}</span></button>)}</div>}<div className={'book-stage '+(zoom?'zoom':'')}><button className="side-arrow" disabled={page===0} onClick={()=>goPage(page-1)} aria-label="الصفحة السابقة"><ChevronRight/></button><div className="reader-camera" ref={cameraRef}><HTMLFlipBook ref={flipBook} className="real-flip-book" initialPage={initialPage} sizing="responsive" width={380} height={540} minWidth={220} maxWidth={380} minHeight={315} maxHeight={540} drawShadow={true} flippingTime={1200} usePortrait={true} startZIndex={0} autoSize={true} maxShadowOpacity={0.5} hardCovers={true} allowTouchScroll={false} respectInteractiveContent={true} swipeDistance={25} foldCornerOnHover={true} flipOnClick="corners" pageBackground="#fffdf4" readingDirection="rtl" respectReducedMotion={true} controls="none" aria-label="المجلد الأول: بداية الحكاية" roleDescription="كتاب" liveRegionText={(_page,count,info)=>`صفحة ${info.pages.map(n=>n+1).join(' و ')} من ${count}`} onTurnProgress={({progress,direction})=>moveCamera(progress,direction)} onChangeState={({state})=>{if(state==='read')resetCamera()}} onLoaded={syncBook} onPageChange={syncBook} onChangeOrientation={(info)=>setPortrait(info.orientation==='portrait')}>{bookLeaves}</HTMLFlipBook></div><button className="side-arrow" disabled={visiblePages.includes(pages.length-1)} onClick={()=>goPage(page+1)} aria-label="الصفحة التالية"><ChevronLeft/></button></div><div className="reader-bottom"><button onClick={()=>goPage(page-1)} disabled={page===0}><ChevronRight size={17}/> السابقة</button><span>صفحة {visiblePages.map(n=>n+1).join(' – ')} من {pages.length}</span><button onClick={()=>goPage(page+1)} disabled={visiblePages.includes(pages.length-1)}>التالية <ChevronLeft size={17}/></button></div><p className="reader-tip">اسحب زاوية الصفحة أو استخدم الأسهم للتنقل &nbsp; ✦</p>{(()=>{const story=demoStories.find(s=>s.status==='published'&&visiblePages.some(i=>s.title===pages[i]?.title));if(!story)return null;return <div className="reader-comments"><h2>💬 كلمات من القرّاء</h2><p>اترك كلمة لطيفة للمبدع الصغير. تظهر التعليقات بعد مراجعتها.</p>{story.comments.filter(c=>c.approved).map(c=><div className="public-comment" key={c.id}><strong>{c.name}</strong><p>{c.text}</p></div>)}<div className="comment-form"><input placeholder="اسم مستعار" value={commentName} onChange={e=>setCommentName(e.target.value)} maxLength={60}/><textarea placeholder="اكتب تعليقاً لطيفاً..." value={commentText} onChange={e=>setCommentText(e.target.value)} maxLength={1000}/><button className="primary" onClick={()=>{if(!commentName.trim()||!commentText.trim()){setNotice('أضف اسماً مستعاراً وتعليقاً أولاً.');return}setDemoStories(demoStories.map(s=>s.id===story.id?{...s,comments:[...s.comments,{id:crypto.randomUUID(),name:commentName.trim(),text:commentText.trim(),approved:false}]}:s));setCommentName('');setCommentText('');setNotice('وصل تعليقك وهو بانتظار المراجعة.')}}>إرسال التعليق</button></div></div>})()}</main>}
 {(view==='login')&&<DemoLogin exit={()=>setView('home')} child={()=>setView('child')} admin={()=>setView('admin')}/>}
 {(view==='child'||view==='admin'||view==='write')&&<DemoDashboard role={view==='admin'?'admin':'child'} stories={demoStories} update={setDemoStories} exit={()=>setView('home')} read={readDemo}/>}
 {notice&&<div className="toast">{notice}</div>}</div>
}

createRoot(document.getElementById('root')!).render(<App/>);
