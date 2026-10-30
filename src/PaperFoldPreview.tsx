import { Paper } from 'paperlab';

// Isolated experiment: Paperlab renders an excerpt on a 3D mesh; the stored
// story and the existing accessible editor remain ordinary text.
export default function PaperFoldPreview({title, text}:{title:string;text:string}) {
 return <Paper preset="letter-fold" autoplay content={{type:'text',text:`${title}\n\n${text.slice(0,350)}${text.length>350?'…':''}`,font:'Noto Naskh Arabic, serif',size:36,align:'right',lineHeight:1.6}} />;
}
