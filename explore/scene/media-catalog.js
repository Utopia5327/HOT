// Project films linked by Manas Bhatia's own portfolio and GSAPP archive.
const youtube=(videoId,title,project,source,duration)=>({type:'youtube',videoId,title,source,duration,width:1280,height:720,poster:`./assets/projects/${project}-1-preview.webp`,audio:'unverified'});
const archive='https://gsapp-cdp.github.io/archive/projects/2025/co-design-canvas-mb5327/';
export const PROJECT_FILMS={
 'spatial-ai':[{"type": "video", "src": "./assets/films/spatial-ai-simulation.mp4", "poster": "./assets/projects/spatial-ai-1-preview.webp", "title": "Studio-In-Flux \u00b7 spatial simulation", "width": 1280, "height": 720, "duration": 10.005, "audio": true, "source": "https://manasbhatia.com/projects/project8.html", "original": "https://manasbhatia.com/img/simulation.mp4"}],
 'emotionecho':[youtube('oMdfE7t80q4','EmotionEcho.exe · project film','emotionecho','https://manasbhatia.com/projects/project6.html')],
 'manav':[youtube('EB4Y2rTle0A','MANAV · project film','manav','https://manasbhatia.com/projects/project1.html',96)],
 'tensilebloom':[youtube('YNv2QMJPHVA','TensileBloom · the kinetic work','tensilebloom','https://manasbhatia.com/projects/project5.html',56)],
 'co-design-canvas':[
  youtube('-WoL0tsY7Rk','Co-Design Canvas · platform overview','co-design-canvas',archive,83),
  youtube('3cJIA4-a10o','Select, Describe, Change','co-design-canvas',archive,25),
  youtube('5WdHKmahvNY','Survey to Sliders','co-design-canvas',archive,19),
  youtube('2HaIKDljhZ4','Collective Vision','co-design-canvas',archive,37),
  youtube('x-vXsdkb96w','Edit Together, in Real Time','co-design-canvas',archive,35)
 ],
 'google-unfold':[
  {type:'video',src:'./assets/films/google-unfold-wildframe.mp4',poster:'./assets/films/google-unfold-wildframe.jpg',title:'Google UnFold · virtual gallery',width:600,height:328,duration:12,audio:false,source:'https://manasbhatia.com/art/art1.html',original:'https://manasbhatia.com/img/wildframeunfold.gif'},
  {type:'video',src:'./assets/films/google-unfold-process.mp4',poster:'./assets/films/google-unfold-process.jpg',title:'Google UnFold · generative process',width:800,height:450,duration:5,audio:false,source:'https://manasbhatia.com/art/art1.html',original:'https://manasbhatia.com/img/aiprocessgoogle.gif'}
 ]
};
