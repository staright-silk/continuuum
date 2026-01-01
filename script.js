document.addEventListener('DOMContentLoaded', function(){
  // remove no-js flag and enable virtual scroll only if initialization succeeds
  document.documentElement.classList.remove('no-js');
  try{
    document.documentElement.classList.add('use-virtual-scroll');
    document.body.classList.add('use-virtual-scroll');
  }catch(e){
    // if anything goes wrong, ensure native scrolling remains available
    document.documentElement.classList.remove('use-virtual-scroll');
    document.body.classList.remove('use-virtual-scroll');
  }
  const slides = Array.from(document.querySelectorAll('.slide'));
  const progress = document.getElementById('progress');
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  let idx = 0;
  const wrapper = document.querySelector('.timeline-wrapper');
  const total = slides.length;

  // viewport height helper
  let vh = window.innerHeight;

  function updateProgress(){
    progress.textContent = (idx+1) + ' / ' + total;
  }

  function show(i){
    idx = Math.max(0, Math.min(i, total-1));
    slides.forEach((s,sn)=> s.classList.toggle('active', sn===idx));
    // update target virtual position
    targetScroll = idx * vh;
    updateProgress();
  }

  prevBtn.addEventListener('click', ()=> show(idx-1));
  nextBtn.addEventListener('click', ()=> show(idx+1));

  document.addEventListener('keydown', (e)=>{
    if(e.key === 'ArrowUp') show(idx-1);
    if(e.key === 'ArrowDown') show(idx+1);
    if(e.key === 'Home') show(0);
    if(e.key === 'End') show(slides.length-1);
  });

  // initialize
  show(0);
  // --- Virtual smooth-scroller + parallax (snappier) ---
  const parallaxEls = Array.from(document.querySelectorAll('.parallax'));
  let currentScroll = 0; // animated position
  let targetScroll = 0;  // desired position
  let isAnimating = false;
  let rafId = null;
  const EASE = 0.28; // higher = snappier

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  // cache parallax elements for relatively fast updates
  let parallaxCache = parallaxEls.map(el=>({
    el,
    speed: parseFloat(el.dataset.speed) || 0.08
  }));
  function rebuildParallaxCache(){
    parallaxCache = parallaxEls.map(el=>({ el, speed: parseFloat(el.dataset.speed) || 0.08 }));
  }
  function updateParallaxWithPos(pos){
    parallaxCache.forEach(item=>{
      const rect = item.el.getBoundingClientRect();
      const elMid = rect.top + rect.height/2;
      const translate = (pos - elMid) * item.speed * 0.6; // subtle effect
      item.el.style.transform = `translateY(${translate}px)`;
    });
  }

  function render(){
    // ease current toward target for smooth snapping
    currentScroll += (targetScroll - currentScroll) * EASE;
    const rounded = Math.round(currentScroll * 100) / 100;
    if(wrapper) wrapper.style.transform = `translateY(${-rounded}px)`;
    updateParallaxWithPos(rounded);

    // if close to target, snap and stop
    if(Math.abs(targetScroll - currentScroll) < 0.6){
      currentScroll = targetScroll;
      if(wrapper) wrapper.style.transform = `translateY(${-Math.round(currentScroll)}px)`;
      updateParallaxWithPos(currentScroll);
      // update active slide index
      const nearest = Math.round(currentScroll / vh);
      idx = clamp(nearest, 0, total-1);
      updateProgress();
      isAnimating = false;
    } else {
      isAnimating = true;
      rafId = window.requestAnimationFrame(render);
    }
  }

  function startRender(){
    if(!isAnimating){ rafId = window.requestAnimationFrame(render); }
  }

  // on resize update viewport height and target positions
  window.addEventListener('resize', ()=>{
    vh = window.innerHeight;
    rebuildParallaxCache();
    targetScroll = idx * vh;
    currentScroll = clamp(currentScroll, 0, (total-1)*vh);
    startRender();
  });

  // initial positions
  targetScroll = 0;
  currentScroll = 0;
  startRender();
  // if any error happens later, we can detect and revert; expose a fail-safe
  window.addEventListener('error', ()=>{
    document.documentElement.classList.remove('use-virtual-scroll');
    document.body.classList.remove('use-virtual-scroll');
    if(wrapper) wrapper.style.transform = '';
    if(rafId) cancelAnimationFrame(rafId);
  });

  // --- Input handlers: wheel + touch with smoothing and subtle inertia ---
  let isScrollingCooldown = false;
  const COOLDOWN = 300; // ms between explicit slide changes

  function toNext(){ show(idx+1); startRender(); }
  function toPrev(){ show(idx-1); startRender(); }

  // snappier wheel: throttle and snap to next/prev slide
  let isScrollingCooldown = false;
  const COOLDOWN = 260;
  function handleWheel(e){
    const delta = e.deltaY || 0;
    if(Math.abs(delta) < 10) return;
    e.preventDefault();
    if(isScrollingCooldown) return;
    if(delta > 0) toNext(); else toPrev();
    isScrollingCooldown = true;
    setTimeout(()=> isScrollingCooldown = false, COOLDOWN);
  }
  window.addEventListener('wheel', handleWheel, {passive:false});

  // touch swipe detection
  let touchStartY = null;
  window.addEventListener('touchstart', (e)=>{
    if(e.touches && e.touches.length) touchStartY = e.touches[0].clientY;
  }, {passive:true});

  window.addEventListener('touchmove', (e)=>{ if(e.touches && e.touches.length) e.preventDefault(); }, {passive:false});
  window.addEventListener('touchend', (e)=>{
    if(touchStartY === null) return;
    const touchEndY = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientY : null;
    if(touchEndY === null) { touchStartY = null; return; }
    const diff = touchStartY - touchEndY;
    if(Math.abs(diff) < 40) { touchStartY = null; return; }
    if(diff > 0) toNext(); else toPrev();
    touchStartY = null;
  }, {passive:true});
});
