/**
 * SinghClasses Sub-Portal Dashboard Engine Addition
 * Architecture: Non-redundant Canvas Interactivity Fabric
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // Abstracted Canvas Particle Instantiation Function to prevent code replication
    const injectDashboardFabric = (containerSelector, useLightDots = false) => {
        const targetElement = document.querySelector(containerSelector);
        if (!targetElement) return;

        const canvas = document.createElement('canvas');
        canvas.className = 'sc-canvas-bg-layer';
        targetElement.insertBefore(canvas, targetElement.firstChild);

        const context = canvas.getContext('2d');
        let width = 0, height = 0, pointArray = [];

        const calculateCanvasSize = () => {
            width = canvas.width = targetElement.offsetWidth;
            height = canvas.height = targetElement.offsetHeight;
        };

        new ResizeObserver(() => {
            calculateCanvasSize();
            pointArray = [];
            const structuralDensity = Math.min(Math.floor((width * height) / 35000), 15) || 8;
            
            for (let i = 0; i < structuralDensity; i++) {
                pointArray.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    horizontalVelocity: (Math.random() - 0.5) * 1.0,
                    verticalVelocity: (Math.random() - 0.5) * 1.0,
                    radius: Math.random() * 0.8 + 0.3
                });
            }
        }).observe(targetElement);

        const renderFrameLoop = () => {
            if (!width || !height) return requestAnimationFrame(renderFrameLoop);
            context.clearRect(0, 0, width, height);

            const isDarkActive = document.body.classList.contains('dark-mode');
            const colorBase = (useLightDots || isDarkActive) ? 'rgba(255,255,255,0.2)' : 'rgba(13,148,136,0.2)';
            const colorLine = (useLightDots || isDarkActive) ? 'rgba(255,255,255,0.06)' : 'rgba(13,148,136,0.06)';

            // Connection Link Execution
            for (let i = 0; i < pointArray.length; i++) {
                for (let j = i + 1; j < pointArray.length; j++) {
                    let spatialX = pointArray[i].x - pointArray[j].x;
                    let spatialY = pointArray[i].y - pointArray[j].y;
                    if ((spatialX * spatialX + spatialY * spatialY) < 7000) {
                        context.beginPath();
                        context.moveTo(pointArray[i].x, pointArray[i].y);
                        context.lineTo(pointArray[j].x, pointArray[j].y);
                        context.strokeStyle = colorLine;
                        context.lineWidth = 0.7;
                        context.stroke();
                    }
                }
            }

            // Node Travel Path Updates
            pointArray.forEach(node => {
                node.x += node.horizontalVelocity;
                node.y += node.verticalVelocity;

                if (node.x < 0 || node.x > width) node.horizontalVelocity *= -1;
                if (node.y < 0 || node.y > height) node.verticalVelocity *= -1;

                context.beginPath();
                context.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
                context.fillStyle = colorBase;
                context.fill();
            });

            requestAnimationFrame(renderFrameLoop);
        };

        renderFrameLoop();
    };

    // Trigger unique instances securely without repeating code logic
    injectDashboardFabric('#youtubeBannerSector', false);
    injectDashboardFabric('#billboardCanvasSector', false);
});
