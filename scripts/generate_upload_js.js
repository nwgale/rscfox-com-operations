#!/usr/bin/env node
/**
 * Generate JavaScript that uploads a file to a page's file input via DataTransfer.
 *
 * Usage:
 *   node generate_upload_js.js <file-path> [input-selector]
 *
 * Output:
 *   Writes the upload JS to /tmp/chrome_exec_js.js
 *
 * How it works:
 *   1. Reads the file from disk as base64
 *   2. Generates JS that decodes base64 → Blob → File → DataTransfer → dispatches change event
 *   3. The generated JS is executed in Chrome via the exec_js.scpt AppleScript
 *
 * The input-selector defaults to '.paper-editor__file-input' but can target any
 * hidden file input on the page.
 */

const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];
const inputSelector = process.argv[3] || '.paper-editor__file-input';

if (!filePath) {
  console.error('Usage: node generate_upload_js.js <file-path> [input-selector]');
  process.exit(1);
}

const fileBuffer = fs.readFileSync(filePath);
const b64 = fileBuffer.toString('base64');
const fileName = path.basename(filePath);
const mimeType = fileName.endsWith('.pdf') ? 'application/pdf'
  : fileName.match(/\.(png|jpg|jpeg|gif|webp)$/i) ? 'image/' + fileName.split('.').pop().toLowerCase()
  : 'application/octet-stream';

// Escape for safe embedding in JS string literal
const escapedB64 = b64.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '');

const js = `(function(){
try{
  var bin=atob('${escapedB64}');
  var bytes=new Uint8Array(bin.length);
  for(var i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i)&0xff;
  var blob=new Blob([bytes],{type:'${mimeType}'});
  var file=new File([blob],'${fileName}',{type:'${mimeType}'});
  var input=document.querySelector('${inputSelector}');
  if(!input)return JSON.stringify({error:'input not found: ${inputSelector}'});
  var dt=new DataTransfer();
  dt.items.add(file);
  input.files=dt.files;
  input.dispatchEvent(new Event('change',{bubbles:true}));
  input.dispatchEvent(new Event('input',{bubbles:true}));
  return JSON.stringify({ok:true,name:file.name,size:file.size});
}catch(e){return JSON.stringify({error:e.toString()});}
})()`;

fs.writeFileSync('/tmp/chrome_exec_js.js', js);
console.log(`Generated upload JS (${js.length} bytes) → /tmp/chrome_exec_js.js`);
console.log(`File: ${fileName} (${fileBuffer.length} bytes)`);
console.log('Next: osascript scripts/exec_js.scpt');
