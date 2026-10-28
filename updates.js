'use strict';
(()=>{
 const current='20261028-compact-times';
 let checking=false;
 const safe=()=>!document.hidden&&!document.querySelector('dialog[open]')&&!document.activeElement?.matches('input,select,textarea')&&typeof LaneCloud!=='undefined'&&LaneCloud.canUpdate();
 async function check(){
  if(checking||!safe())return;
  checking=true;
  try{
   const response=await fetch(new URL('version.json',document.baseURI),{cache:'no-store'});
   if(!response.ok)return;
   const {version}=await response.json();
   if(typeof version!=='string'||version===current||!safe())return;
   // Also defer reload on the profile screen, where fields may contain unsaved edits.
   if(document.querySelector('#save-profile'))return;
   const url=new URL(location.href);url.searchParams.set('v',version);
   location.replace(url.href);
  }catch{/* Offline copies remain usable; retry when returning online. */}
  finally{checking=false}
 }
 window.addEventListener('pageshow',check);
 window.addEventListener('online',check);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
 setInterval(check,60000);
 check();
})();
