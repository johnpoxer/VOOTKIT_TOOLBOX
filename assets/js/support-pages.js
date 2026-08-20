(function () {
  'use strict';
  var d = document;
  function esc(s) { return String(s || '').replace(/[&<>"']/g, function (c) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }
  function bytes(n) { if (!n) return '0 B'; var u=['B','KB','MB','GB'],i=Math.min(Math.floor(Math.log(n)/Math.log(1024)),3); return (n/Math.pow(1024,i)).toFixed(i?1:0)+' '+u[i]; }
  function typeOf(f) { var t=f.type||''; if(t==='application/pdf'||/\.pdf$/i.test(f.name))return'pdf'; if(t.indexOf('image/')===0)return'image'; if(t.indexOf('video/')===0)return'video'; return'other'; }

  var hs=d.getElementById('help-search');
  if(hs){var rows=[].slice.call(d.querySelectorAll('.help-article')),empty=d.getElementById('help-empty'); hs.addEventListener('input',function(){var q=this.value.trim().toLowerCase(),shown=0; rows.forEach(function(r){var ok=!q||r.textContent.toLowerCase().indexOf(q)>-1;r.hidden=!ok;if(ok)shown++;});empty.hidden=shown!==0;});}

  var picker=d.getElementById('files-picker');
  if(picker){
    var files=[], selected=new Set(), list=d.getElementById('file-list'), emptyFiles=d.getElementById('files-empty'),db=null;
    function openDb(){return new Promise(function(resolve){if(!window.indexedDB)return resolve(null);var r=indexedDB.open('vootkit-files',1);r.onupgradeneeded=function(){if(!r.result.objectStoreNames.contains('files'))r.result.createObjectStore('files',{keyPath:'id'});};r.onsuccess=function(){db=r.result;resolve(db);};r.onerror=function(){resolve(null);};});}
    function saveFile(x){if(!db)return;try{db.transaction('files','readwrite').objectStore('files').put(x);}catch(e){}}
    function removeFile(id){if(!db)return;try{db.transaction('files','readwrite').objectStore('files').delete(id);}catch(e){}}
    function loadFiles(){if(!db)return render();var r=db.transaction('files').objectStore('files').getAll();r.onsuccess=function(){files=(r.result||[]).filter(function(x){return x&&x.file;});render();};r.onerror=render;}
    function render(){var q=d.getElementById('files-search').value.toLowerCase(),filter=d.getElementById('files-filter').value,sort=d.getElementById('files-sort').value;
      var shown=files.filter(function(x){return(!q||x.file.name.toLowerCase().indexOf(q)>-1)&&(filter==='all'||x.kind===filter);});
      shown.sort(function(a,b){return sort==='name'?a.file.name.localeCompare(b.file.name):sort==='size'?b.file.size-a.file.size:b.added-a.added;});
      list.innerHTML=shown.map(function(x){return '<article class="file-row"><input type="checkbox" aria-label="Select '+esc(x.file.name)+'" data-file-select="'+x.id+'" '+(selected.has(x.id)?'checked':'')+'><span class="file-type file-'+x.kind+'">'+(x.kind==='image'?'IMG':x.kind==='video'?'VID':x.kind==='pdf'?'PDF':'FILE')+'</span><span class="file-meta"><strong>'+esc(x.file.name)+'</strong><small>'+bytes(x.file.size)+' · '+x.kind.toUpperCase()+'</small></span><button type="button" data-file-download="'+x.id+'" aria-label="Download '+esc(x.file.name)+'">↓</button></article>';}).join('');
      emptyFiles.hidden=files.length>0; list.hidden=files.length===0; var total=files.reduce(function(n,x){return n+x.file.size;},0);d.getElementById('storage-label').textContent=bytes(total)+' saved on this device';d.getElementById('storage-progress').value=Math.min(100,total/104857600*100);var bar=d.getElementById('selection-bar');bar.hidden=!selected.size;d.getElementById('selected-count').textContent=selected.size;
    }
    function add(fs){[].slice.call(fs).forEach(function(f){var x={id:String(Date.now())+Math.random(),file:f,kind:typeOf(f),added:Date.now()};files.push(x);saveFile(x);});render();}
    function download(x){var a=d.createElement('a');a.href=URL.createObjectURL(x.file);a.download=x.file.name;a.click();setTimeout(function(){URL.revokeObjectURL(a.href);},1000);}
    d.getElementById('files-import').onclick=function(){picker.click();}; picker.onchange=function(){add(this.files);this.value='';};
    ['files-search','files-filter','files-sort'].forEach(function(id){d.getElementById(id).addEventListener(id==='files-search'?'input':'change',render);});
    list.addEventListener('change',function(e){var id=e.target.getAttribute('data-file-select');if(!id)return;e.target.checked?selected.add(id):selected.delete(id);render();});
    list.addEventListener('click',function(e){var id=e.target.getAttribute('data-file-download');if(id){var x=files.find(function(v){return v.id===id;});if(x)download(x);}});
    d.querySelectorAll('[data-file-action]').forEach(function(b){b.onclick=function(){var action=this.getAttribute('data-file-action'); if(action==='download')files.filter(function(x){return selected.has(x.id);}).forEach(download);else if(action==='delete'&&confirm('Delete the selected local files?')){selected.forEach(removeFile);files=files.filter(function(x){return!selected.has(x.id);});selected.clear();render();}};});
    d.getElementById('files-manage').onclick=function(){d.getElementById('files-search').focus();};d.getElementById('files-trash').onclick=function(){alert('Trash is empty.');};openDb().then(loadFiles);
  }

  d.querySelectorAll('[data-consent-choice]').forEach(function(b){b.addEventListener('click',function(){var granted=this.getAttribute('data-consent-choice')==='accept';if(window.VKConsent)window.VKConsent.update(granted);else try{localStorage.setItem('vk-consent',JSON.stringify({v:1,granted:granted,at:new Date().toISOString().slice(0,10)}));}catch(e){}var s=d.getElementById('legal-choice-status');if(s)s.textContent=granted?'Optional cookies accepted. You can change this any time.':'Optional cookies rejected. Only necessary storage will be used.';});});
})();
