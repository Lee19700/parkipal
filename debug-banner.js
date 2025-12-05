(function(){
  // Avoid duplicate banners if a page already created its own debug banner
  if (document.getElementById('site-debug-banner') || document.getElementById('debug-banner')) return;

  function createBanner(){
    var banner = document.createElement('div');
    banner.id = 'site-debug-banner';
    banner.className = 'ai-warning';
    banner.style.display = 'none';
    banner.style.position = 'fixed';
    banner.style.top = '12px';
    banner.style.left = '12px';
    banner.style.right = '12px';
    banner.style.zIndex = '99999';
    banner.style.padding = '10px 40px 10px 12px';
    banner.style.textAlign = 'center';
    banner.style.borderRadius = '10px';
    banner.style.boxShadow = '0 10px 30px rgba(2,6,23,0.08)';
    
    var closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.position = 'absolute';
    closeBtn.style.right = '8px';
    closeBtn.style.top = '50%';
    closeBtn.style.transform = 'translateY(-50%)';
    closeBtn.style.background = 'none';
    closeBtn.style.border = 'none';
    closeBtn.style.fontSize = '24px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.color = 'inherit';
    closeBtn.style.opacity = '0.6';
    closeBtn.style.lineHeight = '1';
    closeBtn.style.padding = '0 6px';
    closeBtn.addEventListener('click', function(){ banner.style.display='none'; });
    closeBtn.addEventListener('mouseenter', function(){ closeBtn.style.opacity='1'; });
    closeBtn.addEventListener('mouseleave', function(){ closeBtn.style.opacity='0.6'; });
    
    banner.appendChild(closeBtn);
    document.body.insertBefore(banner, document.body.firstChild);
    return banner;
  }

  function createLogPanel(){
    var panel = document.createElement('div');
    panel.id = 'site-debug-log';
    panel.style.position = 'fixed';
    panel.style.bottom = '12px';
    panel.style.right = '12px';
    panel.style.width = '360px';
    panel.style.maxHeight = '40vh';
    panel.style.overflow = 'auto';
    panel.style.zIndex = '99999';
    panel.style.background = 'rgba(255,255,255,0.98)';
    panel.style.borderRadius = '10px';
    panel.style.boxShadow = '0 12px 40px rgba(2,6,23,0.08)';
    panel.style.padding = '8px';
    panel.style.fontSize = '13px';
    panel.style.display = 'none';
    var title = document.createElement('div'); title.textContent = 'Debug Log'; title.style.fontWeight='700'; title.style.marginBottom='8px'; panel.appendChild(title);
    var list = document.createElement('div'); list.id = 'site-debug-log-list'; panel.appendChild(list);
    var controls = document.createElement('div'); controls.style.display='flex'; controls.style.gap='8px'; controls.style.marginTop='8px';
    var btnClear = document.createElement('button'); btnClear.textContent='Clear'; btnClear.className='btn btn-ghost'; btnClear.addEventListener('click', function(){ list.innerHTML=''; });
    var btnClose = document.createElement('button'); btnClose.textContent='Close'; btnClose.className='btn'; btnClose.addEventListener('click', function(){ panel.style.display='none'; });
    controls.appendChild(btnClear); controls.appendChild(btnClose); panel.appendChild(controls);
    document.body.appendChild(panel);
    return {panel:panel,list:list};
  }

  function qs(id){return document.getElementById(id);}
  var banner = createBanner();
  var lp = createLogPanel();

  function show(msg, persist){ 
    if (!banner) return; 
    banner.style.display='block'; 
    // Clear existing text and close button, then add new content
    while(banner.firstChild && banner.firstChild.tagName !== 'BUTTON') {
      banner.removeChild(banner.firstChild);
    }
    var textNode = document.createTextNode(msg);
    banner.insertBefore(textNode, banner.firstChild);
    if (!persist){ setTimeout(function(){ try{ banner.style.display='none'; }catch(e){} }, 2500); } 
  }
  function append(msg){ if (!banner) return; banner.style.display='block'; banner.textContent = (banner.textContent?banner.textContent+' | ':'') + msg; }

  function pushLog(level, msg){ try{
    // Don't auto-show the panel, just add to list
    var row = document.createElement('div'); row.style.padding='6px'; row.style.borderRadius='6px'; row.style.marginBottom='6px';
    if (level==='error'){ row.style.background='#fff6f6'; row.style.border='1px solid rgba(220,38,38,0.08)'; row.style.color='#7a1f1f'; }
    else if (level==='warn'){ row.style.background='#fff9f0'; row.style.border='1px solid rgba(245,158,11,0.06)'; }
    else { row.style.background='transparent'; }
    var time = new Date().toLocaleTimeString();
    row.innerHTML = '<strong>['+time+']</strong> <span style="margin-left:6px">'+(String(msg))+'</span>';
    lp.list.insertBefore(row, lp.list.firstChild);
  }catch(e){}
  }

  // Capture console methods
  (function(){ var orig = { log: console.log, warn: console.warn, error: console.error }; console.log = function(){ try{ orig.log.apply(console, arguments); pushLog('log', Array.from(arguments).join(' ')); }catch(e){} }; console.warn = function(){ try{ orig.warn.apply(console, arguments); pushLog('warn', Array.from(arguments).join(' ')); }catch(e){} }; console.error = function(){ try{ orig.error.apply(console, arguments); pushLog('error', Array.from(arguments).join(' ')); }catch(e){} }; })();

  window.SITE_DEBUG = { show: show, append: append, push: pushLog, openLog: function(){ lp.panel.style.display='block'; } };

  window.addEventListener('error', function(ev){ try{ var msg = ev && ev.message ? ev.message : 'Unknown error'; var details = msg; if (ev.filename) details += ' at ' + ev.filename; if (ev.lineno) details += ':' + ev.lineno; show('Error: '+msg); pushLog('error', details); }catch(e){} });
  window.addEventListener('unhandledrejection', function(ev){ try{ var reason = ev && ev.reason ? (ev.reason.message || String(ev.reason)) : 'Unhandled rejection'; append('Promise rejection'); pushLog('error', 'Promise: ' + reason); }catch(e){} });

  document.addEventListener('DOMContentLoaded', function(){ try{ show('Scripts loaded', false); }catch(e){} });
})();
