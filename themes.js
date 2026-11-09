'use strict';
var LaneTheme=(()=>{
const current='obsidian';
function apply(){document.documentElement.dataset.theme=current;document.documentElement.style.colorScheme='dark';document.querySelector('meta[name="theme-color"]')?.setAttribute('content','#000000')}
function bind(){const nav=document.querySelector('nav');if(nav&&!document.querySelector('#nav-create')){const add=document.createElement('button');add.id='nav-create';add.className='nav-create';add.type='button';add.setAttribute('aria-label','Adaugă rezultat');add.innerHTML='<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>Adaugă</span>';add.onclick=()=>editor();nav.querySelector('[data-tab="meets"]').before(add)}const add=document.querySelector('#nav-create');if(add)add.hidden=tab==='settings'||readOnly()}
apply(current);return {apply,bind,current:()=>current};})();
