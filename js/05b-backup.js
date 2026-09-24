/* ---------------------------------------------------------
   BACKUP COMPLETO — dados + anexos (IndexedDB)
   --------------------------------------------------------- */
function backupToBase64(blob){
  return new Promise((resolve,reject)=>{
    if(!(blob instanceof Blob)){ resolve(null); return; }
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(reader.error||new Error('Falha ao ler arquivo'));
    reader.readAsDataURL(blob);
  });
}

async function serializarBackupValor(value){
  if(value instanceof Blob){
    return {__backupType:'Blob',type:value.type||'',data:await backupToBase64(value)};
  }
  if(value instanceof Date){
    return {__backupType:'Date',data:value.toISOString()};
  }
  if(value instanceof ArrayBuffer){
    const bytes=new Uint8Array(value);
    let binary=''; for(let i=0;i<bytes.length;i+=0x8000) binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
    return {__backupType:'ArrayBuffer',data:btoa(binary)};
  }
  if(Array.isArray(value)){
    return Promise.all(value.map(serializarBackupValor));
  }
  if(value && typeof value==='object'){
    const out={};
    for(const [k,v] of Object.entries(value)) out[k]=await serializarBackupValor(v);
    return out;
  }
  return value;
}

function backupDataUrlToBlob(dataUrl){
  const [header,data]=String(dataUrl||'').split(',');
  if(!header||data===undefined) throw new Error('Arquivo inválido no backup');
  const mime=(header.match(/data:([^;]+)/)||[])[1]||'application/octet-stream';
  const binary=atob(data); const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
  return new Blob([bytes],{type:mime});
}

async function desserializarBackupValor(value){
  if(Array.isArray(value)) return Promise.all(value.map(desserializarBackupValor));
  if(value && typeof value==='object'){
    if(value.__backupType==='Blob') return backupDataUrlToBlob(value.data);
    if(value.__backupType==='Date') return new Date(value.data);
    if(value.__backupType==='ArrayBuffer'){
      const binary=atob(value.data); const bytes=new Uint8Array(binary.length);
      for(let i=0;i<binary.length;i++) bytes[i]=binary.charCodeAt(i);
      return bytes.buffer;
    }
    const out={};
    for(const [k,v] of Object.entries(value)) out[k]=await desserializarBackupValor(v);
    return out;
  }
  return value;
}

async function projectFilesExport(){
  const db=await ProjectFiles.open();
  const stores=[...db.objectStoreNames]; const dados={};
  for(const storeName of stores){
    dados[storeName]=await new Promise((resolve,reject)=>{
      const tx=db.transaction(storeName,'readonly'); const req=tx.objectStore(storeName).getAll();
      req.onsuccess=async()=>{try{resolve(await Promise.all((req.result||[]).map(serializarBackupValor)));}catch(e){reject(e);}};
      req.onerror=()=>reject(req.error);
    });
  }
  return {name:db.name,version:db.version,stores:dados};
}

async function projectFilesRestore(snapshot){
  const db=await ProjectFiles.open();
  const preparados={};
  for(const [storeName,records] of Object.entries(snapshot?.stores||{})){
    if(db.objectStoreNames.contains(storeName)) preparados[storeName]=await Promise.all((records||[]).map(desserializarBackupValor));
  }
  for(const storeName of [...db.objectStoreNames]){
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(storeName,'readwrite'); tx.objectStore(storeName).clear();
      tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
    });
  }
  for(const [storeName,restored] of Object.entries(preparados)){
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(storeName,'readwrite'); const os=tx.objectStore(storeName);
      restored.forEach(record=>os.put(record));
      tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
    });
  }
}

/* Quando foi o último backup baixado neste navegador. dias = null se nunca. */
function situacaoBackup(){
  const ts = DB.getConfig().ultimoBackup || null;
  const dias = ts ? Math.floor((Date.now() - ts) / 86400000) : null;
  const temDados = ['solicitacoes','documentos','projetos','eventos','atendimentos','gerador-documentos'].some(c => (DB.getAll(c) || []).length);
  return { ts, dias, temDados, atrasado: temDados && (dias === null || dias >= 7) };
}
function textoUltimoBackup(sb){
  if (!sb.ts) return 'Nenhum backup baixado neste navegador ainda.';
  const d = new Date(sb.ts);
  const quando = sb.dias === 0 ? 'hoje' : sb.dias === 1 ? 'ontem' : `há ${sb.dias} dias`;
  return `Último backup: ${quando} (${d.toLocaleDateString('pt-BR')} às ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}).`;
}

async function exportarBackupCompleto(){
  try{
    showToast('⏳ Preparando backup completo...');
    const localStorageData={};
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key && key.startsWith('cs_')) localStorageData[key]=localStorage.getItem(key);
    }
    const arquivos=await projectFilesExport();
    const dados={
      app:'Central da Secretaria',
      formato:'backup-completo',
      versao:2,
      exportadoEm:new Date().toISOString(),
      localStorage:localStorageData,
      indexedDB:{name:arquivos.name,version:arquivos.version,stores:arquivos.stores}
    };
    const blob=new Blob([JSON.stringify(dados)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url; a.download=`backup-completo-central-secretaria-${todayISO()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    const cfg=DB.getConfig(); cfg.ultimoBackup=Date.now(); DB.saveConfig(cfg);
    showToast('✓ Backup completo exportado com dados e anexos.');
    if(typeof renderCurrentView==='function') renderCurrentView();
  }catch(e){
    console.error('Erro ao exportar backup completo',e);
    showToast('⚠ Não foi possível criar o backup completo.');
  }
}

function importarBackupCompleto(file){
  if(!file) return;
  confirmAction(`Restaurar "${file.name}"? Os dados atuais deste navegador serão substituídos pelos do arquivo.`, () => restaurarBackupArquivo(file));
}
async function restaurarBackupArquivo(file){
  try{
    showToast('⏳ Restaurando backup...');
    const texto=await file.text(); const dados=JSON.parse(texto);
    if(dados?.formato!=='backup-completo' || Number(dados?.versao)!==2) throw new Error('Formato de backup não suportado');
    const local=dados.localStorage||{};
    for(let i=localStorage.length-1;i>=0;i--){
      const key=localStorage.key(i); if(key?.startsWith('cs_')) localStorage.removeItem(key);
    }
    for(const [key,value] of Object.entries(local)){
      if(key.startsWith('cs_')) localStorage.setItem(key,value);
    }
    const cfg=DB.getConfig(); const feitoEm=Date.parse(dados.exportadoEm); if(feitoEm){ cfg.ultimoBackup=feitoEm; DB.saveConfig(cfg); }
    await projectFilesRestore(dados.indexedDB||{});
    showToast('✓ Backup restaurado. A página será recarregada.');
    setTimeout(()=>location.reload(),700);
  }catch(e){
    console.error('Erro ao restaurar backup completo',e);
    showToast('⚠ Backup inválido ou não foi possível concluir a restauração.');
  }
}
