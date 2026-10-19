// Before/after compare sliders. The range input sits over the images, so
// mouse, touch and keyboard all work through one native control.
//
// The first time a slider scrolls into view it sweeps once from "before" to
// "after", so the change is visible without dragging. People who prefer
// reduced motion get the end position straight away.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const REST = 12; // resting position: the "after" headline fully in view, a strip of "before" left

document.querySelectorAll('[data-compare] .compare-stage').forEach((stage) => {
    const input = stage.querySelector('input[type="range"]');
    if (!input) return;

    const set = (value) => {
        input.value = value;
        stage.style.setProperty('--pos', value + '%');
    };
    let touched = false;
    input.addEventListener('input', () => {
        touched = true;
        stage.style.setProperty('--pos', input.value + '%');
    });

    if (reduceMotion || !('IntersectionObserver' in window)) {
        set(REST);
        return;
    }

    set(92);
    const observer = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        const from = 92, start = performance.now(), duration = 1400;
        const step = (now) => {
            if (touched) return;
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            set(Math.round(from + (REST - from) * eased));
            if (t < 1) requestAnimationFrame(step);
        };
        setTimeout(() => requestAnimationFrame(step), 250);
    }, { threshold: 0.5 });
    observer.observe(stage);
});
