// parent/js/ui.js
export function bindTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(t => t.addEventListener('click', () => {
      tabs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      const view = t.getAttribute('data-view');
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      document.getElementById(view).classList.add('active');
    }));
  }
  
  export function setConnectState(connected, addr) {
    const btn = document.getElementById('connectBtn');
    btn.textContent = connected ? 'Connected' : 'Connect';
    btn.disabled = !!connected;
  }
  
  export function setNetBadge(text) {
    const el = document.getElementById('netBadge');
    if (el) el.textContent = text;
  }
  
  export function shortAddr(a) {
    if (!a) return '';
    return `${a.slice(0, 6)}…${a.slice(-4)}`;
  }
  