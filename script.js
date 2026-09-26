(function(){
'use strict';
const KEY='ferroVelhoDB_v2';
let db=loadDB();

// Mapeamento de materiais e seus respectivos ícones
const MATERIAIS_ICONS = {
  "Alumínio": "🥤",
  "Alumínio chapa": "🔲",
  "Bateria": "🔋",
  "Cabo de cobre grosso": "🔌",
  "Chumbo": "⚓",
  "Cobre de 4º": "🟠",
  "Cobre fio PP": "🧵",
  "Cobre instalação": "⚡",
  "Cobre mel": "🍯",
  "Cobre misto": "📦",
  "Desodorante": "🧴",
  "Ferro / Sucata": "🏗️",
  "Inox ferroso": "⚙️",
  "Inox não ferroso": "🛠️",
  "Latinha": "🥫",
  "Metal": "🪙",
  "Motor de geladeira": "🚗",
  "Outros": "📋",
  "Panela limpa": "🍲",
  "Panela suja": "🥘",
  "Perfil limpo": "📐",
  "Perfil pintado": "🎨",
  "Perfil sujo": "🪵",
  "Zamak": "🔩"
};

const MATERIAIS = Object.keys(MATERIAIS_ICONS).sort();

function getIcon(material) {
  return MATERIAIS_ICONS[material] || "📦";
}

function loadDB(){
  try{
    const raw=localStorage.getItem(KEY); 
    if(raw){
      const x=JSON.parse(raw);
      return {
        purchases: Array.isArray(x.purchases)?x.purchases:[],
        sales: Array.isArray(x.sales)?x.sales:[],
        closings: Array.isArray(x.closings)?x.closings:[]
      }
    }
  }catch(e){} 
  return {purchases:[],sales:[],closings:[]}
}

function persist(){
  try{
    localStorage.setItem(KEY,JSON.stringify(db)); 
    localStorage.setItem(KEY+'_backup',JSON.stringify(db)); 
    return true;
  }catch(e){
    alert('Não foi possível salvar no navegador.');
    return false;
  }
}

const $=id=>document.getElementById(id);
const money=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0);
const dateBR=d=>new Date(d).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});

function nav(page){
  document.querySelectorAll('.page').forEach(x=>x.classList.remove('active-page')); 
  const p=$(page); 
  if(p)p.classList.add('active-page'); 
  document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.page===page)); 
  const n={dashboard:'Dashboard',compras:'Compras',vendas:'Vendas',estoque:'Estoque',relatorios:'Histórico'}; 
  $('pageTitle').textContent=n[page]||'Dashboard';
}

function materialOptions(){
  return '<option value="">Selecione</option>' + MATERIAIS.map(m=>`<option value="${m}">${getIcon(m)} ${m}</option>`).join('');
}

function addPurchase(data){
  data.id=crypto.randomUUID?crypto.randomUUID():Date.now().toString();
  data.date=new Date().toISOString();
  db.purchases.unshift(data); 
  if(persist()){render();return true}
  return false;
}

function addSale(data){
  data.id=crypto.randomUUID?crypto.randomUUID():Date.now().toString();
  data.date=new Date().toISOString();
  db.sales.unshift(data); 
  if(persist()){render();return true}
  return false;
}

function collect(prefix){
  const ids=prefix?
    {material:'mMaterial',weight:'mWeight',price:'mPrice',total:'mTotal',person:'mSeller',note:'mNote'}:
    {material:'material',weight:'weight',price:'priceKg',total:'total',person:'seller',note:'note'};
  const g=k=>$(ids[k]).value;
  return {material:g('material'),weight:+g('weight'),price:+g('price'),total:+g('total'),person:g('person'),note:g('note')};
}

function validate(x){
  if(!x.material||x.weight<=0||x.total<0)return 'Preencha material, peso e valor total.';
  return '';
}

function render(){
  stats();
  purchaseTable();
  salesTable();
  stock();
  report();
}

function stats(){
  $('todayPurchases').textContent=db.purchases.length;
  $('totalSpent').textContent=money(db.purchases.reduce((a,x)=>a+x.total,0));
  $('totalKg').textContent=db.purchases.reduce((a,x)=>a+x.weight,0).toFixed(2)+' kg';$('stockKg').textContent=stockData().reduce((a,x)=>a+x.kg,0).toFixed(2)+' kg'; 
}

function stockData(){
  const m={};
  db.purchases.forEach(x=>m[x.material]=(m[x.material]||0)+x.weight);
  db.sales.forEach(x=>m[x.material]=(m[x.material]||0)-x.weight);
  return Object.entries(m).map(([material,kg])=>({material,kg})).filter(x=>x.kg>0.0001).sort((a,b)=>b.kg-a.kg);
}

function stock(){
  const arr=stockData(),max=arr[0]?.kg||1;
  $('stockList').innerHTML=arr.length?arr.slice(0,8).map(x=>`<div class="stock-item"><div class="stock-line"><b>${getIcon(x.material)} ${x.material}</b><span>${x.kg.toFixed(2)} kg</span></div><div class="bar"><i style="width:${Math.max(2,x.kg/max*100)}%"></i></div></div>`).join(''):'<p style="color:#7a858e;padding:10px 0;">Nenhum estoque no momento.</p>';
  $('stockTable').innerHTML=arr.length?`<table class="table"><tr><th>Material</th><th>Estoque</th></tr>${arr.map(x=>`<tr><td><b>${getIcon(x.material)} ${x.material}</b></td><td>${x.kg.toFixed(2)} kg</td></tr>`).join('')}</table>`:'<p style="color:#7a858e;padding:10px 0;">Nenhum estoque no momento.</p>';
}

function purchaseTable(){
  const q=($('search')?.value||'').toLowerCase();
  const list=db.purchases.filter(x=>(x.material+' '+x.person+' '+x.note).toLowerCase().includes(q));
  $('purchaseTable').innerHTML=list.length?`<table class="table"><tr><th>Data</th><th>Material</th><th>Kg</th><th>Preço/kg</th><th>Total</th><th>Pessoa</th><th>Obs (Pagamento)</th><th></th></tr>${list.map(x=>`<tr><td>${dateBR(x.date)}</td><td>${getIcon(x.material)}${x.material}</td><td>${x.weight.toFixed(2)}</td><td>${money(x.price)}</td><td>${money(x.total)}</td><td>${x.person||'—'}</td><td><span class="badge">${x.note||'—'}</span></td><td><button class="danger" onclick="window.delPurchase('${x.id}')">Excluir</button></td></tr>`).join('')}</table>`:'<p style="color:#7a858e;padding:10px 0;">Nenhuma compra encontrada.</p>';
  const r=db.purchases.slice(0,6);
  $('recentPurchases').innerHTML=r.length?`<table class="table"><tr><th>Data</th><th>Material</th><th>Kg</th><th>Total</th></tr>${r.map(x=>`<tr><td>${dateBR(x.date)}</td><td>${getIcon(x.material)}${x.material}</td><td>${x.weight.toFixed(2)}</td><td>${money(x.total)}</td></tr>`).join('')}</table>`:'<p style="color:#7a858e;padding:10px 0;">Nenhuma compra hoje.</p>';
}

function salesTable(){
  if(!$('salesTable'))return;
  const q=($('saleSearch')?.value||'').toLowerCase();
  const list=db.sales.filter(x=>(x.material+' '+x.person+' '+x.note).toLowerCase().includes(q));
  $('salesTable').innerHTML=list.length?`<table class="table"><tr><th>Data</th><th>Material</th><th>Kg</th><th>Preço/kg</th><th>Venda</th><th>Cliente</th><th>Obs (Pagamento)</th><th></th></tr>${list.map(x=>`<tr><td>${dateBR(x.date)}</td><td>${getIcon(x.material)}${x.material}</td><td>${x.weight.toFixed(2)}</td><td>${money(x.price)}</td><td>${money(x.total)}</td><td>${x.person||'—'}</td><td><span class="badge">${x.note||'—'}</span></td><td><button class="danger" onclick="window.delSale('${x.id}')">Excluir</button></td></tr>`).join('')}</table>`:'<p style="color:#7a858e;padding:10px 0;">Nenhuma venda encontrada.</p>';
}

function report(){
  $('reportCount').textContent=db.closings.length;
  
  let html = '';
  if(!db.closings || db.closings.length === 0) {
    html = '<p style="color:#7a858e;padding:15px 0;">Nenhum histórico de dia fechado até o momento.</p>';
  } else {
    html = db.closings.map((c, i) => {
      const items = c.itemsBought || [];
      return `
        <div class="panel" style="margin-bottom: 20px;">
          <div class="daily-summary">
            <b>📅 Fechamento nº ${db.closings.length - i} — ${dateBR(c.closedAt)}</b>
            <span style="color: #20a464; font-weight: bold;">Total Gasto: ${money(c.totalSpent)}</span>
          </div>
          <h3>Materiais Comprados e Valores Gastos</h3>
          ${items.length > 0 ? `
            <table class="table">
              <tr><th>Material</th><th>Quantidade Comprada (Kg)</th><th>Valor Total Gasto</th></tr>
              ${items.map(item => `
                <tr>
                  <td><b>${getIcon(item.material)} ${item.material}</b></td>
                  <td>${item.weight.toFixed(2)} kg</td>
                  <td>${money(item.total)}</td>
                </tr>
              `).join('')}
            </table>
          ` : '<p style="color:#7a858e;padding:10px 0;">Nenhum material comprado neste dia.</p>'}
        </div>
      `;
    }).join('');
  }
  
  $('reportHistoryList').innerHTML = html;
}

window.delPurchase=id=>{if(confirm('Excluir esta compra?')){db.purchases=db.purchases.filter(x=>x.id!==id);persist();render()}};
window.delSale=id=>{if(confirm('Excluir esta venda?')){db.sales=db.sales.filter(x=>x.id!==id);persist();render()}};

function setup(){
  const selectIds = ['material', 'mMaterial', 'sMaterial', 'smMaterial'];
  selectIds.forEach(id => {
    const el = $(id);
    if(el) el.innerHTML = materialOptions();
  });

  $('today').textContent=new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  
  document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>nav(b.dataset.page));
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>nav(b.dataset.go));
  
  $('newPurchase').onclick=()=>{$('modal').classList.add('show');};
  $('newSale').onclick=()=>{$('saleModal').classList.add('show')};
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).classList.remove('show'));$('purchaseForm').onsubmit=e=>{
    e.preventDefault();
    const x=collect('');
    const err=validate(x);
    if(err)return alert(err);
    if(addPurchase(x)){e.target.reset();alert('Compra salva com sucesso!')}
  };
  
  $('modalForm').onsubmit=e=>{
    e.preventDefault();
    const x=collect('m');
    const err=validate(x);
    if(err)return alert(err);
    if(addPurchase(x)){e.target.reset();$('modal').classList.remove('show');alert('Compra salva com sucesso!')}
  };
  
  $('saleForm').onsubmit=e=>{
    e.preventDefault();
    const x={material:$('sMaterial').value,weight:+$('sWeight').value,price:+$('sPrice').value,total:+$('sTotal').value,person:$('sSeller').value,note:$('sNote').value};
    const stock=stockData().find(a=>a.material===x.material)?.kg||0;
    if(x.weight>stock)return alert(`Estoque insuficiente. Disponível: ${stock.toFixed(2)} kg`);
    const err=validate(x);
    if(err)return alert(err);
    if(addSale(x)){e.target.reset();alert('Venda salva com sucesso!')}
  };

  if($('saleSearch'))$('saleSearch').oninput=render;
  if($('search'))$('search').oninput=render;

  ['weight','priceKg'].forEach(id=>$(id).oninput=()=>{
    const w=+$('weight').value,p=+$('priceKg').value;
    if(w&&p)$('total').value=(w*p).toFixed(2)   });      ['mWeight','mPrice'].forEach(id=>$(id).oninput=()=>{
    const w=+$('mWeight').value,p=+$('mPrice').value;
    if(w&&p)$('mTotal').value=(w*p).toFixed(2)   });      ['sWeight','sPrice'].forEach(id=>$(id).oninput=()=>{
    const w=+$('sWeight').value,p=+$('sPrice').value;
    if(w&&p)$('sTotal').value=(w*p).toFixed(2)
  });

  // Fechar o Dia
  $('closeDay').onclick=()=>{
    if(!confirm('Deseja realmente fechar o dia? As compras do dia e estoque ativo serão limpos e salvos na aba de Histórico.')) return;

    const materialsSummary = {};
    db.purchases.forEach(p => {
      if(!materialsSummary[p.material]) {
        materialsSummary[p.material] = { material: p.material, weight: 0, total: 0 };
      }
      materialsSummary[p.material].weight += p.weight;
      materialsSummary[p.material].total += p.total;
    });

    const itemsBought = Object.values(materialsSummary);
    const totalSpent = db.purchases.reduce((a, x) => a + x.total, 0);

    db.closings.unshift({
      closedAt: new Date().toISOString(),
      totalSpent: totalSpent,
      itemsBought: itemsBought
    });

    db.purchases = [];
    db.sales = [];

    persist();
    alert('Dia fechado com sucesso! Os dados foram limpos e gravados no Histórico.');
    nav('relatorios');
    render();
  };

  render();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();