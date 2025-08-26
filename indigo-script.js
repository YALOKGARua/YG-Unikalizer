async function exportFullSettingsAllProfiles() {
    function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
    function norm(s){return (s||'').replace(/\s+/g,' ').trim();}
    function low(s){return norm(s).toLowerCase();}
    function vis(el){return el&&el.getClientRects().length>0;}
    function waitFor(fn,t,st){t=t||8000;st=st||80;return new Promise(res=>{var t0=Date.now();(function L(){var v=fn();if(v)return res(v);if(Date.now()-t0>=t)return res(null);setTimeout(L,st)}())});}
    async function ensureInitial(){var p=0;for(var i=0;i<80;i++){container().scrollTop=container().scrollHeight;await sleep(100);var c=document.querySelectorAll('.profile-list-row').length;if(c===p)break;p=c}container().scrollTop=0;}
    function rows(){return Array.prototype.slice.call(document.querySelectorAll('.profile-list-row')).filter(vis);}
    function rowName(r){var el=r.querySelector('.profile-list-row-cell-name');return el?norm(el.textContent):'';}
    function container(){var r=document.querySelector('.profile-list-row');if(!r)return document.scrollingElement||document.documentElement;var p=r.parentElement;while(p){var st=getComputedStyle(p).overflowY;if((st==='auto'||st==='scroll')&&p.scrollHeight>p.clientHeight+10)return p;p=p.parentElement}return document.scrollingElement||document.documentElement;}
    function findSave(){var bs=Array.prototype.slice.call(document.querySelectorAll('button')).filter(vis);return bs.find(b=>/сохранить|save/i.test(low(b.textContent||'')));}
    async function openPanel(r){(r.querySelector('.profile-list-row-cell-name')||r.querySelector('.profile-list-row-content')||r).click();var ok=await waitFor(findSave,10000,80);return ok||null;}
    async function closePanel(){var bs=Array.prototype.slice.call(document.querySelectorAll('button')).filter(vis);var b=bs.find(x=>/отменить|закрыть|cancel|close/i.test(low((x.textContent||x.getAttribute('aria-label')||''))));if(b){b.click()}else{document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}))}await sleep(120);}
    function readInput(i){if(!i)return'';if(i.type==='password'){try{i.type='text';var v=i.value||'';i.type='password';return v}catch(e){return i.value||''}}return i.value||'';}
    function uniqKey(base,set){var k=base||'Field',i=2;while(set.has(k)){k=base+' ('+i+')';i++}set.add(k);return k;}
    function panelRoot(saveBtn){var n=saveBtn,b=null;while(n&&n!==document.body){if(n.querySelector&&n.querySelector('mat-form-field,.mat-form-field,.mat-slide-toggle,mat-radio-group,.mat-checkbox,mat-select'))b=n;n=n.parentElement}return b||document.body;}
    function collect(root){
      var out={}, used=new Set();
      var flds=Array.prototype.slice.call(root.querySelectorAll('mat-form-field,.mat-form-field')).filter(vis);
      for(var i=0;i<flds.length;i++){
        var f=flds[i], lab=f.querySelector('mat-label,.mat-form-field-label');
        var key=norm((lab?lab.textContent:(f.getAttribute('aria-label')||''))).replace(/:$/,''); if(!key) continue;
        var val='', inp=f.querySelector('input,textarea'); if(inp) val=readInput(inp);
        if(!val){var sv=f.querySelector('.mat-select-value-text,.mat-select-value,.mat-select-trigger'); if(sv) val=norm(sv.textContent||'');}
        if(!val){var chips=f.querySelector('.mat-chip-list,.mat-chip-list-wrapper'); if(chips) val=norm(chips.textContent||'');}
        out[uniqKey(key,used)]=val;
      }
      var toggles=Array.prototype.slice.call(root.querySelectorAll('.mat-slide-toggle')).filter(vis);
      for(var t=0;t<toggles.length;t++){var tg=toggles[t];var keyT=norm(tg.textContent||tg.getAttribute('aria-label')||'Toggle');var c=tg.querySelector('input[type="checkbox"]');out[uniqKey(keyT,used)]=c?String(!!c.checked):'';}
      var checks=Array.prototype.slice.call(root.querySelectorAll('.mat-checkbox')).filter(vis);
      for(var c1=0;c1<checks.length;c1++){var cb=checks[c1];var lab1=cb.querySelector('.mat-checkbox-label');var keyC=norm(lab1?lab1.textContent:'');if(!keyC) continue;var ic=cb.querySelector('input[type="checkbox"]');out[uniqKey(keyC,used)]=ic?String(!!ic.checked):'';}
      var radios=Array.prototype.slice.call(root.querySelectorAll('mat-radio-group')).filter(vis);
      for(var r=0;r<radios.length;r++){var g=radios[r];var picked=g.querySelector('.mat-radio-button.mat-radio-checked .mat-radio-label-content');var keyR=g.getAttribute('aria-label')||g.getAttribute('name')||('Radio Group '+(r+1));out[uniqKey(norm(keyR),used)]=picked?norm(picked.textContent||''):'';}
      var pool=Array.prototype.slice.call(root.querySelectorAll('div,span,p,code,textarea,input')).filter(vis);
      for(var q=0;q<pool.length;q++){var txt=((pool[q].value!=null)?pool[q].value:(pool[q].textContent||'')).trim();var m=txt.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);if(m){out.profileId=m[0];break;}}
      return out;
    }
    function tryLoadMore(){
      var pool=Array.prototype.slice.call(document.querySelectorAll('button,[role="button"],a')).filter(vis);
      var el=pool.find(e=>/показать еще|показать ещё|загрузить ещё|load more|more|ещё/i.test(low((e.textContent||'')+' '+(e.getAttribute('aria-label')||'')+' '+(e.getAttribute('title')||''))));
      if(el){el.click();return true}
      return false;
    }
    async function tryNextPage(){
      var pool=Array.prototype.slice.call(document.querySelectorAll('button,[role="button"],a')).filter(vis);
      var next=pool.find(e=>{
        var t=low((e.textContent||'')+' '+(e.getAttribute('aria-label')||'')+' '+(e.getAttribute('title')||''));
        return /след|next|›|»/.test(t)&&!e.disabled;
      });
      if(!next) return false;
      var before=rows().map(r=>rowName(r)).join('|');
      next.click();
      var changed=await waitFor(function(){return rows().map(r=>rowName(r)).join('|')!==before&&rows().length>0},6000,120);
      return !!changed;
    }
    function download(name,text){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/csv;charset=utf-8;'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1000);}
    function esc(v){return '"'+String(v==null?'':v).replace(/"/g,'""').replace(/\r?\n/g,' ')+'"';}
  
    await ensureInitial();
    var seenIds=new Set(), seenNames=new Set(), data=[];
    async function processVisible(){
      var list=rows();
      for(var i=0;i<list.length;i++){
        var r=list[i];
        var nm=rowName(r);
        if(seenNames.has(nm)) continue;
        r.scrollIntoView({block:'center'});
        var btn=await openPanel(r); if(!btn) continue;
        await sleep(120);
        var root=panelRoot(btn);
        var obj=collect(root);
        obj.name=nm;
        data.push(obj);
        if(obj.profileId) seenIds.add(obj.profileId);
        seenNames.add(nm);
        await closePanel();
        await sleep(120);
      }
    }
  
    for(var page=0;page<200;page++){
      var processedBefore=data.length;
      for(var pass=0;pass<40;pass++){
        await processVisible();
        var c=container();
        if(Math.ceil(c.scrollTop+c.clientHeight)>=c.scrollHeight-2) break;
        c.scrollTop=Math.min(c.scrollTop+c.clientHeight*0.9, c.scrollHeight);
        await sleep(150);
      }
      if(tryLoadMore()){ await sleep(600); continue; }
      await processVisible();
      var advanced=await tryNextPage();
      if(!advanced){ if(data.length===processedBefore) break; }
    }
  
    var keys=new Set(['name','profileId']);
    for(var i=0;i<data.length;i++){for(var k in data[i]) keys.add(k);}
    var headers=Array.from(keys);
    var lines=[headers.join(',')];
    for(var j=0;j<data.length;j++){var o=data[j];lines.push(headers.map(h=>esc(o[h])).join(','));}
    var csv=lines.join('\r\n');
    try{await navigator.clipboard.writeText(csv)}catch(e){}
    download('indigo-full-settings.csv', csv);
  }
  exportFullSettingsAllProfiles();