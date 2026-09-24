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

/* Monta o arquivo de backup (dados + anexos). Usado pelo download e
   pelo backup automático na pasta. */
async function montarBackupCompleto(){
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
  return { blob:new Blob([JSON.stringify(dados)],{type:'application/json'}), nome:`backup-completo-central-secretaria-${todayISO()}.json` };
}
function marcarBackupFeito(){
  const cfg=DB.getConfig(); cfg.ultimoBackup=Date.now(); DB.saveConfig(cfg);
}

async function exportarBackupCompleto(){
  try{
    showToast('⏳ Preparando backup completo...');
    const { blob, nome }=await montarBackupCompleto();
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url; a.download=nome;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    marcarBackupFeito();
    showToast('✓ Backup completo exportado com dados e anexos.');
    if(typeof renderCurrentView==='function') renderCurrentView();
  }catch(e){
    console.error('Erro ao exportar backup completo',e);
    showToast('⚠ Não foi possível criar o backup completo.');
  }
}

/* ---------------------------------------------------------
   BACKUP AUTOMÁTICO NUMA PASTA (Chrome e Edge)
   A pessoa escolhe a pasta uma vez; o acesso a ela fica guardado num
   banco separado (não entra no backup nem é apagado ao restaurar).
   Ao abrir o sistema, se já passou 1 dia, salva sozinho — quando o
   navegador ainda tem permissão. Sem permissão, o aviso do Dashboard
   (a partir de 7 dias) vira um botão de 1 clique para salvar na pasta.
   Guarda os 8 backups mais recentes da pasta e apaga os mais velhos.
   --------------------------------------------------------- */
const BACKUP_PASTA_MANTER=8;
const BACKUP_ARQ_RE=/^backup-completo-central-secretaria-\d{4}-\d{2}-\d{2}\.json$/;
let backupPastaHandle=null;

function backupPastaSuportado(){ return typeof window.showDirectoryPicker==='function'; }
function backupPastaConfig(){ return DB.getConfig().backupPasta||null; }

function backupLocalDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open('central_secretaria_local',1);
    req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains('kv')) req.result.createObjectStore('kv'); };
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
  });
}
async function backupLocalGet(chave){
  const db=await backupLocalDB();
  return new Promise((resolve,reject)=>{ const r=db.transaction('kv','readonly').objectStore('kv').get(chave); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error); });
}
async function backupLocalSet(chave,valor){
  const db=await backupLocalDB();
  return new Promise((resolve,reject)=>{ const tx=db.transaction('kv','readwrite'); valor===undefined?tx.objectStore('kv').delete(chave):tx.objectStore('kv').put(valor,chave); tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error); });
}
async function obterPastaBackup(){
  if(backupPastaHandle) return backupPastaHandle;
  try{ backupPastaHandle=await backupLocalGet('pastaBackup')||null; }catch(e){ backupPastaHandle=null; }
  return backupPastaHandle;
}

async function escolherPastaBackup(){
  if(!backupPastaSuportado()) return showToast('Este navegador não permite escolher pasta. Use o Chrome ou o Edge.');
  let handle;
  try{ handle=await window.showDirectoryPicker({ id:'backup-central', mode:'readwrite' }); }
  catch(e){ return; } // a pessoa fechou a janela
  backupPastaHandle=handle;
  try{ await backupLocalSet('pastaBackup',handle); }catch(e){ console.warn('Não foi possível lembrar a pasta',e); }
  const cfg=DB.getConfig(); cfg.backupPasta={ nome:handle.name, desde:Date.now() }; DB.saveConfig(cfg);
  await salvarBackupNaPasta({ pedirPermissao:true });
}
function desligarBackupPasta(){
  confirmAction('Desligar o backup automático? Os arquivos que já estão na pasta continuam lá.', async ()=>{
    const cfg=DB.getConfig(); delete cfg.backupPasta; DB.saveConfig(cfg);
    backupPastaHandle=null; try{ await backupLocalSet('pastaBackup',undefined); }catch(e){}
    showToast('Backup automático desligado.'); renderCurrentView();
  });
}

/* Salva um backup na pasta escolhida. pedirPermissao só deve ser true
   quando vem de um clique (o navegador exige). Retorna true se salvou. */
async function salvarBackupNaPasta({ pedirPermissao=false, silencioso=false }={}){
  const cfg=backupPastaConfig(); if(!cfg) return false;
  const handle=await obterPastaBackup();
  if(!handle){ if(!silencioso) showToast('⚠ Não achei a pasta do backup. Escolha a pasta de novo.'); return false; }
  try{
    let perm=await handle.queryPermission({ mode:'readwrite' });
    if(perm!=='granted' && pedirPermissao) perm=await handle.requestPermission({ mode:'readwrite' });
    if(perm!=='granted'){ if(!silencioso) showToast('⚠ Sem permissão para salvar na pasta.'); return false; }
    if(!silencioso) showToast('⏳ Salvando backup na pasta...');
    const { blob, nome }=await montarBackupCompleto();
    const arq=await handle.getFileHandle(nome,{ create:true });
    const w=await arq.createWritable(); await w.write(blob); await w.close();
    // mantém só os mais recentes (só mexe nos arquivos de backup do sistema)
    const nomes=[]; for await (const [n,h] of handle.entries()) if(h.kind==='file' && BACKUP_ARQ_RE.test(n)) nomes.push(n);
    nomes.sort().reverse().slice(BACKUP_PASTA_MANTER).forEach(n=>handle.removeEntry(n).catch(()=>{}));
    marcarBackupFeito();
    showToast(`✓ Backup salvo na pasta "${handle.name}".`);
    if(typeof renderCurrentView==='function') renderCurrentView();
    return true;
  }catch(e){
    console.error('Erro no backup automático',e);
    if(!silencioso) showToast('⚠ Não foi possível salvar na pasta. Confira se ela ainda existe.');
    return false;
  }
}
/* Chamado ao abrir o sistema. Não pergunta nada: só salva se já pode. */
async function backupAutomaticoAoAbrir(){
  if(!backupPastaConfig() || !backupPastaSuportado()) return;
  const sb=situacaoBackup();
  if(sb.dias!==null && sb.dias<1) return;
  await salvarBackupNaPasta({ silencioso:true });
}
/* Botão do aviso/cartão: salva na pasta se houver uma; senão baixa. */
function fazerBackupAgora(){
  if(backupPastaConfig() && backupPastaSuportado()) salvarBackupNaPasta({ pedirPermissao:true });
  else exportarBackupCompleto();
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
    const pastaAtual=backupPastaConfig();
    for(let i=localStorage.length-1;i>=0;i--){
      const key=localStorage.key(i); if(key?.startsWith('cs_')) localStorage.removeItem(key);
    }
    for(const [key,value] of Object.entries(local)){
      if(key.startsWith('cs_')) localStorage.setItem(key,value);
    }
    const cfg=DB.getConfig(); const feitoEm=Date.parse(dados.exportadoEm); if(feitoEm) cfg.ultimoBackup=feitoEm;
    if(pastaAtual) cfg.backupPasta=pastaAtual; else delete cfg.backupPasta;
    DB.saveConfig(cfg);
    await projectFilesRestore(dados.indexedDB||{});
    showToast('✓ Backup restaurado. A página será recarregada.');
    setTimeout(()=>location.reload(),700);
  }catch(e){
    console.error('Erro ao restaurar backup completo',e);
    showToast('⚠ Backup inválido ou não foi possível concluir a restauração.');
  }
}
