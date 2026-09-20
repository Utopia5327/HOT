// A slightly elevated walking view makes the landscape and exhibits easier to read.
export const EYE_HEIGHT = 1.95;

export const GALLERY_LEVELS={lower:5.6,middle:8.4,upper:11.2};

export const TERRACE_SPECS=[
 {id:'valley-roof',name:'Valley roof terrace',t:.180,half:.023,base:GALLERY_LEVELS.lower,level:GALLERY_LEVELS.lower+3.83},
 {id:'forest-roof',name:'Forest roof terrace',t:.550,half:.022,base:GALLERY_LEVELS.upper,level:GALLERY_LEVELS.upper+3.83},
 {id:'sunset-roof',name:'Sunset roof terrace',t:.800,half:.023,base:GALLERY_LEVELS.middle,level:GALLERY_LEVELS.middle+3.83}
];

// The timber bridge widens into generous, continuous landings at both entrances.
export const bridgeHalfWidth=t=>1.62+.34*Math.sin(t*Math.PI)+.62*Math.exp(-Math.pow(t/.065,2))+.62*Math.exp(-Math.pow((1-t)/.065,2));
