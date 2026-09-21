/* ---------------------------------------------------------
   14. GRÁFICOS E KPIs
   --------------------------------------------------------- */

// Carregar Chart.js dinamicamente
function loadChartJS(){
  return new Promise((resolve,reject)=>{
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js';
    s.onload = resolve;
    s.onerror = () => reject(new Error('Erro ao carregar Chart.js'));
    document.head.appendChild(s);
  });
}

let chartJSLoaded = false;
loadChartJS().then(() => { chartJSLoaded = true; }).catch(e => console.warn('Chart.js não disponível:', e.message));

/* ---------------------------------------------------------
   Cores (palette design-system agnostic)
   --------------------------------------------------------- */
const VIZ_COLORS = {
  light: {
    surface: '#fcfcfb',
    primary: '#0b0b0b',
    secondary: '#52514e',
    muted: '#898781',
    gridline: '#e1e0d9',
    series: [
      '#2a78d6', // blue
      '#eb6834', // orange
      '#1baf7a', // aqua
      '#eda100', // yellow
      '#e87ba4', // magenta
      '#008300'  // green
    ],
    status: {
      good: '#0ca30c',
      warning: '#fab219',
      serious: '#ec835a',
      critical: '#d03b3b'
    }
  },
  dark: {
    surface: '#1a1a19',
    primary: '#ffffff',
    secondary: '#c3c2b7',
    muted: '#898781',
    gridline: '#2c2c2a',
    series: [
      '#3987e5', // blue
      '#d95926', // orange
      '#199e70', // aqua
      '#c98500', // yellow
      '#d55181', // magenta
      '#008300'  // green
    ],
    status: {
      good: '#0ca30c',
      warning: '#fab219',
      serious: '#ec835a',
      critical: '#d03b3b'
    }
  }
};

function getVizColors(){
  const cfg = DB.getConfig();
  return cfg.theme === 'dark' ? VIZ_COLORS.dark : VIZ_COLORS.light;
}

/* ---------------------------------------------------------
   KPIs Principais
   --------------------------------------------------------- */
function calcularKPIsPrincipais(){
  const solicitacoes = DB.getAll('solicitacoes');
  const documentos = DB.getAll('documentos');

  const pendencias = DB.getAll('solicitacoes').filter(solicitacaoAtrasada).length;
  const docsVencidos = documentos.filter(d => situacaoDocumento(d).chave === 'vencido').length;

  return {
    totalSolicitacoes: solicitacoes.length,
    totalDocumentos: documentos.length,
    pendencias,
    docsVencidos
  };
}

function renderKPIsPrincipais(container){
  const kpis = calcularKPIsPrincipais();
  const colors = getVizColors();

  container.innerHTML = `
    <div class="kpis-grid">
      <div class="kpi-tile">
        <div class="kpi-label">Solicitações</div>
        <div class="kpi-value">${kpis.totalSolicitacoes}</div>
        <div class="kpi-sub">${kpis.pendencias} pendentes</div>
      </div>
      <div class="kpi-tile">
        <div class="kpi-label">Documentos</div>
        <div class="kpi-value">${kpis.totalDocumentos}</div>
        <div class="kpi-sub" style="color: ${kpis.docsVencidos > 0 ? colors.status.critical : colors.secondary}">${kpis.docsVencidos} vencidos</div>
      </div>
    </div>`;
}

/* ---------------------------------------------------------
   Gráfico 1: Solicitações por Status
   --------------------------------------------------------- */
function renderGraficoSolicitacoesPorStatus(canvasId){
  if (!chartJSLoaded || !window.Chart) return;

  // Tarefas automáticas de renovação de documento ficam fora do Dashboard.
  const solicitacoes = DB.getAll('solicitacoes').filter(s => !ehTarefaRenovacaoDocumento(s));
  const statuses = ['Pendente', 'Em andamento', 'Concluída', 'Cancelada'];
  const dados = statuses.map(s => solicitacoes.filter(sol => sol.status === s).length);

  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const colors = getVizColors();
  const isDark = DB.getConfig().theme === 'dark';

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: statuses,
      datasets: [{
        label: 'Solicitações',
        data: dados,
        backgroundColor: colors.series.slice(0, statuses.length),
        borderRadius: 4,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? 'rgba(26,26,25,0.9)' : 'rgba(252,252,251,0.9)',
          titleColor: colors.primary,
          bodyColor: colors.primary,
          borderColor: colors.gridline,
          borderWidth: 1,
          padding: 8,
          displayColors: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: colors.muted, font: { size: 12 } },
          grid: { color: colors.gridline, drawBorder: false },
          border: { display: false }
        },
        x: {
          ticks: { color: colors.muted, font: { size: 12 } },
          grid: { display: false },
          border: { display: false }
        }
      }
    }
  });
}

/* ---------------------------------------------------------
   Gráfico 2: Documentos dentro da validade (Vencendo/Válidos)
   Os vencidos são exibidos somente no módulo Documentos.
   --------------------------------------------------------- */
function renderGraficoDocumentosSituacao(canvasId){
  if (!chartJSLoaded || !window.Chart) return;

  // Documentos vencidos ficam fora do Dashboard (só aparecem no módulo Documentos).
  const documentos = DB.getAll('documentos');
  const vencendo = documentos.filter(d => situacaoDocumento(d).chave === 'vencendo').length;
  const validos = documentos.filter(d => situacaoDocumento(d).chave === 'valido').length;

  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const colors = getVizColors();
  const isDark = DB.getConfig().theme === 'dark';

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Vencendo', 'Válidos'],
      datasets: [{
        data: [vencendo, validos],
        backgroundColor: [colors.status.warning, colors.status.good],
        borderColor: colors.surface,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: colors.secondary, font: { size: 12 }, padding: 12 }
        },
        tooltip: {
          backgroundColor: isDark ? 'rgba(26,26,25,0.9)' : 'rgba(252,252,251,0.9)',
          titleColor: colors.primary,
          bodyColor: colors.primary,
          borderColor: colors.gridline,
          borderWidth: 1,
          padding: 8
        }
      }
    }
  });
}

/* ---------------------------------------------------------
   Timeline: Criações ao longo do tempo
   --------------------------------------------------------- */
function renderGraficoTimelineUltimos30Dias(canvasId){
  if (!chartJSLoaded || !window.Chart) return;

  const hoje = new Date();
  const dias = {};

  // Inicializar últimos 30 dias
  for(let i=29; i>=0; i--){
    const d = new Date(hoje);
    d.setDate(d.getDate()-i);
    const key = d.toISOString().slice(0,10);
    dias[key] = 0;
  }

  // Contar solicitações criadas
  const solicitacoes = DB.getAll('solicitacoes');
  solicitacoes.forEach(s => {
    const key = s.dataRecebimento?.slice(0,10);
    if (key && dias.hasOwnProperty(key)) dias[key]++;
  });

  const labels = Object.keys(dias).map(k => {
    const d = new Date(k+'T00:00:00');
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
  });
  const data = Object.values(dias);

  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const colors = getVizColors();
  const isDark = DB.getConfig().theme === 'dark';

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Solicitações criadas',
        data,
        borderColor: colors.series[0],
        backgroundColor: colors.series[0] + '15',
        tension: 0.3,
        fill: true,
        pointRadius: 3,
        pointBackgroundColor: colors.series[0],
        pointBorderColor: colors.surface,
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? 'rgba(26,26,25,0.9)' : 'rgba(252,252,251,0.9)',
          titleColor: colors.primary,
          bodyColor: colors.primary,
          borderColor: colors.gridline,
          borderWidth: 1,
          padding: 8,
          displayColors: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: colors.muted, font: { size: 12 } },
          grid: { color: colors.gridline, drawBorder: false },
          border: { display: false }
        },
        x: {
          ticks: { color: colors.muted, font: { size: 12 } },
          grid: { display: false },
          border: { display: false }
        }
      }
    }
  });
}

/* ---------------------------------------------------------
   Integração com Dashboard
   --------------------------------------------------------- */
function injetarGraficosNoDashboard(){
  const container = document.getElementById('dashboardGraphs');
  if (!container) return;

  container.innerHTML = `
    <div class="graphs-section">
      <h3>Visão geral em gráficos</h3>

      <div class="graphs-grid">
        <div class="graph-card">
          <h4>Solicitações por Status</h4>
          <canvas id="graficoSolicStatus"></canvas>
        </div>

        <div class="graph-card">
          <h4>Documentos dentro da validade</h4>
          <canvas id="graficoDocSituacao"></canvas>
        </div>
      </div>

      <div class="graph-card full-width">
        <h4>Atividade - Últimos 30 Dias</h4>
        <canvas id="graficoTimeline"></canvas>
      </div>
    </div>`;

  // Renderizar gráficos com pequeno delay para garantir que Canvas existe
  setTimeout(() => {
    renderGraficoSolicitacoesPorStatus('graficoSolicStatus');
    renderGraficoDocumentosSituacao('graficoDocSituacao');
    renderGraficoTimelineUltimos30Dias('graficoTimeline');
    if (typeof aplicarVisibilidadeDashboard === 'function') aplicarVisibilidadeDashboard();
  }, 100);
}

// Chamar ao renderizar Dashboard
const originalRenderDashboard = typeof renderDashboard === 'function' ? renderDashboard : null;
if (originalRenderDashboard) {
  window.renderDashboard = function() {
    originalRenderDashboard();
    setTimeout(injetarGraficosNoDashboard, 200);
  };
}
