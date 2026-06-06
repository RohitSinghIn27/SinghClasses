/**
 * SinghClasses Sub-Portal Premium Interactive Engine Additions
 * Performance Tuning: Premium low-density nodes with luxury proximity tracking lines
 */

document.addEventListener('DOMContentLoaded', () => {
    
    const instantiatePremiumFabric = (parentContainerSelector) => {
        const containerNode = document.querySelector(parentContainerSelector);
        if (!containerNode) return;

        const canvasElement = document.createElement('canvas');
        canvasElement.className = 'sc-canvas-bg-layer';
        containerNode.insertBefore(canvasElement, containerNode.firstChild);

        const canvasContext = canvasElement.getContext('2d');
        let viewWidth = 0, viewHeight = 0, nodesArray = [];
        let mouseCoordinates = { x: -2000, y: -2000 };

        const configureDimensions = () => {
            viewWidth = canvasElement.width = containerNode.offsetWidth;
            viewHeight = canvasElement.height = containerNode.offsetHeight;
        };

        // Execution of Premium Fluid Density limits
        new ResizeObserver(() => {
            configureDimensions();
            nodesArray = [];
            
            // Fixed clean ratio bounds to maintain premium minimalistic fidelity spacing
            const luxuryTargetDensity = Math.min(Math.floor((viewWidth * viewHeight) / 48000), 24) || 12;
            
            for (let i = 0; i < luxuryTargetDensity; i++) {
                nodesArray.push({
                    currentX: Math.random() * viewWidth,
                    currentY: Math.random() * viewHeight,
                    moveX: (Math.random() - 0.5) * 0.55, // Slow premium floating vector acceleration
                    moveY: (Math.random() - 0.5) * 0.55,
                    nodeRadius: Math.random() * 0.7 + 0.3 // Sleek narrow visual profiles
                });
            }
        }).observe(containerNode);

        // Track Pointer proximity bounds across the unified container box layers
        containerNode.addEventListener('mousemove', (event) => {
            const boundaries = containerNode.getBoundingClientRect();
            mouseCoordinates.x = event.clientX - boundaries.left;
            mouseCoordinates.y = event.clientY - boundaries.top;
        });

        containerNode.addEventListener('mouseleave', () => {
            mouseCoordinates.x = -2000;
            mouseCoordinates.y = -2000;
        });

        const frameExecutionLoop = () => {
            if (!viewWidth || !viewHeight) return requestAnimationFrame(frameExecutionLoop);
            canvasContext.clearRect(0, 0, viewWidth, viewHeight);

            const isDarkActiveMode = document.body.classList.contains('dark-mode');
            const particleColor = isDarkActiveMode ? 'rgba(255, 255, 255, 0.18)' : 'rgba(13, 148, 136, 0.18)';
            const structureLineColor = isDarkActiveMode ? 'rgba(255, 255, 255, 0.04)' : 'rgba(13, 148, 136, 0.04)';
            const interactiveLineColor = isDarkActiveMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(13, 148, 136, 0.08)';

            // Render Node Connections Layout Matrix
            for (let i = 0; i < nodesArray.length; i++) {
                for (let j = i + 1; j < nodesArray.length; j++) {
                    let distanceDeltaX = nodesArray[i].currentX - nodesArray[j].currentX;
                    let distanceDeltaY = nodesArray[i].currentY - nodesArray[j].currentY;
                    let squaredDistance = distanceDeltaX * distanceDeltaX + distanceDeltaY * distanceDeltaY;

                    if (squaredDistance < 8500) { // Clean linear prox parameters
                        canvasContext.beginPath();
                        canvasContext.moveTo(nodesArray[i].currentX, nodesArray[i].currentY);
                        canvasContext.lineTo(nodesArray[j].currentX, nodesArray[j].currentY);
                        canvasContext.strokeStyle = structureLineColor;
                        canvasContext.lineWidth = 0.6;
                        canvasContext.stroke();
                    }
                }
            }

            // Animate and Paint Nodes Individually
            nodesArray.forEach(particle => {
                particle.currentX += particle.moveX;
                particle.currentY += particle.moveY;

                // Handle Boundary Reversals cleanly
                if (particle.currentX < 0 || particle.currentX > viewWidth) particle.moveX *= -1;
                if (particle.currentY < 0 || particle.currentY > viewHeight) particle.moveY *= -1;

                // Handle Interactive Mouse Proximity Connections
                let pointerDeltaX = mouseCoordinates.x - particle.currentX;
                let pointerDeltaY = mouseCoordinates.y - particle.currentY;
                let pointerDistanceSquared = pointerDeltaX * pointerDeltaX + pointerDeltaY * pointerDeltaY;

                if (pointerDistanceSquared < 18000) {
                    canvasContext.beginPath();
                    canvasContext.moveTo(particle.currentX, particle.currentY);
                    canvasContext.lineTo(mouseCoordinates.x, mouseCoordinates.y);
                    canvasContext.strokeStyle = interactiveLineColor;
                    canvasContext.lineWidth = 0.8;
                    canvasContext.stroke();
                }

                canvasContext.beginPath();
                canvasContext.arc(particle.currentX, particle.currentY, particle.nodeRadius, 0, Math.PI * 2);
                canvasContext.fillStyle = particleColor;
                canvasContext.fill();
            });

            requestAnimationFrame(frameExecutionLoop);
        };

        frameExecutionLoop();
    };

    // Invoke premium canvas engines flawlessly inside respective container sectors
    instantiatePremiumFabric('#learningZoneSector');
    instantiatePremiumFabric('#billboardZoneSector');
});