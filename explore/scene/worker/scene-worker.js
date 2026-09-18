import {buildCampus} from './campus.js';
import {packCampus} from './campus-transfer.js';
import {sceneBuffers} from './scene-transfer.js';
import {SCENE_ASSETS} from '../scene-assets.js';
import {readCampusPayload} from '../scene-binary.js';
onmessage=async({data})=>{
  try{
    let result;
    try{
      const file=SCENE_ASSETS[data.options?.quality||'high'];
      if(!file)throw new Error('No prepared landscape');
      let buffer=data.assetBytes;
      if(!buffer){const response=await fetch(new URL('../'+file,import.meta.url),{cache:'force-cache'});if(!response.ok)throw new Error('Landscape asset unavailable');buffer=await response.arrayBuffer();}
      result=await readCampusPayload(buffer);
    }catch(error){
      if(data.requirePrepared)throw error;
      result=packCampus(buildCampus(data.projects,data.options));
    }
    postMessage(result,sceneBuffers(result.model));
  }catch(error){postMessage({error:error.message});}
};
