// A compact scene container: small JSON metadata followed by aligned typed buffers.
// Positions stay full precision. No geometry is generated on the normal loading path.
const TYPES={Float32Array,Float64Array,Uint32Array,Int32Array,Uint16Array,Int16Array,Uint8Array,Int8Array,Uint8ClampedArray};
const align=n=>Math.ceil(n/8)*8;
export function encodeCampusBinary(data){
  const chunks=[],seen=new Map();let byteLength=0;
  const json=JSON.stringify(data,(_,value)=>{
    if(!ArrayBuffer.isView(value))return value;
    let i=seen.get(value);
    if(i===undefined){i=chunks.length;seen.set(value,i);chunks.push({array:value,offset:byteLength});byteLength=align(byteLength+value.byteLength);}
    return {$typed:i,type:value.constructor.name,length:value.length,offset:chunks[i].offset,shuffled:value.BYTES_PER_ELEMENT>1};
  });
  const header=new TextEncoder().encode(json),start=align(12+header.byteLength),buffer=new ArrayBuffer(start+byteLength),view=new DataView(buffer);
  view.setUint32(0,0x3843424d,true);view.setUint32(4,header.byteLength,true);view.setUint32(8,start,true);
  new Uint8Array(buffer,12,header.byteLength).set(header);
  // Byte planes make repeated float exponents and index ranges compress well, losslessly.
  for(const {array,offset} of chunks){
    const source=new Uint8Array(array.buffer,array.byteOffset,array.byteLength),target=new Uint8Array(buffer,start+offset,array.byteLength),size=array.BYTES_PER_ELEMENT;
    if(size===1)target.set(source);
    else for(let byte=0;byte<size;byte++)for(let i=0;i<array.length;i++)target[byte*array.length+i]=source[i*size+byte];
  }
  return buffer;
}
export function decodeCampusBinary(buffer){
  const view=new DataView(buffer);
  if(view.byteLength<12||view.getUint32(0,true)!==0x3843424d)throw new Error('Invalid landscape asset');
  const length=view.getUint32(4,true),start=view.getUint32(8,true);
  if(start%8||start<12+length||start>buffer.byteLength)throw new Error('Invalid landscape metadata');
  const arrays=new Map();
  return JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,12,length)),(_,value)=>{
    if(value&&typeof value==='object'&&Object.hasOwn(value,'$typed')){
      if(!TYPES[value.type])throw new Error('Unsupported landscape buffer');
      if(!arrays.has(value.$typed)){
        let array;
        if(value.shuffled){
          array=new TYPES[value.type](value.length);
          const source=new Uint8Array(buffer,start+value.offset,array.byteLength),target=new Uint8Array(array.buffer),size=array.BYTES_PER_ELEMENT;
          for(let byte=0;byte<size;byte++)for(let i=0;i<value.length;i++)target[i*size+byte]=source[byte*value.length+i];
        }else array=new TYPES[value.type](buffer,start+value.offset,value.length).slice();
        arrays.set(value.$typed,array);
      }
      return arrays.get(value.$typed);
    }
    return value;
  });
}
export async function readCampusPayload(buffer){
  const magic=new Uint8Array(buffer,0,Math.min(2,buffer.byteLength));
  if(magic[0]===31&&magic[1]===139){
    if(typeof DecompressionStream==='undefined')throw new Error('Landscape decompression unavailable');
    buffer=await new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  }
  return decodeCampusBinary(buffer);
}
