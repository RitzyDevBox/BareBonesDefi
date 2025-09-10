export function bindTabs() {
    const tabs = [...document.querySelectorAll('.tab')];
    const views = [...document.querySelectorAll('.view')];
  
    const show = (id) => {
      tabs.forEach(t => t.classList.toggle('active', t.dataset.view === id));
      views.forEach(v => v.classList.toggle('active', v.id === id));
    };
  
    tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.view)));
  }
  
  export function setNetBadge(text) {
    const el = document.getElementById('netBadge');
    el.textContent = text;
  }
  
  export function setConnectState(connected, addr) {
    const btn = document.getElementById('connectBtn');
    btn.textContent = connected ? (addr.slice(0,6) + '…' + addr.slice(-4)) : 'Connect';
    btn.classList.toggle('primary', !connected);
  }
  