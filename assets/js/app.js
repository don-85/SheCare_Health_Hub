
(function() {
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
    slugify(s){ return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''); },
    now(){ return new Date().toISOString(); }
  };
  window.SheCare = App;

  // Seed demo posts once
  if(!App.get('seeded')){
    const demoPosts = [
      {
        id: crypto.randomUUID(),
        title: "Understanding Medication Options & Aftercare",
        excerpt: "A quick primer on common medications, what to expect, and aftercare checklists.",
        content: "Educational content only. Always consult licensed clinicians for personalized care. This post outlines general considerations, side effects, and aftercare tips.",
        tags: ["education","aftercare","medication"],
        published: true,
        createdAt: App.now(),
        likes: 3, dislikes: 0
      },
      {
        id: crypto.randomUUID(),
        title: "Privacy & Safety: How We Protect Your Data",
        excerpt: "A look at client-side privacy, local-only storage, and how to browse safely.",
        content: "This site stores your likes/comments locally in your browser (localStorage). Clear your browser data to remove them. Avoid sharing personal health info publicly.",
        tags: ["privacy","security"],
        published: true,
        createdAt: App.now(),
        likes: 4, dislikes: 1
      },
      {
        id: crypto.randomUUID(),
        title: "Finding Qualified Care: Telehealth and Clinics",
        excerpt: "How to evaluate telehealth providers and clinics, questions to ask, and red flags.",
        content: "We discuss telehealth screening, clinician credentials, and why follow-up channels matter. This is not medical advice.",
        tags: ["clinics","telehealth"],
        published: true,
        createdAt: App.now(),
        likes: 2, dislikes: 0
      }
    ];
    App.set('posts', demoPosts);
    App.set('comments', []);
    App.set('seeded', true);
  }

  // Like/Dislike helpers
  window.likePost = function(postId){
    const user = App.uid();
    const ledger = App.get('reactions', {});
    ledger[user] = ledger[user] || {};
    // Toggle like; remove dislike if set
    if(ledger[user][postId] === 'like'){ ledger[user][postId] = null; }
    else { ledger[user][postId] = 'like'; }
    App.set('reactions', ledger);
    // Update counters
    const posts = App.get('posts', []);
    const p = posts.find(x => x.id === postId);
    if(p){
      const counts = countReactions(posts, ledger, postId);
      p.likes = counts.likes; p.dislikes = counts.dislikes;
      App.set('posts', posts);
    }
    refreshReactions(postId);
  };
  window.dislikePost = function(postId){
    const user = App.uid();
    const ledger = App.get('reactions', {});
    ledger[user] = ledger[user] || {};
    if(ledger[user][postId] === 'dislike'){ ledger[user][postId] = null; }
    else { ledger[user][postId] = 'dislike'; }
    App.set('reactions', ledger);
    const posts = App.get('posts', []);
    const p = posts.find(x => x.id === postId);
    if(p){
      const counts = countReactions(posts, ledger, postId);
      p.likes = counts.likes; p.dislikes = counts.dislikes;
      App.set('posts', posts);
    }
    refreshReactions(postId);
  };
  function countReactions(posts, ledger, postId){
    let likes=0, dislikes=0;
    const users = Object.keys(ledger);
    for(const u of users){
      const v = ledger[u] && ledger[u][postId];
      if(v==='like') likes++;
      if(v==='dislike') dislikes++;
    }
    // fallback if never reacted
    if(likes===0 && dislikes===0){
      const p = posts.find(x => x.id===postId);
      if(p) { likes = p.likes || 0; dislikes = p.dislikes || 0; }
    }
    return {likes, dislikes};
  }
  window.refreshReactions = function(postId){
    const posts = App.get('posts', []);
    const p = posts.find(x => x.id === postId);
    if(!p) return;
    const likeEl = document.querySelector(`[data-like-count="${postId}"]`);
    const dislikeEl = document.querySelector(`[data-dislike-count="${postId}"]`);
    if(likeEl) likeEl.textContent = p.likes || 0;
    if(dislikeEl) dislikeEl.textContent = p.dislikes || 0;
  }

  // Comment helpers
  window.submitComment = function(postId){
    const name = document.getElementById('cName')?.value?.trim() || "Anonymous";
    const text = document.getElementById('cText')?.value?.trim();
    if(!text){ alert("Please write a comment first."); return; }
    const list = App.get('comments', []);
    list.push({ id: crypto.randomUUID(), postId, name, text, at: App.now(), status: 'published' });
    App.set('comments', list);
    document.getElementById('cText').value='';
    renderComments(postId);
  };
  window.renderComments = function(postId){
    const wrap = document.getElementById('commentsWrap');
    if(!wrap) return;
    const all = App.get('comments', []).filter(c => c.postId===postId && c.status!=='removed');
    if(all.length===0){ wrap.innerHTML = '<p class="text-muted">No comments yet. Be the first to share your experience.</p>'; return; }
    wrap.innerHTML = all.map(c => `
      <div class="border rounded-4 p-3 mb-3">
        <div class="d-flex justify-content-between">
          <strong>${c.name}</strong>
          <span class="text-muted small">${new Date(c.at).toLocaleString()}</span>
        </div>
        <p class="mb-0 mt-2">${c.text.replace(/</g,"&lt;")}</p>
      </div>
    `).join("");
  };

  // Expose post loader
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
    refreshReactions(p.id);
    renderComments(p.id);
    // wire buttons
    document.querySelector('[data-like-btn]').setAttribute('onclick', `likePost("${p.id}")`);
    document.querySelector('[data-dislike-btn]').setAttribute('onclick', `dislikePost("${p.id}")`);
    document.querySelector('[data-comment-btn]').setAttribute('onclick', `submitComment("${p.id}")`);
  };

  // Blog list renderer
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

  // Expose globally for dashboards
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
