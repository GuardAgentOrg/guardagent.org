// GuardAgent High-Density SOC Chart.js Visualizations
// Sleek dark theme: Emerald #10B981, Crimson #EF4444, Amber #F59E0B, Cyan #00D2B4

let decisionDonutChart = null;
let trendLineChart = null;

function renderDecisionDonut(canvasId, breakdown) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;

  if (decisionDonutChart) {
    decisionDonutChart.destroy();
  }

  const ctx = canvas.getContext('2d');
  decisionDonutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Allowed Actions', 'Blocked Threats', 'Pending Approvals'],
      datasets: [{
        data: [breakdown.allow || 0, breakdown.block || 0, breakdown.approval || 0],
        backgroundColor: [
          '#10B981', // Allowed Emerald
          '#EF4444', // Threat Block Crimson
          '#F59E0B'  // Human Approval Amber
        ],
        borderWidth: 2,
        borderColor: '#0C121E', // Canvas matching border
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '74%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 10,
            usePointStyle: true,
            pointStyle: 'circle',
            font: { family: "'Inter', sans-serif", size: 11, weight: '500' },
            color: '#94A3B8',
            padding: 16
          }
        },
        tooltip: {
          backgroundColor: '#070A0F',
          titleColor: '#F8FAFC',
          bodyColor: '#94A3B8',
          titleFont: { family: "'JetBrains Mono', monospace", size: 12, weight: '600' },
          bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
          padding: 10,
          cornerRadius: 6,
          borderColor: 'rgba(255, 255, 255, 0.12)',
          borderWidth: 1
        }
      }
    }
  });
}

function renderTrendLine(canvasId, timeline) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;

  if (trendLineChart) {
    trendLineChart.destroy();
  }

  const labels = timeline.map(t => t.label);
  const allowedData = timeline.map(t => t.allowed);
  const blockedData = timeline.map(t => t.blocked);
  const approvalData = timeline.map(t => t.approvals);

  const ctx = canvas.getContext('2d');
  
  // Create subtle vertical area gradient for Allowed requests
  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, 'rgba(0, 210, 180, 0.22)');
  gradient.addColorStop(1, 'rgba(0, 210, 180, 0.00)');

  trendLineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Allowed Requests',
          data: allowedData,
          borderColor: '#00D2B4',
          backgroundColor: gradient,
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointBackgroundColor: '#070A0F',
          pointBorderColor: '#00D2B4',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6
        },
        {
          label: 'Blocked Threats',
          data: blockedData,
          borderColor: '#EF4444',
          backgroundColor: 'transparent',
          borderDash: [4, 4],
          tension: 0.3,
          borderWidth: 2,
          pointBackgroundColor: '#070A0F',
          pointBorderColor: '#EF4444',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6
        },
        {
          label: 'Pending Approvals',
          data: approvalData,
          borderColor: '#F59E0B',
          backgroundColor: 'transparent',
          tension: 0.3,
          borderWidth: 2,
          pointBackgroundColor: '#070A0F',
          pointBorderColor: '#F59E0B',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: "'JetBrains Mono', monospace", size: 11 }, color: '#64748B' }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { font: { family: "'JetBrains Mono', monospace", size: 11 }, color: '#64748B' }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 10,
            usePointStyle: true,
            pointStyle: 'circle',
            font: { family: "'Inter', sans-serif", size: 11, weight: '500' },
            color: '#94A3B8'
          }
        },
        tooltip: {
          backgroundColor: '#070A0F',
          titleColor: '#F8FAFC',
          bodyColor: '#94A3B8',
          borderColor: 'rgba(255, 255, 255, 0.12)',
          borderWidth: 1,
          padding: 10,
          cornerRadius: 6,
          titleFont: { family: "'JetBrains Mono', monospace", size: 12 },
          bodyFont: { family: "'JetBrains Mono', monospace", size: 11 }
        }
      }
    }
  });
}

window.charts = {
  renderDecisionDonut,
  renderTrendLine
};
