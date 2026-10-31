/* Shared layout and input handling for the existing coverflow galleries. */
(function () {
    window.setupGalleryBrowser = function (ring, onMove) {
        var stage = ring.closest('.gallery-stage');
        var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        var layout = { spacing: 184, depth: 26 };
        var gesture = null, pauseUntil = 0, suppressClickUntil = 0;

        function fit() {
            // Leave space for perspective and shadows above and below every card.
            var size = Math.max(120, Math.min(460, stage.clientHeight - 56, stage.clientWidth * .78));
            stage.style.setProperty('--gallery-card-size', size + 'px');
            layout.spacing = size * .913;
            layout.depth = size * .13;
        }
        new ResizeObserver(fit).observe(stage);
        fit();
        layout.isPaused = function () {
            return motion.matches || document.hidden || !!gesture || performance.now() < pauseUntil || stage.contains(document.activeElement);
        };
        function move(delta) { onMove(delta); pauseUntil = performance.now() + 2000; }

        stage.addEventListener('wheel', function (e) {
            if (e.ctrlKey) return; // Browser pinch-to-zoom remains available.
            var delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            if (!delta) return;
            e.preventDefault();
            move(delta * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? stage.clientHeight : 1) * .004);
        }, { passive: false });
        stage.addEventListener('keydown', function (e) {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            e.preventDefault();
            move(e.key === 'ArrowRight' ? 1 : -1);
        });
        // Touch events rather than pointer events: the browser fires pointercancel when a
        // touch starts on a 3D-transformed link card, which killed swipes that began on a card.
        stage.addEventListener('touchstart', function (e) {
            if (e.touches.length !== 1) { gesture = null; return; }
            var t = e.touches[0];
            suppressClickUntil = 0;
            gesture = { id: t.identifier, x: t.clientX, y: t.clientY, lastX: t.clientX, axis: null };
        }, { passive: true });
        stage.addEventListener('touchmove', function (e) {
            if (!gesture) return;
            var t = Array.prototype.find.call(e.changedTouches, function (c) { return c.identifier === gesture.id; });
            if (!t) return;
            var dx = t.clientX - gesture.x, dy = t.clientY - gesture.y;
            if (!gesture.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 7) {
                gesture.axis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
            }
            if (gesture.axis !== 'horizontal') return;
            if (e.cancelable) e.preventDefault();
            move((gesture.lastX - t.clientX) / layout.spacing);
            gesture.lastX = t.clientX;
        }, { passive: false });
        function endGesture() {
            if (!gesture) return;
            if (gesture.axis === 'horizontal') suppressClickUntil = performance.now() + 450;
            gesture = null;
            pauseUntil = performance.now() + 2000;
        }
        stage.addEventListener('touchend', endGesture);
        stage.addEventListener('touchcancel', endGesture);
        stage.addEventListener('click', function (e) {
            if (performance.now() < suppressClickUntil && e.detail !== 0) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        }, true);
        return layout;
    };
})();
