export function youtubeURL(film,{api=false,autoplay=false}={}){
 const p=new URLSearchParams({playsinline:'1',rel:'0',controls:'1',autoplay:autoplay?'1':'0'});
 if(api){p.set('enablejsapi','1');p.set('origin',location.origin);p.set('loop','1');p.set('playlist',film.videoId);p.set('mute','1');}
 return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(film.videoId)}?${p}`;
}
