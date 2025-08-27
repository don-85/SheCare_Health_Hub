
(function() {
  // ----- Branding & Runtime Config -----
  const Config = {
    brand: '#0ea5e9',
    brand2: '#14b8a6',
    whatsapp: {
      number: '+971500000000',
      message: 'Hello SheCare, I would like to chat.'
    },
    apiBase: '/api'
  };
  document.documentElement.style.setProperty('--brand', Config.brand);
  document.documentElement.style.setProperty('--brand2', Config.brand2);
  function buildWA() {
    const num = Config.whatsapp.number.replace(/[^0-9]/g, '');
    const text = encodeURIComponent(Config.whatsapp.message);
    return `https://wa.me/${num}?text=${text}`;
  }
  document.addEventListener('DOMContentLoaded', () => {
    const wa1 = document.getElementById('waNav');
    const wa2 = document.getElementById('waHero');
    if (wa1) wa1.setAttribute('href', buildWA());
    if (wa2) wa2.setAttribute('href', buildWA());
  });

  // ----- Local namespace -----
  const App = {
    ns: 'shecare',
    get(key, fallback=null){
      try { return JSON.parse(localStorage.getItem(this.ns+'::'+key)) ?? fallback; }
      catch(e){ return fallback; }
    },
    set(key, value){ localStorage.setItem(this.ns+'::'+key, JSON.stringify(value)); },
    uid(){
      let id = sessionStorage.getItem(this.ns+'::uid');
      if(!id){ id = Math.random().toString(36).slice(2); sessionStorage.setItem(this.ns+'::uid', id); }
      return id;
    },
    now(){ return new Date().toISOString(); }
  };
  window.SheCare = App;

  // ----- Seed demo posts -----
  if(!App.get('seeded')){
    const demoPosts = [
      { id: crypto.randomUUID(), title: "Understanding Medication Options & Aftercare",
        excerpt: "A quick primer on common medications, what to expect, and aftercare checklists.",
        content: "Educational content only. Always consult licensed clinicians for personalized care. This post outlines general considerations, side effects, and aftercare tips.",
        tags: ["education","aftercare","medication"], published: true, createdAt: App.now(), likes: 3, dislikes: 0 },
      { id: crypto.randomUUID(), title: "Privacy & Safety: How We Protect Your Data",
        excerpt: "A look at client-side privacy, local-only storage, and how to browse safely.",
        content: "This site stores your likes/comments locally in your browser (localStorage). Clear your browser data to remove them. Avoid sharing personal health info publicly.",
        tags: ["privacy","security"], published: true, createdAt: App.now(), likes: 4, dislikes: 1 },
      { id: crypto.randomUUID(), title: "Finding Qualified Care: Telehealth and Clinics",
        excerpt: "How to evaluate telehealth providers and clinics, questions to ask, and red flags.",
        content: "We discuss telehealth screening, clinician credentials, and why follow-up channels matter. This is not medical advice.",
        tags: ["clinics","telehealth"], published: true, createdAt: App.now(), likes: 2, dislikes: 0 }
    ];
    App.set('posts', demoPosts);
    App.set('comments', []);
    App.set('seeded', true);
  }

  // ----- Backend detection -----
  async function probeBackend(){
    try {
      const res = await fetch(Config.apiBase + '/ping.php', { cache: 'no-store' });
      if(!res.ok) throw new Error('Ping failed');
      const js = await res.json();
      return !!js.ok;
    } catch(e){ return false; }
  }
  window.SheCareBackend = { available: false, config: Config };
  probeBackend().then(ok => window.SheCareBackend.available = ok);

  // ----- Likes/Dislikes -----
  window.likePost = function(postId){
    const user = App.uid();
    const ledger = App.get('reactions', {});
    ledger[user] = ledger[user] || {};
    if(ledger[user][postId] === 'like'){ ledger[user][postId] = null; }
    else { ledger[user][postId] = 'like'; }
    App.set('reactions', ledger);
    refreshReactions(postId);
  };
  window.dislikePost = function(postId){
    const user = App.uid();
    const ledger = App.get('reactions', {});
    ledger[user] = ledger[user] || {};
    if(ledger[user][postId] === 'dislike'){ ledger[user][postId] = null; }
    else { ledger[user][postId] = 'dislike'; }
    App.set('reactions', ledger);
    refreshReactions(postId);
  };
  function countReactions(postId){
    const posts = App.get('posts', []);
    const p = posts.find(x => x.id === postId) || {};
    const ledger = App.get('reactions', {});
    let likes=0, dislikes=0;
    Object.values(ledger).forEach(map => {
      const v = map && map[postId];
      if(v==='like') likes++;
      if(v==='dislike') dislikes++;
    });
    return { likes: likes || p.likes || 0, dislikes: dislikes || p.dislikes || 0 };
  }
  window.refreshReactions = function(postId){
    const c = countReactions(postId);
    const likeEl = document.querySelector(`[data-like-count]`);
    const dislikeEl = document.querySelector(`[data-dislike-count]`);
    if(likeEl) likeEl.textContent = c.likes;
    if(dislikeEl) dislikeEl.textContent = c.dislikes;
  };

  // ----- Backend-aware Comments API -----
  async function apiGetComments(postId){
    if(!window.SheCareBackend.available) {
      const all = App.get('comments', []).filter(c => c.postId===postId && c.status!=='removed');
      return all;
    }
    const res = await fetch(Config.apiBase + '/comments.php?postId=' + encodeURIComponent(postId));
    const js = await res.json();
    return js.comments || [];
  }
  async function apiAddComment(postId, name, text){
    if(!window.SheCareBackend.available){
      const list = App.get('comments', []);
      list.push({ id: crypto.randomUUID(), postId, name, text, at: App.now(), status: 'published' });
      App.set('comments', list);
      return { ok:true };
    }
    const res = await fetch(Config.apiBase + '/comments.php', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, name, text })
    });
    const js = await res.json();
    return js;
  }

  // ----- Auth helpers (optional) -----
  async function apiRegister(email, password){
    const res = await fetch(Config.apiBase + '/auth.php?action=register', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email, password })
    });
    return res.json();
  }
  async function apiLogin(email, password){
    const res = await fetch(Config.apiBase + '/auth.php?action=login', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email, password })
    });
    return res.json();
  }
  window.SheCareAuth = { apiRegister, apiLogin };

  // ----- Blog pages -----
  window.renderBlogList = function(){
    const posts = App.get('posts', []).filter(p=>p.published);
    const grid = document.getElementById('blogGrid');
    if(!grid) return;
    grid.innerHTML = posts.map(p => `
      <div class="col-md-6 col-lg-4">
        <div class="card card-rounded shadow-soft h-100">
          <div class="card-body d-flex flex-column">
            <h5 class="card-title">${p.title}</h5>
            <p class="card-text text-muted">${p.excerpt}</p>
            <div class="mt-auto">
              <div class="mb-2">${(p.tags||[]).map(t=>`<span class="badge rounded-pill text-bg-light me-1">${t}</span>`).join('')}</div>
              <a class="btn btn-outline-brand btn-sm rounded-pill" href="post.html?id=${encodeURIComponent(p.id)}">Read</a>
            </div>
          </div>
        </div>
      </div>
    `).join("");
  };

  window.loadPostFromQuery = function(){
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    const posts = App.get('posts', []);
    const p = posts.find(x => x.id===id);
    if(!p){ document.getElementById('postBody').innerHTML = '<p class="text-muted">Post not found.</p>'; return; }
    document.getElementById('postTitle').textContent = p.title;
    document.getElementById('postBody').innerHTML = `<p>${p.content}</p>`;
    document.getElementById('postTags').innerHTML = (p.tags||[]).map(t=>`<span class="tag">${t}</span>`).join('');
    document.querySelector('[data-like-count]').setAttribute('data-like-count', p.id);
    document.querySelector('[data-dislike-count]').setAttribute('data-dislike-count', p.id);
    document.querySelector('[data-like-btn]').setAttribute('onclick', `likePost("${p.id}")`);
    document.querySelector('[data-dislike-btn]').setAttribute('onclick', `dislikePost("${p.id}")`);
    document.querySelector('[data-comment-btn]').setAttribute('onclick', `submitComment("${p.id}")`);
    refreshReactions(p.id);
    renderComments(p.id);
  };

  window.submitComment = async function(postId){
    const name = document.getElementById('cName')?.value?.trim() || "Anonymous";
    const text = document.getElementById('cText')?.value?.trim();
    if(!text){ alert("Please write a comment first."); return; }
    const resp = await apiAddComment(postId, name, text);
    if(!resp.ok){ alert(resp.error || 'Failed to save comment'); return; }
    document.getElementById('cText').value='';
    renderComments(postId);
  };

  window.renderComments = async function(postId){
    const wrap = document.getElementById('commentsWrap');
    if(!wrap) return;
    const all = await apiGetComments(postId);
    if(all.length===0){ wrap.innerHTML = '<p class="text-muted">No comments yet. Be the first to share your experience.</p>'; return; }
    wrap.innerHTML = all.map(c => `
      <div class="border rounded-4 p-3 mb-3">
        <div class="d-flex justify-content-between">
          <strong>${c.name||'Anonymous'}</strong>
          <span class="text-muted small">${new Date(c.at).toLocaleString()}</span>
        </div>
        <p class="mb-0 mt-2">${(c.text||'').replace(/</g,"&lt;")}</p>
      </div>
    `).join("");
  };

  // Expose CRUD for admin
  window.SheCareAPI = {
    listPosts(){ return App.get('posts', []); },
    savePost(p){
      const posts = App.get('posts', []);
      const idx = posts.findIndex(x => x.id===p.id);
      if(idx>-1) posts[idx] = p; else posts.unshift(p);
      App.set('posts', posts);
    },
    removePost(id){
      const posts = App.get('posts', []).filter(x=>x.id!==id);
      App.set('posts', posts);
    },
    listComments(){ return App.get('comments', []); },
    moderateComment(id, status){
      const cs = App.get('comments', []);
      const c = cs.find(x => x.id===id);
      if(c){ c.status = status; App.set('comments', cs); }
    }
  };

})();