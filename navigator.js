

(function(){
  // ===== clean up previous install (safe to re-run; removes the EXACT prior global listener) =====
  if (window.__sbsickFlow) {
    var P = window.__sbsickFlow;
    try { P.bodyObserver && P.bodyObserver.disconnect(); } catch(e){}
    try { P.mountObserver && P.mountObserver.disconnect(); } catch(e){}
    try { P.onDown && document.removeEventListener('mousedown', P.onDown, true); } catch(e){}
  }

  // ===== config =====
  var TRIGGER_TEXT = "🤒 I'm sick, what should I do?"; // exact trimmed textContent of the suggestion button
  var ROOT_ID = "sbsick-root";
  var PFX = "sbsick";                 // unique style/class prefix — nothing leaks into the host page
  var managerName = "your manager";   // placeholder, NOT a real person
  var managerContact = "";            // "+10000000000" (sms) or "manager@example.com" (mailto). Empty = no link opened.

  var S = window.__sbsickFlow = { mountObserver:null, bodyObserver:null, onDown:null };

  // ===== scoped stylesheet =====
  (function injectStyle(){
    var ex = document.getElementById(PFX+'-style'); if (ex) ex.remove();
    var css = ''
    + '.'+PFX+'-wrap{display:flex;flex-direction:column;gap:10px;padding:10px 0 18px;width:100%;font-family:inherit;}'
    + '.'+PFX+'-row{display:flex;width:100%;align-items:flex-end;gap:8px;}'
    + '.'+PFX+'-row.bot{justify-content:flex-start;}'
    + '.'+PFX+'-row.user{justify-content:flex-end;}'
    + '.'+PFX+'-avatar{flex:0 0 auto;width:26px;height:26px;border-radius:50%;background:#1f8a44;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;}'
    + '.'+PFX+'-bubble{max-width:78%;padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.45;word-wrap:break-word;}'
    + '.'+PFX+'-bubble.bot{background:#fff;color:#1a1a1a;border:1px solid #E2E2E4;border-bottom-left-radius:4px;}'
    + '.'+PFX+'-bubble.user{background:#1f8a44;color:#fff;border-bottom-right-radius:4px;}'
    + '.'+PFX+'-choices{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;margin:2px 0;width:100%;}'
    + '.'+PFX+'-pill{cursor:pointer;font-size:13px;padding:8px 14px;border-radius:999px;border:1px solid #1f8a44;background:#fff;color:#1f8a44;transition:background .15s,color .15s;}'
    + '.'+PFX+'-pill:hover{background:#1f8a44;color:#fff;}'
    + '.'+PFX+'-back{align-self:flex-start;cursor:pointer;font-size:12px;padding:4px 10px;border-radius:999px;border:1px solid #c9c9cf;background:#fff;color:#555;margin-top:2px;}'
    + '.'+PFX+'-back:hover{background:#f2f2f4;}'
    + '.'+PFX+'-card{align-self:flex-start;max-width:88%;background:#f3fbf5;border:1px solid #bfe6cb;border-radius:14px;padding:12px 14px;font-size:13px;line-height:1.5;color:#14532d;}'
    + '.'+PFX+'-card h4{margin:0 0 6px;font-size:13px;font-weight:700;display:flex;align-items:center;gap:6px;}'
    + '.'+PFX+'-kv{display:flex;justify-content:space-between;gap:12px;padding:2px 0;}'
    + '.'+PFX+'-msg{margin-top:8px;padding:10px;background:#fff;border:1px solid #d6ece0;border-radius:10px;font-style:italic;color:#333;white-space:pre-wrap;}'
    + '.'+PFX+'-inputrow{display:flex;gap:8px;align-items:center;justify-content:flex-end;width:100%;margin:2px 0;}'
    + '.'+PFX+'-num{width:90px;font-size:14px;padding:8px 10px;border-radius:10px;border:1px solid #c9c9cf;}'
    + '.'+PFX+'-num:focus{outline:none;border-color:#1f8a44;}'
    + '.'+PFX+'-cont{cursor:pointer;font-size:13px;padding:8px 16px;border-radius:999px;border:none;background:#1f8a44;color:#fff;}'
    + '.'+PFX+'-cont:disabled{opacity:.45;cursor:not-allowed;}'
    + '.'+PFX+'-err{color:#b42318;font-size:12px;width:100%;text-align:right;}';
    var st = document.createElement('style'); st.id = PFX+'-style'; st.textContent = css;
    document.head.appendChild(st);
  })();

  // ===== DOM helpers (selectors verified on the live page) =====
  function getView(){ return document.querySelector('[data-testid="ai-assistant-view"]'); }
  function getScroll(view){ return (view||document).querySelector('[class*="overflow-y-auto"]'); }
  function getFooter(view){ return (view||document).querySelector('[data-testid="ai-assistant-footer"]'); }
  function findTriggerBtn(view){
    var btns=(view||document).querySelectorAll('button');
    for(var i=0;i<btns.length;i++){ if(btns[i].textContent.trim()===TRIGGER_TEXT) return btns[i]; }
    return null;
  }
  function isMounted(scroll){ return !!(scroll && scroll.querySelector('#'+ROOT_ID)); }
  function el(tag,cls,text){ var e=document.createElement(tag); if(cls)e.className=cls; if(text!=null)e.textContent=text; return e; }
  function scrollBottom(scroll){ scroll.scrollTop = scroll.scrollHeight; }

  // ===== chat primitives (all user-derived strings via textContent) =====
  function botMsg(ctx, text){
    var row = el('div', PFX+'-row bot');
    row.appendChild(el('div', PFX+'-avatar', '🤖'));
    row.appendChild(el('div', PFX+'-bubble bot', text));
    ctx.root.appendChild(row); scrollBottom(ctx.scroll);
  }
  function userMsg(ctx, text){
    var row = el('div', PFX+'-row user');
    row.appendChild(el('div', PFX+'-bubble user', text));
    ctx.root.appendChild(row); scrollBottom(ctx.scroll);
  }
  function choices(ctx, list, onBack){
    var box = el('div', PFX+'-choices');
    var backPill = null;
    list.forEach(function(c){
      var b = el('button', PFX+'-pill', c.label);
      b.addEventListener('click', function(){ box.remove(); if(backPill)backPill.remove(); userMsg(ctx, c.label); c.onPick(); });
      box.appendChild(b);
    });
    ctx.root.appendChild(box);
    if (onBack){
      backPill = el('button', PFX+'-back', '← Back');
      backPill.addEventListener('click', function(){ box.remove(); backPill.remove(); onBack(); });
      ctx.root.appendChild(backPill);
    }
    scrollBottom(ctx.scroll);
  }
  function successCard(ctx, title, rows, msg){
    var card = el('div', PFX+'-card');
    card.appendChild(el('h4', null, title));
    (rows||[]).forEach(function(r){
      var kv = el('div', PFX+'-kv');
      kv.appendChild(el('span', null, r[0]));
      kv.appendChild(el('strong', null, r[1]));
      card.appendChild(kv);
    });
    if (msg){ card.appendChild(el('div', PFX+'-msg', msg)); }
    ctx.root.appendChild(card); scrollBottom(ctx.scroll);
  }

  // ===== branching state machine =====
  function buildFlow(ctx){
    var data = { days:null };
    function daysLabel(n){ return n + (n===1?' day':' days'); }

    function step1(){
      botMsg(ctx, "Hi — sorry you're not feeling well. Let's log your sick leave. 🤒");
      botMsg(ctx, "Will you be out for longer than 3 days?");
      choices(ctx, [
        { label:"No — 3 days or less", onPick: step2a },
        { label:"Yes — longer than 3 days", onPick: step2b }
      ]);
    }
    function step2a(){
      botMsg(ctx, "Got it — for absences of 3 days or less you don't need a doctor's note. ✅ Your sick leave has been logged. Rest up and get well soon!");
      successCard(ctx, "✅ Sick leave logged", [["Duration","3 days or less"],["Doctor's note","Not required"]]);
    }
    function step2b(){
      botMsg(ctx, "Since you'll be out more than 3 days, a doctor's note is required. Have you already seen a doctor?");
      choices(ctx, [
        { label:"Yes, I've seen a doctor", onPick: step3b },
        { label:"No, not yet", onPick: step3a }
      ], step1);
    }
    function step3a(){
      botMsg(ctx, "For absences longer than 3 days a doctor's note is mandatory. Please see a doctor to get a sick-leave certificate, then come back here to finish logging your absence and upload the note. 🩺");
    }
    function step3b(){
      botMsg(ctx, "Great. How many days did the doctor sign you off for?");
      var rowEl = el('div', PFX+'-inputrow');
      var input = el('input', PFX+'-num'); input.type='number'; input.min='1'; input.max='365'; input.placeholder='days';
      var cont = el('button', PFX+'-cont', 'Continue'); cont.disabled = true;
      var errBox = el('div', PFX+'-err');
      function valid(){ var v=parseInt(input.value,10); return v>=1 && v<=365; }
      input.addEventListener('input', function(){ errBox.textContent=''; cont.disabled=!valid(); });
      input.addEventListener('keydown', function(e){ if(e.key==='Enter' && !cont.disabled) cont.click(); });
      cont.addEventListener('click', function(){
        if(!valid()){ errBox.textContent='Please enter a number of days between 1 and 365.'; return; }
        data.days = parseInt(input.value,10);
        rowEl.remove(); errBox.remove(); backPill.remove();
        userMsg(ctx, daysLabel(data.days));
        step3bDone();
      });
      rowEl.appendChild(input); rowEl.appendChild(cont);
      ctx.root.appendChild(rowEl); ctx.root.appendChild(errBox);
      var backPill = el('button', PFX+'-back', '← Back');
      backPill.addEventListener('click', function(){ rowEl.remove(); errBox.remove(); backPill.remove(); step2b(); });
      ctx.root.appendChild(backPill);
      scrollBottom(ctx.scroll); input.focus();
    }
    function step3bDone(){
      botMsg(ctx, "Thanks — I've recorded a doctor-certified absence of " + daysLabel(data.days) + ".");
      botMsg(ctx, "Have you already told your manager you'll be out?");
      choices(ctx, [
        { label:"Yes, I've told them", onPick: step4a },
        { label:"No, not yet", onPick: step4b }
      ]);
    }
    function step4a(){
      botMsg(ctx, "Perfect — you're all set. 🎉 Your sick leave (" + daysLabel(data.days) + ", doctor-certified) has been logged. Get well soon!");
      successCard(ctx, "🎉 Sick leave logged", [["Duration",daysLabel(data.days)],["Doctor's note","Certified"],["Manager","Informed by you"]]);
    }
    function step4b(){
      botMsg(ctx, "No problem — want me to message " + managerName + " for you, or will you do it yourself?");
      choices(ctx, [
        { label:"Text my manager automatically", onPick: step4bAuto },
        { label:"I'll tell them myself", onPick: step4bSelf }
      ], step3bDone);
    }
    function step4bAuto(){
      var text = "Hi, I'm calling in sick and will be out for " + daysLabel(data.days) + " (doctor-certified). I've logged it in the intranet. Thanks!";
      var card = el('div', PFX+'-card');
      card.appendChild(el('h4', null, "📱 Sent to " + managerName));
      card.appendChild(el('div', PFX+'-msg', text));
      ctx.root.appendChild(card); scrollBottom(ctx.scroll);
      if (managerContact){
        try {
          var href = managerContact.indexOf('@')>-1
            ? 'mailto:'+encodeURIComponent(managerContact)+'?subject='+encodeURIComponent('Sick leave')+'&body='+encodeURIComponent(text)
            : 'sms:'+encodeURIComponent(managerContact)+'?&body='+encodeURIComponent(text);
          window.open(href, '_blank');
        } catch(e){}
      }
      botMsg(ctx, "Done — " + managerName + " has been notified and your sick leave is logged. Get well soon! 🎉");
    }
    function step4bSelf(){
      botMsg(ctx, "Got it — please remember to let " + managerName + " know. Your sick leave (" + daysLabel(data.days) + ") has been logged. Get well soon!");
    }
    step1();
  }

  // ===== mount / takeover =====
  function hideStartScreen(scroll){
    Array.prototype.forEach.call(scroll.children, function(c){ if(c.id!==ROOT_ID) c.style.display='none'; });
  }
  function mountFlow(){
    var view = getView(); if(!view) return;
    var scroll = getScroll(view); if(!scroll) return;
    if (isMounted(scroll)) return;   // bail if my flow is already mounted (safe re-run / re-trigger guard)
    var footer = getFooter(view); if(footer) footer.style.display='none';
    hideStartScreen(scroll);
    var root = el('div', PFX+'-wrap'); root.id = ROOT_ID;
    scroll.appendChild(root);
    // mount-scoped observer: keep start screen/footer hidden ONLY while my flow is mounted
    if (S.mountObserver){ try{S.mountObserver.disconnect();}catch(e){} }
    S.mountObserver = new MutationObserver(function(){
      var sc = getScroll(getView());
      if (!sc || !isMounted(sc)){ if(S.mountObserver){ S.mountObserver.disconnect(); S.mountObserver=null; } return; }
      hideStartScreen(sc);
      var ft = getFooter(getView()); if(ft) ft.style.display='none';
    });
    S.mountObserver.observe(scroll, { childList:true });
    buildFlow({ root:root, scroll:scroll });
  }

  // ===== trigger hook: mousedown, capture phase (fires before Navigator's own handler) =====
  function onDown(e){
    var btn = e.target && e.target.closest ? e.target.closest('button') : null;
    if (!btn || btn.textContent.trim() !== TRIGGER_TEXT) return;
    e.preventDefault(); e.stopPropagation(); if(e.stopImmediatePropagation) e.stopImmediatePropagation();
    mountFlow();
  }
  S.onDown = onDown; // stable reference so a future re-run removes THIS exact global listener

  // ===== robustness: re-hook the button whenever the panel is rebuilt =====
  function hookButtons(){
    var view = getView(); if(!view) return;
    var btn = findTriggerBtn(view);
    if (btn && !btn.dataset.sbsickHooked){ btn.dataset.sbsickHooked='1'; btn.addEventListener('mousedown', onDown, true); }
  }
  document.addEventListener('mousedown', onDown, true);            // global capture (belt-and-suspenders)
  S.bodyObserver = new MutationObserver(hookButtons);              // re-find on rebuild
  S.bodyObserver.observe(document.body, { childList:true, subtree:true });
  hookButtons();

  return 'sbsick installed';
})();