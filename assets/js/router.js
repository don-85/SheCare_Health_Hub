
(function(){
  function sameOrigin(url){
    try { const u = new URL(url, location.origin); return u.origin === location.origin; } catch(e){ return false; }
  }
  function isInternalLink(a){
    if(!a || !a.href) return false;
    return sameOrigin(a.href) && !a.target && !a.href.startsWith('mailto:') && !a.href.startsWith('tel:');
  }
  async function fetchPage(url){
    const res = await fetch(url, { headers: { 'X-Requested-With': 'fetch' } });
    const text = await res.text();
    const doc = new DOMParser().parseFromString(text, 'text/html');
    return doc;
  }
  function swapMain(doc){
    const current = document.querySelector('main');
    const next = doc.querySelector('main');
    if(current && next){
      current.replaceWith(next);
      setTimeout(()=>{
        if (typeof renderBlogList === 'function' && location.pathname.endsWith('blog.html')) renderBlogList();
        if (typeof loadPostFromQuery === 'function' && location.pathname.endsWith('post.html')) loadPostFromQuery();
        if (typeof refreshAdminLists === 'function' && location.pathname.endsWith('admin.html')) refreshAdminLists();
        if (typeof loadUser === 'function' && location.pathname.endsWith('dashboard.html')) loadUser();
      }, 0);
    } else {
      document.body.innerHTML = doc.body.innerHTML;
    }
  }
  async function onClick(e){
    const a = e.target.closest('a');
    if(!a || !isInternalLink(a)) return;
    const href = a.getAttribute('href');
    if(href.startsWith('#')) return;
    if(e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    const doc = await fetchPage(href);
    swapMain(doc);
    window.history.pushState({}, '', href);
    document.querySelectorAll('.navbar .nav-link').forEach(link => {
      const lhref = link.getAttribute('href');
      link.classList.toggle('active', lhref && href.endsWith(lhref));
    });
  }
  window.addEventListener('click', onClick);
  window.addEventListener('popstate', async () => {
    const doc = await fetchPage(location.href);
    swapMain(doc);
  });
})();