document.addEventListener("DOMContentLoaded", () => {
    window.scrollTo(0, 0);
    window.addEventListener("pageshow", () => window.scrollTo(0, 0));
    const yr = document.getElementById("current-year");
    if (yr) yr.textContent = new Date().getFullYear();
    const dmBtn = document.getElementById("darkModeToggle");
    if (localStorage.getItem("theme") === "dark") document.body.classList.add("dark-mode");
    dmBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        document.body.classList.toggle("dark-mode");
        localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
    });
    const initShare = (btnId) => {
        document.getElementById(btnId)?.addEventListener("click", async (e) => {
            e.preventDefault();
            const url = window.location.href;
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(url);
                } else {
                    const ta = document.createElement("textarea");
                    ta.value = url;
                    ta.style.position = "fixed";
                    ta.style.left = "-9999px";
                    document.body.appendChild(ta);
                    ta.focus();
                    ta.select();
                    document.execCommand("copy");
                    ta.remove();
                }
                alert("Link copied!");
            } catch (err) {
                alert("Could not copy the link. Please copy it manually: " + url);
            }
        });
    };
    initShare("sharePageToggle");
    const scrollBtn = document.getElementById("scrollTopAction"),
        footer = document.querySelector(".site-footer"),
        hud = document.querySelector(".floating-action-hud");
    scrollBtn?.addEventListener("click", (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
    if (footer && hud) {
        const updateHud = () => {
            let r = footer.getBoundingClientRect(),
                vh = window.innerHeight,
                overlap = vh - r.top;
            hud.style.transform = overlap > 0 ? `translateY(-${Math.min(overlap, 90)}px)` : "translateY(0)";
        };
        let t = false;
        window.addEventListener(
            "scroll",
            () => {
                if (!t) {
                    window.requestAnimationFrame(() => {
                        updateHud();
                        t = false;
                    });
                    t = true;
                }
            },
            { passive: true }
        );
        updateHud();
    }
    const initDynamicFabric = (selector, canvasId, particleCount, connectionDistance, forceLight = false) => {
        const wrapper = document.querySelector(selector);
        if (!wrapper) return;
        let canvas = canvasId ? document.getElementById(canvasId) : null;
        if (!canvas) {
            canvas = document.createElement("canvas");
            canvas.className = "sc-canvas-bg-layer";
            wrapper.insertBefore(canvas, wrapper.firstChild);
        }
        const ctx = canvas.getContext("2d");
        let w = 0,
            h = 0,
            dots = [],
            cursor = { x: -2000, y: -2000 };
        new ResizeObserver(() => {
            w = canvas.width = wrapper.offsetWidth;
            h = canvas.height = wrapper.offsetHeight;
            dots = [];
            const density = particleCount || Math.min(Math.floor((w * h) / 30000), 20) || 15;
            for (let i = 0; i < density; i++)
                dots.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - 0.5) * 1.2,
                    vy: (Math.random() - 0.5) * 1.2,
                    r: Math.random() * 0.8 + 0.3
                });
        }).observe(wrapper);
        wrapper.addEventListener("mousemove", (e) => {
            const box = wrapper.getBoundingClientRect();
            cursor.x = e.clientX - box.left;
            cursor.y = e.clientY - box.top;
        });
        wrapper.addEventListener("mouseleave", () => (cursor.x = cursor.y = -2000));
        const runLoop = () => {
            if (!w || !h) return requestAnimationFrame(runLoop);
            ctx.clearRect(0, 0, w, h);
            const dark = document.body.classList.contains("dark-mode"),
                lightTheme = forceLight || dark,
                cBase = lightTheme ? "rgba(255,255,255,0.35)" : "rgba(5,150,105,0.2)",
                cLink = lightTheme ? "rgba(255,255,255,0.12)" : "rgba(5,150,105,0.1)",
                cHigh = lightTheme ? "rgba(255,255,255,0.95)" : "rgba(4,120,87,0.5)",
                connDist = connectionDistance || 80;
            for (let i = 0; i < dots.length; i++) {
                for (let j = i + 1; j < dots.length; j++) {
                    let dx = dots[i].x - dots[j].x,
                        dy = dots[i].y - dots[j].y;
                    if (dx * dx + dy * dy < connDist * connDist) {
                        ctx.beginPath();
                        ctx.moveTo(dots[i].x, dots[i].y);
                        ctx.lineTo(dots[j].x, dots[j].y);
                        ctx.strokeStyle = cLink;
                        ctx.lineWidth = 0.8;
                        ctx.stroke();
                    }
                }
            }
            dots.forEach((p) => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > w) p.vx *= -1;
                if (p.y < 0 || p.y > h) p.vy *= -1;
                let cDist = (cursor.x - p.x) ** 2 + (cursor.y - p.y) ** 2,
                    size = p.r,
                    color = cBase;
                if (cDist < 10000) {
                    size = p.r + (1 - Math.sqrt(cDist) / 100) * 2;
                    color = cHigh;
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(cursor.x, cursor.y);
                    ctx.strokeStyle = cLink;
                    ctx.lineWidth = 1.1;
                    ctx.stroke();
                }
                ctx.beginPath();
                ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
            });
            requestAnimationFrame(runLoop);
        };
        runLoop();
    };
    initDynamicFabric("#scHeroTop", "scParticleCanvas1", 15, 40);
    initDynamicFabric("#scSubscribeBanner", "scParticleCanvas2", 10, 30);
});
document.addEventListener("contextmenu", (e) => {
    if (e.target.tagName === "IMG") e.preventDefault();
});